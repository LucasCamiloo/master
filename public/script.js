const MASTER_URL = 'https://master-teste.vercel.app';
const SLAVE_URL = 'https://slave-teste.vercel.app';

let devices = [];
let eventSource = null;

async function loadDevices() {
    try {
        const response = await fetch(`${MASTER_URL}/api/screens`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        devices = data.screens;
        updateDeviceList();
        // Only update chart if we're on the main page
        const chartElement = document.getElementById('statusChart');
        if (chartElement) {
            updateChart();
        }
    } catch (error) {
        console.error('Error loading devices:', error);
    }
}

// Remove WebSocket initialization and add SSE
function initSSE() {
    if (eventSource) {
        eventSource.close();
    }

    eventSource = new EventSource(`${MASTER_URL}/events`);

    eventSource.onopen = () => {
        console.log('SSE connection established');
    };

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('SSE message received:', data);

            if (data.type === 'screen_update') {
                if (data.action === 'name_update') {
                    // Atualizar apenas o nome localmente
                    const device = devices.find(d => d.id === data.screenId);
                    if (device) {
                        device.name = data.name;
                        updateDeviceList();
                    }
                } else {
                    // Manter comportamento atual
                    loadDevices();
                }
            }
        } catch (error) {
            console.error('Error processing SSE message:', error);
        }
    };

    eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        eventSource.close();
        setTimeout(initSSE, 5000); // Reconectar após 5 segundos
    };
}

// Adicionar função createDeviceElement
function createDeviceElement(device) {
    const deviceDiv = document.createElement('div');
    deviceDiv.className = 'card mb-3';
    deviceDiv.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h5 class="card-title">${device.name || 'Sem nome'}</h5>
                    <span class="badge ${device.operational ? 'bg-success' : 'bg-danger'}">
                        ${device.operational ? 'Operante' : 'Inoperante'}
                    </span>
                </div>
                <div class="actions">
                    <button class="action-btn view-btn" onclick="viewDevice('${device.id}')" title="Visualizar">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="action-btn edit-btn" onclick="editDevice('${device.id}')" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="action-btn ad-btn" onclick="selectAd('${device.id}')" title="Anúncios">
                        <i class="bi bi-image"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteDevice('${device.id}')" title="Excluir">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    return deviceDiv;
}

// Atualizar o evento DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    loadDevices();
    initSSE();
    // Recarregar a lista a cada 5 segundos
    setInterval(loadDevices, 5000);
});

