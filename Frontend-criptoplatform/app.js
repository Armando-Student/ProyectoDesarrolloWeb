// Configuración con Proxy CORS
const API_BASE_URL = 'https://corsproxy.io/?https://proyectodesarrolloweb-production.up.railway.app/api';

// Elementos del DOM
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const userNav = document.getElementById('userNav');
const loginForm = document.getElementById('loginForm');
const registerUserForm = document.getElementById('registerUserForm');
const registerForm = document.getElementById('registerForm');
const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');
const logoutBtn = document.getElementById('logoutBtn');
const userBalance = document.getElementById('userBalance');
const currentBalance = document.getElementById('currentBalance');
const userName = document.getElementById('userName');
const cryptoSelect = document.getElementById('cryptoSelect');
const cryptoList = document.getElementById('cryptoList');
const transactionForm = document.getElementById('transactionForm');
const portfolioList = document.getElementById('portfolioList');
const transactionHistory = document.getElementById('transactionHistory');
const cryptoAmount = document.getElementById('cryptoAmount');
const unitPrice = document.getElementById('unitPrice');
const totalPrice = document.getElementById('totalPrice');
const transactionType = document.getElementById('transactionType');
const loadingSpinner = document.getElementById('loadingSpinner');

let currentUser = null;
let authToken = null;
let cryptocurrencies = [];

// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);
loginForm.addEventListener('submit', handleLogin);
registerUserForm.addEventListener('submit', handleRegister);
showRegisterLink.addEventListener('click', showRegisterForm);
showLoginLink.addEventListener('click', showLoginForm);
logoutBtn.addEventListener('click', handleLogout);
cryptoSelect.addEventListener('change', updatePriceInfo);
cryptoAmount.addEventListener('input', updateTotalPrice);
transactionType.addEventListener('change', updateTransactionForm);
transactionForm.addEventListener('submit', executeTransaction);

