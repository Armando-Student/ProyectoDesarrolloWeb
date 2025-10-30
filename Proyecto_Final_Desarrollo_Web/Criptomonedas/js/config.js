// config.js - CONFIGURACIÓN COMPLETA CON TODOS LOS ENDPOINTS DISPONIBLES
const API_BASE_URL = 'https://proyectodesarrolloweb-production.up.railway.app';

// ✅ TODOS LOS ENDPOINTS QUE SÍ EXISTEN EN TU BACKEND
const API_ENDPOINTS = {
    // Autenticación
    LOGIN: '/api/login',
    REGISTER: '/api/register',
    
    // Perfil de usuario
    PROFILE: '/api/profile',
    
    // Criptomonedas
    CRYPTOCURRENCIES: '/api/cryptocurrencies',
    
    // Portafolio
    PORTFOLIO: '/api/portfolio',
    
    // Transacciones
    TRANSACTIONS: '/api/transactions',
    BUY: '/api/transaction/buy',
    SELL: '/api/transaction/sell'
};

// Función principal para hacer requests
async function apiRequest(endpoint, options = {}) {
    // Validar que el endpoint no sea undefined
    if (!endpoint) {
        console.error('❌ Error: endpoint es undefined');
        throw new Error('Endpoint no definido');
    }
    
    const url = API_BASE_URL + endpoint;
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        ...options
    };
    
    // Si hay body, convertirlo a JSON
    if (options.body && typeof options.body !== 'string') {
        defaultOptions.body = JSON.stringify(options.body);
    }
    
    try {
        console.log(`🔄 Request a: ${url}`);
        const response = await fetch(url, defaultOptions);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('✅ Response exitosa:', data);
        return data;
        
    } catch (error) {
        console.error('❌ API Request failed:', error);
        throw error;
    }
}

// ==================== FUNCIONES ESPECÍFICAS ====================

// 🔐 AUTENTICACIÓN
async function loginUser(credentials) {
    return await apiRequest(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        body: credentials
    });
}

async function registerUser(userData) {
    return await apiRequest(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        body: userData
    });
}

// 👤 PERFIL DE USUARIO
async function getUserProfile() {
    return await apiRequest(API_ENDPOINTS.PROFILE);
}

// 💰 CRIPTOMONEDAS
async function getCryptocurrencies() {
    return await apiRequest(API_ENDPOINTS.CRYPTOCURRENCIES);
}

// 📊 PORTAFOLIO
async function getPortfolio() {
    return await apiRequest(API_ENDPOINTS.PORTFOLIO);
}

// 💳 TRANSACCIONES
async function getTransactions() {
    return await apiRequest(API_ENDPOINTS.TRANSACTIONS);
}

async function buyCryptocurrency(buyData) {
    // Asegurar que todos los campos numéricos son números
    const sanitizedData = {
        crypto_id: parseInt(buyData.crypto_id),
        amount: parseFloat(buyData.amount),
        type: 'buy',
        price: parseFloat(buyData.price),
        total: parseFloat(buyData.total)
    };

    return await apiRequest(API_ENDPOINTS.BUY, {
        method: 'POST',
        body: sanitizedData
    });
}

async function sellCryptocurrency(sellData) {
    return await apiRequest(API_ENDPOINTS.SELL, {
        method: 'POST',
        body: sellData
    });
}

// ==================== EXPORTACIÓN ====================

// Exportar al objeto global window.API
window.API = {
    // Constantes
    API_BASE_URL,
    ENDPOINTS: API_ENDPOINTS,
    
    // Función base
    apiRequest,
    
    // Funciones específicas
    // Autenticación
    loginUser,
    registerUser,
    
    // Perfil
    getUserProfile,
    
    // Criptomonedas
    getCryptocurrencies,
    
    // Portafolio
    getPortfolio,
    
    // Transacciones
    getTransactions,
    buyCryptocurrency,
    sellCryptocurrency
};

console.log('✅ API Config loaded successfully');
console.log('Available endpoints:', API_ENDPOINTS);