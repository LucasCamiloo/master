// Define MASTER_URL at the very top before any other code
const MASTER_URL = 'https://master-teste.vercel.app';

// Initialize empty arrays and variables
window.ads = [];
window.currentSlide = 0;
window.selectedProducts = [];

// Add safe DOM manipulation helper
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id "${id}" not found`);
    }
    return element;
}

// Update toggleProduct function with null checks
function toggleProduct(number) {
    const content = getElement(`product-content-${number}`);
    const icon = getElement(`toggle-icon-${number}`);
    
    if (!content || !icon) {
        console.warn('Required elements for toggleProduct not found');
        return;
    }
    
    content.style.display = content.style.display === 'block' ? 'none' : 'block';
    icon.classList.toggle('expanded');
}

// Update event listener initialization
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Initialize product selection elements
        const addAdButton = getElement('addAd');
        const saveAdButton = getElement('saveAd');
        const backgroundSelect = getElement('backgroundSelect');
        const searchByCategory = getElement('searchByCategory');

        if (addAdButton) {
            addAdButton.addEventListener('click', handleAddAd);
        }

        if (saveAdButton) {
            saveAdButton.addEventListener('click', handleSaveAd);
        }

        if (searchByCategory) {
            searchByCategory.addEventListener('input', handleCategorySearch);
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

// ...existing code...

// Update loadExistingProducts function with better error handling
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

// ...existing code...

// Update modal initialization
window.openProductSelectionModal = async function() {
    const modalElement = getElement('productSelectionModal');
    if (!modalElement) {
        console.error('Product selection modal not found');
        return;
    }

    window.selectedProducts = []; // Reset selection
    const modal = new bootstrap.Modal(modalElement);
    await loadModalProducts();
    updateSelectedCount();
    modal.show();
};

// Initialize window.ads and global variables at the top
window.ads = [];
window.currentSlide = 0;

document.addEventListener("DOMContentLoaded", async () => {
    // Check if slideIntervalInput exists before using it
    const slideIntervalInput = document.getElementById("slideInterval") || { value: "5" };

    // Move these variables to the top so they're accessible throughout the file
    const backgroundSelect = document.getElementById("backgroundSelect");
    const addAdButton = document.getElementById("addAd");
    const saveAdButton = document.getElementById("saveAd");
    const adPreview = document.getElementById("adPreview");
    const startSlideshowButton = document.getElementById("startSlideshow");
    const slidesList = document.getElementById("slidesList");
    const videoInput = document.getElementById("videoInput");

    // Check if elements exist before adding event listeners
    if (!addAdButton || !saveAdButton || !backgroundSelect) {
        console.error('Required elements not found');
        return;
    }

    // Initialize updatePreview function in global scope
    window.updatePreview = function() {
        const adPreview = document.getElementById('adPreview');
        if (!adPreview || !window.ads || !window.ads.length) {
            console.log('Preview não pode ser atualizado:', {
                adPreview: !!adPreview,
                hasAds: !!(window.ads && window.ads.length)
            });
            return;
        }
        
        adPreview.innerHTML = window.ads.map((ad, index) => `
            <div class="slide" style="display: ${index === window.currentSlide ? 'flex' : 'none'}">
                ${ad}
            </div>
        `).join('');

        console.log('Preview atualizado com', window.ads.length, 'slides');

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
        updateSlidesList(); // Call updateSlidesList after updating preview
    };

    // Initialize updateSlidesList function in global scope
    window.updateSlidesList = async function() {
        const timelineContainer = document.getElementById('timelineSlides');
        if (!timelineContainer) return;
    
        // Limpar o container
        timelineContainer.innerHTML = '';
    
        // Processar cada slide
        await Promise.all(window.ads.map(async (adHTML, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = `timeline-slide ${index === window.currentSlide ? 'active' : ''}`;
            slideDiv.onclick = () => showSlide(index);
    
            // Criar um container temporário para renderizar o conteúdo
            const previewContainer = document.createElement('div');
            previewContainer.style.position = 'absolute';
            previewContainer.style.left = '-9999px';
            previewContainer.style.width = '1920px';
            previewContainer.style.height = '1080px';
            previewContainer.innerHTML = adHTML;
            document.body.appendChild(previewContainer);
    
            try {
                // Gerar thumbnail usando html2canvas
                const canvas = await html2canvas(previewContainer);
                slideDiv.innerHTML = `
                    <div class="thumbnail" style="background-image: url('${canvas.toDataURL()}')"></div>
                    <button class="remove-btn" onclick="removeSlide(${index}); event.stopPropagation();">
                        <i class="bi bi-x"></i>
                    </button>
                    <div class="slide-number">Slide ${index + 1}</div>
                `;
            } catch (error) {
                console.error('Erro ao gerar thumbnail:', error);
                // Fallback para quando não conseguir gerar o thumbnail
                slideDiv.innerHTML = `
                    <div class="thumbnail" style="background: #2a2a2a;"></div>
                    <button class="remove-btn" onclick="removeSlide(${index}); event.stopPropagation();">
                        <i class="bi bi-x"></i>
                    </button>
                    <div class="slide-number">Slide ${index + 1}</div>
                `;
            }
    
            document.body.removeChild(previewContainer);
            timelineContainer.appendChild(slideDiv);
        }));
    };

    // Função para remover um slide específico
    window.removeSlide = function(index) {
        if (!window.ads || window.isRemovingSlide) return;
        window.isRemovingSlide = true;
    
        if (confirm('Tem certeza que deseja excluir este slide?')) {
            // Remover o slide
            window.ads.splice(index, 1);
    
            // Ajustar o índice atual
            if (window.currentSlide >= window.ads.length) {
                window.currentSlide = Math.max(0, window.ads.length - 1);
            }
    
            // Atualizar preview
            if (!window.ads.length) {
                const adPreview = document.getElementById('adPreview');
                if (adPreview) {
                    adPreview.innerHTML = '<div class="empty-state">Nenhum slide adicionado</div>';
                }
                const timelineContainer = document.getElementById('timelineSlides');
                if (timelineContainer) {
                    timelineContainer.innerHTML = '';
                }
            } else {
                updatePreview(); // updateSlidesList já é chamado internamente
            }
        }
    
        // Garantir que a flag seja resetada
        setTimeout(() => {
            window.isRemovingSlide = false;
        }, 100);
    };
    
    // Função para limpar todos os slides
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
    
    // Add this function to show specific slide when clicked
    window.showSlide = function(index) {
        window.currentSlide = index;
        updatePreview();
        // Update active state in timeline
        document.querySelectorAll('.timeline-slide').forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });
    };

    // Update getBackgroundImage to handle missing files
    window.getBackgroundImage = function(backgroundClass) {
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
    };

    // Remover qualquer event listener existente antes de adicionar o novo
    if (addAdButton) {
        const newAddAdButton = addAdButton.cloneNode(true);
        addAdButton.parentNode.replaceChild(newAddAdButton, addAdButton);
        
        newAddAdButton.addEventListener("click", async () => {
            const adType = document.querySelector('.ad-type-button.active').getAttribute('data-ad-type');
            const backgroundClass = backgroundSelect.value;
            
            // Validate background selection
            if ((adType === "twoProducts" && !backgroundClass.startsWith('twoProducts')) ||
                (adType === "productList" && !backgroundClass.startsWith('list'))) {
                alert("Por favor, selecione um fundo apropriado para o tipo de anúncio.");
                return;
            }

            let adHTML = null;

            try {
                if (adType === "twoProducts") {
                    // Get values directly from the select elements
                    const product1Id = document.getElementById("product1Select").value;
                    const product2Id = document.getElementById("product2Select").value;

                    if (!product1Id || !product2Id) {
                        alert("Por favor, selecione ambos os produtos.");
                        return;
                    }

                    try {
                        const [product1Data, product2Data] = await Promise.all([
                            fetch(`${MASTER_URL}/api/products/${product1Id}`).then(res => res.json()),
                            fetch(`${MASTER_URL}/api/products/${product2Id}`).then(res => res.json())
                        ]);

                        if (!product1Data.success || !product2Data.success) {
                            throw new Error('Falha ao carregar produtos');
                        }

                        const product1 = {
                            title: product1Data.product.name,
                            description: product1Data.product.description,
                            price: product1Data.product.price,
                            imageUrl: product1Data.product.imageUrl
                        };

                        const product2 = {
                            title: product2Data.product.name,
                            description: product2Data.product.description,
                            price: product2Data.product.price,
                            imageUrl: product2Data.product.imageUrl
                        };

                        adHTML = generateAdHTML(product1, product2, product1.imageUrl, product2.imageUrl, backgroundClass);
                    } catch (error) {
                        console.error('Erro ao carregar produtos:', error);
                        alert('Erro ao carregar produtos. Por favor, tente novamente.');
                        return;
                    }
                } else if (adType === "productList") {
                    adHTML = await generateListAdHTML(backgroundClass);
                } else if (adType === "video") {
                    const videoUrl = document.getElementById("videoUrl").value.trim();
                    if (!videoUrl) {
                        alert("Por favor, insira a URL do vídeo.");
                        return;
                    }
                
                    try {
                        adHTML = generateVideoAdHTML(videoUrl);
                        // Clear the video URL input after successful addition
                        document.getElementById("videoUrl").value = '';
                    } catch (error) {
                        alert(error.message);
                        return;
                    }
                }

                if (adHTML) {
                    window.ads.push(adHTML);
                    window.currentSlide = window.ads.length - 1;
                    updatePreview();
                    Swal.fire({
                        icon: 'success',
                        title: 'Sucesso!',
                        text: 'Anúncio adicionado!'
                    });

                    // Clear form inputs
                    document.getElementById("product1Select").value = "";
                    document.getElementById("product2Select").value = "";
                    document.getElementById("product1Title").value = "";
                    document.getElementById("product1Description").value = "";
                    document.getElementById("product1Price").value = "";
                    document.getElementById("product1Image").value = "";
                    document.getElementById("product2Title").value = "";
                    document.getElementById("product2Description").value = "";
                    document.getElementById("product2Price").value = "";
                    document.getElementById("product2Image").value = "";
                    document.getElementById("videoInput").value = "";
                    document.querySelectorAll('#productCheckboxes input:checked').forEach(checkbox => checkbox.checked = false);
                }
            } catch (error) {
                if (error) { // Verifica se o objeto 'error' tem algo
                 
                }
            }
        });
    }

    saveAdButton.addEventListener('click', () => {
        // The modal will open automatically through data-bs-toggle
        // No need for additional logic here
    });

    window.handleSaveAndClose = async function() {
        const title = document.getElementById('adTitleModal').value;
        if (!title) {
            alert('Por favor, digite um título para o anúncio');
            return;
        }

        if (window.ads.length === 0) {
            alert('Adicione pelo menos um slide antes de salvar');
            return;
        }

        try {
            const response = await fetch(`${MASTER_URL}/api/ads`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: title,
                    content: window.ads
                })
            });

            if (!response.ok) throw new Error('Falha ao salvar anúncio');

            const data = await response.json();
            if (data.success) {
                alert('Anúncio salvo com sucesso!');
                loadSavedAds();
                closeAndClearModal();
                clearForm(); // Clear the form after successful save
            }
        } catch (error) {
            console.error('Erro ao salvar anúncio:', error);
            alert('Erro ao salvar anúncio: ' + error.message);
        }
    };

    function clearForm() {
        // Clear inputs
        document.getElementById('product1Title').value = '';
        document.getElementById('product1Description').value = '';
        document.getElementById('product1Price').value = '';
        document.getElementById('product2Title').value = '';
        document.getElementById('product2Description').value = '';
        document.getElementById('product2Price').value = '';
        
        // Clear preview
        adPreview.innerHTML = '';
        
        // Clear ads array
        window.ads = [];
    }

    window.closeAndClearModal = function() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('saveAdModal'));
        if (modal) {
            modal.hide();
            setTimeout(() => {
                document.getElementById('adTitleModal').value = '';
                document.body.classList.remove('modal-open');
                document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }, 200);
        }
    };

   

    const getImageURL = (input) => {
        return input.files.length > 0 ? URL.createObjectURL(input.files[0]) : null;
    };

    window.generateAdHTML = function(product1, product2, image1, image2, backgroundClass) {
        const backgroundImage = window.getBackgroundImage(backgroundClass);
        const defaultProductImage = `${MASTER_URL}/default-product.png`;
        
        return `
        <div class="ad-container" style="background-image: url('${backgroundImage}')">
            <div class="products-container">
                <div class="product">
                    <img src="${image1 || defaultProductImage}" alt="Produto 1">
                    <div class="product-title">${product1.title}</div>
                    <div class="product-description">${product1.description}</div>
                    <div class="product-price">${product1.price}</div>
                </div>
                <div class="product">
                    <img src="${image2 || defaultProductImage}" alt="Produto 2">
                    <div class="product-title">${product2.title}</div>
                    <div class="product-description">${product2.description}</div>
                    <div class="product-price">${product2.price}</div>
                </div>
            </div>
        </div>
        `;
    };

    const generateVideoAdHTML = (videoUrl) => {
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
    };

    async function uploadVideo(file) {
        if (!file) return null;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await fetch(`${MASTER_URL}/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                return data.fileUrl; // This will be appended to the base URL in generateVideoAdHTML
            }
            console.error('Upload failed:', data);
            return null;
        } catch (error) {
            console.error('Error uploading video:', error);
            return null;
        }
    }

    startSlideshowButton.addEventListener("click", () => {
        if (window.ads.length === 0) {
            alert("Adicione pelo menos um anúncio!");
            return;
        }

        const slideInterval = parseInt(slideIntervalInput.value, 10) * 1000;
        const slideshowWindow = window.open("", "_blank", "width=1920,height=1080");

        const backgroundClass = backgroundSelect.value;
        const backgroundImage = getBackgroundImage(backgroundClass);

        slideshowWindow.document.write(`
        <html>
            <head>
                <title>Apresentação</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background-color: #000;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        overflow: hidden;
                    }
                    #slideContainer {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        opacity: 0;
                        transition: opacity 1s ease-in-out;
                    }
                    .ad-container {
                        width: 1920px;
                        height: 1080px;
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: linear-gradient(to bottom, #ffffff, #e7f0fa);
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        background-image: url('${backgroundImage}');
                        background-size: 1920px 1080px;
                        background-repeat: no-repeat;
                        background-position: center;
                    }
                    .ad-header {
                        height: 120px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 0 60px;
                    }
                    .ad-header img {
                        height: 80px;
                        width: auto;
                    }
                    .products-container {
                        flex: 1;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        gap: 200px;  /* Increased gap between products */
                        padding: 20px;
                    }
                    .product {
                        width: 400px;  /* Reduced from 600px */
                        height: 600px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        padding: 40px;
                        background-color: transparent; /* Changed from rgba(255, 255, 255, 0.9) */
                        border-radius: 15px;
                        box-shadow: none; /* Removed box shadow */
                    }
                    .product img {
                        width: 300px;  /* Reduced from 400px */
                        height: 250px;  /* Reduced from 300px */
                        object-fit: contain;
                        border-radius: 0; /* Removed border radius */
                        margin-bottom: 30px;
                        background: transparent; /* Added transparent background */
                        mix-blend-mode: normal; /* Added to ensure proper blending */
                    }
                    .product-title {
                        font-size: 32px;
                        font-weight: bold;
                        margin: 20px 0;
                        color: #333;
                    }
                    .product-description {
                        font-size: 24px;
                        margin: 15px 0;
                        color: #666;
                        line-height: 1.4;
                    }
                    .product-price {
                        font-size: 48px;
                        color: #d9534f;
                        font-weight: bold;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div id="slideContainer">
                    <div id="slideContent"></div>
                </div>
                <script>
                    const ads = ${JSON.stringify(window.ads)};
                    let currentIndex = 0;

                    function showSlide() {
                        const container = document.getElementById('slideContainer');
                        const content = document.getElementById('slideContent');
                        
                        // Fade out
                        container.style.opacity = 0;
                        
                        setTimeout(() => {
                            // Update content
                            content.innerHTML = ads[currentIndex];
                            
                            // Fade in
                            container.style.opacity = 1;
                            
                            // Update index
                            currentIndex = (currentIndex + 1) % ads.length;
                        }, 1000);
                    }

                    // Show first slide immediately
                    document.getElementById('slideContent').innerHTML = ads[0];
                    document.getElementById('slideContainer').style.opacity = 1;
                    currentIndex = 1;

                    // Start slideshow
                    setInterval(showSlide, ${slideInterval});
                </script>
            </body>
        </html>
        `);
        slideshowWindow.document.close();
    });

    async function uploadImage(file) {
        if (!file) return null;
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetch(`${MASTER_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            return data.imageUrl; // Retornar a URL relativa da imagem
        }
        return null;
    }

    // Adicionar ao escopo global para que possa ser acessada pelo onclick
    window.deleteAd = async function(adId) {
        if (!confirm('Tem certeza que deseja excluir este anúncio?')) {
            return;
        }
    
        try {
            const response = await fetch(`${MASTER_URL}/api/ads/${adId}`, {
                method: 'DELETE'
            });
    
            if (!response.ok) {
                throw new Error('Falha ao excluir anúncio');
            }
    
            const data = await response.json();
            if (data.success) {
                alert('Anúncio excluído com sucesso!');
                loadSavedAds(); // Reload the ads list
            }
        } catch (error) {
            console.error('Erro ao excluir anúncio:', error);
            alert('Erro ao excluir anúncio: ' + error.message);
        }
    };

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
    // Função para excluir um anúncio salvo
    async function deleteAd(adId) {
        try {
            const response = await fetch(`${MASTER_URL}/api/ads/${adId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Falha ao excluir anúncio');
            }

            const data = await response.json();
            if (data.success) {
                alert('Anúncio excluído com sucesso!');
                loadSavedAds();
            } else {
                throw new Error(data.message || 'Erro ao excluir anúncio');
            }
        } catch (error) {
            console.error('Erro ao excluir anúncio:', error);
            alert('Erro ao excluir anúncio: ' + error.message);
        }
    }

    // Mover a função useAd para o escopo global para que possa ser acessada pelo onclick
    window.useAd = async function(adId) {
        try {
            const response = await fetch(`${MASTER_URL}/api/ads/${adId}`);
            if (!response.ok) {
                throw new Error('Falha ao carregar anúncio');
            }
    
            const data = await response.json();
            if (data.success && data.ad) {
                window.ads = Array.isArray(data.ad.content) ? data.ad.content : [data.ad.content];
                document.getElementById('adTitle').value = data.ad.title;
                updatePreview();
                updateSlidesList();
            }
        } catch (error) {
            console.error('Erro ao carregar anúncio:', error);
            alert('Erro ao carregar anúncio: ' + error.message);
        }
    };

    // Função para pré-visualizar um anúncio salvo
    window.previewAd = async function(adId) {
        try {
            const response = await fetch(`${MASTER_URL}/api/ads/${adId}`);
            if (!response.ok) throw new Error('Falha ao carregar anúncio');

            const data = await response.json();
            if (data.success) {
                const modal = new bootstrap.Modal(document.getElementById('previewAdModal'));
                const previewContent = document.getElementById('previewAdContent');
                previewContent.innerHTML = '';

                // Garantir que o conteúdo seja um array
                const contents = Array.isArray(data.ad.content) ? data.ad.content : [data.ad.content];

                contents.forEach((slide, index) => {
                    const slideDiv = document.createElement('div');
                    slideDiv.className = `slide ${index === 0 ? 'active' : ''}`;
                    slideDiv.innerHTML = slide;
                    previewContent.appendChild(slideDiv);
                });

                if (contents.length > 1) {
                    const nav = document.createElement('div');
                    nav.className = 'slide-nav';
                    nav.innerHTML = `
                        <button onclick="prevModalSlide()">
                            <i class="bi bi-chevron-left"></i> Anterior
                        </button>
                        <button onclick="nextModalSlide()">
                            Próximo <i class="bi bi-chevron-right"></i>
                        </button>
                    `;
                    previewContent.appendChild(nav);
                }

                modal.show();
                currentModalSlide = 0;

                // Ajustar tamanho após modal estar visível
                setTimeout(() => {
                    const modalSlides = previewContent.querySelectorAll('.slide');
                    modalSlides.forEach(slide => {
                        const container = slide.querySelector('.ad-container');
                        if (container) {
                            container.style.transform = 'scale(0.9)';
                            container.style.transformOrigin = 'center center';
                        }
                    });
                }, 300);
            }
        } catch (error) {
            console.error('Erro ao pré-visualizar anúncio:', error);
            alert('Erro ao pré-visualizar anúncio: ' + error.message);
        }
    };

    // Add navigation functions for preview
    let currentPreviewSlide = 0;
    window.nextSlide = function() {
        const slides = document.querySelectorAll('#previewAdContent .slide');
        slides[currentPreviewSlide].style.display = 'none';
        currentPreviewSlide = (currentPreviewSlide + 1) % slides.length;
        slides[currentPreviewSlide].style.display = 'block';
    };

    window.prevSlide = function() {
        const slides = document.querySelectorAll('#previewAdContent .slide');
        slides[currentPreviewSlide].style.display = 'none';
        currentPreviewSlide = (currentPreviewSlide - 1 + slides.length) % slides.length;
        slides[currentPreviewSlide].style.display = 'block';
    };

    // Fechar o modal de pré-visualização
    document.getElementById('closePreviewModal').addEventListener('click', () => {
        document.getElementById('previewModal').style.display = 'none';
    });

    // Carregar anúncios salvos quando a página carregar
  

    // Função para carregar produtos existentes
    async function loadExistingProducts() {
        try {
            // Remove localStorage and only use API
            const response = await fetch(`${MASTER_URL}/api/products`);
            const apiData = await response.json();
    
            if (apiData.success && apiData.products) {
                const allProducts = apiData.products;
                console.log('Total de produtos:', allProducts.length);
    
                // Atualizar os selects
                const product1Select = document.getElementById('product1Select');
                const product2Select = document.getElementById('product2Select');
    
                if (product1Select && product2Select) {
                    const options = allProducts.map(product => 
                        `<option value="${product.id}">${product.name}</option>`
                    ).join('');
    
                    const defaultOption = '<option value="">Selecione um produto</option>';
                    product1Select.innerHTML = defaultOption + options;
                    product2Select.innerHTML = defaultOption + options;
                }
    
                return allProducts;
            }
            return [];
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            return [];
        }
    }
    
    // Update loadProduct function to use API instead of localStorage
    async function loadProduct(productId, productNumber) {
        try {
            console.log(`Loading product ${productId} for position ${productNumber}`);
            const response = await fetch(`${MASTER_URL}/api/products/${productId}`);
            const data = await response.json();
    
            if (data.success && data.product) {
                const product = data.product;
                document.getElementById(`product${productNumber}Title`).value = product.name;
                document.getElementById(`product${productNumber}Description`).value = product.description;
                document.getElementById(`product${productNumber}Price`).value = product.price;
    
                if (product.imageUrl) {
                    document.getElementById(`product${productNumber}Image`).dataset.imageUrl = product.imageUrl;
    
                    const container = document.getElementById(`product${productNumber}Image`).parentElement;
                    let preview = container.querySelector('img');
                    if (!preview) {
                        preview = document.createElement('img');
                        preview.className = 'img-preview mt-2';
                        preview.style.maxWidth = '200px';
                        container.appendChild(preview);
                    }
                    preview.src = product.imageUrl;
                }
            } else {
                console.log('Product not found');
            }
        } catch (error) {
            console.error('Error loading product:', error);
        }
    }
    
    // Remove filterProducts function that used localStorage
    window.filterProducts = function(productNumber) {
        const searchInput = document.getElementById(`product${productNumber}Search`).value.toLowerCase();
        const selectElement = document.getElementById(`product${productNumber}Select`);
        
        // Hide options that don't match search
        Array.from(selectElement.options).forEach(option => {
            const text = option.text.toLowerCase();
            option.style.display = text.includes(searchInput) ? '' : 'none';
        });
    };

    // Inicializar produtos
    await loadExistingProducts();

    // Função para carregar um produto específico
    async function loadProduct(productId, productNumber) {
        try {
            console.log(`Loading product ${productId} for position ${productNumber}`);
            const products = JSON.parse(localStorage.getItem('products')) || [];
            const product = products[productId];

            if (product) {
                console.log('Found product:', product);
                document.getElementById(`product${productNumber}Title`).value = product.name || product.nome;
                document.getElementById(`product${productNumber}Description`).value = product.description || product.descricao;
                document.getElementById(`product${productNumber}Price`).value = product.price || `R$ ${product.preco}`;

                if (product.image || product.foto) {
                    const imageUrl = product.image || product.foto;
                    document.getElementById(`product${productNumber}Image`).dataset.imageUrl = imageUrl;

                    const container = document.getElementById(`product${productNumber}Image`).parentElement;
                    let preview = container.querySelector('img');
                    if (!preview) {
                        preview = document.createElement('img');
                        preview.className = 'img-preview mt-2';
                        preview.style.maxWidth = '200px';
                        container.appendChild(preview);
                    }
                    preview.src = imageUrl;
                }
            } else {
                console.log('Product not found');
            }
        } catch (error) {
            console.error('Error loading product:', error);
        }
    }

    // Expor função globalmente
    window.loadProduct = loadProduct;

    // Mover funções para o escopo global
    window.selectExistingProduct = function(index, productNumber) {
        loadProduct(index, productNumber);
    };

    window.filterProducts = function(productNumber) {
        // ... existing filterProducts code ...
    };

    // Add new function to generate list-style ad HTML
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
            const defaultProductImage = `${MASTER_URL}/default-product.png`;
            
            const formatImageUrl = (url) => {
                if (!url) return defaultProductImage;
                return url.startsWith('http') ? url : `${MASTER_URL}${url}`;
            };

            const formatPrice = (price) => {
                if (!price) return 'Preço indisponível';
                // Remove currency symbol and spaces
                price = price.toString().replace('R$', '').trim();
                // Replace comma with dot for decimal places
                price = price.replace(',', '.');
                const parsedPrice = parseFloat(price);
                return isNaN(parsedPrice) ? 'Preço indisponível' : `R$ ${parsedPrice.toFixed(2)}`;
            };

            console.log('Generating list ad HTML with selected products:', selectedProducts);

            return `
            <div class="ad-container" style="background-image: url('${backgroundImage}')">
                <div class="list-layout">
                    <div class="product-display">
                        <div class="featured-image-container">
                            <img class="featured-image" 
                                 src="${formatImageUrl(selectedProducts[0].imageUrl)}" 
                                 alt="${selectedProducts[0].name}"
                                 onerror="this.src='${MASTER_URL}/default-product.png'">
                            
                        </div>
                        <div class="featured-info">
                            <h2 class="featured-name">${selectedProducts[0].name}</h2>
                            <div class="featured-price">${formatPrice(selectedProducts[0].price)}</div>
                        </div>
                    </div>
                    <div class="products-list">
                        ${selectedProducts.map((product, index) => {
                            const price = formatPrice(product.price);
                            return `
                                <div class="product-list-item ${index === 0 ? 'active' : ''}" 
                                     data-image-url="${formatImageUrl(product.imageUrl)}"
                                     data-name="${product.name}"
                                     data-price="${price.replace('R$', '').trim()}">
                                    <span class="product-list-name">${product.name}</span>
                                    <span class="product-list-price">${price}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>`;
        } catch (error) {
            console.error('Erro ao gerar anúncio em lista:', error);
            return null;
        }
    }

    function toggleAdType() {
        const adType = document.querySelector('.ad-type-button.active').getAttribute('data-ad-type');
        const twoProductsSection = document.getElementById("twoProductsSection");
        const productListSection = document.getElementById("productListSection");
        const videoSection = document.getElementById("videoSection");
        const backgroundSelect = document.getElementById("backgroundSelect");
        
        try {
            // Update sections visibility
            if (adType === "twoProducts") {
                twoProductsSection.classList.remove("hidden");
                productListSection.style.display = "none";
                videoSection.style.display = "none";
                backgroundSelect.closest('.form-section').style.display = "block";
                
                // Show only two products backgrounds
                Array.from(backgroundSelect.options).forEach(option => {
                    option.style.display = option.value.startsWith('twoProducts') ? '' : 'none';
                });
                
                if (backgroundSelect.value.startsWith('list')) {
                    backgroundSelect.value = 'twoProducts1';
                }
            } else if (adType === "productList") {
                twoProductsSection.classList.add("hidden");
                productListSection.style.display = "block";
                videoSection.style.display = "none";
                backgroundSelect.closest('.form-section').style.display = "block";
                loadProductsForSelection(); // Load products for list view
                
                // Show only list backgrounds
                Array.from(backgroundSelect.options).forEach(option => {
                    option.style.display = option.value.startsWith('list') ? '' : 'none';
                });
                
                if (backgroundSelect.value.startsWith('twoProducts')) {
                    backgroundSelect.value = 'list1';
                }
            } else if (adType === "video") {
                twoProductsSection.classList.add("hidden");
                productListSection.style.display = "none";
                videoSection.style.display = "block";
                backgroundSelect.closest('.form-section').style.display = "none";
            }
            
            // Trigger content reload to ensure correct display
            updatePreview();
        } catch (error) {
            console.error('Error in toggleAdType:', error);
            alert('Erro ao alternar tipo de anúncio');
        }
    }

    // Função para carregar produtos para seleção
    async function loadProductsForSelection() {
        try {
            const response = await fetch(`${MASTER_URL}/api/products`);
            const data = await response.json();
            
            if (data.success && data.products) {
                const productCheckboxes = document.getElementById('productCheckboxes');
                if (!productCheckboxes) {
                    console.error('Element productCheckboxes not found');
                    return;
                }
                
                // Limpar conteúdo existente
                productCheckboxes.innerHTML = '';
                
                // Adicionar os produtos como checkboxes com imagens e informações
                data.products.forEach(product => {
                    const productDiv = document.createElement('div');
                    productDiv.className = 'product-item';
                    
                    const imageUrl = product.imageUrl ? 
                        `${MASTER_URL}${product.imageUrl}` : 
                        `${MASTER_URL}/default-product.png`;
                    
                    productDiv.innerHTML = `
                        <div class="form-check d-flex align-items-center w-100">
                            <input class="form-check-input me-3" type="checkbox" 
                                   value="${product.id}" id="product${product.id}">
                            <img src="${imageUrl}" alt="${product.name}" 
                                 onerror="this.src='${MASTER_URL}/default-product.png'">
                            <div class="product-item-info">
                                <div class="product-item-name">${product.name}</div>
                                <div class="product-item-price">${product.price}</div>
                            </div>
                        </div>
                    `;
                    
                    // Adicionar evento de clique no item inteiro
                    productDiv.addEventListener('click', (e) => {
                        if (e.target.type !== 'checkbox') {
                            const checkbox = productDiv.querySelector('input[type="checkbox"]');
                            checkbox.checked = !checkbox.checked;
                        }
                    });
                    
                    productCheckboxes.appendChild(productDiv);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            const productCheckboxes = document.getElementById('productCheckboxes');
            if (productCheckboxes) {
                productCheckboxes.innerHTML = '<div class="alert alert-danger">Erro ao carregar produtos</div>';
            }
        }
    }

    // Atualizar a função de filtro
    window.filterProducts = function(productNumber) {
        const searchInput = document.getElementById(`product${productNumber}Search`).value.toLowerCase();
        const selectElement = document.getElementById(`product${productNumber}Select`);
        
        // Hide options that don't match search
        Array.from(selectElement.options).forEach(option => {
            const text = option.text.toLowerCase();
            option.style.display = text.includes(searchInput) ? '' : 'none';
        });
    };

    // Adicione esta chamada à função toggleAdType
    function toggleAdType(adType) {
        // ...existing code...
        
        if (adType === "productList") {
            twoProductsSection.classList.add("hidden");
            productListSection.style.display = "block";
            videoSection.style.display = "none";
            backgroundSelect.closest('.form-section').style.display = "block";
            loadProductsForSelection(); // Adicione esta chamada aqui
            // ...rest of the existing code...
        }
        // ...existing code...
    }

    // Atualizar a função toggleAdType
    function toggleAdType(adType) {
        console.log('Toggling ad type to:', adType); // Debug log
        
        const twoProductsSection = document.getElementById("twoProductsSection");
        const productListSection = document.getElementById("productListSection");
        const videoSection = document.getElementById("videoSection");
        const backgroundSelect = document.getElementById("backgroundSelect");
        
        // Remover classe active de todos os botões
        document.querySelectorAll('.ad-type-button').forEach(button => {
            button.classList.remove('active');
        });
        
        // Adicionar classe active ao botão selecionado
        const selectedButton = document.querySelector(`.ad-type-button[data-ad-type="${adType}"]`);
        if (selectedButton) {
            selectedButton.classList.add('active');
        }

        // Esconder todas as seções primeiro
        twoProductsSection.style.display = "none";
        productListSection.style.display = "none";
        videoSection.style.display = "none";

        // Mostrar a seção apropriada
        switch (adType) {
            case "twoProducts":
                twoProductsSection.style.display = "block";
                backgroundSelect.closest('.form-section').style.display = "block";
                updateBackgroundOptions("twoProducts");
                break;
            case "productList":
                productListSection.style.display = "block";
                backgroundSelect.closest('.form-section').style.display = "block";
                updateBackgroundOptions("productList");
                loadProductsForSelection();
                break;
            case "video":
                videoSection.style.display = "block";
                backgroundSelect.closest('.form-section').style.display = "none";
                break;
        }
    }

    // Função para inicializar o estado do produto
    function initializeProductState() {
        document.querySelectorAll('.product-content').forEach(content => {
            content.style.display = 'none';
        });
    }

    // Atualizar a função toggleProduct
    function toggleProduct(number) {
        const content = document.getElementById(`product-content-${number}`);
        const icon = document.getElementById(`toggle-icon-${number}`);
        const isExpanded = content.style.display === 'block';
        
        // Fechar todos os produtos primeiro
        document.querySelectorAll('.product-content').forEach(el => {
            el.style.display = 'none';
        });
        document.querySelectorAll('.toggle-icon').forEach(el => {
            el.classList.remove('expanded');
        });
        
        // Abrir o produto clicado se ele não estava expandido
        if (!isExpanded) {
            content.style.display = 'block';
            icon.classList.add('expanded');
        }
    }

    // Inicializar estado dos produtos
    initializeProductState();
    
    // Adicionar event listeners para os botões de tipo de anúncio
    document.querySelectorAll('.ad-type-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const adType = e.target.closest('.ad-type-button').getAttribute('data-ad-type');
            toggleAdType(adType);
        });
    });
    
    // Inicializar event listeners
    initializeEventListeners();
    
    // Configurar estado inicial
    toggleAdType('twoProducts');
    toggleProduct(1);
});

// Atualizar a função toggleProduct
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

// Atualizar a função toggleAdType
window.toggleAdType = function(adType) {
    console.log('Toggling ad type:', adType);
    
    const twoProductsSection = document.getElementById("twoProductsSection");
    const productListSection = document.getElementById("productListSection");
    const videoSection = document.getElementById("videoSection");
    const backgroundSelect = document.getElementById("backgroundSelect");
    
    // Atualizar botões
    document.querySelectorAll('.ad-type-button').forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-ad-type') === adType) {
            button.classList.add('active');
        }
    });

    // Esconder todas as seções primeiro
    twoProductsSection.style.display = "none";
    productListSection.style.display = "none";
    videoSection.style.display = "none";

    // Mostrar apenas a seção apropriada
    switch (adType) {
        case "twoProducts":
            twoProductsSection.style.display = "block";
            backgroundSelect.closest('.form-section').style.display = "block";
            updateBackgroundOptions("twoProducts");
            break;
        case "productList":
            productListSection.style.display = "block";
            backgroundSelect.closest('.form-section').style.display = "block";
            updateBackgroundOptions("productList");
            loadProductsForSelection(); // Carregar produtos quando alternar para esta view
            break;
        case "video":
            videoSection.style.display = "block";
            backgroundSelect.closest('.form-section').style.display = "none";
            break;
    }
};

// Adicionar função para inicialização dos event listeners
function initializeEventListeners() {
    // Event listeners para os botões de tipo de anúncio
    document.querySelectorAll('.ad-type-button').forEach(button => {
        button.addEventListener('click', function() {
            const adType = this.getAttribute('data-ad-type');
            toggleAdType(adType);
        });
    });

    // Event listeners para os headers de produto
    document.querySelectorAll('.product-header').forEach(header => {
        header.addEventListener('click', function() {
            const productNumber = this.closest('.product-section').getAttribute('data-product-number');
            toggleProduct(productNumber);
        });
    });
}

// Atualizar o event listener DOMContentLoaded
document.addEventListener("DOMContentLoaded", async () => {
    // ...existing code...
    
    // Inicializar event listeners
    initializeEventListeners();
    
    // Configurar estado inicial
    toggleAdType('twoProducts');
    toggleProduct(1);
    loadExistingProducts();
    loadSavedAds();
    
    // ...existing code...
});

// Adicionar a função updateBackgroundOptions no escopo global
window.updateBackgroundOptions = function(type) {
    const backgroundSelect = document.getElementById("backgroundSelect");
    if (!backgroundSelect) return;

    const options = backgroundSelect.options;
    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        if (type === "twoProducts") {
            option.style.display = option.value.startsWith('twoProducts') ? '' : 'none';
            if (option.value === 'twoProducts1' && !backgroundSelect.value.startsWith('twoProducts')) {
                backgroundSelect.value = 'twoProducts1';
            }
        } else if (type === "productList") {
            option.style.display = option.value.startsWith('list') ? '' : 'none';
            if (option.value === 'list1' && !backgroundSelect.value.startsWith('list')) {
                backgroundSelect.value = 'list1';
            }
        }
    }
};

// Atualizar a função loadProductsForSelection
window.loadProductsForSelection = async function() {
    const productCheckboxes = document.getElementById('productCheckboxes');
    if (!productCheckboxes) return;
    
    try {
        productCheckboxes.innerHTML = '<div class="alert alert-info">Carregando produtos...</div>';
        
        const response = await fetch(`${MASTER_URL}/api/products`);
        const data = await response.json();
        
        if (data.success && data.products) {
            productCheckboxes.innerHTML = '';
            
            data.products.forEach(product => {
                const productDiv = document.createElement('div');
                productDiv.className = 'product-item mb-2';
                
                const imageUrl = product.imageUrl ? 
                    `${MASTER_URL}${product.imageUrl}` : 
                    `${MASTER_URL}/default-product.png`;
                
                productDiv.innerHTML = `
                    <div class="form-check d-flex align-items-center w-100">
                        <input class="form-check-input me-3" type="checkbox" 
                               value="${product.id}" id="product${product.id}">
                        <div class="d-flex align-items-center flex-grow-1">
                            <img src="${imageUrl}" alt="${product.name}" 
                                 style="width: 50px; height: 50px; object-fit: contain; margin-right: 15px;"
                                 onerror="this.src='${MASTER_URL}/default-product.png'">
                            <div>
                                <div class="product-item-name">${product.name}</div>
                                <div class="product-item-price text-primary">${product.price}</div>
                            </div>
                        </div>
                    </div>
                `;
                
                productDiv.addEventListener('click', (e) => {
                    if (e.target.type !== 'checkbox') {
                        const checkbox = productDiv.querySelector('input[type="checkbox"]');
                        checkbox.checked = !checkbox.checked;
                    }
                });
                
                productCheckboxes.appendChild(productDiv);
            });

            // Adicionar listener para a pesquisa
            const searchInput = document.getElementById('productSearchInput');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    document.querySelectorAll('.product-item').forEach(item => {
                        const name = item.querySelector('.product-item-name').textContent.toLowerCase();
                        const price = item.querySelector('.product-item-price').textContent.toLowerCase();
                        const shouldShow = name.includes(searchTerm) || price.includes(searchTerm);
                        item.style.display = shouldShow ? '' : 'none';
                    });
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        productCheckboxes.innerHTML = '<div class="alert alert-danger">Erro ao carregar produtos</div>';
    }
}

// Atualizar a função toggleAdType
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

// Função para minimizar a timeline
window.toggleTimeline = function() {
    const timelineContainer = document.querySelector('.timeline-container');
    timelineContainer.classList.toggle('collapsed');
};

// Atualizar função de geração de lista de anúncios
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

// Atualizar função de carregamento de anúncios salvos
window.loadSavedAds = async function() {
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
};

// Atualizar função de prévisualização
window.previewAd = async function(adId) {
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
};

// Atualizar função de exclusão
window.deleteAd = async function(adId) {
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
};

// Inicializar variáveis globais
window.ads = window.ads || [];
window.currentSlide = 0;

// Atualizar a função de preview
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

// Adicionar função separada para a timeline
function updateTimeline() {
    const timelineContainer = document.getElementById('timelineSlides');
    if (!timelineContainer) return;

    timelineContainer.innerHTML = window.ads.map((adHTML, index) => {
        const thumbnailDiv = document.createElement('div');
        thumbnailDiv.className = `timeline-slide ${index === window.currentSlide ? 'active' : ''}`;
        thumbnailDiv.onclick = () => showSlide(index);

        const temp = document.createElement('div');
        temp.innerHTML = adHTML;
        
        // Extrair imagem de fundo do container de anúncio
        const adContainer = temp.querySelector('.ad-container');
        const bgImage = adContainer ? adContainer.style.backgroundImage : '';

        thumbnailDiv.innerHTML = `
            <div class="thumbnail" style="background: ${bgImage || '#f0f0f0'}; background-size: cover;">
                <div class="slide-content">${adHTML}</div>
            </div>
            <button class="remove-btn" onclick="removeSlide(${index}); event.stopPropagation();">
                <i class="bi bi-x"></i>
            </button>
            <div class="slide-number">Slide ${index + 1}</div>
        `;

        return thumbnailDiv;
    }).map(div => div.outerHTML).join('');
}

// Atualizar a função de adicionar anúncio
document.getElementById('addAd')?.addEventListener('click', async function() {
    const adType = document.querySelector('.ad-type-button.active').getAttribute('data-ad-type');
    const backgroundClass = document.getElementById("backgroundSelect").value;
    
    // Validar seleção de fundo
    if ((adType === "twoProducts" && !backgroundClass.startsWith('twoProducts')) ||
        (adType === "productList" && !backgroundClass.startsWith('list'))) {
        alert("Por favor, selecione um fundo apropriado para o tipo de anúncio.");
        return;
    }

    let adHTML;

    if (adType === "twoProducts") {
        const product1 = {
            title: document.getElementById("product1Title").value,
            description: document.getElementById("product1Description").value,
            price: document.getElementById("product1Price").value,
            imageUrl: document.getElementById("product1Image").dataset.imageUrl
        };
        const product2 = {
            title: document.getElementById("product2Title").value,
            description: document.getElementById("product2Description").value,
            price: document.getElementById("product2Price").value,
            imageUrl: document.getElementById("product2Image").dataset.imageUrl
        };

        adHTML = generateAdHTML(product1, product2, product1.imageUrl, product2.imageUrl, backgroundClass);
    } else if (adType === "productList") {
        const selectedProducts = document.querySelectorAll('#productCheckboxes input:checked');
        if (selectedProducts.length > 10) {
            alert("Você só pode adicionar até 10 itens em uma lista.");
            return;
        }
        adHTML = await generateListAdHTML(backgroundClass);
    } else if (adType === "video") {
        const videoUrl = document.getElementById("videoUrl").value.trim();
        if (!videoUrl) {
            alert("Por favor, insira a URL do vídeo.");
            return;
        }

        try {
            adHTML = generateVideoAdHTML(videoUrl);
            // Clear the video URL input after successful addition
            document.getElementById("videoUrl").value = '';
        } catch (error) {
            alert(error.message);
            return;
        }
    }

    if (adHTML) {
        window.ads.push(adHTML);
        window.currentSlide = window.ads.length - 1;
        updatePreview(); // Isso também chamará updateTimeline()
        Swal.fire({
            icon: 'success',
            title: 'Sucesso!',
            text: 'Anúncio adicionado!'
        });
    }
});

// Atualizar função de remoção de slide
window.removeSlide = function(index) {
    // Prevenir processamento se já estiver removendo
    if (window.isRemovingSlide) return;
    
    window.isRemovingSlide = true;

    try {
        // Confirmar exclusão
        if (!confirm('Tem certeza que deseja excluir este slide?')) {
            return;
        }

        // Remover o slide
        window.ads.splice(index, 1);

        // Ajustar o índice atual se necessário
        if (window.currentSlide >= window.ads.length) {
            window.currentSlide = Math.max(0, window.ads.length - 1);
        }

        // Atualizar interface
        const adPreview = document.getElementById('adPreview');
        const timelineContainer = document.getElementById('timelineSlides');

        if (window.ads.length === 0) {
            // Caso não haja mais slides
            if (adPreview) {
                adPreview.innerHTML = '<div class="empty-state">Nenhum slide adicionado</div>';
            }
            if (timelineContainer) {
                timelineContainer.innerHTML = '';
            }
        } else {
            // Atualizar preview uma única vez
            updatePreview();
        }
    } finally {
        // Garantir que a flag seja resetada
        setTimeout(() => {
            window.isRemovingSlide = false;
        }, 100);
    }
};

// Atualizar função de mostrar slide
window.showSlide = function(index) {
    window.currentSlide = index;
    updatePreview(); // Isso também atualizará a timeline
};

// Adicionar navegação de slides
window.nextSlide = function() {
    showSlide((currentSlide + 1) % window.ads.length);
};

window.prevSlide = function() {
    showSlide((currentSlide - 1 + window.ads.length) % window.ads.length);
};

// Atualizar a função removeSlide
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

// Atualizar a função updatePreview
window.updatePreview = function() {
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
};

// Atualizar a função updateSlidesList
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

// Inicializar eventos e carregar dados ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    loadExistingProducts();
    toggleProduct(1);
    toggleAdType('twoProducts');
    loadSavedAds();
});

// Adicionar função para abrir modal de seleção
window.openProductSelectionModal = function() {
  const modal = new bootstrap.Modal(document.getElementById('productSelectionModal'));
  loadAllProducts();
  modal.show();
};

// Carregar todos os produtos e permitir seleção de múltiplos
async function loadAllProducts() {
    try {
        const response = await fetch(`${MASTER_URL}/api/products`);
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('productsListContainer');
            if (!container) {
                console.error('productsListContainer element not found');
                return;
            }

            container.innerHTML = data.products.map(p => `
                <div class="col-3 mb-3">
                    <div class="card h-100">
                        <img src="${p.imageUrl}" class="card-img-top" alt="${p.name}">
                        <div class="card-body">
                            <h5 class="card-title">${p.name}</h5>
                            <p class="card-text">${p.description}</p>
                            <span class="badge bg-primary">${p.price}</span>
                        </div>
                        <div class="card-footer">
                            <input type="checkbox" class="product-checkbox" value="${p._id}"
                                data-name="${p.name}" data-description="${p.description}"
                                data-price="${p.price}" data-image="${p.imageUrl}">
                            Selecionar
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            console.error('Failed to load products:', data.message);
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Confirmar seleção de até dois produtos
document.getElementById('confirmSelection').addEventListener('click', () => {
  const checkboxes = document.querySelectorAll('.product-checkbox:checked');
  if (checkboxes.length !== 2) {
    alert('Selecione exatamente 2 produtos antes de confirmar.');
    return;
  }
  // Preencher campos de produto 1 e 2
  const [first, second] = checkboxes;
  document.getElementById('product1Title').value = first.dataset.name;
  document.getElementById('product1Description').value = first.dataset.description;
  document.getElementById('product1Price').value = first.dataset.price;
  document.getElementById('product1Image').dataset.imageUrl = first.dataset.image;

  document.getElementById('product2Title').value = second.dataset.name;
  document.getElementById('product2Description').value = second.dataset.description;
  document.getElementById('product2Price').value = second.dataset.price;
  document.getElementById('product2Image').dataset.imageUrl = second.dataset.image;

  // Fechar modal
  const modalEl = document.getElementById('productSelectionModal');
  if (modalEl) bootstrap.Modal.getInstance(modalEl).hide();
});

