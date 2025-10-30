// auth.js - CÓDIGO COMPLETO CORREGIDO
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
});

function initializeAuth() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('✅ Formulario de login inicializado');
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        console.log('✅ Formulario de registro inicializado');
    }
    
    checkExistingAuth();
}

function checkExistingAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user && (window.location.pathname.includes('login.html') || 
                          window.location.pathname.includes('registro.html'))) {
        console.log('🔄 Usuario ya autenticado, redirigiendo al dashboard...');
        window.location.href = 'dashboard.html';
    }
}

async function handleLogin(event) {
    event.preventDefault();
    console.log('🔄 Procesando login...');
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const loginButton = document.querySelector('#loginForm .btn-auth');
    
    let originalText = 'Ingresar';
    if (loginButton) {
        originalText = loginButton.textContent;
        loginButton.textContent = 'Iniciando sesión...';
        loginButton.disabled = true;
    }
    
    try {
        if (!email || !password) {
            throw new Error('Por favor completa todos los campos');
        }
        
        console.log('📧 Email:', email);
        
        const result = await window.API.loginUser({
            email: email,
            password: password
        });
        
        if (result && result.token) {
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            
            console.log('✅ Login exitoso, token guardado');
            showAlert('¡Inicio de sesión exitoso!', 'success');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } else {
            throw new Error('Credenciales inválidas');
        }
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        
        let errorMessage = 'Error al iniciar sesión';
        
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Error de conexión. Verifica tu internet y que el servidor esté funcionando.';
        } else if (error.message.includes('401')) {
            errorMessage = 'Email o contraseña incorrectos';
        } else if (error.message.includes('Network Error')) {
            errorMessage = 'Error de red. Verifica tu conexión a internet.';
        } else {
            errorMessage = error.message || 'Error del servidor. Intenta más tarde.';
        }
        
        showAlert(errorMessage, 'error');
        
    } finally {
        if (loginButton) {
            loginButton.textContent = originalText;
            loginButton.disabled = false;
        }
    }
}

async function handleRegister(event) {
    event.preventDefault();
    console.log('🔄 Procesando registro...');
    
    // ✅ CORREGIDO: Buscar fullName en lugar de name
    const nameInput = document.getElementById('fullName') || document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const registerButton = document.querySelector('#registerForm .btn-auth');
    
    // Verificar que todos los elementos existen
    if (!nameInput || !emailInput || !passwordInput || !confirmPasswordInput) {
        console.error('❌ Elementos del formulario no encontrados:');
        console.log('- name/fullName:', !!nameInput);
        console.log('- email:', !!emailInput);
        console.log('- password:', !!passwordInput);
        console.log('- confirmPassword:', !!confirmPasswordInput);
        showAlert('Error: Formulario incompleto. Verifica que todos los campos existan.', 'error');
        return;
    }
    
    const name = nameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    let originalText = 'Registrarse';
    if (registerButton) {
        originalText = registerButton.textContent;
        registerButton.textContent = 'Creando cuenta...';
        registerButton.disabled = true;
    }
    
    try {
        if (!name || !email || !password || !confirmPassword) {
            throw new Error('Por favor completa todos los campos');
        }
        
        if (password !== confirmPassword) {
            throw new Error('Las contraseñas no coinciden');
        }
        
        if (password.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
        
        if (!isValidEmail(email)) {
            throw new Error('Por favor ingresa un email válido');
        }
        
        console.log('📝 Registrando usuario:', { name, email });
        
        const result = await window.API.registerUser({
            name: name,
            email: email,
            password: password
        });
        
        if (result && result.message) {
            showAlert('¡Cuenta creada exitosamente! Redirigiendo al login...', 'success');
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            
        } else {
            throw new Error('Error al crear la cuenta');
        }
        
    } catch (error) {
        console.error('❌ Error en registro:', error);
        
        let errorMessage = 'Error al crear la cuenta';
        
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Error de conexión. Verifica tu internet.';
        } else if (error.message.includes('400') || error.message.includes('409')) {
            errorMessage = 'El email ya está registrado';
        } else {
            errorMessage = error.message || 'Error del servidor. Intenta más tarde.';
        }
        
        showAlert(errorMessage, 'error');
        
    } finally {
        if (registerButton) {
            registerButton.textContent = originalText;
            registerButton.disabled = false;
        }
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        console.log('❌ Usuario no autenticado, redirigiendo al login');
        window.location.href = 'login.html';
        return false;
    }
    
    console.log('✅ Usuario autenticado');
    return true;
}

function logout() {
    console.log('🚪 Cerrando sesión...');
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userPortfolio');
    localStorage.removeItem('transactions');
    
    showAlert('Sesión cerrada correctamente', 'success');
    
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}

function showAlert(message, type) {
    const existingAlerts = document.querySelectorAll('.auth-alert');
    existingAlerts.forEach(alert => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    });
    
    const alert = document.createElement('div');
    alert.className = `auth-alert alert-${type}`;
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
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 5000);
}

function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

function updateUser(userData) {
    const currentUser = getUser();
    const updatedUser = { ...currentUser, ...userData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
}

window.Auth = {
    checkAuth,
    logout,
    getToken,
    getUser,
    updateUser,
    showAlert
};

console.log('✅ Auth module loaded successfully');