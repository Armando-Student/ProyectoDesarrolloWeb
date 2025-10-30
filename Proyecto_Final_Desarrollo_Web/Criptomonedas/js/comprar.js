// comprar.js - VERSIÓN DEFINITIVA CORREGIDA
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 comprar.js cargado - Iniciando...');
    initializeBuyPage();
});

let cryptocurrencies = [];
let currentCrypto = null;
const FEE_PERCENTAGE = 0.1;

async function initializeBuyPage() {
    try {
        console.log('🔄 Inicializando página de compra...');
        
        // Verificar autenticación
        if (!window.Auth || !window.Auth.checkAuth()) {
            window.location.href = 'login.html';
            return;
        }

        await loadUserData();
        await loadCryptocurrencies();
        setupEventListeners();
        
        console.log('✅ Página de compra lista para usar');
        
    } catch (error) {
        console.error('❌ Error al inicializar:', error);
        showAlert('Error al cargar la página de compra', 'error');
    }
}

async function loadUserData() {
    try {
        const user = window.Auth.getUser();
        if (user) {
            // Actualizar balance disponible
            const balanceElement = document.getElementById('availableBalance');
            if (balanceElement) {
                balanceElement.textContent = `$${parseFloat(user.balance || 0).toFixed(2)}`;
            }
            
            // Mostrar nombre de usuario
            const welcomeElement = document.getElementById('userWelcome');
            if (welcomeElement) {
                welcomeElement.textContent = `Hola, ${user.name || user.email}`;
            }
        }
    } catch (error) {
        console.error('Error cargando datos de usuario:', error);
    }
}

async function loadCryptocurrencies() {
    try {
        console.log('🔄 Cargando criptomonedas disponibles...');
        
        cryptocurrencies = await window.API.getCryptocurrencies();
        console.log('✅ Criptomonedas cargadas:', cryptocurrencies);
        
        // Verificar formato de datos
        if (cryptocurrencies && cryptocurrencies.length > 0) {
            const ejemplo = cryptocurrencies[0];
            console.log('📝 Formato de datos recibidos:', {
                ejemplo: ejemplo,
                tipos: {
                    id: typeof ejemplo.id,
                    symbol: typeof ejemplo.symbol,
                    name: typeof ejemplo.name,
                    current_price: typeof ejemplo.current_price
                }
            });
        }
        
        // Verificar la estructura de los datos
        if (cryptocurrencies && cryptocurrencies.length > 0) {
            console.log('📝 Ejemplo de estructura de crypto:', {
                primero: cryptocurrencies[0],
                tipos: {
                    id: typeof cryptocurrencies[0].id,
                    symbol: typeof cryptocurrencies[0].symbol,
                    current_price: typeof cryptocurrencies[0].current_price
                }
            });
        }
        
        if (!cryptocurrencies || cryptocurrencies.length === 0) {
            showAlert('No hay criptomonedas disponibles en este momento', 'warning');
            return;
        }
        
        // Llenar el dropdown
        populateCryptoSelect();
        
        // Seleccionar la primera criptomoneda por defecto
        if (cryptocurrencies.length > 0) {
            selectCrypto(cryptocurrencies[0]);
        }
        
    } catch (error) {
        console.error('❌ Error cargando criptomonedas:', error);
        showAlert('Error al cargar las criptomonedas disponibles', 'error');
        
        const cryptoSelect = document.getElementById('cryptoSelect');
        if (cryptoSelect) {
            cryptoSelect.innerHTML = '<option value="">Error cargando criptomonedas</option>';
        }
    }
}

