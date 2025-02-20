const MASTER_URL = 'https://master-teste.vercel.app';

// Função para salvar um produto no Local Storage
document.getElementById('product-form')?.addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent default form submission

    const formData = new FormData();
    formData.append('name', document.getElementById('product-name').value);
    formData.append('description', document.getElementById('product-description').value);
    formData.append('price', document.getElementById('product-price').value);

    const imageInput = document.getElementById('product-image');
    if (imageInput?.files && imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    try {
        const response = await fetch(`${MASTER_URL}/api/products`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            alert('Produto salvo com sucesso!');
            window.location.href = 'product-list.html';
        } else {
            throw new Error(data.message || 'Erro ao salvar produto');
        }
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        alert('Erro ao salvar produto: ' + error.message);
    }
    event.target.reset();
});

// Função para salvar o produto no Local Storage
function saveProduct(product, redirect = true) {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    products.push(product);
    localStorage.setItem('products', JSON.stringify(products));
    alert('Produto adicionado com sucesso!');

    if (redirect) {
        // Redirecionar para a lista de produtos
        window.location.href = 'product-list.html';
    }
}

// Remove all references to localStorage and update functions to use the API

// Function to load products from the API
async function loadProducts() {
    try {
        const response = await fetch(`${MASTER_URL}/api/products`);
        if (!response.ok) {
            throw new Error('Failed to load products');
        }

        const data = await response.json();
        const container = document.getElementById('product-container');
        
        if (!container) {
            console.error('Container not found');
            return;
        }

        container.innerHTML = '';

        if (!data.success || !data.products || data.products.length === 0) {
            container.innerHTML = '<div class="text-center">Nenhum produto encontrado</div>';
            return;
        }

        data.products.forEach(product => {
            const imageUrl = product.imageUrl ? 
                `${MASTER_URL}${product.imageUrl}` : 
                `${MASTER_URL}/default-product.png`;

            const productElement = document.createElement('div');
            productElement.className = 'product-item';
            productElement.innerHTML = `
                <img src="${imageUrl}" 
                     alt="${product.name}" 
                     onerror="this.src='${MASTER_URL}/default-product.png'">
                <h3>${product.name}</h3>
                <p>${product.description}</p>
                <p class="fw-bold">R$ ${product.price}</p>
                <div class="btn-group">
                    <button class="btn btn-primary" onclick="editProduct('${product.id}')">
                        <i class="bi bi-pencil"></i> Editar
                    </button>
                    <button class="btn btn-danger" onclick="deleteProduct('${product.id}')">
                        <i class="bi bi-trash"></i> Excluir
                    </button>
                </div>
            `;

            container.appendChild(productElement);
        });
    } catch (error) {
        console.error('Error loading products:', error);
        const container = document.getElementById('product-container');
        if (container) {
            container.innerHTML = '<div class="text-center text-danger">Erro ao carregar produtos</div>';
        }
    }
}

