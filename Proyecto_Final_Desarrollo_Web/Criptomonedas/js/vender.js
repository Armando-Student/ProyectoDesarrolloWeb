// vender.js - VERSIÓN COMPLETA CORREGIDA
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 vender.js cargado - Iniciando...');
    await initializeSellPage();
});

// ✅ FALLBACK PARA CUANDO window.API NO ESTÉ DISPONIBLE
if (!window.API) {
    console.log('⚠️ window.API no disponible, creando fallback...');
    window.API = {
        async getPortfolio() {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No token available');
            
            const response = await fetch('https://proyectodesarrolloweb-production.up.railway.app/api/portfolio', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
            
            return await response.json();
        },
        
        async getCryptocurrencies() {
            const response = await fetch('https://proyectodesarrolloweb-production.up.railway.app/api/cryptocurrencies');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
            
            return await response.json();
        },
        
        async sellCryptocurrency(sellData) {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No token available');
            
            // ✅ JSON CORRECTO para vender - solo crypto_id y amount
            const requestData = {
                crypto_id: sellData.crypto_id,
                amount: sellData.amount
            };
            
            console.log('📤 Enviando venta al backend:', requestData);
            
            const response = await fetch('https://proyectodesarrolloweb-production.up.railway.app/api/transaction/sell', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            return await response.json();
        },
        
        async getTransactions() {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No token available');
            
            const response = await fetch('https://proyectodesarrolloweb-production.up.railway.app/api/transactions', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
            
            return await response.json();
        }
    };
    console.log('✅ Fallback API creado');
}

let currentCrypto = null;
let cryptocurrencies = [];
let userPortfolio = [];
const FEE_PERCENTAGE = 0.1;

async function initializeSellPage() {
    try {
        console.log('🔄 Iniciando página de venta...');
        
        // 1. Verificar autenticación
        if (!checkAuth()) {
            return;
        }

        // 2. Cargar datos del usuario
        await loadUserData();
        
        // 3. Cargar criptomonedas disponibles
        await loadCryptocurrencies();
        console.log('✅ Criptomonedas cargadas:', cryptocurrencies.length);
        
        // 4. Cargar portafolio fresco del servidor
        await loadUserPortfolio();
        console.log('✅ Portafolio cargado:', userPortfolio.length, 'activos');
        
        // 5. Configurar la interfaz
        await setupCryptoSelection();
        
        // 6. Configurar event listeners
        setupEventListeners();
        
        console.log('✅ Página de venta inicializada correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando página:', error);
        showAlert('Error cargando la página de venta', 'error');
    }
}

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        window.location.href = 'login.html';
        return false;
    }
    
    // Mostrar datos del usuario
    const userObj = JSON.parse(user);
    const welcomeElement = document.getElementById('userWelcome');
    if (welcomeElement) {
        welcomeElement.textContent = `Hola, ${userObj.name || userObj.email}`;
    }
    
    return true;
}

async function loadUserData() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            const balanceElement = document.getElementById('availableBalance');
            if (balanceElement) {
                balanceElement.textContent = `$${parseFloat(user.balance || 0).toFixed(2)}`;
            }
        }
    } catch (error) {
        console.error('Error cargando datos de usuario:', error);
    }
}

async function loadCryptocurrencies() {
    try {
        console.log('🔄 Cargando criptomonedas...');
        
        if (window.API && window.API.getCryptocurrencies) {
            cryptocurrencies = await window.API.getCryptocurrencies();
        } else {
            // Fallback directo
            const response = await fetch('https://proyectodesarrolloweb-production.up.railway.app/api/cryptocurrencies');
            if (!response.ok) throw new Error('Error fetching cryptocurrencies');
            cryptocurrencies = await response.json();
        }
        
        console.log('✅ Criptomonedas obtenidas:', cryptocurrencies.length);
        
    } catch (error) {
        console.error('❌ Error cargando criptomonedas:', error);
        showAlert('Error cargando criptomonedas disponibles', 'error');
        cryptocurrencies = [];
    }
}

