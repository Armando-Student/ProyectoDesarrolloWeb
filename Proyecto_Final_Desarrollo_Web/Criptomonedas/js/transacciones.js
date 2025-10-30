document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    checkAuth();
    
    // Cargar datos según la página
    if (window.location.pathname.includes('comprar.html')) {
        loadBuyPage();
    } else if (window.location.pathname.includes('vender.html')) {
        loadSellPage();
    }
    
    // Event listener para logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
});

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Mostrar nombre de usuario
    document.getElementById('userWelcome').textContent = `Bienvenido, ${user.name}`;
    return user;
}

function loadBuyPage() {
    const user = JSON.parse(localStorage.getItem('user'));
    const selectedCrypto = localStorage.getItem('selectedCrypto') || 'bitcoin';
    
    // Cargar información de la criptomoneda
    loadCryptoInfo(selectedCrypto, 'buy');
    
    // Mostrar saldo disponible
    document.getElementById('availableBalance').textContent = 
        `$${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    
    // Event listeners para el formulario
    const amountInput = document.getElementById('amount');
    const buyForm = document.getElementById('buyForm');
    
    amountInput.addEventListener('input', calculateBuyTotal);
    buyForm.addEventListener('submit', processBuy);
}

function loadSellPage() {
    const user = JSON.parse(localStorage.getItem('user'));
    const selectedCrypto = localStorage.getItem('selectedCrypto') || 'bitcoin';
    
    // Cargar información de la criptomoneda
    loadCryptoInfo(selectedCrypto, 'sell');
    
    // Mostrar saldo disponible
    document.getElementById('availableBalance').textContent = 
        `$${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    
    // Event listeners para el formulario
    const amountInput = document.getElementById('amount');
    const sellForm = document.getElementById('sellForm');
    
    amountInput.addEventListener('input', calculateSellTotal);
    sellForm.addEventListener('submit', processSell);
}

function loadCryptoInfo(cryptoId, action) {
    const cryptocurrencies = {
        'bitcoin': { name: 'Bitcoin', symbol: 'BTC', price: 45000.75 },
        'ethereum': { name: 'Ethereum', symbol: 'ETH', price: 3200.50 },
        'dogecoin': { name: 'Dogecoin', symbol: 'DOGE', price: 0.15 }
    };
    
    const crypto = cryptocurrencies[cryptoId] || cryptocurrencies['bitcoin'];
    const cryptoInfo = document.getElementById('cryptoInfo');
    
    cryptoInfo.innerHTML = `
        <div class="crypto-selected">
            <div>
                <div class="crypto-name-large">${crypto.name}</div>
                <div class="crypto-price-large">$${crypto.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="crypto-symbol-badge">${crypto.symbol}</div>
        </div>
    `;
    
    // Guardar información de la cripto para cálculos
    localStorage.setItem('currentCrypto', JSON.stringify(crypto));
}

function calculateBuyTotal() {
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const crypto = JSON.parse(localStorage.getItem('currentCrypto'));
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (crypto && amount > 0) {
        const totalCost = amount * crypto.price;
        document.getElementById('totalCost').value = `$${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        
        // Calcular saldo después
        const balanceAfter = user.balance - totalCost;
        document.getElementById('balanceAfter').innerHTML = 
            `Saldo después: <span>$${balanceAfter.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>`;
        
        // Habilitar/deshabilitar botón según fondos
        const buyButton = document.getElementById('buyButton');
        if (totalCost > user.balance) {
            buyButton.disabled = true;
            buyButton.title = 'Fondos insuficientes';
        } else {
            buyButton.disabled = false;
            buyButton.title = '';
        }
    }
}

function calculateSellTotal() {
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const crypto = JSON.parse(localStorage.getItem('currentCrypto'));
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (crypto && amount > 0) {
        const totalEarn = amount * crypto.price;
        document.getElementById('totalEarn').value = `$${totalEarn.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        
        // Calcular saldo después
        const balanceAfter = user.balance + totalEarn;
        document.getElementById('balanceAfter').innerHTML = 
            `Saldo después: <span>$${balanceAfter.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>`;
    }
}

function processBuy(e) {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('amount').value);
    const crypto = JSON.parse(localStorage.getItem('currentCrypto'));
    const user = JSON.parse(localStorage.getItem('user'));
    
    const totalCost = amount * crypto.price;
    
    if (totalCost > user.balance) {
        showAlert('Fondos insuficientes para realizar esta compra', 'error');
        return;
    }
    
    // Procesar compra vía backend si es posible
    (async () => {
        const buyButton = document.getElementById('buyButton');
        buyButton.textContent = 'Procesando...';
        buyButton.disabled = true;

        const buyData = {
            cryptocurrency_id: crypto.id || null,
            symbol: crypto.symbol,
            amount: amount,
            price: crypto.price
        };

            try {
            const endpoint = (typeof API_ENDPOINTS !== 'undefined' && API_ENDPOINTS.BUY) ? API_ENDPOINTS.BUY : '/api/transactions';

            const result = (typeof apiRequest === 'function')
                ? await apiRequest(endpoint, { method: 'POST', body: JSON.stringify(buyData) })
                : await (async () => {
                    const url = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL + endpoint : 'https://proyectodesarrolloweb-production.up.railway.app' + endpoint;
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}) },
                        body: JSON.stringify(buyData)
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return await res.json();
                })();

            console.log('✅ Compra procesada en backend:', result);

            // Actualizar balance si el servidor lo devuelve
            if (result.new_balance !== undefined) {
                if (window.Auth && typeof window.Auth.updateUser === 'function') {
                    window.Auth.updateUser({ balance: result.new_balance });
                } else {
                    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                    storedUser.balance = result.new_balance;
                    localStorage.setItem('user', JSON.stringify(storedUser));
                }

                const balanceEl = document.getElementById('availableBalance');
                if (balanceEl) balanceEl.textContent = `$${parseFloat(result.new_balance).toFixed(2)}`;
            }

            if (result.portfolio) localStorage.setItem('userPortfolio', JSON.stringify(result.portfolio));

            // Intentar refrescar portfolio y transacciones desde el servidor
            try {
                if (window.API && typeof window.API.getPortfolio === 'function') {
                    const portfolio = await window.API.getPortfolio();
                    if (portfolio) localStorage.setItem('userPortfolio', JSON.stringify(portfolio));
                }

                if (window.API && typeof window.API.getTransactions === 'function') {
                    const tx = await window.API.getTransactions();
                    if (tx) localStorage.setItem('transactions', JSON.stringify(tx));
                }
            } catch (err) {
                console.warn('No se pudo refrescar portfolio/transacciones:', err.message || err);
            }

            showAlert(`¡Compra exitosa! Has comprado ${amount} ${crypto.symbol}`, 'success');
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);

        } catch (err) {
            console.error('❌ Error procesando compra en el servidor:', err);
            showAlert('Error al procesar la compra: ' + (err.message || 'Error de servidor'), 'error');
            const buyButton = document.getElementById('buyButton');
            buyButton.textContent = 'Comprar';
            buyButton.disabled = false;
            return;
        }
    })();
}