function populateCryptoSelect() {
    const cryptoSelect = document.getElementById('cryptoSelect');
    
    if (!cryptoSelect) {
        console.error('❌ Elemento cryptoSelect no encontrado');
        return;
    }
    
    // Limpiar y agregar opción por defecto
    cryptoSelect.innerHTML = '<option value="">Selecciona una criptomoneda</option>';
    
    // Agregar cada criptomoneda
    cryptocurrencies.forEach(crypto => {
        // Verificar que tengamos todos los campos necesarios
        if (!crypto.id || !crypto.symbol || !crypto.name || !crypto.current_price) {
            console.error('Crypto con datos incompletos:', crypto);
            return;
        }

        const option = document.createElement('option');
        option.value = crypto.id.toString(); // Convertir ID a string para el valor del option
        option.textContent = `${crypto.name} (${crypto.symbol}) - $${parseFloat(crypto.current_price).toFixed(2)}`;
        
        // Asegurarnos de que el ID sea un número y los datos sean del tipo correcto
        const cryptoData = {
            id: Number(crypto.id),
            symbol: crypto.symbol.toUpperCase(),
            name: crypto.name,
            current_price: Number(crypto.current_price)
        };
        
        // Validar que los datos sean correctos
        console.log(`Validando crypto ${crypto.name}:`, {
            id: typeof cryptoData.id + ': ' + cryptoData.id,
            price: typeof cryptoData.current_price + ': ' + cryptoData.current_price
        });
        
        option.setAttribute('data-crypto', JSON.stringify(cryptoData));
        cryptoSelect.appendChild(option);
        
        console.log(`✅ Criptomoneda cargada: ${crypto.name} (${crypto.symbol})`);
    });
    
    console.log(`✅ Dropdown poblado con ${cryptocurrencies.length} criptomonedas`);
}

function setupEventListeners() {
    console.log('🔄 Configurando event listeners...');
    
    // ✅ 1. PREVENIR COMPORTAMIENTO POR DEFECTO DEL FORMULARIO
    const buyForm = document.getElementById('buyForm');
    if (buyForm) {
        buyForm.addEventListener('submit', function(e) {
            console.log('❌ Formulario submit PREVENIDO');
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();
            return false;
        });
    }
    
    // ✅ 2. EVENT LISTENER DIRECTO AL BOTÓN (IMPORTANTE)
    const buyButton = document.getElementById('buyButton');
    if (buyButton) {
        // Remover cualquier event listener existente
        const newButton = buyButton.cloneNode(true);
        buyButton.parentNode.replaceChild(newButton, buyButton);
        
        // Agregar nuevo event listener al botón nuevo
        document.getElementById('buyButton').addEventListener('click', function(e) {
            console.log('🎯 Botón de compra clickeado - Ejecutando compra...');
            executePurchase();
        });
        
        console.log('✅ Event listener del botón configurado correctamente');
    }
    
    // Event listener para cambio de criptomoneda
    const cryptoSelect = document.getElementById('cryptoSelect');
    if (cryptoSelect) {
        cryptoSelect.addEventListener('change', handleCryptoChange);
    }
    
    // Event listener para cambio de tipo de cantidad
    const amountType = document.getElementById('amountType');
    if (amountType) {
        amountType.addEventListener('change', updateAmountPlaceholder);
    }
    
    // Event listener para input de cantidad
    const amountInput = document.getElementById('amount');
    if (amountInput) {
        amountInput.addEventListener('input', calculatePurchase);
    }
    
    // Event listener para logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (window.Auth && window.Auth.logout) {
                window.Auth.logout();
            }
        });
    }
    
    console.log('✅ Todos los event listeners configurados');
}

function handleCryptoChange(event) {
    const selectedOption = event.target.options[event.target.selectedIndex];
    
    if (selectedOption && selectedOption.value) {
        try {
            // Obtener los datos guardados de la criptomoneda
            const cryptoData = JSON.parse(selectedOption.getAttribute('data-crypto'));
            console.log('📊 Datos de crypto seleccionada:', cryptoData);
            
            // Verificar que tenemos todos los campos necesarios
            if (!cryptoData.id || !cryptoData.symbol || !cryptoData.current_price) {
                throw new Error('Datos de criptomoneda incompletos');
            }
            
            // Guardar los datos de la criptomoneda seleccionada
            currentCrypto = cryptoData;
            
            selectCrypto(currentCrypto);
            
        } catch (error) {
            console.error('Error al procesar la selección de criptomoneda:', error);
            showAlert('Error al seleccionar la criptomoneda', 'error');
        }
    }
}

function selectCrypto(crypto) {
    currentCrypto = crypto;
    window.currentCrypto = crypto;
    
    console.log(`✅ Criptomoneda seleccionada: ${crypto.name} (${crypto.symbol})`);
    
    // Actualizar la interfaz
    updateCryptoInfo(crypto);
    
    // Recalcular la compra
    calculatePurchase();
}

