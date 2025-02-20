// Variáveis globais
window.ads = [];
window.currentSlide = 0;
let selectedProducts = [];
let allProducts = [];
let categories = [];
const MASTER_URL = 'https://master-teal.vercel.app';

document.addEventListener("DOMContentLoaded", async () => {
    // Inicializar variáveis
    const backgroundSelect = document.getElementById("backgroundSelect");
    const addAdButton = document.getElementById("addAd");
    const saveAdButton = document.getElementById("saveAd");
    const adPreview = document.getElementById("adPreview");

    // Verificar elementos essenciais
    if (!backgroundSelect || !addAdButton || !saveAdButton || !adPreview) {
        console.error('Elementos essenciais não encontrados');
        return;
    }

    // Carregar produtos quando o modal for aberto
    const productModal = document.getElementById('productSelectionModal');
    if (productModal) {
        productModal.addEventListener('show.bs.modal', loadProductsModal);
    }

    // Event listener para o botão de adicionar anúncio
    addAdButton.addEventListener("click", async () => {
        const adType = document.querySelector('.ad-type-button.active')?.getAttribute('data-ad-type');
        if (!adType) {
            Swal.fire({
                icon: 'warning',
                title: 'Atenção',
                text: 'Selecione um tipo de anúncio'
            });
            return;
        }

        const backgroundClass = backgroundSelect.value;
        
        if ((adType === "twoProducts" && !backgroundClass.startsWith('twoProducts')) ||
            (adType === "productList" && !backgroundClass.startsWith('list'))) {
            Swal.fire({
                icon: 'warning',
                title: 'Atenção',
                text: 'Selecione um fundo apropriado para o tipo de anúncio'
            });
            return;
        }

        if (adType === "twoProducts" && selectedProducts.length !== 2) {
            Swal.fire({
                icon: 'warning',
                title: 'Atenção',
                text: 'Selecione exatamente 2 produtos'
            });
            return;
        }

        let adHTML;

        try {
            if (adType === "twoProducts") {
                adHTML = generateAdHTML(selectedProducts[0], selectedProducts[1], backgroundClass);
            } else if (adType === "productList") {
                adHTML = await generateListAdHTML(backgroundClass);
            } else if (adType === "video") {
                const videoUrl = document.getElementById("videoUrl")?.value.trim();
                if (!videoUrl) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Atenção',
                        text: 'Insira uma URL de vídeo'
                    });
                    return;
                }
                adHTML = generateVideoAdHTML(videoUrl);
            }

            if (adHTML) {
                window.ads.push(adHTML);
                window.currentSlide = window.ads.length - 1;
                updatePreview();
                
                // Limpar seleção
                selectedProducts = [];
                updateSelectedProductsPreview();
                
                Swal.fire({
                    icon: 'success',
                    title: 'Sucesso',
                    text: 'Anúncio adicionado!'
                });
            }
        } catch (error) {
            console.error('Erro ao adicionar anúncio:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Falha ao adicionar anúncio'
            });
        }
    });

    // Event listener para confirmar seleção de produtos
    document.getElementById('confirmProductSelection')?.addEventListener('click', () => {
        if (selectedProducts.length !== 2) {
            Swal.fire({
                icon: 'warning',
                title: 'Seleção incompleta',
                text: 'Por favor, selecione exatamente 2 produtos'
            });
            return;
        }

        // Fechar o modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('productSelectionModal'));
        if (modal) {
            modal.hide();
        }
    });

    // Inicializar
    toggleAdType('twoProducts');
    loadSavedAds();
});

// Função para carregar produtos no modal
async function loadProductsModal() {
    try {
        const [productsResponse, categoriesResponse] = await Promise.all([
            fetch(`${MASTER_URL}/api/products`),
            fetch(`${MASTER_URL}/api/categories`)
        ]);

        if (!productsResponse.ok || !categoriesResponse.ok) {
            throw new Error('Falha ao carregar dados');
        }

        const productsData = await productsResponse.json();
        const categoriesData = await categoriesResponse.json();

        allProducts = productsData.products;
        categories = categoriesData.categories;

        // Preencher select de categorias
        const categorySelect = document.getElementById('categoryFilterModal');
        categorySelect.innerHTML = '<option value="">Todas as categorias</option>' +
            categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

        renderProductsGrid();
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Falha ao carregar produtos'
        });
    }
}

// Função para renderizar grid de produtos
function renderProductsGrid() {
    const grid = document.getElementById('productsGridModal');
    const searchTerm = document.getElementById('productSearchModal').value.toLowerCase();
    const selectedCategory = document.getElementById('categoryFilterModal').value;

    const filteredProducts = allProducts.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                            product.description.toLowerCase().includes(searchTerm);
        const matchesCategory = !selectedCategory || product.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    grid.innerHTML = filteredProducts.map(product => `
        <div class="product-card ${selectedProducts.some(p => p.id === product.id) ? 'selected' : ''}"
             onclick="toggleProductSelection('${product.id}')">
            <img src="${product.imageUrl || '/default-product.png'}" alt="${product.name}">
            <div class="product-name">${product.name}</div>
            <div class="product-price">${product.price}</div>
        </div>
    `).join('');

    updateSelectedProductsPreview();
}