function processSell(e) {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('amount').value);
    const crypto = JSON.parse(localStorage.getItem('currentCrypto'));
    const user = JSON.parse(localStorage.getItem('user'));
    
    const totalEarn = amount * crypto.price;
    
    (async () => {
        const sellButton = document.getElementById('sellButton');
        sellButton.textContent = 'Procesando...';
        sellButton.disabled = true;

        const sellData = {
            cryptocurrency_id: crypto.id || null,
            symbol: crypto.symbol,
            amount: amount,
            price: crypto.price
        };

            try {
            const endpoint = (typeof API_ENDPOINTS !== 'undefined' && API_ENDPOINTS.SELL) ? API_ENDPOINTS.SELL : '/api/transactions';

            const result = (typeof apiRequest === 'function')
                ? await apiRequest(endpoint, { method: 'POST', body: JSON.stringify(sellData) })
                : await (async () => {
                    const url = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL + endpoint : 'https://proyectodesarrolloweb-production.up.railway.app' + endpoint;
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}) },
                        body: JSON.stringify(sellData)
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return await res.json();
                })();

            console.log('✅ Venta procesada en backend:', result);

            // Actualizar balance si el servidor lo devuelve
            if (result.new_balance !== undefined) {
                if (window.Auth && typeof window.Auth.updateUser === 'function') {
                    window.Auth.updateUser({ balance: result.new_balance });
                } else {
                    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                    storedUser.balance = result.new_balance;
                    localStorage.setItem('user', JSON.stringify(storedUser));
                }

                const balanceEl = document.getElementById('availableBalance');
                if (balanceEl) balanceEl.textContent = `$${parseFloat(result.new_balance).toFixed(2)}`;
            }

            if (result.portfolio) localStorage.setItem('userPortfolio', JSON.stringify(result.portfolio));

            // Intentar refrescar portfolio y transacciones desde el servidor
            try {
                if (window.API && typeof window.API.getPortfolio === 'function') {
                    const portfolio = await window.API.getPortfolio();
                    if (portfolio) localStorage.setItem('userPortfolio', JSON.stringify(portfolio));
                }

                if (window.API && typeof window.API.getTransactions === 'function') {
                    const tx = await window.API.getTransactions();
                    if (tx) localStorage.setItem('transactions', JSON.stringify(tx));
                }
            } catch (err) {
                console.warn('No se pudo refrescar portfolio/transacciones:', err.message || err);
            }

            showAlert(`¡Venta exitosa! Has vendido ${amount} ${crypto.symbol}`, 'success');
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);

        } catch (err) {
            console.error('❌ Error procesando venta en el servidor:', err);
            showAlert('Error al procesar la venta: ' + (err.message || 'Error de servidor'), 'error');
            const sellButton = document.getElementById('sellButton');
            sellButton.textContent = 'Confirmar Venta';
            sellButton.disabled = false;
            return;
        }
    })();
}

// Transaction saving is now handled by the server API

function showAlert(message, type) {
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    if (type === 'error') {
        alert.style.background = '#e74c3c';
    } else {
        alert.style.background = '#27ae60';
    }
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Agregar estilos para la animación
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);