function updateCryptoInfo(crypto) {
    // Actualizar nombre y precio
    const cryptoNameElement = document.getElementById('cryptoName');
    const cryptoPriceElement = document.getElementById('cryptoPrice');
    
    if (cryptoNameElement) {
        cryptoNameElement.textContent = `${crypto.name} (${crypto.symbol})`;
    }
    
    if (cryptoPriceElement) {
        cryptoPriceElement.textContent = `Precio: $${parseFloat(crypto.current_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
    }
    
    // Actualizar símbolo del input de cantidad
    updateAmountPlaceholder();
}

function updateAmountPlaceholder() {
    const amountType = document.getElementById('amountType').value;
    const amountInput = document.getElementById('amount');
    const amountSymbol = document.getElementById('amountSymbol');
    
    if (amountInput && amountSymbol) {
        if (amountType === 'crypto') {
            amountInput.placeholder = '0.000000';
            if (currentCrypto) {
                amountSymbol.textContent = currentCrypto.symbol;
            }
        } else {
            amountInput.placeholder = '0.00';
            amountSymbol.textContent = 'USD';
        }
    }
    
    calculatePurchase();
}

function calculatePurchase() {
    if (!currentCrypto) return;
    
    const amountType = document.getElementById('amountType').value;
    const amountInput = document.getElementById('amount');
    const amount = parseFloat(amountInput.value) || 0;
    const price = parseFloat(currentCrypto.current_price || 0);
    
    let cryptoAmount, usdAmount;
    
    if (amountType === 'crypto') {
        cryptoAmount = amount;
        usdAmount = amount * price;
    } else {
        usdAmount = amount;
        cryptoAmount = amount / price;
    }
    
    const fee = usdAmount * (FEE_PERCENTAGE / 100);
    const total = usdAmount + fee;
    
    updatePurchaseSummary(cryptoAmount, usdAmount, fee, total);
}

function updatePurchaseSummary(cryptoAmount, usdAmount, fee, total) {
    const totalCostElement = document.getElementById('totalCost');
    const feeAmountElement = document.getElementById('feeAmount');
    const finalTotalElement = document.getElementById('finalTotal');
    
    if (totalCostElement) {
        totalCostElement.textContent = `$${usdAmount.toFixed(2)}`;
    }
    
    if (feeAmountElement) {
        feeAmountElement.textContent = `$${fee.toFixed(2)}`;
    }
    
    if (finalTotalElement) {
        finalTotalElement.textContent = `$${total.toFixed(2)}`;
    }
}

async function executePurchase() {
    console.log('🎯 INICIANDO PROCESO DE COMPRA...');
    console.log('📊 Crypto actual:', currentCrypto);
    console.log('👤 Datos de usuario:', window.Auth.getUser());
    
    if (!currentCrypto) {
        showAlert('Error: No hay criptomoneda seleccionada', 'error');
        return;
    }

    const user = window.Auth.getUser();
    const amountType = document.getElementById('amountType').value;
    const amountInput = document.getElementById('amount');
    const amount = parseFloat(amountInput.value);
    const price = parseFloat(currentCrypto.current_price);
    
    // Validar cantidad
    if (isNaN(amount) || amount <= 0) {
        showAlert('Por favor ingresa una cantidad válida', 'error');
        return;
    }
    
    let cryptoAmount, usdAmount;
    
    if (amountType === 'crypto') {
        cryptoAmount = amount;
        usdAmount = amount * price;
    } else {
        usdAmount = amount;
        cryptoAmount = amount / price;
    }
    
    const fee = usdAmount * (FEE_PERCENTAGE / 100);
    const finalTotal = usdAmount + fee;
    
    // Verificar saldo
    if (user.balance < finalTotal) {
        showAlert(`Saldo insuficiente. Necesitas: $${finalTotal.toFixed(2)}`, 'error');
        return;
    }
    
    // Mostrar estado de procesamiento
    const buyButton = document.getElementById('buyButton');
    if (buyButton) {
        buyButton.disabled = true;
        buyButton.textContent = 'Procesando...';
    }
    
    try {
        console.log('=== 🚀 ENVIANDO COMPRA AL SERVIDOR ===');
        console.log('📊 Crypto actual:', currentCrypto);
        
        // Validar que el ID sea un número
        if (!currentCrypto || typeof currentCrypto.id !== 'number') {
            throw new Error('ID de criptomoneda inválido');
        }
        
        // Calcular la cantidad exacta de crypto a comprar
        let finalCryptoAmount;
        if (amountType === 'crypto') {
            finalCryptoAmount = amount; // Ya está en unidades de crypto
        } else {
            finalCryptoAmount = amount / price; // Convertir de USD a crypto
        }
        
        console.log('💰 Monto a comprar:', finalCryptoAmount);
        
        // Validar que los datos son válidos
        const cryptoId = parseInt(currentCrypto.id);
        if (isNaN(cryptoId) || cryptoId <= 0) {
            throw new Error('ID de criptomoneda inválido');
        }

        if (isNaN(finalCryptoAmount) || finalCryptoAmount <= 0) {
            throw new Error('Cantidad inválida');
        }

        // Construir el objeto con los datos validados y el tipo de transacción
        const purchaseData = {
            crypto_id: cryptoId,
            amount: finalCryptoAmount,
            type: 'buy',                               // Agregar el tipo explícitamente
            price: currentCrypto.current_price,        // Agregar el precio actual
            total: finalCryptoAmount * currentCrypto.current_price  // Agregar el total
        };

        // Log para depuración
        console.log('📤 Datos de compra a enviar:', {
            datos: purchaseData,
            validación: {
                tipoId: typeof purchaseData.crypto_id,
                tipoAmount: typeof purchaseData.amount,
                tipoPrice: typeof purchaseData.price,
                tipoTotal: typeof purchaseData.total,
                esNúmero: !isNaN(purchaseData.crypto_id) && !isNaN(purchaseData.amount),
                amountType
            }
        });

        console.log('📤 Datos de compra:', purchaseData);

        const result = await window.API.buyCryptocurrency(purchaseData);
        
        console.log('✅ COMPRA EXITOSA EN SERVIDOR:', result);

        // 1) Actualizar balance local si el servidor devuelve new_balance
        if (result.new_balance !== undefined) {
            // Actualizar localStorage y el módulo Auth
            if (window.Auth && typeof window.Auth.updateUser === 'function') {
                window.Auth.updateUser({ balance: result.new_balance });
            } else {
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                storedUser.balance = result.new_balance;
                localStorage.setItem('user', JSON.stringify(storedUser));
            }

            // Actualizar el elemento de balance en la UI si existe
            const balanceElement = document.getElementById('availableBalance');
            if (balanceElement) {
                balanceElement.textContent = `$${parseFloat(result.new_balance).toFixed(2)}`;
            }

            console.log('👤 Balance actualizado localmente a:', result.new_balance);
        }

        // 2) Actualizar portafolio y transacciones locales pidiéndoselas al backend
        try {
            if (window.API && typeof window.API.getPortfolio === 'function') {
                const portfolio = await window.API.getPortfolio();
                if (portfolio) {
                    localStorage.setItem('userPortfolio', JSON.stringify(portfolio));
                    console.log('📦 Portafolio actualizado desde servidor:', portfolio);
                }
            }

            if (window.API && typeof window.API.getTransactions === 'function') {
                const transactions = await window.API.getTransactions();
                if (transactions) {
                    localStorage.setItem('transactions', JSON.stringify(transactions));
                    console.log('🧾 Transacciones actualizadas desde servidor:', transactions.length);
                }
            }
        } catch (err) {
            console.warn('⚠️ No se pudo actualizar portafolio/transacciones:', err.message || err);
        }

        showAlert(`¡Compra exitosa! Has comprado ${finalCryptoAmount.toFixed(6)} ${currentCrypto.symbol}`, 'success');

        // Redirigir después de éxito
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('❌ ERROR EN LA COMPRA:', error);
        
        if (error.message.includes('Failed to fetch')) {
            showAlert('Error de conexión. Verifica tu internet.', 'error');
        } else if (error.message.includes('401')) {
            showAlert('Sesión expirada. Por favor inicia sesión nuevamente.', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showAlert(`Error en la compra: ${error.message}`, 'error');
        }
        
    } finally {
        // Restaurar botón siempre
        const buyButton = document.getElementById('buyButton');
        if (buyButton) {
            buyButton.disabled = false;
            buyButton.textContent = 'Confirmar Compra';
        }
    }
}

function showAlert(message, type) {
    // Remover alertas existentes
    const existingAlerts = document.querySelectorAll('.custom-alert');
    existingAlerts.forEach(alert => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    });
    
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
                     type === 'info' ? '#3498db' :
                     '#27ae60'};
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 5000);
}

console.log('✅ comprar.js cargado exitosamente');