// Fechar modal ao confirmar (poderia fechar automaticamente ao clicar no produto, se preferir)
document.getElementById('confirmSelection').addEventListener('click', () => {
  const modalEl = document.getElementById('productSelectionModal');
  if (modalEl) bootstrap.Modal.getInstance(modalEl).hide();
});

// Atualizar campo de busca de categorias em tempo real
document.getElementById('searchByCategory').addEventListener('input', loadModalProducts);

// ...existing code...

let selectedProducts = [];

window.openProductSelectionModal = async function() {
    selectedProducts = []; // Reset seleção
    const modal = new bootstrap.Modal(document.getElementById('productSelectionModal'));
    await loadProductsGrid();
    updateSelectedCount();
    modal.show();
};

async function loadProductsGrid() {
    try {
        const response = await fetch(`${MASTER_URL}/api/products`);
        const data = await response.json();
        
        if (data.success) {
            const grid = document.getElementById('productsGrid');
            grid.innerHTML = data.products.map(product => `
                <div class="col-md-3 mb-3">
                    <div class="card h-100 product-card ${selectedProducts.find(p => p.id === product.id) ? 'selected' : ''}" 
                         onclick="toggleProductSelection(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                        <img src="${product.imageUrl || `${MASTER_URL}/default-product.png`}" 
                             class="card-img-top p-2" alt="${product.name}">
                        <div class="card-body">
                            <h6 class="card-title">${product.name}</h6>
                            <p class="card-text text-primary">${product.price}</p>
                        </div>
                        <div class="selected-overlay">
                            <i class="bi bi-check-circle"></i>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

window.toggleProductSelection = function(product) {
    const index = selectedProducts.findIndex(p => p.id === product.id);
    
    if (index > -1) {
        selectedProducts.splice(index, 1);
    } else if (selectedProducts.length < 2) {
        selectedProducts.push(product);
    } else {
        alert('Você só pode selecionar 2 produtos!');
        return;
    }
    
    updateProductCards();
    updateSelectedCount();
};

function updateProductCards() {
    document.querySelectorAll('.product-card').forEach(card => {
        const productId = JSON.parse(card.getAttribute('onclick').split('(')[1].split(')')[0]).id;
        card.classList.toggle('selected', selectedProducts.some(p => p.id === productId));
    });
}

function updateSelectedCount() {
    document.getElementById('selectedCount').textContent = selectedProducts.length;
}

window.confirmProductSelection = function() {
    if (selectedProducts.length !== 2) {
        alert('Por favor, selecione exatamente 2 produtos.');
        return;
    }

    // Atualizar preview dos produtos selecionados
    const selectedProductsDiv = document.getElementById('selectedProducts');
    selectedProductsDiv.innerHTML = selectedProducts.map(product => `
        <div class="col-6">
            <div class="card mb-3">
                <img src="${product.imageUrl || `${MASTER_URL}/default-product.png`}" 
                     class="card-img-top p-2" alt="${product.name}">
                <div class="card-body">
                    <h6 class="card-title">${product.name}</h6>
                    <p class="card-text text-primary">${product.price}</p>
                </div>
            </div>
        </div>
    `).join('');

    // Fechar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('productSelectionModal'));
    modal.hide();
};

// Adicionar pesquisa em tempo real
document.getElementById('productSearchInput')?.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    document.querySelectorAll('.product-card').forEach(card => {
        const productName = card.querySelector('.card-title').textContent.toLowerCase();
        const productPrice = card.querySelector('.card-text').textContent.toLowerCase();
        const shouldShow = productName.includes(searchTerm) || productPrice.includes(searchTerm);
        card.closest('.col-md-3').style.display = shouldShow ? '' : 'none';
    });
});

// Atualizar a função generateAdHTML para usar os produtos selecionados
window.generateAdHTML = function(backgroundClass) {
    if (selectedProducts.length !== 2) {
        alert('Por favor, selecione 2 produtos primeiro.');
        return null;
    }

    const [product1, product2] = selectedProducts;
    const backgroundImage = window.getBackgroundImage(backgroundClass);
    
    return `
    <div class="ad-container" style="background-image: url('${backgroundImage}')">
        <div class="products-container">
            <div class="product">
                <img src="${product1.imageUrl || `${MASTER_URL}/default-product.png`}" alt="${product1.name}">
                <div class="product-title">${product1.name}</div>
                <div class="product-description">${product1.description || ''}</div>
                <div class="product-price">${product1.price}</div>
            </div>
            <div class="product">
                <img src="${product2.imageUrl || `${MASTER_URL}/default-product.png`}" alt="${product2.name}">
                <div class="product-title">${product2.name}</div>
                <div class="product-description">${product2.description || ''}</div>
                <div class="product-price">${product2.price}</div>
            </div>
        </div>
    </div>`;
};

// ...existing code...

window.openProductSelectionModal = async function() {
    selectedProducts = []; // Reset seleção
    const modal = new bootstrap.Modal(document.getElementById('productSelectionModal'));
    await loadModalProducts(); // Alterado de loadProductsGrid para loadModalProducts
    updateSelectedCount();
    modal.show();
};

async function loadModalProducts() {
    try {
        const productsContainer = document.getElementById('productsListContainer');
        productsContainer.innerHTML = '<div class="w-100 text-center">Carregando produtos...</div>';

        const response = await fetch(`${MASTER_URL}/api/products`);
        const data = await response.json();
        
        if (data.success) {
            productsContainer.innerHTML = '';
            
            // Agrupar produtos por categoria
            const productsByCategory = data.products.reduce((acc, product) => {
                if (!acc[product.category]) {
                    acc[product.category] = [];
                }
                acc[product.category].push(product);
                return acc;
            }, {});

            // Criar containers por categoria
            Object.entries(productsByCategory).forEach(([category, products]) => {
                const categorySection = document.createElement('div');
                categorySection.className = 'category-section mb-4 w-100';
                categorySection.innerHTML = `
                    <h5 class="category-title mb-3">${category}</h5>
                    <div class="row g-3 products-grid">
                        ${products.map(product => `
                            <div class="col-md-3">
                                <div class="card h-100 product-card ${selectedProducts.find(p => p._id === product._id) ? 'selected' : ''}" 
                                     onclick="toggleProductSelection(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                                    <img src="${product.imageUrl || '/default-product.png'}" 
                                         class="card-img-top p-2" alt="${product.name}"
                                         style="height: 200px; object-fit: contain;">
                                    <div class="card-body">
                                        <h6 class="card-title">${product.name}</h6>
                                        <p class="card-text text-primary">${product.price}</p>
                                    </div>
                                    <div class="card-footer bg-transparent">
                                        <div class="form-check">
                                            <input type="checkbox" class="form-check-input" 
                                                   ${selectedProducts.find(p => p._id === product._id) ? 'checked' : ''}>
                                            <label class="form-check-label">Selecionar</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                productsContainer.appendChild(categorySection);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        document.getElementById('productsListContainer').innerHTML = 
            '<div class="alert alert-danger">Erro ao carregar produtos</div>';
    }
}

// Atualizar a função de filtro por categoria
document.getElementById('searchByCategory').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    document.querySelectorAll('.category-section').forEach(section => {
        const categoryTitle = section.querySelector('.category-title').textContent.toLowerCase();
        const products = section.querySelectorAll('.product-card');
        
        let hasVisibleProducts = false;
        
        // Verificar produtos dentro da categoria
        products.forEach(product => {
            const productName = product.querySelector('.card-title').textContent.toLowerCase();
            const shouldShow = categoryTitle.includes(searchTerm) || productName.includes(searchTerm);
            product.closest('.col-md-3').style.display = shouldShow ? '' : 'none';
            if (shouldShow) hasVisibleProducts = true;
        });
        
        // Mostrar/ocultar seção da categoria
        section.style.display = hasVisibleProducts ? '' : 'none';
    });
});

// Atualizar função de seleção de produto
window.toggleProductSelection = function(product) {
    const index = selectedProducts.findIndex(p => p._id === product._id);
    const card = document.querySelector(`.product-card[onclick*="${product._id}"]`);
    const checkbox = card.querySelector('input[type="checkbox"]');
    
    if (index > -1) {
        selectedProducts.splice(index, 1);
        card.classList.remove('selected');
        checkbox.checked = false;
    } else if (selectedProducts.length < 2) {
        selectedProducts.push(product);
        card.classList.add('selected');
        checkbox.checked = true;
    } else {
        alert('Você só pode selecionar 2 produtos!');
        return;
    }
    
    updateSelectedCount();
};

// ...existing code...

window.confirmProductSelection = function() {
    if (selectedProducts.length === 0) {
        alert('Por favor, selecione produtos antes de confirmar.');
        return;
    }

    // Atualizar preview dos produtos selecionados
    const selectedProductsDiv = document.getElementById('selectedProducts');
    selectedProductsDiv.innerHTML = selectedProducts.map(product => `
        <div class="col-6">
            <div class="card mb-3">
                <img src="${product.imageUrl || `${MASTER_URL}/default-product.png`}" 
                     class="card-img-top p-2" alt="${product.name}">
                <div class="card-body">
                    <h6 class="card-title">${product.name}</h6>
                    <p class="card-text text-primary">${product.price}</p>
                </div>
            </div>
        </div>
    `).join('');

    // Fechar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('productSelectionModal'));
    modal.hide();
};

// Atualizar a função de carregar produtos no modal
async function loadModalProducts() {
    try {
        const productsContainer = document.getElementById('productsListContainer');
        const categorySelect = document.getElementById('categorySelect');
        productsContainer.innerHTML = '<div class="w-100 text-center">Carregando produtos...</div>';

        const response = await fetch(`${MASTER_URL}/api/products`);
        const data = await response.json();
        
        if (data.success) {
            // Agrupar produtos por categoria
            const productsByCategory = data.products.reduce((acc, product) => {
                const category = product.category || 'Sem Categoria';
                if (!acc[category]) {
                    acc[category] = [];
                }
                acc[category].push(product);
                return acc;
            }, {});

            // Atualizar select de categorias
            const categories = Object.keys(productsByCategory);
            categorySelect.innerHTML = `
                <option value="all">Todas as Categorias</option>
                ${categories.map(cat => `
                    <option value="${cat}">${cat}</option>
                `).join('')}
            `;

            // Função para renderizar produtos filtrados
            function renderProducts(categoryFilter = 'all', searchTerm = '') {
                productsContainer.innerHTML = '';
                Object.entries(productsByCategory).forEach(([category, products]) => {
                    if (categoryFilter === 'all' || categoryFilter === category) {
                        // Filtrar produtos pelo termo de busca
                        const filteredProducts = products.filter(product => 
                            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
                        );

                        if (filteredProducts.length > 0) {
                            const categorySection = document.createElement('div');
                            categorySection.className = 'category-section mb-4';
                            categorySection.innerHTML = `
                                <h5 class="category-title mb-3">${category}</h5>
                                <div class="row g-3">
                                    ${filteredProducts.map(product => `
                                        <div class="col-md-3">
                                            <div class="card h-100 product-card ${selectedProducts.find(p => p._id === product._id) ? 'selected' : ''}" 
                                                 onclick="toggleProductSelection(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                                                <img src="${product.imageUrl || '/default-product.png'}" 
                                                     class="card-img-top p-2" alt="${product.name}"
                                                     style="height: 200px; object-fit: contain;">
                                                <div class="card-body">
                                                    <h6 class="card-title">${product.name}</h6>
                                                    <p class="card-text text-primary">${product.price}</p>
                                                </div>
                                                <div class="card-footer bg-transparent">
                                                    <div class="form-check">
                                                        <input type="checkbox" class="form-check-input" 
                                                               ${selectedProducts.find(p => p._id === product._id) ? 'checked' : ''}>
                                                        <label class="form-check-label">Selecionar</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            `;
                            productsContainer.appendChild(categorySection);
                        }
                    }
                });
            }

            // Renderizar todos os produtos inicialmente
            renderProducts();

            // Adicionar listeners para filtros
            categorySelect.addEventListener('change', () => {
                const searchTerm = document.getElementById('searchByCategory').value;
                renderProducts(categorySelect.value, searchTerm);
            });

            document.getElementById('searchByCategory').addEventListener('input', (e) => {
                renderProducts(categorySelect.value, e.target.value);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        productsContainer.innerHTML = '<div class="alert alert-danger">Erro ao carregar produtos</div>';
    }
}

// ...
