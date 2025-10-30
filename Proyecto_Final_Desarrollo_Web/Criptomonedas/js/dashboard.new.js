document.addEventListener('DOMContentLoaded', async function() {
    try {
        await checkAuth();
        await loadDashboardData();
        setupEventListeners();
    } catch (error) {
        console.error('Error al cargar el dashboard:', error);
        showAlert('Error al cargar los datos del dashboard', 'error');
    }
});

async function checkAuth() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // Obtener el perfil del usuario desde la API
        const userProfile = await window.API.apiRequest(window.API.ENDPOINTS.USER_PROFILE);
        console.log('✅ Perfil de usuario cargado:', userProfile);
        
        // Actualizar localStorage con los datos más recientes
        localStorage.setItem('user', JSON.stringify(userProfile));
        
        // Actualizar la UI
        document.getElementById('userWelcome').textContent = `Bienvenido, ${userProfile.name || userProfile.email}`;
        document.getElementById('currentBalance').textContent = 
            `$${parseFloat(userProfile.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    } catch (error) {
        console.error('Error al cargar el perfil:', error);
        showAlert('Error al cargar el perfil de usuario', 'error');
        
        // Si hay un error, intentar usar datos locales
        const localUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (localUser.name || localUser.email) {
            document.getElementById('userWelcome').textContent = `Bienvenido, ${localUser.name || localUser.email}`;
            document.getElementById('currentBalance').textContent = 
                `$${parseFloat(localUser.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        }
    }
}

