// Configuración de la API
const API_BASE_URL = 'https://proyectodesarrolloweb-production.up.railway.app';
const API_ENDPOINTS = {
    REGISTER: '/api/register'
};

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    // Event listeners para validación en tiempo real
    if (passwordInput) {
        passwordInput.addEventListener('input', validatePasswordStrength);
        passwordInput.addEventListener('blur', validatePassword);
        passwordInput.addEventListener('input', clearPasswordError);
    }
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('blur', validateConfirmPassword);
        confirmPasswordInput.addEventListener('input', clearConfirmPasswordError);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Ejecutar todas las validaciones
            const isFullNameValid = validateFullName();
            const isEmailValid = validateEmail();
            const isPasswordValid = validatePassword();
            const isConfirmPasswordValid = validateConfirmPassword();
            const isTermsAccepted = validateTerms();
            
            if (isFullNameValid && isEmailValid && isPasswordValid && isConfirmPasswordValid && isTermsAccepted) {
                const formData = {
                    fullName: document.getElementById('fullName').value.trim(),
                    email: document.getElementById('email').value.trim(),
                    password: document.getElementById('password').value
                };
                
                await simulateRegistration(formData);
            } else {
                showAlert('Por favor, corrige los errores en el formulario', 'error');
            }
        });
    }
});

// ========== FUNCIÓN DE REGISTRO SOLO EN BASE DE DATOS ==========