// Função para alternar seleção de produto
function toggleProductSelection(productId) {
    const index = selectedProducts.findIndex(p => p.id === productId);
    const product = allProducts.find(p => p.id === productId);

    if (index === -1 && selectedProducts.length < 2) {
        selectedProducts.push(product);
    } else if (index !== -1) {
        selectedProducts.splice(index, 1);
    } else {
        Swal.fire({
            icon: 'warning',
            title: 'Limite atingido',
            text: 'Você só pode selecionar 2 produtos'
        });
        return;
    }

    renderProductsGrid();
}

// Função para atualizar preview de produtos selecionados
function updateSelectedProductsPreview() {
    const preview = document.getElementById('selectedProductsPreview');
    preview.innerHTML = selectedProducts.map(product => `
        <div class="selected-product-preview">
            <img src="${product.imageUrl || '/default-product.png'}" alt="${product.name}">
            <span>${product.name}</span>
        </div>
    `).join('');
}

// Event listeners
document.getElementById('productSearchModal').addEventListener('input', renderProductsGrid);
document.getElementById('categoryFilterModal').addEventListener('change', renderProductsGrid);

// Função para gerar HTML de anúncio
function generateAdHTML(product1, product2, backgroundClass) {
    const backgroundImage = getBackgroundImage(backgroundClass);
    const defaultProductImage = `${MASTER_URL}/default-product.png`;
    
    return `
    <div class="ad-container" style="background-image: url('${backgroundImage}')">
        <div class="products-container">
            <div class="product">
                <img src="${product1.imageUrl || defaultProductImage}" alt="Produto 1">
                <div class="product-title">${product1.name}</div>
                <div class="product-description">${product1.description}</div>
                <div class="product-price">${product1.price}</div>
            </div>
            <div class="product">
                <img src="${product2.imageUrl || defaultProductImage}" alt="Produto 2">
                <div class="product-title">${product2.name}</div>
                <div class="product-description">${product2.description}</div>
                <div class="product-price">${product2.price}</div>
            </div>
        </div>
    </div>
    `;
}