async function loadUserPortfolio() {
    try {
        console.log('🔄 Obteniendo portafolio del servidor...');
        
        // ✅ USAR window.API (ahora siempre disponible)
        const freshPortfolio = await window.API.getPortfolio();
        
        if (!freshPortfolio) {
            throw new Error('No se recibieron datos del portafolio');
        }

        // Filtrar solo activos con cantidad > 0
        userPortfolio = freshPortfolio.filter(asset => {
            const amount = parseFloat(asset.amount || 0);
            return amount > 0;
        });
        
        localStorage.setItem('userPortfolio', JSON.stringify(userPortfolio));
        
        console.log('✅ Portafolio actualizado:', userPortfolio.length, 'activos con saldo');
        console.log('📊 Detalles:', userPortfolio.map(asset => 
            `${asset.symbol}: ${parseFloat(asset.amount).toFixed(8)}`
        ));
        
        return userPortfolio;
        
    } catch (error) {
        console.error('❌ Error cargando portafolio:', error);
        showAlert('Error cargando tu portafolio: ' + error.message, 'error');
        userPortfolio = [];
        return [];
    }
}

async function setupCryptoSelection() {
    console.log('🔄 Configurando selección de criptomonedas...');
    
    const cryptoSelect = document.getElementById('cryptoSelect');
    if (!cryptoSelect) {
        console.error('❌ Elemento cryptoSelect no encontrado');
        return;
    }
    
    // Limpiar opciones anteriores
    cryptoSelect.innerHTML = '<option value="">Selecciona una criptomoneda</option>';
    
    // Verificar que tenemos datos
    if (!userPortfolio || userPortfolio.length === 0) {
        cryptoSelect.innerHTML = '<option value="">No tienes criptomonedas para vender</option>';
        cryptoSelect.disabled = true;
        resetCryptoInfo();
        console.log('ℹ️ No hay criptomonedas en el portafolio');
        return;
    }
    
    if (!cryptocurrencies || cryptocurrencies.length === 0) {
        cryptoSelect.innerHTML = '<option value="">Error cargando datos</option>';
        cryptoSelect.disabled = true;
        console.error('❌ No hay datos de criptomonedas disponibles');
        return;
    }
    
    // Contador para ver cuántas agregamos
    let addedCount = 0;
    
    // Agregar cada criptomoneda del portafolio al dropdown
    userPortfolio.forEach(asset => {
        const crypto = cryptocurrencies.find(c => c.symbol === asset.symbol);
        const amount = parseFloat(asset.amount || 0);
        
        if (crypto && amount > 0) {
            const option = document.createElement('option');
            option.value = asset.symbol;
            option.textContent = `${crypto.name} (${asset.symbol}) - ${amount.toFixed(8)} disp.`;
            option.setAttribute('data-crypto', JSON.stringify(crypto));
            cryptoSelect.appendChild(option);
            addedCount++;
            
            console.log(`✅ Agregada: ${asset.symbol} - ${amount.toFixed(8)}`);
        }
    });
    
    if (addedCount === 0) {
        cryptoSelect.innerHTML = '<option value="">No tienes criptomonedas para vender</option>';
        cryptoSelect.disabled = true;
        console.log('ℹ️ No se agregaron criptomonedas al dropdown');
    } else {
        cryptoSelect.disabled = false;
        console.log(`✅ Dropdown poblado con ${addedCount} criptomonedas`);
    }
}

function setupEventListeners() {
    console.log('🔄 Configurando event listeners...');
    
    // Select de criptomoneda
    const cryptoSelect = document.getElementById('cryptoSelect');
    if (cryptoSelect) {
        cryptoSelect.addEventListener('change', handleCryptoChange);
    }
    
    // Tipo de cantidad
    const amountType = document.getElementById('amountType');
    if (amountType) {
        amountType.addEventListener('change', updateAmountPlaceholder);
    }
    
    // Input de cantidad
    const amountInput = document.getElementById('amount');
    if (amountInput) {
        amountInput.addEventListener('input', calculateSale);
    }
    
    // Botones de porcentaje
    document.querySelectorAll('.btn-percentage').forEach(btn => {
        btn.addEventListener('click', handlePercentageClick);
    });
    
    // Formulario
    const sellForm = document.getElementById('sellForm');
    if (sellForm) {
        sellForm.addEventListener('submit', handleSellSubmit);
    }
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    console.log('✅ Event listeners configurados');
}

