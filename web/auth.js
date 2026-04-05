// auth.js - Authentication Logic (Simulated with localStorage)

// Check if user is already logged in
function checkAuth() {
    const user = localStorage.getItem('pm_user');
    if (user && window.location.pathname.includes('login.html')) {
        window.location.href = 'dashboard.html';
    }
}

// Login Handler
function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    // Get stored users
    const users = JSON.parse(localStorage.getItem('pm_users') || '[]');
    
    // Find user
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        // Login success
        localStorage.setItem('pm_user', JSON.stringify(user));
        localStorage.setItem('pm_token', 'token_' + Date.now());
        
        // Show success message
        showNotification('Inicio de sesión exitoso. Redirigiendo...', 'success');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    } else {
        showNotification('Email o contraseña incorrectos', 'error');
    }
}

// Register Handler
function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (password !== confirmPassword) {
        showNotification('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    // Get stored users
    const users = JSON.parse(localStorage.getItem('pm_users') || '[]');
    
    // Check if email already exists
    if (users.find(u => u.email === email)) {
        showNotification('Este email ya está registrado', 'error');
        return;
    }
    
    // Create new user
    const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password,
        createdAt: new Date().toISOString(),
        trialEnds: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
        plan: 'trial'
    };
    
    // Save user
    users.push(newUser);
    localStorage.setItem('pm_users', JSON.stringify(users));
    
    // Auto login
    localStorage.setItem('pm_user', JSON.stringify(newUser));
    localStorage.setItem('pm_token', 'token_' + Date.now());
    
    showNotification('Cuenta creada exitosamente. ¡Bienvenido!', 'success');
    
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1500);
}

// Logout
function logout() {
    localStorage.removeItem('pm_user');
    localStorage.removeItem('pm_token');
    window.location.href = 'login.html';
}

// Show notification
function showNotification(message, type) {
    // Remove existing notifications
    const existing = document.querySelector('.auth-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `auth-notification ${type === 'success' ? 'success' : 'error'}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 20px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 1000;
        animation: slideDown 0.3s ease;
        ${type === 'success' 
            ? 'background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981;' 
            : 'background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444;'}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});