// Función para hacer fetch con proxy
async function apiFetch(endpoint, options = {}) {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent('https://proyectodesarrolloweb-production.up.railway.app/api' + endpoint)}`;
    
    console.log('🔗 Fetching:', endpoint);
    
    const response = await fetch(proxyUrl, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return await response.json();
}

// Inicializar aplicación
function initApp() {
    showLoading(false);
    
    const savedToken = localStorage.getItem('crypto_token');
    const savedUser = localStorage.getItem('crypto_user');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showDashboard();
        loadDashboardData();
    }
}

// Mostrar/ocultar loading
function showLoading(show = true) {
    if (show) {
        loadingSpinner.classList.remove('d-none');
    } else {
        loadingSpinner.classList.add('d-none');
    }
}

// Mostrar sección de login
function showLoginSection() {
    loginSection.style.display = 'block';
    dashboardSection.classList.add('d-none');
    userNav.classList.add('d-none');
}

// Mostrar dashboard
function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.classList.remove('d-none');
    userNav.classList.remove('d-none');
    
    userBalance.textContent = `Balance: $${currentUser.balance.toLocaleString()}`;
    currentBalance.textContent = `$${currentUser.balance.toLocaleString()}`;
    userName.textContent = currentUser.name;
}

// Manejar login
async function handleLogin(e) {
    e.preventDefault();
    showLoading(true);
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const data = await apiFetch('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        authToken = data.token;
        currentUser = data.user;
        
        localStorage.setItem('crypto_token', authToken);
        localStorage.setItem('crypto_user', JSON.stringify(currentUser));
        
        showDashboard();
        loadDashboardData();
        showAlert('Login exitoso!', 'success');
        
    } catch (error) {
        showAlert(`Error: ${error.message}`, 'danger');
    } finally {
        showLoading(false);
    }
}

// Manejar registro
async function handleRegister(e) {
    e.preventDefault();
    showLoading(true);
    
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    
    try {
        const data = await apiFetch('/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
        
        showAlert('Usuario registrado exitosamente! Ahora puedes iniciar sesión.', 'success');
        showLoginForm();
        
    } catch (error) {
        showAlert(`Error: ${error.message}`, 'danger');
    } finally {
        showLoading(false);
    }
}

// Mostrar formulario de registro
function showRegisterForm(e) {
    if (e) e.preventDefault();
    loginForm.closest('.card').style.display = 'none';
    registerForm.style.display = 'block';
}

// Mostrar formulario de login
function showLoginForm(e) {
    if (e) e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.closest('.card').style.display = 'block';
}

// Manejar logout
function handleLogout(e) {
    e.preventDefault();
    
    authToken = null;
    currentUser = null;
    localStorage.removeItem('crypto_token');
    localStorage.removeItem('crypto_user');
    
    showLoginSection();
    showAlert('Sesión cerrada exitosamente', 'info');
}

// Cargar datos del dashboard
async function loadDashboardData() {
    showLoading(true);
    
    try {
        await Promise.all([
            loadCryptocurrencies(),
            loadPortfolio(),
            loadTransactionHistory()
        ]);
    } catch (error) {
        showAlert('Error cargando datos del dashboard', 'danger');
    } finally {
        showLoading(false);
    }
}

// Cargar criptomonedas
async function loadCryptocurrencies() {
    try {
        cryptocurrencies = await apiFetch('/cryptocurrencies');
        renderCryptoList();
        populateCryptoSelect();
    } catch (error) {
        showAlert('Error cargando criptomonedas', 'danger');
    }
}

// Renderizar lista de criptomonedas
function renderCryptoList() {
    cryptoList.innerHTML = '';
    
    cryptocurrencies.forEach(crypto => {
        const col = document.createElement('div');
        col.className = 'col-md-4 mb-3';
        
        col.innerHTML = `
            <div class="card crypto-card h-100">
                <div class="card-body">
                    <h5 class="card-title">${crypto.name} (${crypto.symbol})</h5>
                    <h3 class="card-text">$${crypto.current_price.toLocaleString()}</h3>
                    <p class="text-muted">Precio actual</p>
                </div>
            </div>
        `;
        
        cryptoList.appendChild(col);
    });
}

// Poblar select de criptomonedas
function populateCryptoSelect() {
    cryptoSelect.innerHTML = '';
    
    cryptocurrencies.forEach(crypto => {
        const option = document.createElement('option');
        option.value = crypto.id;
        option.textContent = `${crypto.name} (${crypto.symbol})`;
        option.setAttribute('data-price', crypto.current_price);
        cryptoSelect.appendChild(option);
    });
    
    if (cryptocurrencies.length > 0) {
        updatePriceInfo();
    }
}

// Actualizar información de precios
function updatePriceInfo() {
    const selectedOption = cryptoSelect.options[cryptoSelect.selectedIndex];
    const price = selectedOption.getAttribute('data-price');
    unitPrice.value = `$${parseFloat(price).toLocaleString()}`;
    updateTotalPrice();
}

// Actualizar precio total
function updateTotalPrice() {
    const selectedOption = cryptoSelect.options[cryptoSelect.selectedIndex];
    const price = parseFloat(selectedOption.getAttribute('data-price'));
    const amount = parseFloat(cryptoAmount.value) || 0;
    const total = price * amount;
    totalPrice.value = `$${total.toLocaleString()}`;
}

// Actualizar formulario de transacción
function updateTransactionForm() {
    const btn = document.getElementById('transactionBtn');
    if (transactionType.value === 'buy') {
        btn.className = 'btn btn-success w-100';
        btn.innerHTML = '<i class="fas fa-arrow-up me-2"></i>Comprar';
    } else {
        btn.className = 'btn btn-danger w-100';
        btn.innerHTML = '<i class="fas fa-arrow-down me-2"></i>Vender';
    }
}

// Ejecutar transacción
async function executeTransaction(e) {
    e.preventDefault();
    showLoading(true);
    
    const cryptoId = cryptoSelect.value;
    const amount = parseFloat(cryptoAmount.value);
    const type = transactionType.value;
    
    if (!cryptoId || !amount || amount <= 0) {
        showAlert('Por favor ingresa una cantidad válida', 'warning');
        showLoading(false);
        return;
    }
    
    try {
        const data = await apiFetch(`/transaction/${type}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ crypto_id: cryptoId, amount })
        });
        
        showAlert(data.message, 'success');
        
        if (data.new_balance) {
            currentUser.balance = data.new_balance;
            localStorage.setItem('crypto_user', JSON.stringify(currentUser));
            userBalance.textContent = `Balance: $${currentUser.balance.toLocaleString()}`;
            currentBalance.textContent = `$${currentUser.balance.toLocaleString()}`;
        }
        
        await loadDashboardData();
        
        cryptoAmount.value = '';
        updateTotalPrice();
        
    } catch (error) {
        showAlert(error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

// Cargar portafolio
async function loadPortfolio() {
    try {
        const portfolio = await apiFetch('/portfolio', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        renderPortfolio(portfolio);
    } catch (error) {
        portfolioList.innerHTML = `<tr><td colspan="4" class="text-center text-muted">${error.message}</td></tr>`;
    }
}

// Renderizar portafolio
function renderPortfolio(portfolio) {
    if (portfolio.length === 0) {
        portfolioList.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">
                    No tienes criptomonedas en tu portafolio
                </td>
            </tr>
        `;
        return;
    }
    
    portfolioList.innerHTML = '';
    
    portfolio.forEach(item => {
        const crypto = cryptocurrencies.find(c => c.id == item.id) || item;
        const currentPrice = crypto.current_price || 0;
        const totalValue = currentPrice * item.amount;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name} (${item.symbol})</td>
            <td>${parseFloat(item.amount).toFixed(8)}</td>
            <td>$${currentPrice.toLocaleString()}</td>
            <td>$${totalValue.toLocaleString()}</td>
        `;
        portfolioList.appendChild(tr);
    });
}

// Cargar historial de transacciones
async function loadTransactionHistory() {
    try {
        const transactions = await apiFetch('/transactions', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        renderTransactionHistory(transactions);
    } catch (error) {
        transactionHistory.innerHTML = `<tr><td colspan="6" class="text-center text-muted">${error.message}</td></tr>`;
    }
}

// Renderizar historial de transacciones
function renderTransactionHistory(transactions) {
    if (transactions.length === 0) {
        transactionHistory.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    No hay transacciones registradas
                </td>
            </tr>
        `;
        return;
    }
    
    transactionHistory.innerHTML = '';
    
    transactions.forEach(transaction => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(transaction.created_at).toLocaleString()}</td>
            <td class="${transaction.type}">${transaction.type === 'buy' ? 'Compra' : 'Venta'}</td>
            <td>${transaction.name} (${transaction.symbol})</td>
            <td>${parseFloat(transaction.amount).toFixed(8)}</td>
            <td>$${parseFloat(transaction.price).toLocaleString()}</td>
            <td>$${parseFloat(transaction.total).toLocaleString()}</td>
        `;
        transactionHistory.appendChild(tr);
    });
}

// Mostrar alertas
function showAlert(message, type) {
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.insertBefore(alertDiv, document.body.firstChild);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}