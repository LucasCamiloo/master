import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';
import mongoose from 'mongoose';
import Ad from './models/ad.js';
import Screen from './models/screen.js';
import Product from './models/product.js';
import fileService from './services/fileService.js';
import config from './config/config.js';
import Category from './models/category.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 4000;

// Remover criação do diretório uploads
// Remover rotas estáticas de uploads
// Configurar multer apenas com memoryStorage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024
    }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Adicionar rota específica para os fundos
app.use('/fundos', express.static(path.join(__dirname, 'public', 'fundos')));

// Update static file serving configuration
app.use(express.static(path.join(__dirname, 'public')));
app.use('/scripts', express.static(path.join(__dirname, 'public')));
app.use('/styles', express.static(path.join(__dirname, 'public')));

// Add explicit routes for script.js and styles.css
app.get('/script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'script.js'));
});

app.get('/styles.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'styles.css'));
});

// Add new routes for logo and font
app.get('/LOGO_DYP.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'LOGO_DYP.png'));
});

app.get('/Giphurs.otf', (req, res) => {
    res.sendFile(path.join(__dirname, 'Giphurs.otf'));
});

// Add route for the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Add routes for adicionarProd.html and product-list.html
app.get('/produtos/adicionarProd', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'produtos', 'adicionarProd.html'));
});

app.get('/produtos/product-list', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'produtos', 'product-list.html'));
});

const scheduledAds = new Map(); // Manter apenas este em memória pois é temporário

// Criação do servidor HTTP e SSE
const clients = new Set();

// Enhanced SSE endpoint
app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const client = res;
    clients.add(client);

    // Keep connection alive
    const keepAlive = setInterval(() => {
        res.write(':keepalive\n\n');
    }, 20000);

    req.on('close', () => {
        clearInterval(keepAlive);
        clients.delete(client);
    });
});

// Enhance SSE notifications with controlled frequency
function notifyMasterClients(eventData) {
    const data = `data: ${JSON.stringify(eventData)}\n\n`;
    clients.forEach(client => {
        try {
            client.write(data);
        } catch (error) {
            console.error('Erro ao notificar cliente SSE:', error);
        }
    });
}

// Limit the frequency of notifications to avoid overwhelming clients
const NOTIFY_INTERVAL = 1000; // 1 segundo
let notifyQueue = [];
let isNotifying = false;

function enqueueNotification(eventData) {
    notifyQueue.push(eventData);
    processQueue();
}

function processQueue() {
    if (isNotifying || notifyQueue.length === 0) return;
    isNotifying = true;

    const eventData = notifyQueue.shift();
    notifyMasterClients(eventData);

    setTimeout(() => {
        isNotifying = false;
        processQueue();
    }, NOTIFY_INTERVAL);
}

// Adicionar cache para screens
const screensCache = {
    data: new Map(),
    lastUpdate: 0,
    ttl: 30000 // Aumentado para 30 segundos
};