async function loadDashboardData() {
    try {
        await Promise.all([
            loadPortfolio(),
            loadRecentTransactions(),
            loadMarketData()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showAlert('Error al cargar los datos del dashboard', 'error');
    }
}

async function loadPortfolio() {
    try {
        console.log('🔄 Cargando portafolio desde API...');
        const portfolio = await window.API.getPortfolio();
        console.log('✅ Portafolio cargado desde API:', portfolio);
        localStorage.setItem('userPortfolio', JSON.stringify(portfolio));
        displayPortfolio(portfolio);
    } catch (error) {
        console.error('Error al cargar el portafolio:', error);
        showAlert('Error al cargar el portafolio', 'warning');
        const localPortfolio = JSON.parse(localStorage.getItem('userPortfolio') || '[]');
        displayPortfolio(localPortfolio);
    }
}

function displayPortfolio(portfolio) {
    const portfolioTable = document.getElementById('portfolioTable');
    const portfolioValue = document.getElementById('portfolioValue');
    
    if (!portfolioTable || !portfolioValue) {
        console.error('Elementos del portafolio no encontrados');
        return;
    }
    
    if (!portfolio || portfolio.length === 0) {
        portfolioTable.innerHTML = `
            <tr>
                <td colspan="6" class="empty-message">
                    <div class="empty-state">
                        <h3>Tu portafolio está vacío</h3>
                        <p>¡Comienza tu aventura en el mundo cripto!</p>
                        <a href="comprar.html" class="btn-primary">Comprar Criptomonedas</a>
                    </div>
                </td>
            </tr>
        `;
        portfolioValue.textContent = 'Total: $0.00';
        return;
    }
    
    let totalValue = 0;
    portfolioTable.innerHTML = '';
    
    portfolio.forEach(asset => {
        const currentPrice = parseFloat(asset.current_price || asset.price || 0);
        const amount = parseFloat(asset.amount || 0);
        const value = currentPrice * amount;
        const change24h = parseFloat(asset.price_change_percentage_24h || 0);
        
        totalValue += value;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="crypto-name">
                    <strong>${asset.name || asset.symbol.toUpperCase()}</strong>
                    <span class="crypto-symbol">${asset.symbol.toUpperCase()}</span>
                </div>
            </td>
            <td>${amount.toFixed(6)}</td>
            <td>$${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td>$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td>
                <span class="change-24h ${change24h >= 0 ? 'positive' : 'negative'}">
                    ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-buy" onclick="redirectToBuy('${asset.symbol}')">Comprar</button>
                    <button class="btn-sell" onclick="redirectToSell('${asset.symbol}')">Vender</button>
                </div>
            </td>
        `;
        
        portfolioTable.appendChild(row);
    });
    
    portfolioValue.textContent = `Total: $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

async function loadRecentTransactions() {
    try {
        console.log('🔄 Cargando transacciones recientes...');
        const transactions = await window.API.getRecentTransactions();
        console.log('✅ Transacciones cargadas:', transactions);
        localStorage.setItem('recentTransactions', JSON.stringify(transactions));
        displayRecentTransactions(transactions);
    } catch (error) {
        console.error('Error al cargar transacciones:', error);
        showAlert('Error al cargar transacciones', 'warning');
        const localTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        displayRecentTransactions(localTransactions.slice(0, 10));
    }
}

function displayRecentTransactions(transactions) {
    const transactionsList = document.getElementById('recentTransactions');
    
    if (!transactionsList) {
        console.error('Elemento recentTransactions no encontrado');
        return;
    }
    
    if (!transactions || transactions.length === 0) {
        transactionsList.innerHTML = `
            <div class="empty-state">
                <h3>No hay transacciones recientes</h3>
                <p>Tus transacciones aparecerán aquí</p>
            </div>
        `;
        return;
    }
    
    transactionsList.innerHTML = '';
    
    transactions.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at))
              .slice(0, 10)
              .forEach(transaction => {
        const date = new Date(transaction.date || transaction.created_at);
        const element = document.createElement('div');
        element.className = 'transaction-item';
        
        element.innerHTML = `
            <div class="transaction-type ${transaction.type}">
                ${transaction.type === 'buy' ? '🟢 Compra' : '🔴 Venta'}
            </div>
            <div class="transaction-details">
                <span class="transaction-crypto">${transaction.symbol || transaction.cryptocurrency_symbol}</span>
                <span class="transaction-amount">${parseFloat(transaction.amount).toFixed(6)}</span>
            </div>
            <div class="transaction-value">
                $${parseFloat(transaction.total || transaction.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                <span class="transaction-date">${date.toLocaleDateString()} ${date.toLocaleTimeString()}</span>
            </div>
        `;
        
        transactionsList.appendChild(element);
    });
}

async function loadMarketData() {
    try {
        console.log('🔄 Cargando datos de mercado...');
        const marketData = await window.API.apiRequest(window.API.ENDPOINTS.CRYPTOCURRENCIES);
        console.log('✅ Datos de mercado cargados:', marketData);
        displayMarketData(marketData);
    } catch (error) {
        console.error('Error al cargar datos de mercado:', error);
        showAlert('Error al cargar datos de mercado', 'error');
    }
}

function displayMarketData(cryptocurrencies) {
    const marketGrid = document.getElementById('marketGrid');
    
    if (!marketGrid) {
        console.error('Elemento marketGrid no encontrado');
        return;
    }
    
    if (!cryptocurrencies || cryptocurrencies.length === 0) {
        marketGrid.innerHTML = `
            <div class="empty-state">
                <h3>No hay datos de mercado disponibles</h3>
                <p>Intenta recargar la página</p>
            </div>
        `;
        return;
    }
    
    marketGrid.innerHTML = '';
    
    cryptocurrencies.forEach(crypto => {
        const price = parseFloat(crypto.current_price || crypto.price || 0);
        const change24h = parseFloat(crypto.price_change_percentage_24h || 0);
        
        const card = document.createElement('div');
        card.className = 'crypto-card';
        card.innerHTML = `
            <div class="crypto-header">
                <h4>${crypto.name || crypto.symbol.toUpperCase()} (${crypto.symbol.toUpperCase()})</h4>
                <span class="crypto-price">$${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="crypto-details">
                <span class="crypto-change ${change24h >= 0 ? 'positive' : 'negative'}">
                    ${change24h >= 0 ? '↗' : '↘'} ${Math.abs(change24h).toFixed(2)}%
                </span>
                <span class="crypto-volume">
                    Vol. 24h: $${parseFloat(crypto.volume_24h || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
            </div>
            <div class="crypto-actions">
                <button class="btn-buy" onclick="redirectToBuy('${crypto.symbol}')">Comprar</button>
                <button class="btn-sell" onclick="redirectToSell('${crypto.symbol}')">Vender</button>
            </div>
        `;
        
        marketGrid.appendChild(card);
    });
    
    const timestamp = document.createElement('div');
    timestamp.className = 'market-timestamp';
    timestamp.textContent = `Última actualización: ${new Date().toLocaleTimeString()}`;
    marketGrid.appendChild(timestamp);
}

function setupEventListeners() {
    const logoutBtn = document.getElementById('logoutBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            showAlert('Actualizando datos...', 'info');
            loadDashboardData();
        });
    }
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('userPortfolio');
    localStorage.removeItem('transactions');
    localStorage.removeItem('recentTransactions');
    showAlert('Sesión cerrada correctamente', 'success');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1500);
}

function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    // Estilos para el alert
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
    `;
    
    // Color según el tipo
    switch (type) {
        case 'error':
            alert.style.background = '#e74c3c';
            break;
        case 'success':
            alert.style.background = '#27ae60';
            break;
        case 'warning':
            alert.style.background = '#f39c12';
            break;
        default:
            alert.style.background = '#3498db';
    }
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 3000);
}

// Funciones globales para redirección
window.redirectToBuy = function(symbol) {
    localStorage.setItem('selectedCrypto', symbol);
    window.location.href = 'comprar.html';
};

window.redirectToSell = function(symbol) {
    localStorage.setItem('selectedCrypto', symbol);
    window.location.href = 'vender.html';
};

// Verificar si hay una transacción reciente para forzar actualización
if (localStorage.getItem('forceRefresh') === 'true') {
    localStorage.removeItem('forceRefresh');
    setTimeout(loadDashboardData, 1000);
}