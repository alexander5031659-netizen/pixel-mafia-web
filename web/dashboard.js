// dashboard.js - Dashboard Logic

let currentUser = null;

// ── Auth Protection ──────────────────────────────────────────────────────────
function checkAuth() {
    try {
        const user = localStorage.getItem('pm_user');
        if (!user) {
            window.location.href = 'login.html';
            return null;
        }
        return JSON.parse(user);
    } catch (e) {
        console.error('Auth error:', e);
        // For demo, return a default user
        return { name: 'Demo User', email: 'demo@test.com', role: 'user' };
    }
}

// ── Initialize Dashboard ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    currentUser = checkAuth();
    if (!currentUser) return;

    loadUserInfo(currentUser);
    loadStats(currentUser);
    loadBots(currentUser);
    setupTabs();
    setupEventListeners(currentUser);
});

// ── Tab Navigation ───────────────────────────────────────────────────────────
function setupTabs() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = item.getAttribute('data-section');

            // Remove active from all nav items
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Hide all sections
            sections.forEach(s => s.classList.remove('active'));

            // Show target section
            const section = document.getElementById(targetSection + '-section');
            if (section) section.classList.add('active');

            // Update header
            updateHeader(targetSection);
        });
    });
}

function updateHeader(sectionId) {
    const pageTitle = document.querySelector('.page-title h1');
    const pageSubtext = document.querySelector('.page-title p');
    if (!pageTitle) return;

    const titles = {
        'dashboard': ['Dashboard', 'Gestiona tus bots de música 24/7'],
        'request': ['Solicitar Bot', 'Pide un bot para tu sala'],
        'bots': ['Mis Bots', 'Todos tus bots asignados'],
        'settings': ['Configuración', 'Ajustes de tu cuenta']
    };

    if (titles[sectionId]) {
        pageTitle.textContent = titles[sectionId][0];
        if (pageSubtext) pageSubtext.textContent = titles[sectionId][1];
    }
}

// ── Load User Info ───────────────────────────────────────────────────────────
function loadUserInfo(user) {
    const name = user.name || 'Usuario';
    const initial = name.charAt(0).toUpperCase();
    
    document.getElementById('userAvatar').textContent = initial;
}