// Função para gerar HTML de lista de anúncios
async function generateListAdHTML(backgroundClass) {
    try {
        const selectedProducts = [];
        const checkboxes = document.querySelectorAll('#productCheckboxes input:checked');
        
        for (const checkbox of checkboxes) {
            const response = await fetch(`${MASTER_URL}/api/products/${checkbox.value}`);
            const data = await response.json();
            if (data.success) {
                selectedProducts.push(data.product);
            }
        }

        if (selectedProducts.length === 0) {
            alert('Selecione pelo menos um produto para a lista');
            return null;
        }

        const backgroundImage = getBackgroundImage(backgroundClass);
        
        // Usar a URL da imagem diretamente sem concatenar com MASTER_URL
        const formatImageUrl = (url) => url || '/default-product.png';

        console.log('Generating list ad HTML with products:', selectedProducts);

        return `
        <div class="ad-container" style="background-image: url('${backgroundImage}')">
            <div class="list-layout">
                <div class="product-display">
                    <div class="featured-image-container">
                        <img class="featured-image" 
                             src="${formatImageUrl(selectedProducts[0].imageUrl)}" 
                             alt="${selectedProducts[0].name}">
                    </div>
                    <div class="featured-info">
                        <h2 class="featured-name">${selectedProducts[0].name}</h2>
                        <p class="featured-description">${selectedProducts[0].description}</p>
                        <div class="featured-price">${selectedProducts[0].price}</div>
                    </div>
                </div>
                <div class="products-list">
                    ${selectedProducts.map((product, index) => `
                        <div class="product-list-item ${index === 0 ? 'active' : ''}" 
                             data-product-id="${product.id}">
                            <div class="product-list-info">
                                <span class="product-list-name">${product.name}</span>
                                <span class="product-list-description">${product.description}</span>
                            </div>
                            <span class="product-list-price">${product.price}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>`;
    } catch (error) {
        console.error('Erro ao gerar anúncio em lista:', error);
        return null;
    }
}

// Função para gerar HTML de vídeo de anúncio
function generateVideoAdHTML(videoUrl) {
    let embedHtml;
    
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        const videoId = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
        if (!videoId) {
            throw new Error('URL do YouTube inválida');
        }
        embedHtml = `
            <iframe 
                id="youtube-player"
                src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1&controls=0" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen
                class="video-slide"
                data-video-type="youtube"
                style="width: 100%; height: 100%;">
            </iframe>
            <script>
                // YouTube Player API integration
                function onYouTubeIframeAPIReady() {
                    new YT.Player('youtube-player', {
                        events: {
                            'onStateChange': function(event) {
                                if (event.data === YT.PlayerState.ENDED) {
                                    // Avançar para o próximo slide apenas quando o vídeo terminar
                                    nextSlide();
                                }
                            }
                        }
                    });
                }

                // Load YouTube API if not already loaded
                if (!window.YT) {
                    const tag = document.createElement('script');
                    tag.src = "https://www.youtube.com/iframe_api";
                    const firstScriptTag = document.getElementsByTagName('script')[0];
                    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                }
            </script>`;
    } else if (videoUrl.includes('vimeo.com')) {
        const videoId = videoUrl.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i)?.[1];
        if (!videoId) {
            throw new Error('URL do Vimeo inválida');
        }
        embedHtml = `
            <iframe 
                id="vimeo-player"
                src="https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&api=1" 
                frameborder="0" 
                allow="autoplay; fullscreen" 
                allowfullscreen
                class="video-slide"
                data-video-type="vimeo"
                style="width: 100%; height: 100%;">
            </iframe>
            <script src="https://player.vimeo.com/api/player.js"></script>
            <script>
                const player = new Vimeo.Player('vimeo-player');
                player.on('ended', function() {
                    // Avançar para o próximo slide apenas quando o vídeo terminar
                    nextSlide();
                });
            </script>`;
    } else if (videoUrl.match(/\.(mp4|webm)$/i)) {
        embedHtml = `
            <video 
                src="${videoUrl}" 
                autoplay 
                muted 
                playsinline
                class="video-slide"
                data-video-type="direct"
                style="width: 100%; height: 100%; object-fit: contain;"
                onended="nextSlide()">
            </video>`;
    } else {
        throw new Error('URL de vídeo não suportada. Use YouTube, Vimeo ou link direto para MP4/WebM.');
    }

    return `
    <div class="video-container" style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background: #000;">
        ${embedHtml}
    </div>`;
}

// Função para obter imagem de fundo
function getBackgroundImage(backgroundClass) {
    const basePath = `${MASTER_URL}/fundos/`;
    let imagePath;
    
    switch (backgroundClass) {
        case 'twoProducts1':
            imagePath = 'duo1.jpg';
            break;
        case 'twoProducts2':
            imagePath = 'duo2.jpg';
            break;
        case 'twoProducts3':
            imagePath = 'duo3.jpg';
            break;
        case 'list1':
            imagePath = 'list1.jpg';
            break;
        case 'list2':
            imagePath = 'list2.jpg';
            break;
        case 'list3':
            imagePath = 'list3.jpg';
            break;
        default:
            return `${MASTER_URL}/uploads/default-background.jpg`;
    }

    return `${basePath}${imagePath}`;
}

// Função para atualizar preview
function updatePreview() {
    const adPreview = document.getElementById('adPreview');
    if (!adPreview) return;

    if (!window.ads || !window.ads.length) {
        adPreview.innerHTML = '<div class="empty-state">Nenhum slide adicionado</div>';
        return;
    }

    // Garantir que o currentSlide é válido
    window.currentSlide = Math.min(Math.max(0, window.currentSlide), window.ads.length - 1);

    // Atualizar o preview com fade
    adPreview.style.opacity = '0';
    setTimeout(() => {
        adPreview.innerHTML = window.ads.map((ad, index) => `
            <div class="slide" style="display: ${index === window.currentSlide ? 'flex' : 'none'}">
                ${ad}
            </div>
        `).join('');

        // Adicionar controles de navegação se houver mais de um slide
        if (window.ads.length > 1) {
            const nav = document.createElement('div');
            nav.className = 'slide-nav';
            nav.innerHTML = `
                <button onclick="prevSlide()">
                    <i class="bi bi-chevron-left"></i> Anterior
                </button>
                <button onclick="nextSlide()">
                    Próximo <i class="bi bi-chevron-right"></i>
                </button>
            `;
            adPreview.appendChild(nav);
        }

        // Fade in
        adPreview.style.opacity = '1';
        
        // Atualizar a timeline após o preview
        updateSlidesList();
    }, 300);
}

// Função para atualizar lista de slides
async function updateSlidesList() {
    const timelineContainer = document.getElementById('timelineSlides');
    if (!timelineContainer) return;

    // Limpar o container
    timelineContainer.innerHTML = '';

    // Se não houver slides, retornar
    if (!window.ads || window.ads.length === 0) return;

    // Processar cada slide
    for (let index = 0; index < window.ads.length; index++) {
        const slideDiv = document.createElement('div');
        slideDiv.className = `timeline-slide ${index === window.currentSlide ? 'active' : ''}`;
        slideDiv.onclick = () => showSlide(index);

        // Adicionar conteúdo do slide
        slideDiv.innerHTML = `
            <div class="thumbnail">
                <div class="slide-content">${window.ads[index]}</div>
            </div>
            <button class="remove-btn" onclick="event.stopPropagation(); removeSlide(${index});">
                <i class="bi bi-x"></i>
            </button>
            <div class="slide-number">Slide ${index + 1}</div>
        `;

        timelineContainer.appendChild(slideDiv);
    }
}

// Função para mostrar slide
function showSlide(index) {
    window.currentSlide = index;
    updatePreview(); // Isso também atualizará a timeline
}

// Função para remover slide
function removeSlide(index) {
    // Prevenir chamadas múltiplas
    if (!window.ads || window.isRemovingSlide) {
        return;
    }

    window.isRemovingSlide = true;

    if (confirm('Tem certeza que deseja excluir este slide?')) {
        // Remover o slide do array
        window.ads.splice(index, 1);

        // Ajustar o índice atual se necessário
        if (window.currentSlide >= window.ads.length) {
            window.currentSlide = Math.max(0, window.ads.length - 1);
        }

        // Atualizar a interface apenas uma vez
        if (window.ads.length === 0) {
            const adPreview = document.getElementById('adPreview');
            if (adPreview) {
                adPreview.innerHTML = '<div class="empty-state">Nenhum slide adicionado</div>';
            }
            const timelineContainer = document.getElementById('timelineSlides');
            if (timelineContainer) {
                timelineContainer.innerHTML = '';
            }
        } else {
            updatePreview();
        }
    }

    // Permitir nova remoção
    setTimeout(() => {
        window.isRemovingSlide = false;
    }, 100);
}

// Função para próximo slide
function nextSlide() {
    showSlide((currentSlide + 1) % window.ads.length);
}

// Função para slide anterior
function prevSlide() {
    showSlide((currentSlide - 1 + window.ads.length) % window.ads.length);
}

// Função para carregar anúncios salvos
async function loadSavedAds() {
    try {
        const response = await fetch(`${MASTER_URL}/api/ads`);
        if (!response.ok) throw new Error('Falha ao carregar anúncios');

        const data = await response.json();
        if (data.success) {
            const container = document.getElementById('savedAdsList');
            container.innerHTML = '';

            data.ads.forEach(ad => {
                const adCard = document.createElement('div');
                adCard.className = 'saved-ad-card';
                
                // Usar a URL da imagem diretamente se existir
                const imageUrl = ad.imageUrl || '/files/default-ad';
                
                adCard.innerHTML = `
                    <div class="saved-ad-thumbnail" style="background-image: url('${imageUrl}')"></div>
                    <h5 class="saved-ad-title">${ad.title}</h5>
                    <div class="saved-ad-buttons">
                        <button class="btn btn-sm btn-primary" onclick="previewAd('${ad.id}')">
                            <i class="bi bi-eye"></i> Visualizar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteAd('${ad.id}')">
                            <i class="bi bi-trash"></i> Excluir
                        </button>
                    </div>
                `;
                
                container.appendChild(adCard);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar anúncios:', error);
    }
}

// Função para pré-visualizar anúncio
async function previewAd(adId) {
    try {
        const response = await fetch(`${MASTER_URL}/api/ads/${adId}`);
        if (!response.ok) throw new Error('Falha ao carregar anúncio');

        const data = await response.json();
        if (data.success) {
            const modal = new bootstrap.Modal(document.getElementById('previewAdModal'));
            const previewContent = document.getElementById('previewAdContent');
            previewContent.innerHTML = '';

            const contents = Array.isArray(data.ad.content) ? data.ad.content : [data.ad.content];

            contents.forEach((content, index) => {
                const slideDiv = document.createElement('div');
                slideDiv.className = `slide ${index === 0 ? 'active' : ''}`;
                slideDiv.style.display = index === 0 ? 'block' : 'none';
                slideDiv.innerHTML = content;
                previewContent.appendChild(slideDiv);
            });

            modal.show();
        }
    } catch (error) {
        console.error('Erro ao pré-visualizar anúncio:', error);
        alert('Erro ao pré-visualizar anúncio: ' + error.message);
    }
}

// Função para excluir anúncio
async function deleteAd(adId) {
    if (!confirm('Tem certeza que deseja excluir este anúncio?')) return;

    try {
        const response = await fetch(`${MASTER_URL}/api/ads/${adId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (data.success) {
            alert('Anúncio excluído com sucesso!');
            loadSavedAds(); // Recarregar a lista
        } else {
            throw new Error(data.message || 'Erro ao excluir anúncio');
        }
    } catch (error) {
        console.error('Erro ao excluir anúncio:', error);
        alert('Erro ao excluir anúncio: ' + error.message);
    }
}