async function simulateRegistration(formData) {
    const submitBtn = document.querySelector('.btn-auth');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creando cuenta...';
    submitBtn.disabled = true;

    try {
        console.log('👤 Intentando registro en BD:', API_BASE_URL + API_ENDPOINTS.REGISTER);
        
        // Preparar datos para el servidor
        const requestData = {
            name: formData.fullName,
            email: formData.email,
            password: formData.password
        };

        console.log('📤 Enviando datos al servidor:', { ...requestData, password: '[PROTEGIDO]' });

        const response = await fetch(API_BASE_URL + API_ENDPOINTS.REGISTER, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        console.log('📨 Status del servidor:', response.status);
        
        const responseText = await response.text();
        console.log('📄 Respuesta del servidor:', responseText);

        let responseData;
        try {
            responseData = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            console.error('❌ Error parseando JSON:', e);
            responseData = { message: responseText };
        }

        if (response.ok) {
            // ✅ ÉXITO - Usuario guardado en base de datos
            console.log('✅ Registro exitoso en base de datos');
            showAlert('¡Cuenta creada exitosamente! Redirigiendo al login...', 'success');
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            
        } else {
            // ❌ ERROR - Mostrar mensaje específico del servidor
            let errorMessage = 'Error en el servidor';
            
            if (response.status === 409) {
                errorMessage = 'Este correo electrónico ya está registrado';
            } else if (response.status === 400) {
                errorMessage = 'Datos inválidos. Verifica la información';
            } else if (responseData.message) {
                errorMessage = responseData.message;
            } else if (responseData.error) {
                errorMessage = responseData.error;
            }
            
            throw new Error(errorMessage);
        }
        
    } catch (error) {
        console.error('❌ Error en registro:', error);
        
        let userMessage = error.message;
        
        if (error.message.includes('Failed to fetch')) {
            userMessage = 'Error de conexión con el servidor. Verifica tu conexión a internet.';
        } else if (error.message.includes('CORS')) {
            userMessage = 'Error de CORS. El servidor no permite registro desde este origen.';
        }
        
        showAlert(userMessage, 'error');
        
        // Reactivar el botón
        const submitBtn = document.querySelector('.btn-auth');
        submitBtn.textContent = 'Crear Cuenta';
        submitBtn.disabled = false;
    }
}

// ========== FUNCIONES DE VALIDACIÓN (MISMAS QUE ANTES) ==========

function validateFullName() {
    const fullNameInput = document.getElementById('fullName');
    const fullName = fullNameInput.value.trim();
    const fullNameError = document.getElementById('fullNameError') || createErrorElement(fullNameInput, 'fullNameError');
    
    clearErrorStyle(fullNameInput);
    
    if (!fullName) {
        showFieldError(fullNameInput, fullNameError, 'El nombre completo es obligatorio');
        return false;
    }
    
    if (fullName.length < 2) {
        showFieldError(fullNameInput, fullNameError, 'El nombre debe tener al menos 2 caracteres');
        return false;
    }
    
    showFieldSuccess(fullNameInput);
    fullNameError.textContent = '';
    return true;
}

function validateEmail() {
    const emailInput = document.getElementById('email');
    const email = emailInput.value.trim();
    const emailError = document.getElementById('emailError') || createErrorElement(emailInput, 'emailError');
    
    clearErrorStyle(emailInput);
    
    if (!email) {
        showFieldError(emailInput, emailError, 'El correo electrónico es obligatorio');
        return false;
    }
    
    if (!isValidEmail(email)) {
        showFieldError(emailInput, emailError, 'Por favor, ingresa un correo electrónico válido');
        return false;
    }
    
    showFieldSuccess(emailInput);
    emailError.textContent = '';
    return true;
}

function validatePassword() {
    const passwordInput = document.getElementById('password');
    const password = passwordInput.value;
    const passwordError = document.getElementById('passwordError') || createErrorElement(passwordInput, 'passwordError');
    
    clearErrorStyle(passwordInput);
    
    if (!password) {
        showFieldError(passwordInput, passwordError, 'La contraseña es obligatoria');
        return false;
    }
    
    if (password.length < 6) {
        showFieldError(passwordInput, passwordError, 'La contraseña debe tener al menos 6 caracteres');
        return false;
    }
    
    showFieldSuccess(passwordInput);
    passwordError.textContent = '';
    return true;
}

function validateConfirmPassword() {
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const confirmPassword = confirmPasswordInput.value;
    const confirmError = document.getElementById('confirmError') || createErrorElement(confirmPasswordInput, 'confirmError');
    
    clearErrorStyle(confirmPasswordInput);
    
    if (!confirmPassword) {
        showFieldError(confirmPasswordInput, confirmError, 'Por favor, confirma tu contraseña');
        return false;
    }
    
    if (confirmPassword !== passwordInput.value) {
        showFieldError(confirmPasswordInput, confirmError, 'Las contraseñas no coinciden');
        return false;
    }
    
    showFieldSuccess(confirmPasswordInput);
    confirmError.textContent = '';
    return true;
}

function validateTerms() {
    const termsInput = document.getElementById('terms');
    const termsError = document.getElementById('termsError') || createErrorElement(termsInput, 'termsError');
    
    if (!termsInput.checked) {
        termsError.textContent = 'Debes aceptar los términos y condiciones';
        termsError.style.display = 'block';
        termsError.style.color = '#e74c3c';
        termsError.style.marginTop = '0.5rem';
        termsError.style.fontSize = '0.85rem';
        return false;
    }
    
    termsError.textContent = '';
    termsError.style.display = 'none';
    return true;
}

function validatePasswordStrength() {
    const password = document.getElementById('password').value;
    const strengthElement = document.getElementById('passwordStrength') || createPasswordStrengthElement();
    
    if (password.length === 0) {
        strengthElement.textContent = '';
        return;
    }
    
    let strength = 'débil';
    let strengthClass = 'strength-weak';
    
    if (password.length >= 8) {
        strength = 'media';
        strengthClass = 'strength-medium';
    }
    
    if (password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
        strength = 'fuerte';
        strengthClass = 'strength-strong';
    }
    
    strengthElement.textContent = `Fortaleza: ${strength}`;
    strengthElement.className = `password-strength ${strengthClass}`;
}

// ========== FUNCIONES AUXILIARES ==========

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function createErrorElement(inputElement, errorId) {
    const errorElement = document.createElement('div');
    errorElement.id = errorId;
    errorElement.className = 'error-message';
    errorElement.style.cssText = `
        color: #e74c3c;
        font-size: 0.85rem;
        margin-top: 0.25rem;
        display: block;
    `;
    
    inputElement.parentNode.appendChild(errorElement);
    return errorElement;
}

function createPasswordStrengthElement() {
    const strengthElement = document.createElement('div');
    strengthElement.id = 'passwordStrength';
    strengthElement.className = 'password-strength';
    document.getElementById('password').parentNode.appendChild(strengthElement);
    return strengthElement;
}

function showFieldError(inputElement, errorElement, message) {
    inputElement.style.borderColor = '#e74c3c';
    inputElement.style.background = '#fdf2f2';
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function showFieldSuccess(inputElement) {
    inputElement.style.borderColor = '#27ae60';
    inputElement.style.background = '#f2fdf2';
}

function clearErrorStyle(inputElement) {
    inputElement.style.borderColor = '#e1e5e9';
    inputElement.style.background = 'white';
}

function clearPasswordError() {
    const passwordError = document.getElementById('passwordError');
    if (passwordError) {
        passwordError.textContent = '';
        passwordError.style.display = 'none';
    }
    clearErrorStyle(document.getElementById('password'));
}

function clearConfirmPasswordError() {
    const confirmError = document.getElementById('confirmError');
    if (confirmError) {
        confirmError.textContent = '';
        confirmError.style.display = 'none';
    }
    clearErrorStyle(document.getElementById('confirmPassword'));
}

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
    } else if (type === 'warning') {
        alert.style.background = '#f39c12';
    } else {
        alert.style.background = '#27ae60';
    }
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Agregar estilos para la animación
if (!document.getElementById('register-styles')) {
    const style = document.createElement('style');
    style.id = 'register-styles';
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
        
        .error-message {
            color: #e74c3c;
            font-size: 0.85rem;
            margin-top: 0.25rem;
            display: block;
        }
        
        .password-strength {
            margin-top: 0.25rem;
            font-size: 0.8rem;
            font-weight: 500;
        }
        
        .strength-weak { color: #e74c3c; }
        .strength-medium { color: #f39c12; }
        .strength-strong { color: #27ae60; }
    `;
    document.head.appendChild(style);
}