// Ensure the /api/screens endpoint is correctly defined
app.get('/api/screens', async (req, res) => {
    try {
        const now = Date.now();
        const screens = await Screen.find({}).lean();
        const screenList = await Promise.all(screens.map(async (screen) => {
            try {
                // Primeiro, tentar usar o cache se ainda válido
                const cachedScreen = screensCache.data.get(screen.id);
                if (cachedScreen && (now - screensCache.lastUpdate) < screensCache.ttl) {
                    return cachedScreen;
                }

                // Se não houver cache válido, verificar status
                const response = await fetch(`${screen.slaveUrl}/status`, {
                    timeout: 5000
                });
                
                if (!response.ok) {
                    throw new Error('Status check failed');
                }

                const status = await response.json();
                const screenData = {
                    id: screen.id,
                    slaveUrl: screen.slaveUrl,
                    content: screen.content || [],
                    name: screen.name || 'Sem nome',
                    operational: status.operational && screen.registered,
                    currentAd: screen.currentAd || null,
                    registered: screen.registered,
                    lastUpdate: now
                };

                // Atualizar cache
                screensCache.data.set(screen.id, screenData);
                return screenData;
            } catch (error) {
                console.error(`Error checking screen ${screen.id}:`, error);
                
                // Se houver erro, manter o registro mas marcar como não operacional
                const screenData = {
                    ...screen,
                    operational: false,
                    registered: true, // Mantém registrado mesmo com erro
                    lastUpdate: now
                };
                screensCache.data.set(screen.id, screenData);
                return screenData;
            }
        }));

        screensCache.lastUpdate = now;
        res.json({ success: true, screens: screenList });
    } catch (error) {
        console.error('Error fetching screens:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Adicionar verificação periódica de status das telas
setInterval(async () => {
    try {
        const screens = await Screen.find({});
        const now = Date.now();

        for (const screen of screens) {
            try {
                const response = await fetch(`${screen.slaveUrl}/status`, {
                    timeout: 3000
                });
                
                if (response.ok) {
                    const status = await response.json();
                    const screenData = {
                        id: screen.id,
                        slaveUrl: screen.slaveUrl,
                        content: screen.content || [],
                        name: screen.name || 'Sem nome',
                        operational: status.operational && screen.registered,
                        currentAd: screen.currentAd || null,
                        registered: screen.registered,
                        lastUpdate: now
                    };
                    screensCache.data.set(screen.id, screenData);
                }
            } catch (error) {
                console.error(`Background status check failed for screen ${screen.id}:`, error);
                // Não remove do cache em caso de erro
            }
        }
    } catch (error) {
        console.error('Background screen check error:', error);
    }
}, 15000); // Verificar a cada 15 segundos

const MASTER_URL = process.env.MASTER_URL || 'https://master-teal.vercel.app';
const SLAVE_URL = process.env.SLAVE_URL || 'https://slave-psi.vercel.app';

// Update file serving routes
app.use('/files', express.static(path.join(__dirname, 'public', 'files')));
app.use('/fundos', express.static(path.join(__dirname, 'public', 'fundos')));

// Manter apenas esta rota
app.post('/register', async (req, res) => {
    try {
        const { pin, screenId, slaveUrl } = req.body;
        console.log('📝 Registration attempt:', { pin, screenId, slaveUrl });

        // Validate required fields
        if (!pin || !screenId || !slaveUrl) {
            console.error('❌ Missing required fields:', { pin, screenId, slaveUrl });
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: pin, screenId, and slaveUrl are required'
            });
        }

        // First verify the slave URL
        try {
            console.log('🔍 Verifying slave:', slaveUrl);
            const verifyResponse = await fetch(`${slaveUrl}/screen-data?screenId=${screenId}`, {
                headers: { 'Accept': 'application/json' },
                timeout: 5000
            });

            if (!verifyResponse.ok) {
                console.error('❌ Slave verification failed:', await verifyResponse.text());
                throw new Error(`Slave verification failed with status ${verifyResponse.status}`);
            }

            const verifyData = await verifyResponse.json();
            console.log('📱 Slave data:', verifyData);

            // Register in database with no initial content or ad
            const screen = await Screen.findOneAndUpdate(
                { id: screenId },
                {
                    slaveUrl,
                    registered: true,
                    content: null,
                    currentAd: null,
                    lastUpdate: new Date()
                },
                { upsert: true, new: true }
            );

            // Notify slave
            console.log('📤 Notifying slave');
            const registerResponse = await fetch(`${slaveUrl}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pin,
                    screenId,
                    masterUrl: MASTER_URL
                })
            });

            if (!registerResponse.ok) {
                throw new Error('Failed to register with slave');
            }

            console.log('✅ Registration successful');
            return res.json({
                success: true,
                message: 'Screen registered successfully',
                screen
            });
        } catch (error) {
            console.error('❌ Registration process error:', error);
            return res.status(500).json({
                success: false,
                message: `Registration failed: ${error.message}`
            });
        }
    } catch (error) {
        console.error('❌ Internal error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Atualizar o endpoint de upload para suportar tanto imagens quanto vídeos. 
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const file = await fileService.uploadFile(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype
        );

        res.json({
            success: true,
            fileUrl: `/files/${file._id}`,
            fileId: file._id,
            contentType: file.contentType
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Modificar endpoint de conteúdo
app.post('/content', async (req, res) => {
    try {
        const { screenId, content } = req.body;
        const screen = await Screen.findOne({ id: screenId });

        if (!screen) {
            return res.status(404).json({ message: 'Screen not found' });
        }

        // Replace localhost URLs with deployed URLs
        const updatedContent = content.replace(
            /http:\/\/localhost:4000/g,
            MASTER_URL
        );

        const response = await fetch(`${screen.slaveUrl}/content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: updatedContent })
        });

        const data = await response.json();
        if (data.success) {
            screen.content = updatedContent;
            await screen.save();
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: 'Content update failed' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Corrigir o endpoint de deleção - movê-lo antes do app.listen()
app.delete('/api/screen/:screenId', async (req, res) => {
    try {
        const { screenId } = req.params;
        const screen = await Screen.findOne({ id: screenId });

        if (!screen) {
            return res.status(404).json({ success: false, message: 'Screen not found' });
        }

        // Garantir que o slave seja notificado
        try {
            console.log('Notifying slave about unregistration:', screen.slaveUrl);
            const unregisterResponse = await fetch(`${screen.slaveUrl}/unregister`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ screenId })
            });

            if (!unregisterResponse.ok) {
                const errorData = await unregisterResponse.json();
                console.error('Error from slave:', errorData);
                throw new Error('Failed to unregister slave: ' + errorData.message);
            }

            const unregisterData = await unregisterResponse.json();
            console.log('Slave unregistered successfully:', unregisterData);

        } catch (error) {
            console.error('Error notifying slave:', error);
            // Continuar mesmo se houver erro na notificação
        }

        // Remover a tela do registro do master
        await Screen.deleteOne({ id: screenId });
        console.log('Screen removed from master:', screenId);

        res.json({ success: true, message: 'Screen deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Certifique-se de que estas rotas estão antes do app.listen()
app.post('/api/screens/:screenId/display-ad', async (req, res) => {
    try {
        const { screenId } = req.params;
        const { adId } = req.body;

        const screen = await Screen.findOne({ id: screenId });
        const ad = await Ad.findOne({ id: adId });

        if (!screen || !ad) {
            return res.status(404).json({ success: false, message: 'Screen or Ad not found' });
        }

        // Atualizar o conteúdo da tela com o anúncio selecionado
        const response = await fetch(`${screen.slaveUrl}/content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: ad.content })
        });

        const data = await response.json();
        if (data.success) {
            screen.content = ad.content;
            screen.currentAd = adId; // Manter referência ao anúncio atual
            await screen.save();
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: 'Content update failed' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/screens/:screenId/display-ad', async (req, res) => {
    try {
        const { screenId } = req.params;
        const { adId } = req.body;

        const screen = await Screen.findOne({ id: screenId });
        const ad = await Ad.findOne({ id: adId });

        if (!screen || !ad) {
            return res.status(404).json({ success: false, message: 'Screen or Ad not found' });
        }

        // Atualizar o conteúdo da tela com o anúncio selecionado
        const response = await fetch(`${screen.slaveUrl}/content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: ad.content })
        });

        const data = await response.json();
        if (data.success) {
            screen.content = ad.content;
            await screen.save();
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: 'Content update failed' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Remover todas as rotas de anúncios existentes e substituir por estas:
const adRoutes = express.Router();

// Rota para salvar um novo anúncio
adRoutes.post('/', async (req, res) => {
    try {
        console.log('Recebendo requisição para salvar anúncio:', req.body); // Log para debug
        const { title, content } = req.body;
        const adId = Date.now().toString();

        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: 'Title and content are required'
            });
        }

        const newAd = await Ad.create({
            id: adId,
            title,
            content: Array.isArray(content) ? content : [content],
            dateCreated: new Date().toISOString()
        });

        console.log('Anúncio salvo:', newAd); // Log para debug
        res.json({ success: true, id: adId });
    } catch (error) {
        console.error('Erro ao salvar anúncio:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Rota para listar todos os anúncios
adRoutes.get('/', async (req, res) => {
    try {
        const adsList = await Ad.find({});
        res.json({ success: true, ads: adsList });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Rota para buscar anúncios disponíveis
adRoutes.get('/available', async (req, res) => {
    try {
        const adsList = await Ad.find({}, 'id title dateCreated');
        res.json({ success: true, ads: adsList });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Rota para excluir um anúncio salvo
adRoutes.delete('/:adId', async (req, res) => {
    try {
        const { adId } = req.params;
        console.log('Tentando excluir anúncio:', adId); // Debug log

        const ad = await Ad.findOneAndDelete({ id: adId });
        if (!ad) {
            console.log('Anúncio não encontrado:', adId); // Debug log
            return res.status(404).json({
                success: false,
                message: 'Ad not found'
            });
        }

        console.log('Anúncio excluído com sucesso:', adId); // Debug log

        // Remover o anúncio de todas as telas que o estavam exibindo
        const screens = await Screen.find({ currentAd: adId });
        for (const screen of screens) {
            screen.currentAd = null;
            screen.content = null;
            await screen.save();
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir anúncio:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Rota para buscar um anúncio por ID
adRoutes.get('/:adId', async (req, res) => {
    try {
        const { adId } = req.params;
        const ad = await Ad.findOne({ id: adId });
        if (!ad) {
            return res.status(404).json({ success: false, message: 'Ad not found' });
        }
        res.status(200).json({ success: true, ad });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ★ NOVA: Rota para buscar anúncio pelo id
adRoutes.get('/:id', async (req, res) => {
    try {
        const adId = req.params.id;
        // Busque o anúncio pelo campo "id" ou "_id" conforme sua estrutura
        const ad = await Ad.findOne({ id: adId }) || await Ad.findById(adId);
        if (!ad) return res.status(404).json({ success: false, message: 'Anúncio não encontrado' });
        res.json({ success: true, ad });
    } catch (error) {
        console.error('Error fetching ad:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Registrar as rotas de anúncios
app.use('/api/ads', adRoutes);

// Add content validation utility
function validateContent(content) {
    if (!content) return null;
    
    // Normalize to array
    const contentArray = Array.isArray(content) ? content : [content];
    
    // Filter invalid entries
    return contentArray.filter(item => 
        item !== null && 
        item !== undefined && 
        item !== ''
    );
}



app.post('/api/schedule-ad', (req, res) => {
    try {
        const { adId, screenId, scheduleDate, scheduleTime } = req.body;

        if (!adId || !screenId || !scheduleDate || !scheduleTime) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const scheduleDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
        if (isNaN(scheduleDateTime.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid date or time' });
        }

        scheduledAds.set(`${screenId}-${adId}`, {
            adId,
            screenId,
            scheduleDateTime
        });

        res.json({ success: true, message: 'Ad scheduled successfully' });
    } catch (error) {
        console.error('Error scheduling ad:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

setInterval(async () => {
    const now = new Date();
    for (const [key, { adId, screenId, scheduleDateTime }] of scheduledAds.entries()) {
        if (now >= scheduleDateTime) {
            try {
                const screen = await Screen.findOne({ id: screenId });
                const ad = await Ad.findOne({ id: adId });

                if (screen && ad) {
                    const response = await fetch(`${screen.slaveUrl}/content`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: ad.content })
                    });

                    if (response.ok) {
                        console.log(`Ad ${adId} displayed on screen ${screenId}`);
                        scheduledAds.delete(key);
                    } else {
                        console.error(`Failed to display ad ${adId} on screen ${screenId}`);
                    }
                }
            } catch (error) {
                console.error(`Error displaying ad ${adId} on screen ${screenId}:`, error);
            }
        }
    }
}, 60000); // Verificar a cada minuto

// Update products endpoint to handle imageUrl
app.post('/api/products', async (req, res) => {
    try {
        console.log('Received product data:', req.body);
        const { name, description, price, imageUrl, category } = req.body;
        
        if (!name || !description || !price) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name, description and price are required' 
            });
        }

        let formattedPrice = price;
        if (!price.includes('R$')) {
            // Convert number to price format if needed
            formattedPrice = `R$ ${parseFloat(price).toFixed(2)}`.replace('.', ',');
        }

        const product = await Product.create({
            id: Date.now().toString(),
            name,
            description,
            price: formattedPrice,
            imageUrl: imageUrl || null,
            category: category || 'Outros' // Usa 'Outros' como fallback
        });

        console.log('Product saved:', {
            id: product.id,
            name: product.name,
            price: product.price,
            category: product.category
        });

        res.json({
            success: true,
            product: product.toObject()
        });
    } catch (error) {
        console.error('Error saving product:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Update get products endpoint
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find({});
        console.log('Found products:', products.length);
        
        const productsWithImages = products.map(product => {
            const productObj = product.toObject();
            // Use the virtual fullImageUrl or default image
            productObj.imageUrl = productObj.fullImageUrl || `${MASTER_URL}/files/default-product`;
            console.log('Processing product:', {
                id: productObj.id,
                name: productObj.name,
                imageUrl: productObj.imageUrl
            });
            return productObj;
        });

        res.json({
            success: true,
            products: productsWithImages
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/files/:fileId', async (req, res) => {
    try {
        console.log('File request:', req.params.fileId);
        let file;

        if (req.params.fileId === 'default-product') {
            console.log('Requesting default image');
            file = await fileService.getDefaultImage();
        } else {
            try {
                console.log('Requesting specific file:', req.params.fileId);
                // Convert string ID to ObjectId if needed
                const fileId = req.params.fileId;
                file = await fileService.getFile(fileId);
                console.log('File found:', !!file);
            } catch (error) {
                console.error('Error fetching file, using default:', error);
                file = await fileService.getDefaultImage();
            }
        }

        if (!file || !file.buffer) {
            console.error('No file or buffer found');
            file = await fileService.getDefaultImage();
            if (!file || !file.buffer) {
                return res.status(404).send('File not found');
            }
        }

        res.setHeader('Content-Type', file.contentType || 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.send(file.buffer);
    } catch (error) {
        console.error('Error serving file:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Novo endpoint para upload de anúncio salvo
app.post('/upload-ad', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const file = await fileService.uploadFile(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype
        );

        
        const adId = Date.now().toString();
        const ad = await Ad.create({
            id: adId,
            title: req.body.title || 'Untitled Ad',
            content: `<img src="/files/${file._id}" alt="${req.body.title || 'Untitled Ad'}">`,
            dateCreated: new Date().toISOString(),
            fileId: file._id
        });

        res.json({
            success: true,
            adId,
            fileUrl: `/files/${file._id}`,
            fullUrl: `http://localhost:${port}/files/${file._id}`
        });
    } catch (error) {
        console.error('Ad upload error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id });
        if (product) {
            res.json({ success: true, product });
        } else {
            res.status(404).json({ success: false, message: 'Produto não encontrado' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Endpoint to delete a product
app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Product.findOneAndDelete({ id });
        if (result) {
            res.json({ success: true, message: 'Produto excluído com sucesso' });
        } else {
            res.status(404).json({ success: false, message: 'Produto não encontrado' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Proxy endpoint to fetch images
app.get('/proxy', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) {
        return res.status(400).json({ success: false, message: 'URL is required' });
    }

    try {
        console.log('Fetching image through proxy:', imageUrl);
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch image');
        }

        const contentType = response.headers.get('content-type');
        const buffer = await response.buffer();

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        
        res.send(buffer);
    } catch (error) {
        console.error('Error fetching image:', error);
        res.status(500).json({ success: false, message: 'Error fetching image' });
    }
});

// Adicionar nova rota para obter conteúdo atual da tela
app.get('/api/screens/:screenId/current-content', async (req, res) => {
    try {
        const { screenId } = req.params;
        const screen = await Screen.findOne({ id: screenId });

        if (!screen) {
            return res.status(404).json({ success: false, message: 'Screen not found' });
        }

        // Retorna o conteúdo atual da tela
        res.json({
            success: true,
            content: screen.content,
            currentAd: screen.currentAd
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Adicionar nova rota para upload de URL
app.post('/api/upload-from-url', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ success: false, message: 'URL is required' });
        }

        const file = await fileService.uploadFromUrl(url);
        res.json({
            success: true,
            fileId: file._id.toString(),
            contentType: file.contentType
        });
    } catch (error) {
        console.error('Error uploading from URL:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Adicionar rota para gerar QR Code
app.get('/generate-qr', (req, res) => {
    const { screenId, pin } = req.query;
    if (!screenId || !pin) {
        return res.status(400).send('Missing screenId or pin');
    }

    const qrCodeUrl = `${MASTER_URL}/register?screenId=${screenId}&pin=${pin}`;
    // Gerar QR Code usando uma biblioteca de QR Code, por exemplo, qrcode
    qrcode.toDataURL(qrCodeUrl, (err, url) => {
        if (err) {
            console.error('Error generating QR Code:', err);
            return res.status(500).send('Error generating QR Code');
        }
        res.send(url);
    });
});

// Add screen name update endpoint
app.put('/api/screens/:screenId/name', async (req, res) => {
    try {
        const { screenId } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }

        const screen = await Screen.findOneAndUpdate(
            { id: screenId },
            { name: name },
            { new: true }
        );

        if (!screen) {
            return res.status(404).json({
                success: false,
                message: 'Screen not found'
            });
        }

        // Notify connected clients about the name update
        notifyMasterClients({
            type: 'screen_update',
            action: 'name_update',
            screenId: screenId,
            name: name
        });

        res.json({
            success: true,
            screen: screen
        });
    } catch (error) {
        console.error('Error updating screen name:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Endpoint para obter todas as categorias
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find().sort('name');
        res.json({ success: true, categories: categories.map(cat => cat.name) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Endpoint para adicionar nova categoria
app.post('/api/categories', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Nome da categoria é obrigatório' });
        }
        
        const category = await Category.create({ name });
        res.json({ success: true, category: category.name });
    } catch (error) {
        if (error.code === 11000) { // Erro de duplicidade
            res.json({ success: true, category: req.body.name }); // Retorna sucesso mesmo se já existir
        } else {
            res.status(500).json({ success: false, message: error.message });
        }
    }
});

// Mover a conexão com o MongoDB para antes de qualquer uso do fileService
async function startServer() {
    try {
        await mongoose.connect(config.mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            heartbeatFrequencyMS: 2000
        });

        console.log("Conectado ao banco de dados");

        mongoose.connection.on('connected', () => {
            console.log('Mongoose connected to DB');
        });

        mongoose.connection.on('error', (err) => {
            console.error('Mongoose connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('Mongoose disconnected');
        });

        // Create server after MongoDB connection is established
        const server = http.createServer(app);

        // Iniciar o servidor e tratar o erro de porta em uso
        server.listen(port, () => {
            console.log(`Master running on http://localhost:${port}`);
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`Port ${port} is already in use. Trying another port...`);
                server.listen(0, () => {
                    const newPort = server.address().port;
                    console.log(`Master running on http://localhost:${newPort}`);
                });
            } else {
                console.error('Server error:', err);
            }
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// Remover a conexão MongoDB anterior que estava no final do arquivo

// Remova todas as definições duplicadas dos endpoints /content e substitua pelos endpoints consolidados abaixo:

// Endpoint para atualizar o conteúdo (POST /content)
app.post('/content', async (req, res) => {
    try {
        const { content, screenId, selectedAdId } = req.body;
        if (!screenId) {
            return res.status(400).json({ success: false, message: 'screenId is required' });
        }
        const updateData = { lastUpdate: new Date() };
        if (content !== undefined) {
            updateData.content = Array.isArray(content) ? content : [content];
        }
        if (selectedAdId) {
            updateData.selectedAdId = selectedAdId;
            // Se não vier conteúdo, force a busca pelo ad no GET
            if (content === undefined) {
                updateData.content = null;
            }
        }
        // Atualize a tela – certifique-se de usar o campo correto (por exemplo, "id")
        const update = await Screen.findOneAndUpdate({ id: screenId }, { $set: updateData }, { new: true });
        if (!update) {
            return res.status(404).json({ success: false, message: 'Screen not found' });
        }
        console.log('Content updated:', { screenId, selectedAdId, contentLength: update.content ? update.content.length : 0 });
        res.json({ success: true, message: 'Content updated successfully' });
    } catch (error) {
        console.error('Content update error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Endpoint para obter o conteúdo (GET /content)
app.get('/content', async (req, res) => {
    try {
        const data = await ScreenManager.getData();
        console.log('Fetching content, current data:', data);
        if (!data) {
            return res.json({ success: true, content: ['Waiting for content...'], selectedAdId: null });
        }
        // Se houver anúncio selecionado mas nenhum conteúdo armazenado, tente buscar no master
        if (data.selectedAdId && (!data.content || data.content.length === 0)) {
            try {
                console.log('Fetching ad content from master for ad ID:', data.selectedAdId);
                const response = await fetch(`${MASTER_URL}/api/ads/${data.selectedAdId}`);
                if (response.ok) {
                    const adData = await response.json();
                    if (adData.success && adData.ad?.content) {
                        const adContent = Array.isArray(adData.ad.content) ? adData.ad.content : [adData.ad.content];
                        console.log('Ad content fetched successfully');
                        return res.json({
                            success: true,
                            content: adContent,
                            selectedAdId: data.selectedAdId
                        });
                    }
                }
                console.log('Failed to fetch ad content from master');
            } catch (error) {
                console.error('Error fetching ad:', error);
            }
        }
        // Caso contrário, retorne o conteúdo armazenado ou um fallback
        const contentToSend = (data.content && data.content.length > 0) ? data.content : ['Waiting for content...'];
        console.log('Sending content response:', { contentLength: contentToSend.length, selectedAdId: data.selectedAdId });
        res.json({
            success: true,
            content: contentToSend,
            selectedAdId: data.selectedAdId
        });
    } catch (error) {
        console.error('Error fetching content:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Corrigir endpoint de anúncios
app.post('/api/ads', async (req, res) => {
    try {
        console.log('Recebendo requisição para salvar anúncio:', req.body);
        const { title, content, imageUrl } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: 'Title and content are required'
            });
        }

        // Validar e normalizar a URL da imagem
        let normalizedImageUrl = imageUrl;
        if (imageUrl) {
            // Corrige falta de dois-pontos em caso de "https//"
            let fixedUrl = imageUrl.replace(/^https?\/\/(.*)/, 'https://$1');
            normalizedImageUrl = fixedUrl;
        }

        const adId = Date.now().toString();
        const newAd = await Ad.create({
            id: adId,
            title,
            content: Array.isArray(content) ? content : [content],
            imageUrl: normalizedImageUrl,
            dateCreated: new Date()
        });

        console.log('Anúncio salvo:', {
            id: newAd.id,
            title: newAd.title,
            imageUrl: newAd.imageUrl,
            fullImageUrl: newAd.fullImageUrl
        });

        res.json({ 
            success: true, 
            ad: newAd.toObject()
        });
    } catch (error) {
        console.error('Erro ao salvar anúncio:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

app.put('/api/screens/:screenId/ad', async (req, res) => {
    try {
        const { screenId } = req.params;
        const { adId } = req.body;

        console.log('📝 Processing ad update:', { screenId, adId });

        const screen = await Screen.findOne({ id: screenId });
        if (!screen) {
            return res.status(404).json({ success: false, message: 'Screen not found' });
        }

        const ad = await Ad.findOne({ id: adId });
        if (!ad) {
            return res.status(404).json({ success: false, message: 'Ad not found' });
        }

        // Prepare content
        const content = Array.isArray(ad.content) ? ad.content : [ad.content];
        
        // Update screen in database first
        const updatedScreen = await Screen.findOneAndUpdate(
            { id: screenId },
            { 
                selectedAdId: adId,
                content: content,
                lastUpdate: new Date()
            },
            { new: true }
        );

        // Notify slave with both content and selectedAdId
        try {
            const response = await fetch(`${screen.slaveUrl}/content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: content,
                    selectedAdId: adId,
                    screenId: screen.id
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update slave');
            }

            // Notify all connected clients via SSE
            notifyMasterClients({
                type: 'screen_update',
                screenId: screen.id,
                action: 'ad_update',
                adId: adId
            });
        } catch (error) {
            console.error('Error notifying slave:', error);
            // Continue even if slave notification fails
        }

        res.json({ 
            success: true,
            screen: updatedScreen
        });
    } catch (error) {
        console.error('Ad update error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Atualizar a rota de criação de anúncios para incluir imageUrl
app.post('/api/ads', async (req, res) => {
    try {
        console.log('Recebendo requisição para salvar anúncio:', req.body);
        const { title, content, imageUrl } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: 'Title and content are required'
            });
        }

        // Validar e normalizar a URL da imagem
        let normalizedImageUrl = imageUrl;
        if (imageUrl && !/^https?:\/\//.test(imageUrl)) {
            normalizedImageUrl = `${MASTER_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        }

        const adId = Date.now().toString();
        const newAd = await Ad.create({
            id: adId,
            title,
            content: Array.isArray(content) ? content : [content],
            imageUrl: normalizedImageUrl,
            dateCreated: new Date()
        });

        console.log('Anúncio salvo:', {
            id: newAd.id,
            title: newAd.title,
            imageUrl: newAd.imageUrl,
            fullImageUrl: newAd.fullImageUrl
        });

        res.json({ 
            success: true, 
            ad: newAd.toObject()
        });
    } catch (error) {
        console.error('Erro ao salvar anúncio:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Atualizar a rota de listagem de anúncios
app.get('/api/ads', async (req, res) => {
    try {
        const ads = await Ad.find({});
        const adsWithImages = ads.map(ad => {
            const adObj = ad.toObject();
            // Remover fallback que adiciona MASTER_URL
            adObj.imageUrl = adObj.fullImageUrl || '/files/default-ad';
            return adObj;
        });

        res.json({ 
            success: true, 
            ads: adsWithImages 
        });
    } catch (error) {
        console.error('Erro ao listar anúncios:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Atualizar rota de upload de anúncios
app.post('/upload-ad', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'No file uploaded' 
            });
        }

        const file = await fileService.uploadFile(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype
        );

        const adId = Date.now().toString();
        const imageUrl = `/files/${file._id}`;

        const ad = await Ad.create({
            id: adId,
            title: req.body.title || 'Untitled Ad',
            content: `<img src="${imageUrl}" alt="${req.body.title || 'Untitled Ad'}">`,
            imageUrl: imageUrl,
            dateCreated: new Date()
        });

        res.json({
            success: true,
            ad: ad.toObject(),
            fileUrl: imageUrl,
            fullUrl: `${MASTER_URL}${imageUrl}`
        });
    } catch (error) {
        console.error('Ad upload error:', error);
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, imageUrl } = req.body;

        console.log('Updating product:', { id, name, description, price, imageUrl });

        // Validações
        if (!name || !description || !price) {
            return res.status(400).json({
                success: false,
                message: 'Nome, descrição e preço são obrigatórios'
            });
        }

        // Formatação do preço se necessário
        let formattedPrice = price;
        if (!price.startsWith('R$')) {
            formattedPrice = `R$ ${price.replace('R$', '').trim()}`;
        }

        // Atualizar produto
        const updatedProduct = await Product.findOneAndUpdate(
            { id: id },
            {
                name,
                description,
                price: formattedPrice,
                imageUrl: imageUrl || null,
                lastUpdate: new Date()
            },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado'
            });
        }

        console.log('Product updated:', updatedProduct);

        res.json({
            success: true,
            product: updatedProduct
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao atualizar produto'
        });
    }
});