function updateDeviceList() {
    const container = document.getElementById('deviceListContainer');
    if (!container) return;

    container.innerHTML = devices.map(device => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="card-title">${device.name || 'Sem nome'}</h5>
                        <span class="badge ${device.operational ? 'bg-success' : 'bg-danger'}">
                            ${device.operational ? 'Operante' : 'Inoperante'}
                        </span>
                    </div>
                    <div class="actions">
                        <button class="action-btn view-btn" onclick="viewDevice('${device.id}')" title="Visualizar">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="action-btn edit-btn" onclick="editDevice('${device.id}')" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="action-btn ad-btn" onclick="selectAd('${device.id}')" title="Anúncios">
                            <i class="bi bi-image"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteDevice('${device.id}')" title="Excluir">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function updateChart() {
    const chartElement = document.getElementById('statusChart');
    if (!chartElement) {
        return; // Skip chart update if element doesn't exist
    }

    const operanteCount = devices.filter(d => d.registered).length;
    const inoperanteCount = devices.filter(d => !d.registered).length;

    const ctx = chartElement.getContext('2d');
    if (window.statusChart) {
        window.statusChart.destroy();
    }
    
    window.statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Operantes', 'Inoperantes'],
            datasets: [{
                data: [operanteCount, inoperanteCount],
                backgroundColor: ['#28a745', '#dc3545'],
                borderColor: ['#28a745', '#dc3545'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    });
}

function editDevice(deviceId) {
    try {
        console.log('Editing device:', deviceId);
        const device = devices.find(d => d.id === deviceId);
        if (!device) {
            console.error('Device not found:', deviceId);
            return;
        }
        console.log('Found device:', device);

        const modalElement = document.getElementById('editDeviceModal');
        if (!modalElement) {
            console.error('Modal element not found');
            return;
        }

        // Set modal values
        document.getElementById('editDeviceId').value = deviceId;
        document.getElementById('deviceName').value = device.name || '';
        console.log('Modal values set');

        // Initialize and show modal
        const modal = new bootstrap.Modal(modalElement);
        modal.show();

        // Log modal state
        console.log('Modal shown');
    } catch (error) {
        console.error('Error in editDevice:', error);
    }
}

async function saveDeviceName() {
    try {
        const deviceId = document.getElementById('editDeviceId').value;
        const newName = document.getElementById('deviceName').value.trim();
        
        console.log('Saving device name:', { deviceId, newName });

        if (!deviceId || !newName) {
            await Swal.fire('Erro', 'Por favor, insira um nome válido', 'error');
            return;
        }

        const response = await fetch(`${MASTER_URL}/api/screens/${deviceId}/name`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ name: newName })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage;
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || 'Erro ao atualizar nome';
            } catch (e) {
                errorMessage = errorText || 'Erro ao atualizar nome';
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        
        if (data.success) {
            // Atualizar o dispositivo na lista local
            const device = devices.find(d => d.id === deviceId);
            if (device) {
                device.name = newName;
            }
            
            // Atualizar a interface
            updateDeviceList();

            // Fechar o modal com Bootstrap
            const modalElement = document.getElementById('editDeviceModal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }

            await Swal.fire('Sucesso!', 'Nome do dispositivo atualizado', 'success');
            await loadDevices(); // Recarrega a lista para persistir o nome
        } else {
            throw new Error(data.message || 'Erro ao atualizar nome');
        }
    } catch (error) {
        console.error('Error in saveDeviceName:', error);
        await Swal.fire('Erro', 'Falha ao salvar nome: ' + error.message, 'error');
    }
}

// ...existing code...

// Update the selectAd function with better error handling
async function selectAd(deviceId) {
    try {
        console.log('Loading available ads...');
        const response = await fetch(`${MASTER_URL}/api/ads/available`);
        if (!response.ok) {
            throw new Error(`Failed to load ads: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.ads || !data.ads.length) {
            throw new Error('Não foi adicionado nenhum anuncio ainda.');
        }

        const adSelector = document.createElement('select');
        adSelector.innerHTML = data.ads.map(ad => 
            `<option value="${ad.id}">${ad.title} (${new Date(ad.dateCreated).toLocaleDateString()})</option>`
        ).join('');

        const result = await Swal.fire({
            title: 'Selecione um anúncio',
            html: adSelector,
            showCancelButton: true,
            confirmButtonText: 'Selecionar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            const selectedAdId = adSelector.value;
            console.log('Updating ad:', { deviceId, selectedAdId });

            const updateResponse = await fetch(`${MASTER_URL}/api/screens/${deviceId}/ad`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ adId: selectedAdId })
            });

            if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                throw new Error(errorData.message || 'Failed to update ad');
            }

            const updateData = await updateResponse.json();
            if (updateData.success) {
                await loadDevices();
                await Swal.fire('Sucesso!', 'Anúncio atualizado com sucesso', 'success');
            } else {
                throw new Error(updateData.message || 'Failed to update ad');
            }
        }
    } catch (error) {
        console.error('Error selecting ad:', error);
        await Swal.fire('Erro', `Falha ao selecionar anúncio: ${error.message}`, 'error');
    }
}

// ...existing code...

// Remove the credential generation from master
window.registerScreen = async function() {
    try {
        const slaveUrl = document.getElementById('slaveUrl').value.trim();
        const screenId = document.getElementById('screenId').value.trim();
        const pin = document.getElementById('pin').value.trim();

        console.log('Attempting registration with:', { slaveUrl, screenId, pin });

        if (!slaveUrl || !screenId || !pin) {
            await Swal.fire('Erro', 'Todos os campos são obrigatórios', 'error');
            return;
        }

        // Send registration request
        const response = await fetch(`${MASTER_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                slaveUrl,
                screenId,
                pin
            })
        });

        const data = await response.json();
        console.log('Registration response:', data);

        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        if (data.success) {
            await Swal.fire('Sucesso', 'Tela registrada com sucesso!', 'success');
            loadDevices();
        } else {
            throw new Error(data.message || 'Failed to register screen');
        }
    } catch (error) {
        console.error('Registration error:', error);
        await Swal.fire('Erro', `Falha no registro: ${error.message}`, 'error');
    }
};

// ...rest of existing code...

window.useAd = async function(adId) {
    const screenId = prompt('Digite o ID da tela onde deseja exibir este anúncio:');
    if (!screenId) return;

    try {
        const response = await fetch(`${MASTER_URL}/api/screens/${screenId}/ad`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ adId })
        });

        if (response.ok) {
            alert('Anúncio aplicado com sucesso!');
        } else {
            throw new Error('Falha ao atualizar anúncio');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao aplicar anúncio: ' + error.message);
    }
};

// ...existing code...

async function deleteDevice(deviceId) {
    try {
        const confirmation = await Swal.fire({
            title: 'Confirmação',
            text: 'Tem certeza que deseja excluir esta tela?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, excluir',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmation.isConfirmed) {
            return;
        }

        const response = await fetch(`${MASTER_URL}/api/screen/${deviceId}`, {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao excluir tela');
        }

        const data = await response.json();
        if (data.success) {
            Swal.fire('Sucesso!', 'Tela excluída com sucesso', 'success');
            loadDevices(); // Recarrega a lista de dispositivos
        } else {
            throw new Error(data.message || 'Erro ao excluir tela');
        }
    } catch (error) {
        console.error('Erro ao excluir tela:', error);
        Swal.fire('Erro', 'Erro ao excluir tela: ' + error.message, 'error');
    }
}

// ...existing code...

async function scheduleAd(adId, screenId, scheduleDate, scheduleTime) {
    try {
        const response = await fetch(`${MASTER_URL}/api/schedule-ad`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adId, screenId, scheduleDate, scheduleTime })
        });

        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            } catch (e) {
                throw new Error(errorText);
            }
        }

        const data = await response.json();
        if (data.success) {
            alert('Anúncio agendado com sucesso!');
        } else {
            throw new Error(data.message || 'Falha ao agendar anúncio');
        }
    } catch (error) {
        console.error('Erro ao agendar anúncio:', error);
        alert('Erro ao agendar anúncio: ' + error.message);
    }
}

