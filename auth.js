// auth.js - Authentication JavaScript
console.log('🔐 auth.js loaded');

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing auth...');
    
    // Handle login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('✅ Login form found');
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.log('❌ Login form NOT found');
    }

    // Handle register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        console.log('✅ Register form found');
        registerForm.addEventListener('submit', handleRegister);
    }

    // Google sign-in buttons (placeholder)
    const googleBtns = document.querySelectorAll('.btn-google');
    googleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            alert('Google Sign-In se implementará con Firebase Auth');
        });
    });
});

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const remember = document.querySelector('input[name="remember"]').checked;

    // Show loading state
    const btn = e.target.querySelector('.btn-auth');
    const originalText = btn.textContent;
    btn.textContent = 'Entrando...';
    btn.disabled = true;

    try {
        // In production, this will call your API
        // const response = await fetch('/api/auth/login', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ email, password })
        // });
        // const data = await response.json();

        // Simulate API call for now
        await new Promise(r => setTimeout(r, 1000));

        // Demo credentials for testing
        if (email === 'demo@pixelmafia.com' && password === 'demo123') {
            const mockUser = {
                id: '1',
                name: 'Demo User',
                email: email,
                tokens: 100,
                plan: 'Pro'
            };

            // Store auth data
            localStorage.setItem('token', 'mock-jwt-token');
            localStorage.setItem('user', JSON.stringify(mockUser));

            // Redirect to dashboard
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get('redirect') || 'dashboard';
            window.location.href = `${redirect}.html`;
        } else {
            showError('Email o contraseña incorrectos');
        }
    } catch (error) {
        showError('Error de conexión. Intenta de nuevo.');
        console.error('Login error:', error);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation
    if (password !== confirmPassword) {
        showError('Las contraseñas no coinciden');
        return;
    }

    if (password.length < 6) {
        showError('La contraseña debe tener al menos 6 caracteres');
        return;
    }

    // Show loading state
    const btn = e.target.querySelector('.btn-auth');
    const originalText = btn.textContent;
    btn.textContent = 'Creando cuenta...';
    btn.disabled = true;

    try {
        // In production, this will call your API
        // const response = await fetch('/api/auth/register', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ name, email, password })
        // });
        // const data = await response.json();

        // Simulate API call for now
        await new Promise(r => setTimeout(r, 1500));

        // Show success and redirect to login
        showSuccess('¡Cuenta creada! Redirigiendo...');
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);

    } catch (error) {
        showError('Error de conexión. Intenta de nuevo.');
        console.error('Register error:', error);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function showError(message) {
    // Remove existing messages
    document.querySelectorAll('.error-message, .success-message').forEach(el => el.remove());

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message show';
    errorDiv.textContent = message;

    const form = document.querySelector('.auth-form');
    form.insertBefore(errorDiv, form.firstChild);

    // Auto remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function showSuccess(message) {
    // Remove existing messages
    document.querySelectorAll('.error-message, .success-message').forEach(el => el.remove());

    const successDiv = document.createElement('div');
    successDiv.className = 'success-message show';
    successDiv.textContent = message;

    const form = document.querySelector('.auth-form');
    form.insertBefore(successDiv, form.firstChild);
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Check auth status for protected pages
function requireAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html?redirect=' + window.location.pathname.split('/').pop().replace('.html', '');
        return false;
    }
    return true;
}

// Get current user
function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}
