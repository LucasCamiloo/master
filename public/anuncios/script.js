const MASTER_URL = 'https://master-teste.vercel.app';

function getElement(id) {
    return document.getElementById(id);
}

// Global variables
window.selectedProducts = [];
window.ads = [];
window.currentSlide = 0;

// Update selected products count
function updateSelectedCount() {
    const countElement = document.getElementById('selectedCount');
    if (countElement) {
        countElement.textContent = window.selectedProducts.length;
    }
}

// Toggle product selection once
window.toggleProductSelection = function(product) {
    if (!window.selectedProducts) {
        window.selectedProducts = [];
    }

    const index = window.selectedProducts.findIndex(p => p.id === product.id);
    const checkbox = document.querySelector(`input[type="checkbox"][value="${product.id}"]`);
    const card = checkbox?.closest('.card');
    
    if (index > -1) {
        window.selectedProducts.splice(index, 1);
        if (checkbox) checkbox.checked = false;
        if (card) card.classList.remove('selected');
    } else if (window.selectedProducts.length < 2) {
        window.selectedProducts.push(product);
        if (checkbox) checkbox.checked = true;
        if (card) card.classList.add('selected');
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Limite atingido',
            text: 'Você só pode selecionar até 2 produtos'
        });
        return;
    }

    updateSelectedCount();
    updateSelectedProductsPreview();
};

// Update selected products preview
function updateSelectedProductsPreview() {
    const container = document.getElementById('selectedProducts');
    if (!container) return;

    container.innerHTML = window.selectedProducts.map(product => `
        <div class="col-6">
            <div class="card mb-3">
                <img src="${product.imageUrl || `${MASTER_URL}/default-product.png`}" 
                     class="card-img-top p-2" alt="${product.name}">
                <div class="card-body">
                    <h6>${product.name}</h6>
                    <p>${product.price}</p>
                </div>
            </div>
        </div>
    `).join('');
}

// Confirm product selection for exactly two products
window.confirmProductSelection = function() {
    if (window.selectedProducts.length !== 2) {
        Swal.fire({
            icon: 'error',
            title: 'Seleção incompleta',
            text: 'Por favor selecione exatamente 2 produtos'
        });
        return;
    }

    const [product1, product2] = window.selectedProducts;
    
    // Update form fields
    const fields = {
        'product1Title': product1.name,
        'product1Description': product1.description,
        'product1Price': product1.price,
        'product2Title': product2.name,
        'product2Description': product2.description,
        'product2Price': product2.price
    };

    Object.entries(fields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.value = value || '';
    });

    ['product1Image', 'product2Image'].forEach((id, index) => {
        const element = document.getElementById(id);
        if (element) {
            element.dataset.imageUrl = window.selectedProducts[index].imageUrl || '';
        }
    });

    const modal = bootstrap.Modal.getInstance(document.getElementById('productSelectionModal'));
    if (modal) modal.hide();
};

// Open product selection modal
window.openProductSelectionModal = async function() {
    const modalElement = getElement('productSelectionModal');
    if (!modalElement) return;
    window.selectedProducts = [];
    const modal = new bootstrap.Modal(modalElement);
    await loadModalProducts(); 
    updateSelectedCount();
    modal.show();
};

// Load products for the main UI
async function loadExistingProducts() {
    try {
        const response = await fetch(`${MASTER_URL}/api/products`);
        const data = await response.json();
        
        if (data.success && data.products) {
            const allProducts = data.products;
            
            // Update product selects if they exist
            const product1Select = getElement('product1Select');
            const product2Select = getElement('product2Select');
            
            const options = allProducts.map(product => 
                `<option value="${product.id}">${product.name}</option>`
            ).join('');
            
            const defaultOption = '<option value="">Selecione um produto</option>';
            
            if (product1Select) {
                product1Select.innerHTML = defaultOption + options;
            }
            if (product2Select) {
                product2Select.innerHTML = defaultOption + options;
            }
            
            return allProducts;
        }
        return [];
    } catch (error) {
        console.error('Error loading products:', error);
        return [];
    }
}

// Load saved ads
async function loadSavedAds() {
    try {
        const response = await fetch(`${MASTER_URL}/api/ads`);
        if (!response.ok) throw new Error('Falha ao carregar anúncios');
    
        const data = await response.json();
        if (data.success) {
            const container = document.getElementById('savedAdsList');
            container.className = 'saved-ads-gallery';
            container.innerHTML = '';
    
            for (const ad of data.ads) {
                const adCard = document.createElement('div');
                adCard.className = 'slide-card';
    
                // Criar preview usando html2canvas
                const previewContainer = document.createElement('div');
                previewContainer.style.position = 'absolute';
                previewContainer.style.left = '-9999px';
                previewContainer.style.width = '1920px';
                previewContainer.style.height = '1080px';
                
                // Se o anúncio tem múltiplos slides, usar o primeiro
                const firstSlide = Array.isArray(ad.content) ? ad.content[0] : ad.content;
                previewContainer.innerHTML = firstSlide;
                document.body.appendChild(previewContainer);
    
                try {
                    const canvas = await html2canvas(previewContainer);
                    adCard.innerHTML = `
                        <img src="${canvas.toDataURL()}" alt="${ad.title}" class="slide-preview-img">
                        <div class="slide-info">
                            <div class="slide-title">${ad.title}</div>
                        </div>
                        <div class="slide-actions">
                            <button class="btn btn-sm btn-primary" onclick="previewAd('${ad.id}')">
                                <i class="bi bi-eye"></i> Visualizar
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteAd('${ad.id}')">
                                <i class="bi bi-trash"></i> Excluir
                            </button>
                        </div>
                    `;
                } catch (error) {
                    console.error('Erro ao gerar preview:', error);
                    // Fallback para quando não for possível gerar o preview
                    adCard.innerHTML = `
                        <div class="slide-preview-img" style="background: #2a2a2a;"></div>
                        <div class="slide-info">
                            <div class="slide-title">${ad.title}</div>
                        </div>
                        <div class="slide-actions">
                            <button class="btn btn-sm btn-primary" onclick="previewAd('${ad.id}')">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteAd('${ad.id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    `;
                }
    
                document.body.removeChild(previewContainer);
                container.appendChild(adCard);
            }
        }
    } catch (error) {
        console.error('Erro ao carregar anúncios:', error);
        const container = document.getElementById('savedAdsList');
        container.innerHTML = '<p>Erro ao carregar anúncios.</p>';
    }
}