// ...existing code...

async function loadScreens() {
    try {
        const response = await fetch(`${MASTER_URL}/api/screens`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('deviceListContainer');
            container.innerHTML = '';
            
            data.screens.forEach(screen => {
                const deviceElement = createDeviceElement(screen);
                container.appendChild(deviceElement);
            });
        }
    } catch (error) {
        console.error('Error loading screens:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Falha ao carregar as telas'
        });
    }
}

// Adicionar chamada automática
document.addEventListener('DOMContentLoaded', () => {
    loadScreens();
    // Recarregar a lista a cada 5 segundos
    setInterval(loadScreens, 5000);
});

// ...rest of existing code...

async function loadScreenCredentials() {
    try {
        // First, get the screen data from slave
        const slaveUrl = document.getElementById('slaveUrl').value.trim();
        const response = await fetch(`${slaveUrl}/screen-data`);
        const data = await response.json();
        
        // Auto-fill the form with slave's data
        document.getElementById('screenId').value = data.screenId;
        document.getElementById('pin').value = data.pin;
        
        console.log('📱 Dados carregados do slave:', data);
    } catch (error) {
        console.error('❌ Erro ao carregar dados do slave:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Não foi possível carregar os dados da tela'
        });
    }
}

// ...existing code...

let html5QrcodeScanner = null;

function startQRScanner() {
    const modal = new bootstrap.Modal(document.getElementById('qrScannerModal'));
    modal.show();

    if (html5QrcodeScanner === null) {
        html5QrcodeScanner = new Html5QrcodeScanner(
            "reader", 
            { 
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
                // Configurações em português
                rememberLastUsedCamera: true,
                supportedScanTypes: [],
                texts: {
                    header: "Leitor de QR Code",
                    subHeader: "Posicione o QR Code na frente da câmera",
                    poweredBy: "Powered by ",
                    scanButtonSuccess: "Escaneando",
                    scanButtonFailure: "Por favor, tente novamente",
                    scanResultFailure: "Não foi possível decodificar o QR Code",
                    selectCamera: "Selecione a câmera",
                    requestPermission: "Solicitar permissão da câmera",
                    permissionDenied: "Permissão negada",
                    permissionRequest: "Este aplicativo precisa de permissão para acessar a câmera",
                    noCameraFound: "Nenhuma câmera encontrada",
                    scanningStatus: "Escaneando..."
                }
            }
        );

        html5QrcodeScanner.render((decodedText) => {
            try {
                console.log("QR Code detectado:", decodedText);
                const data = JSON.parse(decodedText);
                
                if (data.screenId && data.pin) {
                    console.log("Dados válidos do QR:", data);
                    // Preencher os campos do formulário
                    document.getElementById('screenId').value = data.screenId;
                    document.getElementById('pin').value = data.pin;
                    
                    // Parar o scanner e fechar o modal
                    html5QrcodeScanner.clear();
                    modal.hide();
                    
                    // Notificar o usuário em português
                    Swal.fire({
                        title: 'QR Code Lido!',
                        text: 'Os dados foram preenchidos automaticamente.',
                        icon: 'success',
                        confirmButtonText: 'OK'
                    });
                }
            } catch (error) {
                console.error('Erro ao processar QR code:', error);
                Swal.fire({
                    title: 'Erro',
                    text: 'QR Code inválido ou danificado',
                    icon: 'error',
                    confirmButtonText: 'Tentar Novamente'
                });
            }
        }, (error) => {
            console.log('Erro no scanner:', error);
        });
    }
}

// Limpar o scanner quando o modal for fechado
document.getElementById('qrScannerModal').addEventListener('hidden.bs.modal', () => {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
        html5QrcodeScanner = null;
    }
});

// ...existing code...

document.addEventListener('DOMContentLoaded', () => {
    const editModal = document.getElementById('editDeviceModal');
    if (editModal) {
        editModal.addEventListener('shown.bs.modal', () => {
            document.getElementById('deviceName').focus();
        });

        // Fix accessibility issue with aria-hidden
        editModal.addEventListener('hide.bs.modal', () => {
            const focusableElements = editModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            focusableElements.forEach(el => {
                el.setAttribute('tabindex', '-1');
            });
        });

        editModal.addEventListener('hidden.bs.modal', () => {
            const focusableElements = editModal.querySelectorAll('button, [href], input, select, textarea, [tabindex="-1"]');
            focusableElements.forEach(el => {
                el.removeAttribute('tabindex');
            });
        });
    }
    
    // ...rest of existing DOMContentLoaded code...
});

// ...existing code...