// ── Load Stats ───────────────────────────────────────────────────────────────
function loadStats(user) {
    try {
        // Leer bots asignados por el admin
        const allBots = JSON.parse(localStorage.getItem('allBots') || '[]');
        const bots = allBots.filter(b => b.clientEmail === user.email);
        const activeBots = bots.filter(b => b.active).length;
        
        const trialEnd = new Date(user.trialEnds || Date.now() + 3 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const daysLeft = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
        
        const statBots = document.getElementById('statBots');
        const statListeners = document.getElementById('statListeners');
        const statUptime = document.getElementById('statUptime');
        const statDays = document.getElementById('statDays');
        
        if (statBots) statBots.textContent = activeBots;
        if (statListeners) statListeners.textContent = Math.floor(Math.random() * 30) + 5;
        if (statUptime) statUptime.textContent = activeBots > 0 ? '99.9%' : '--';
        if (statDays) statDays.textContent = daysLeft > 0 ? daysLeft : '0';
        
        if (daysLeft <= 0 && statDays) {
            statDays.style.color = '#ef4444';
        }
    } catch (e) {
        console.error('Load stats error:', e);
    }
}

// ── Load Bots ────────────────────────────────────────────────────────────────
function loadBots(user) {
    // Leer bots asignados por el admin desde 'allBots'
    const allBots = JSON.parse(localStorage.getItem('allBots') || '[]');
    const bots = allBots.filter(b => b.clientEmail === user.email);
    
    const emptyState = document.getElementById('emptyBots');
    const dashboardBots = document.getElementById('dashboardBots');
    const allBotsList = document.getElementById('allBotsList');
    
    dashboardBots.innerHTML = '';
    allBotsList.innerHTML = '';
    
    if (bots.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Dashboard: show only active bots (max 2)
    const activeBots = bots.filter(b => b.active).slice(0, 2);
    activeBots.forEach((bot, i) => {
        const realIndex = bots.indexOf(bot);
        dashboardBots.appendChild(createBotCard(bot, realIndex, user.email));
    });

    if (activeBots.length === 0) {
        emptyState.style.display = 'block';
    }
    
    // All Bots page: show all bots
    bots.forEach((bot, index) => {
        allBotsList.appendChild(createBotCard(bot, index, user.email));
    });
}

// ── Create Bot Card ──────────────────────────────────────────────────────────
function createBotCard(bot, index, userEmail) {
    const card = document.createElement('div');
    card.className = 'bot-card ' + (bot.active ? 'active' : '');
    card.innerHTML = 
        '<div class="bot-card-header">' +
            '<div class="bot-info">' +
                '<div class="status-dot ' + (bot.active ? 'online' : 'offline') + '"></div>' +
                '<div class="bot-name">' +
                    '<h3>' + bot.name + '</h3>' +
                    '<span class="badge ' + bot.category.toLowerCase() + '">' + bot.category + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="bot-controls">' +
                '<button class="btn-icon" onclick="toggleBot(\'' + userEmail + '\', ' + index + ')" title="' + (bot.active ? 'Detener' : 'Iniciar') + '">' +
                    '<i class="fas fa-' + (bot.active ? 'pause' : 'play') + '"></i>' +
                '</button>' +
            '</div>' +
        '</div>' +
        '<div class="bot-card-body">' +
            '<div class="now-playing">' +
                '<div class="album-art"><i class="fas fa-music"></i></div>' +
                '<div class="track-info">' +
                    '<span class="track-name">' + (bot.active ? 'Reproduciendo m&uacute;sica...' : 'Bot detenido') + '</span>' +
                    '<span class="track-artist">' + (bot.roomUrl ? extractRoomId(bot.roomUrl) : 'Sin sala configurada') + '</span>' +
                '</div>' +
                '<div class="track-time">' + (bot.active ? 'LIVE' : 'OFF') + '</div>' +
            '</div>' +
            '<div class="bot-meta">' +
                '<div class="meta-item">' +
                    '<i class="fas fa-door-open"></i>' +
                    '<span>' + (bot.roomUrl ? extractRoomId(bot.roomUrl) : 'No configurada') + '</span>' +
                '</div>' +
                '<div class="meta-item">' +
                    '<i class="fas fa-clock"></i>' +
                    '<span>' + (bot.active ? 'Activo' : 'Inactivo') + '</span>' +
                '</div>' +
                '<div class="meta-item">' +
                    '<i class="fas fa-user"></i>' +
                    '<span>' + (bot.imvuUser || 'Sin cuenta') + '</span>' +
                '</div>' +
            '</div>' +
        '</div>';
    return card;
}

// ── Extract Room ID from URL ─────────────────────────────────────────────────
function extractRoomId(url) {
    if (!url) return 'No configurada';
    const match = url.match(/room-([\d-]+)/);
    return match ? 'Sala ' + match[1] : url;
}

// ── Toggle Bot (Start/Stop) ──────────────────────────────────────────────────
function toggleBot(userEmail, index) {
    const allBots = JSON.parse(localStorage.getItem('allBots') || '[]');
    const userBots = allBots.filter(b => b.clientEmail === userEmail);
    const bot = userBots[index];
    
    if (bot) {
        // Encontrar el índice real en allBots
        const realIndex = allBots.findIndex(b => b.id === bot.id);
        if (realIndex !== -1) {
            allBots[realIndex].active = !allBots[realIndex].active;
            localStorage.setItem('allBots', JSON.stringify(allBots));
            loadBots({ email: userEmail });
            loadStats({ id: userEmail, email: userEmail });
        }
    }
}

// ── Setup Event Listeners ────────────────────────────────────────────────────
function setupEventListeners(user) {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('pm_user');
        localStorage.removeItem('pm_token');
        window.location.href = 'login.html';
    });
    
    // Settings form
    document.getElementById('settingsForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const newName = document.getElementById('settingsName').value.trim();
        if (newName) {
            user.name = newName;
            localStorage.setItem('pm_user', JSON.stringify(user));
            loadUserInfo(user);
            showNotification('Perfil actualizado', 'success');
        }
    });

    // Delete account
    document.getElementById('deleteAccountBtn').addEventListener('click', () => {
        if (confirm('¿Estás seguro? Esta acci&oacute;n es irreversible.')) {
            localStorage.removeItem('pm_user');
            localStorage.removeItem('pm_token');
            localStorage.removeItem('pm_bots_' + user.id);
            window.location.href = 'login.html';
        }
    });

    // Request Bot form
    const requestForm = document.getElementById('requestBotForm');
    if (requestForm) {
        requestForm.addEventListener('submit', (e) => {
            e.preventDefault();
            requestBot(user);
        });
    }

    // Load availability counts
    updateAvailabilityCounts();
}