function handleCryptoChange(event) {
    const selectedSymbol = event.target.value;
    
    if (!selectedSymbol) {
        currentCrypto = null;
        resetCryptoInfo();
        return;
    }
    
    // Buscar la criptomoneda en los datos cargados
    const crypto = cryptocurrencies.find(c => c.symbol === selectedSymbol);
    const asset = userPortfolio.find(a => a.symbol === selectedSymbol);
    
    if (crypto && asset) {
        currentCrypto = {
            ...crypto,
            availableAmount: parseFloat(asset.amount)
        };
        
        updateCryptoInfo();
        updateAmountPlaceholder();
        resetCalculation();
        
        console.log(`✅ Cripto seleccionada: ${currentCrypto.name} (${currentCrypto.symbol})`);
    } else {
        console.error('❌ No se encontraron datos para:', selectedSymbol);
        showAlert('Error al seleccionar la criptomoneda', 'error');
    }
}

function updateCryptoInfo() {
    if (!currentCrypto) return;
    
    const price = parseFloat(currentCrypto.current_price || 0);
    const amount = currentCrypto.availableAmount || 0;
    const totalValue = amount * price;
    
    document.getElementById('cryptoName').textContent = `${currentCrypto.name} (${currentCrypto.symbol})`;
    document.getElementById('cryptoPrice').textContent = `Precio: $${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('availableCrypto').textContent = `${amount.toFixed(8)} ${currentCrypto.symbol}`;
    document.getElementById('currentValue').textContent = `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function resetCryptoInfo() {
    document.getElementById('cryptoName').textContent = 'Selecciona una criptomoneda';
    document.getElementById('cryptoPrice').textContent = 'Precio: $0.00';
    document.getElementById('availableCrypto').textContent = '0.00000000';
    document.getElementById('currentValue').textContent = '$0.00';
}

function updateAmountPlaceholder() {
    if (!currentCrypto) return;
    
    const amountType = document.getElementById('amountType').value;
    const symbol = currentCrypto.symbol;
    
    document.getElementById('amountSymbol').textContent = amountType === 'crypto' ? symbol : 'USD';
    document.getElementById('amountLabel').textContent = amountType === 'crypto' ? 'Cantidad:' : 'Monto en USD:';
}

function handlePercentageClick(event) {
    if (!currentCrypto) {
        showAlert('Primero selecciona una criptomoneda', 'error');
        return;
    }
    
    const percentage = parseFloat(event.target.dataset.percentage) / 100;
    const amountType = document.getElementById('amountType').value;
    const price = parseFloat(currentCrypto.current_price);
    const availableAmount = currentCrypto.availableAmount;
    
    let amount;
    
    if (amountType === 'crypto') {
        amount = availableAmount * percentage;
        document.getElementById('amount').value = amount.toFixed(8);
    } else {
        amount = (availableAmount * price) * percentage;
        document.getElementById('amount').value = amount.toFixed(2);
    }
    
    calculateSale();
}

function calculateSale() {
    if (!currentCrypto) return;
    
    const amountInput = parseFloat(document.getElementById('amount').value) || 0;
    const amountType = document.getElementById('amountType').value;
    const price = parseFloat(currentCrypto.current_price);
    const availableAmount = currentCrypto.availableAmount;
    
    let cryptoAmount, usdAmount;
    
    if (amountType === 'crypto') {
        cryptoAmount = amountInput;
        usdAmount = amountInput * price;
    } else {
        usdAmount = amountInput;
        cryptoAmount = amountInput / price;
    }
    
    const fee = usdAmount * (FEE_PERCENTAGE / 100);
    const finalTotal = usdAmount - fee;
    
    // Validar que no exceda la cantidad disponible
    const hasEnoughCrypto = availableAmount >= cryptoAmount;
    const isValidAmount = amountInput > 0;
    
    // Actualizar UI
    document.getElementById('totalReceive').textContent = `$${usdAmount.toFixed(2)}`;
    document.getElementById('feeAmount').textContent = `$${fee.toFixed(2)}`;
    document.getElementById('finalTotal').textContent = `$${finalTotal.toFixed(2)}`;
    
    // Habilitar/deshabilitar botón
    const sellButton = document.getElementById('sellButton');
    if (sellButton) {
        sellButton.disabled = !hasEnoughCrypto || !isValidAmount;
    }
    
    // Mostrar error si no hay suficiente
    if (amountInput > 0 && !hasEnoughCrypto) {
        showAlert(`No tienes suficiente ${currentCrypto.symbol}. Máximo: ${availableAmount.toFixed(8)}`, 'error');
    }
}

function resetCalculation() {
    document.getElementById('amount').value = '';
    document.getElementById('totalReceive').textContent = '$0.00';
    document.getElementById('feeAmount').textContent = '$0.00';
    document.getElementById('finalTotal').textContent = '$0.00';
    
    const sellButton = document.getElementById('sellButton');
    if (sellButton) {
        sellButton.disabled = true;
    }
}

async function handleSellSubmit(event) {
    event.preventDefault();
    await executeSale();
}

async function executeSale() {
    if (!currentCrypto) {
        showAlert('Selecciona una criptomoneda', 'error');
        return;
    }
    
    const amountInput = parseFloat(document.getElementById('amount').value);
    if (!amountInput || amountInput <= 0) {
        showAlert('Ingresa una cantidad válida', 'error');
        return;
    }
    
    const amountType = document.getElementById('amountType').value;
    const price = parseFloat(currentCrypto.current_price);
    
    let cryptoAmount;
    
    if (amountType === 'crypto') {
        cryptoAmount = amountInput;
    } else {
        cryptoAmount = amountInput / price;
    }
    
    // Verificar cantidad disponible
    if (cryptoAmount > currentCrypto.availableAmount) {
        showAlert(`No tienes suficiente ${currentCrypto.symbol}`, 'error');
        return;
    }
    
    // ✅ PREPARAR DATOS CORRECTOS para la venta
    const sellData = {
        crypto_id: parseInt(currentCrypto.id),
        amount: parseFloat(cryptoAmount)
    };
    
    console.log('📤 Enviando venta:', sellData);
    
    // Deshabilitar botón
    const sellButton = document.getElementById('sellButton');
    if (sellButton) {
        sellButton.disabled = true;
        sellButton.textContent = 'Procesando...';
    }
    
    try {
        const result = await window.API.sellCryptocurrency(sellData);
        console.log('✅ Venta exitosa:', result);
        
        showAlert(`¡Venta exitosa! Vendiste ${cryptoAmount.toFixed(6)} ${currentCrypto.symbol}`, 'success');
        
        // Recargar datos y actualizar interfaz
        setTimeout(async () => {
            await loadUserPortfolio();
            await setupCryptoSelection();
            resetCryptoInfo();
            resetCalculation();
            
            // Redirigir al dashboard
            window.location.href = 'dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error en venta:', error);
        showAlert(`Error: ${error.message}`, 'error');
        
        // Rehabilitar botón
        if (sellButton) {
            sellButton.disabled = false;
            sellButton.textContent = 'Confirmar Venta';
        }
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userPortfolio');
    showAlert('Sesión cerrada', 'success');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}

function showAlert(message, type) {
    const existingAlerts = document.querySelectorAll('.custom-alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alert = document.createElement('div');
    alert.className = `custom-alert alert-${type}`;
    alert.textContent = message;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        background: ${type === 'error' ? '#e74c3c' : 
                     type === 'warning' ? '#f39c12' : 
                     '#27ae60'};
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) alert.remove();
    }, 5000);
}

console.log('✅ vender.js cargado exitosamente');