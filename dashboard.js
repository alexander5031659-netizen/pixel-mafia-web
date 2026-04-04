// dashboard.js - Dashboard Logic

let currentUser = null;

// ── Auth Protection ──────────────────────────────────────────────────────────
function checkAuth() {
    const user = localStorage.getItem('pm_user');
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }
    return JSON.parse(user);
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
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = item.getAttribute('data-page');

            // Remove active from all nav items
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Hide all pages
            pages.forEach(p => p.classList.remove('active'));

            // Show target page
            const page = document.getElementById(targetPage);
            if (page) page.classList.add('active');

            // Update header
            updateHeader(targetPage);
        });
    });
}

function updateHeader(pageId) {
    const title = document.getElementById('pageTitle');
    const subtext = document.getElementById('pageSubtext');

    const titles = {
        'page-dashboard': ['Dashboard', 'Resumen de tu actividad'],
        'page-bots': ['Mis Bots', 'Gestiona todos tus bots'],
        'page-settings': ['Configuraci&oacute;n', 'Ajustes de tu cuenta']
    };

    if (titles[pageId]) {
        title.textContent = titles[pageId][0];
        subtext.textContent = titles[pageId][1];
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
    const bots = JSON.parse(localStorage.getItem('pm_bots_' + user.id) || '[]');
    const activeBots = bots.filter(b => b.active).length;
    
    const trialEnd = new Date(user.trialEnds);
    const now = new Date();
    const daysLeft = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
    
    document.getElementById('statBots').textContent = activeBots;
    document.getElementById('statListeners').textContent = Math.floor(Math.random() * 30) + 5;
    document.getElementById('statUptime').textContent = activeBots > 0 ? '99.9%' : '--';
    document.getElementById('statDays').textContent = daysLeft > 0 ? daysLeft : '0';
    
    if (daysLeft <= 0) {
        document.getElementById('statDays').style.color = '#ef4444';
    }
}

// ── Load Bots ────────────────────────────────────────────────────────────────
function loadBots(user) {
    const bots = JSON.parse(localStorage.getItem('pm_bots_' + user.id) || '[]');
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
        dashboardBots.appendChild(createBotCard(bot, realIndex, user.id));
    });

    if (activeBots.length === 0) {
        emptyState.style.display = 'block';
    }
    
    // All Bots page: show all bots
    bots.forEach((bot, index) => {
        allBotsList.appendChild(createBotCard(bot, index, user.id));
    });
}

// ── Create Bot Card ──────────────────────────────────────────────────────────
function createBotCard(bot, index, userId) {
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
                '<button class="btn-icon" onclick="toggleBot(\'' + userId + '\', ' + index + ')" title="' + (bot.active ? 'Detener' : 'Iniciar') + '">' +
                    '<i class="fas fa-' + (bot.active ? 'pause' : 'play') + '"></i>' +
                '</button>' +
                '<button class="btn-icon" onclick="deleteBot(\'' + userId + '\', ' + index + ')" title="Eliminar">' +
                    '<i class="fas fa-trash"></i>' +
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
function toggleBot(userId, index) {
    const bots = JSON.parse(localStorage.getItem('pm_bots_' + userId) || '[]');
    if (bots[index]) {
        bots[index].active = !bots[index].active;
        localStorage.setItem('pm_bots_' + userId, JSON.stringify(bots));
        loadBots({ id: userId });
        loadStats({ id: userId });
    }
}

// ── Delete Bot ───────────────────────────────────────────────────────────────
function deleteBot(userId, index) {
    if (!confirm('¿Est&aacute;s seguro de eliminar este bot?')) return;
    
    const bots = JSON.parse(localStorage.getItem('pm_bots_' + userId) || '[]');
    bots.splice(index, 1);
    localStorage.setItem('pm_bots_' + userId, JSON.stringify(bots));
    loadBots({ id: userId });
    loadStats({ id: userId });
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
    
    // New Bot Modal (multiple buttons)
    const modal = document.getElementById('botModal');
    document.getElementById('newBotBtn').addEventListener('click', () => modal.classList.add('active'));
    document.getElementById('newBotBtn2').addEventListener('click', () => modal.classList.add('active'));
    document.getElementById('createFirstBot').addEventListener('click', () => modal.classList.add('active'));
    document.getElementById('modalClose').addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
    
    // Create Bot Form
    document.getElementById('botForm').addEventListener('submit', (e) => {
        e.preventDefault();
        createBot(user);
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
}

// ── Create Bot ───────────────────────────────────────────────────────────────
function createBot(user) {
    const name = document.getElementById('botName').value.trim();
    const roomUrl = document.getElementById('botRoomUrl').value.trim();
    const category = document.getElementById('botCategory').value;
    const imvuUser = document.getElementById('botImvuUser').value.trim();
    
    if (!name || !roomUrl) {
        showNotification('Completa todos los campos obligatorios', 'error');
        return;
    }
    
    const bots = JSON.parse(localStorage.getItem('pm_bots_' + user.id) || '[]');
    
    if (user.plan === 'trial' && bots.length >= 1) {
        showNotification('Tu plan de prueba solo incluye 1 bot. Actualiza para m&aacute;s.', 'error');
        return;
    }
    
    const newBot = {
        id: Date.now().toString(),
        name,
        roomUrl,
        category,
        imvuUser,
        active: false,
        createdAt: new Date().toISOString()
    };
    
    bots.push(newBot);
    localStorage.setItem('pm_bots_' + user.id, JSON.stringify(bots));
    
    document.getElementById('botModal').classList.remove('active');
    document.getElementById('botForm').reset();
    
    loadBots(user);
    loadStats(user);
    showNotification('Bot "' + name + '" creado exitosamente', 'success');
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