// Function to delete a product using the API
async function deleteProduct(productId) {
    try {
        const response = await fetch(`${MASTER_URL}/api/products/${productId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete product');
        }

        loadProducts(); // Reload products after deletion
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Erro ao excluir produto: ' + error.message);
    }
}

// Function to open the edit modal with product data
async function openEditModal(productId) {
    try {
        const response = await fetch(`${MASTER_URL}/api/products/${productId}`);
        if (!response.ok) {
            throw new Error('Failed to load product');
        }

        const data = await response.json();
        if (data.success) {
            const product = data.product;

            // Fill the modal with product data
            document.getElementById('edit-product-name').value = product.name;
            document.getElementById('edit-product-description').value = product.description;
            document.getElementById('edit-product-price').value = product.price;
            document.getElementById('edit-product-index').value = productId;

            // Show the modal
            const editModal = new bootstrap.Modal(document.getElementById('editProductModal'));
            editModal.show();
        }
    } catch (error) {
        console.error('Error loading product:', error);
        alert('Erro ao carregar produto: ' + error.message);
    }
}

// Function to save product changes using the API
async function saveProductChanges() {
    const productId = document.getElementById('edit-product-index').value;
    const name = document.getElementById('edit-product-name').value;
    const description = document.getElementById('edit-product-description').value.substring(0, 180); // Limit description length
    const price = document.getElementById('edit-product-price').value;
    const imageFile = document.getElementById('edit-product-image').files[0];

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('price', price);

    if (imageFile) {
        formData.append('image', imageFile);
    }

    try {
        const response = await fetch(`${MASTER_URL}/api/products/${productId}`, {
            method: 'PUT',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to save product changes');
        }

        loadProducts(); // Reload products after saving changes
        const editModal = bootstrap.Modal.getInstance(document.getElementById('editProductModal'));
        editModal.hide();
    } catch (error) {
        console.error('Error saving product changes:', error);
        alert('Erro ao salvar alterações do produto: ' + error.message);
    }
}

// Load products when the page is loaded
document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('product-container')) {
        loadProducts();
    }
});

// Função para importar produtos de um arquivo TXT
document.getElementById('import-form')?.addEventListener('submit', async function(event) {
    event.preventDefault();
    console.log('Import form submitted');

    const fileInput = document.getElementById('import-file');
    if (!fileInput.files || !fileInput.files[0]) {
        alert('Por favor, selecione um arquivo.');
        return;
    }

    // Mostrar indicador de carregamento
    document.getElementById('loading').style.display = 'block';

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const content = e.target.result;
            const products = JSON.parse(content);

            if (!Array.isArray(products)) {
                throw new Error('O arquivo deve conter um array de produtos');
            }

            for (const item of products) {
                if (!item.produto) {
                    console.error('Produto inválido:', item);
                    continue;
                }

                const product = {
                    name: item.produto.nome,
                    description: item.produto.descricao.substring(0, 180),
                    price: typeof item.produto.preco === 'number' ? 
                           `R$ ${item.produto.preco.toFixed(2)}` : 
                           `R$ ${item.produto.preco}`,
                    image: item.produto.foto
                };

                try {
                    await saveToAPI(product);
                    console.log('Produto salvo:', product.name);
                } catch (error) {
                    console.error('Erro ao salvar produto:', error);
                }
            }

            alert('Produtos importados com sucesso!');
            window.location.href = 'product-list.html';
        } catch (error) {
            console.error('Erro ao processar arquivo:', error);
            alert('Erro ao processar arquivo: ' + error.message);
        } finally {
            // Esconder indicador de carregamento
            document.getElementById('loading').style.display = 'none';
        }
    };

    reader.readAsText(fileInput.files[0]);
});

// Função para importar produtos
function importProducts() {
    const fileInput = document.getElementById('import-file');
    console.log('Iniciando importação...');

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                const fileContent = e.target.result;
                console.log('Conteúdo do arquivo:', fileContent);

                const productData = JSON.parse(fileContent);
                console.log('Dados parseados:', productData);

                // Mostrar indicador de carregamento
                document.getElementById('loading').style.display = 'block';
                
                for (const item of productData) {
                    if (!item.produto) continue;
                    
                    const product = {
                        name: item.produto.nome,
                        description: item.produto.descricao,
                        price: typeof item.produto.preco === 'number' ? 
                               item.produto.preco.toFixed(2) : 
                               item.produto.preco.toString(),
                        image: item.produto.foto
                    };
                    
                    console.log('Produto formatado:', product);

                    try {
                        await saveToAPI(product);
                        console.log('Produto salvo:', product.name);
                    } catch (error) {
                        console.error('Erro ao salvar produto:', error);
                    }
                }

                // Esconder indicador de carregamento
                document.getElementById('loading').style.display = 'none';
                alert('Produtos importados com sucesso!');
                window.location.href = 'product-list.html';
            } catch (error) {
                document.getElementById('loading').style.display = 'none';
                console.error('Erro ao processar arquivo:', error);
                alert('Erro ao processar arquivo: ' + error.message);
            }
        };

        reader.readAsText(fileInput.files[0]);
    } else {
        alert('Por favor, selecione um arquivo');
    }
}

// Função para salvar produto na API
async function saveToAPI(product) {
    try {
        console.log('Iniciando salvamento do produto:', product);
        const formData = new FormData();
        
        formData.append('name', product.name);
        formData.append('description', product.description);
        formData.append('price', product.price);

        // Alterado: envia imagem via campo "image", não "imageUrl"
        if (product.image) {
            formData.append('image', product.image);
        }
        
        const response = await fetch(`${MASTER_URL}/api/products`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to save product');
        }

        return await response.json();
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        throw error;
    }
}
