// dashboard.js - CORREGIDO
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
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user) {
        window.location.href = 'login.html';
        return;
    }

    // Mostrar datos del usuario desde localStorage
    document.getElementById('userWelcome').textContent = `Bienvenido, ${user.name || user.email}`;
    document.getElementById('currentBalance').textContent = 
        `$${parseFloat(user.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

async function loadDashboardData() {
    try {
        await loadMarketData();      // Criptomonedas disponibles
        await loadPortfolio();       // Portafolio del usuario  
        await loadRecentTransactions(); // Transacciones
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showAlert('Error cargando datos del servidor', 'error');
    }
}

async function loadPortfolio() {
    try {
        console.log('🔄 Cargando portafolio desde API...');
        
        // ✅ USAR ENDPOINT QUE SÍ EXISTE: /api/portfolio
        const portfolio = await window.API.getPortfolio();
        console.log('✅ Portafolio cargado desde API:', portfolio);
        
        displayPortfolio(portfolio);
        
    } catch (error) {
        console.error('Error al cargar el portafolio:', error);
        showAlert('Error al cargar el portafolio', 'error');
        
        // Mostrar mensaje de portafolio vacío
        const portfolioTable = document.getElementById('portfolioTable');
        if (portfolioTable) {
            portfolioTable.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-message">
                        No se pudo cargar el portafolio. Intenta más tarde.
                    </td>
                </tr>
            `;
        }
    }
}