// ── Update Availability Counts ─────────────────────────────────────────────────
function updateAvailabilityCounts() {
    const accounts = JSON.parse(localStorage.getItem('accountPool') || '[]');
    const gaCount = accounts.filter(a => a.category === 'GA' && a.status === 'available').length;
    const apCount = accounts.filter(a => a.category === 'AP' && a.status === 'available').length;
    
    const gaEl = document.getElementById('gaCount');
    const apEl = document.getElementById('apCount');
    if (gaEl) gaEl.textContent = gaCount;
    if (apEl) apEl.textContent = apCount;
}

// ── Request Bot ────────────────────────────────────────────────────────────────
function requestBot(user) {
    const botType = document.querySelector('input[name="botType"]:checked').value;
    const roomUrl = document.getElementById('roomUrl').value.trim();
    const botName = document.getElementById('botName').value.trim() || 'Bot ' + Math.floor(Math.random() * 1000);

    // Get available accounts
    const accounts = JSON.parse(localStorage.getItem('accountPool') || '[]');
    const availableAccount = accounts.find(a => a.category === botType && a.status === 'available');

    if (!availableAccount) {
        showNotification('No hay cuentas ' + botType + ' disponibles. Contacta al administrador.', 'error');
        return;
    }

    // Create new bot
    const newBot = {
        id: 'bot_' + Date.now(),
        name: botName,
        category: botType,
        roomUrl: roomUrl,
        clientEmail: user.email,
        clientName: user.name,
        imvuUser: availableAccount.username,
        imvuPass: availableAccount.password,
        status: 'offline',
        active: false,
        createdAt: new Date().toISOString()
    };

    // Save bot
    const allBots = JSON.parse(localStorage.getItem('allBots') || '[]');
    allBots.push(newBot);
    localStorage.setItem('allBots', JSON.stringify(allBots));

    // Mark account as in use
    availableAccount.status = 'in_use';
    availableAccount.assignedTo = user.email;
    localStorage.setItem('accountPool', JSON.stringify(accounts));

    // Update availability counts
    updateAvailabilityCounts();

    // Reload bots display
    loadBots(user);
    loadStats(user);

    // Show success notification
    showNotification('¡Bot ' + botType + ' asignado exitosamente!', 'success');

    // Clear form
    document.getElementById('roomUrl').value = '';
    document.getElementById('botName').value = '';

    // Switch to bots section
    const botsNav = document.querySelector('.nav-item[data-section="bots"]');
    if (botsNav) botsNav.click();
}

// ── Show Notification ────────────────────────────────────────────────────────
function showNotification(message, type) {
    const existing = document.querySelector('.dash-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'dash-notification ' + (type === 'success' ? 'success' : 'error');
    notification.innerHTML = '<i class="fas fa-' + (type === 'success' ? 'check-circle' : 'exclamation-circle') + '"></i><span>' + message + '</span>';
    
    notification.style.cssText = 'position:fixed;top:20px;right:20px;padding:14px 20px;border-radius:12px;font-size:14px;font-weight:500;display:flex;align-items:center;gap:10px;z-index:1000;animation:slideIn 0.3s ease;' +
        (type === 'success' 
            ? 'background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#10b981;' 
            : 'background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#ef4444;');
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