// Toggle product section
function toggleProduct(number) {
    const content = document.getElementById(`product-content-${number}`);
    const icon = document.getElementById(`toggle-icon-${number}`);
    const allContents = document.querySelectorAll('.product-content');
    const allIcons = document.querySelectorAll('.toggle-icon');
    
    // Primeiro, fecha todos os produtos
    allContents.forEach(el => el.style.display = 'none');
    allIcons.forEach(el => el.classList.remove('expanded'));
    
    // Depois, abre apenas o produto clicado
    content.style.display = 'block';
    icon.classList.add('expanded');
}

// Toggle ad type
window.toggleAdType = function(adType) {
    console.log('Toggling ad type:', adType);
    
    const twoProductsSection = document.getElementById("twoProductsSection");
    const productListSection = document.getElementById("productListSection");
    const videoSection = document.getElementById("videoSection");
    const backgroundSelect = document.getElementById("backgroundSelect");
    
    if (!twoProductsSection || !productListSection || !videoSection || !backgroundSelect) {
        console.error('Required sections not found');
        return;
    }

    // Update button states
    document.querySelectorAll('.ad-type-button').forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-ad-type') === adType) {
            button.classList.add('active');
        }
    });

    // Hide all sections first
    twoProductsSection.style.display = "none";
    productListSection.style.display = "none";
    videoSection.style.display = "none";

    // Show appropriate section
    switch (adType) {
        case "twoProducts":
            twoProductsSection.style.display = "block";
            backgroundSelect.closest('.form-section').style.display = "block";
            window.updateBackgroundOptions("twoProducts");
            break;
        case "productList":
            productListSection.style.display = "block";
            backgroundSelect.closest('.form-section').style.display = "block";
            window.updateBackgroundOptions("productList");
            window.loadProductsForSelection(); // Use window.loadProductsForSelection
            break;
        case "video":
            videoSection.style.display = "block";
            backgroundSelect.closest('.form-section').style.display = "none";
            break;
    }
};

// Update preview
window.updatePreview = function() {
    const adPreview = document.getElementById('adPreview');
    if (!adPreview) return;

    if (!window.ads || !window.ads.length) {
        adPreview.innerHTML = '<div class="empty-state">Nenhum slide adicionado</div>';
        return;
    }

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

    updateSlidesList(); // Chamar apenas aqui
};

// Update slides list for timeline
window.updateSlidesList = async function() {
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
};

// Remove a single slide
window.removeSlide = function(index) {
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
};

// Clear all slides
window.clearAllSlides = function() {
    if (window.ads.length === 0) {
        alert('Não há slides para excluir.');
        return;
    }
    
    if (confirm('Tem certeza que deseja excluir todos os slides?')) {
        window.ads = [];
        window.currentSlide = 0;
        updatePreview();
        updateSlidesList();
    }
};

// Show a specific slide
window.showSlide = function(index) {
    window.currentSlide = index;
    updatePreview(); // Isso também atualizará a timeline
};

// Listen for DOMContentLoaded once
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Basic setup
        const addAdButton = getElement('addAd');
        const saveAdButton = getElement('saveAd');
        const backgroundSelect = getElement('backgroundSelect');
        const searchByCategory = getElement('searchByCategory');
        const confirmSelectionBtn = getElement('confirmSelection');

        if (addAdButton) {
            addAdButton.addEventListener('click', handleAddAd);
        }

        if (saveAdButton) {
            saveAdButton.addEventListener('click', handleSaveAd);
        }

        if (searchByCategory) {
            searchByCategory.addEventListener('input', handleCategorySearch);
        }

        if (confirmSelectionBtn) {
            confirmSelectionBtn.addEventListener('click', confirmProductSelection);
        }

        // Load initial data
        await Promise.all([
            loadExistingProducts(),
            loadSavedAds()
        ]);

        // Initialize product sections if they exist
        const productSections = document.querySelectorAll('.product-section');
        if (productSections.length > 0) {
            toggleProduct(1);
        }

        // Initialize ad type
        toggleAdType('twoProducts');

    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

// ...existing code for generating ads, uploads, slideshows, etc.