function displayPortfolio(portfolio) {
    const portfolioTable = document.getElementById('portfolioTable');
    
    if (!portfolioTable) {
        console.error('Elemento portfolioTable no encontrado');
        return;
    }
    
    if (!portfolio || portfolio.length === 0) {
        portfolioTable.innerHTML = `
            <tr>
                <td colspan="6" class="empty-message">
                    No tienes criptomonedas en tu portafolio aún.
                    ¡Comienza a invertir!
                </td>
            </tr>
        `;
        return;
    }
    
    portfolioTable.innerHTML = '';
    
    let totalValue = 0;
    
    portfolio.forEach(asset => {
        const currentPrice = parseFloat(asset.current_price || asset.price || 0);
        const amount = parseFloat(asset.amount || asset.quantity || 0);
        const value = currentPrice * amount;
        totalValue += value;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong>${asset.name || asset.cryptocurrency_name}</strong>
                <div class="symbol">${asset.symbol || asset.cryptocurrency_symbol}</div>
            </td>
            <td>${amount.toFixed(6)}</td>
            <td>$${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td>$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td class="change-positive">+0.00%</td>
            <td>
                <button class="btn-buy" onclick="redirectToBuy('${asset.symbol || asset.cryptocurrency_symbol}')">Comprar</button>
                <button class="btn-sell" onclick="redirectToSell('${asset.symbol || asset.cryptocurrency_symbol}')">Vender</button>
            </td>
        `;
        
        portfolioTable.appendChild(row);
    });
    
    // Actualizar valor total del portafolio
    const portfolioValueElement = document.getElementById('portfolioValue');
    if (portfolioValueElement) {
        portfolioValueElement.textContent = `Total: $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }
}

async function loadRecentTransactions() {
    try {
        console.log('🔄 Cargando transacciones recientes...');
        
        // ✅ USAR ENDPOINT QUE SÍ EXISTE: /api/transactions
        const transactions = await window.API.getTransactions();
        console.log('✅ Transacciones cargadas desde API:', transactions);
        
        displayRecentTransactions(transactions);
        
    } catch (error) {
        console.error('Error al cargar transacciones:', error);
        showAlert('Error al cargar transacciones', 'error');
        
        // Mostrar mensaje de no hay transacciones
        const recentTransactionsElement = document.getElementById('recentTransactions');
        if (recentTransactionsElement) {
            recentTransactionsElement.innerHTML = `
                <div class="empty-message">
                    No se pudieron cargar las transacciones. Intenta más tarde.
                </div>
            `;
        }
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
            <div class="empty-message">
                No hay transacciones recientes.
            </div>
        `;
        return;
    }
    
    transactionsList.innerHTML = '';
    
    // Ordenar transacciones por fecha (más recientes primero) y tomar las últimas 5
    const recentTransactions = transactions
        .sort((a, b) => new Date(b.date || b.created_at || b.timestamp) - new Date(a.date || a.created_at || a.timestamp))
        .slice(0, 5);
    
    recentTransactions.forEach(transaction => {
        const transactionElement = document.createElement('div');
        transactionElement.className = 'transaction-item';
        
        const transactionType = transaction.type || 'buy';
        const amount = parseFloat(transaction.amount || transaction.quantity || 0);
        const symbol = transaction.symbol || transaction.cryptocurrency_symbol || 'CRYPTO';
        const total = parseFloat(transaction.total || transaction.total_amount || 0);
        const date = new Date(transaction.date || transaction.created_at || transaction.timestamp);
        
        transactionElement.innerHTML = `
            <div class="transaction-type ${transactionType}">
                ${transactionType === 'buy' ? 'COMPRA' : 'VENTA'}
            </div>
            <div class="transaction-details">
                <strong>${symbol}</strong>
                <div class="transaction-date">${date.toLocaleDateString()}</div>
            </div>
            <div class="transaction-amount ${transactionType}">
                <div>${transactionType === 'buy' ? '+' : '-'}${amount.toFixed(4)} ${symbol}</div>
                <div class="transaction-total">$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
        `;
        
        transactionsList.appendChild(transactionElement);
    });
}

async function loadMarketData() {
    try {
        console.log('🔄 Cargando datos de mercado...');
        
        // ✅ USAR ENDPOINT QUE SÍ EXISTE: /api/cryptocurrencies
        const cryptocurrencies = await window.API.getCryptocurrencies();
        console.log('✅ Datos de mercado cargados:', cryptocurrencies);
        
        displayMarketData(cryptocurrencies);
        
    } catch (error) {
        console.error('Error al cargar datos de mercado:', error);
        showAlert('Error al cargar datos de mercado', 'error');
        
        const marketGrid = document.getElementById('marketGrid');
        if (marketGrid) {
            marketGrid.innerHTML = '<p class="error-message">No se pudieron cargar los datos del mercado</p>';
        }
    }
}

function displayMarketData(cryptocurrencies) {
    const marketGrid = document.getElementById('marketGrid');
    
    if (!marketGrid) {
        console.error('Elemento marketGrid no encontrado');
        return;
    }
    
    if (!cryptocurrencies || cryptocurrencies.length === 0) {
        marketGrid.innerHTML = '<p class="empty-message">No hay criptomonedas disponibles</p>';
        return;
    }
    
    marketGrid.innerHTML = '';
    
    cryptocurrencies.forEach(crypto => {
        const price = parseFloat(crypto.current_price || 0);
        const changePercent = (Math.random() * 10 - 5).toFixed(2); // Simular cambio %
        const changePositive = changePercent >= 0;
        
        const cryptoCard = document.createElement('div');
        cryptoCard.className = 'crypto-card';
        cryptoCard.innerHTML = `
            <div class="crypto-header">
                <h4>${crypto.name} (${crypto.symbol})</h4>
                <span class="crypto-price">$${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="crypto-change ${changePositive ? 'positive' : 'negative'}">
                ${changePositive ? '+' : ''}${changePercent}%
            </div>
            <div class="crypto-actions">
                <button class="btn-buy" onclick="redirectToBuy('${crypto.symbol}')">Comprar</button>
                <button class="btn-sell" onclick="redirectToSell('${crypto.symbol}')">Vender</button>
            </div>
        `;
        
        marketGrid.appendChild(cryptoCard);
    });
}

// Las demás funciones se mantienen igual (setupEventListeners, logout, showAlert, etc.)
function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('refreshBtn').addEventListener('click', refreshData);
}

function refreshData() {
    console.log('🔄 Actualizando datos...');
    showAlert('Actualizando datos...', 'success');
    loadDashboardData();
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('userPortfolio');
    localStorage.removeItem('transactions');
    showAlert('Sesión cerrada correctamente', 'success');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1500);
}

function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
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
        background: ${type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#27ae60'};
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) alert.remove();
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