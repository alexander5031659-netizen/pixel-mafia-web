// dashboard.js - Dashboard functionality
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!requireAuth()) return;

    // Load user data
    loadUserData();

    // Setup navigation
    setupNavigation();

    // Load bots
    loadBots();

    // Setup modal handlers
    setupModals();

    // Update stats
    updateStats();
});

// Load user data
function loadUserData() {
    const user = getCurrentUser();
    if (user) {
        document.getElementById('userName').textContent = user.name;
        document.getElementById('tokenCount').textContent = user.tokens || 0;
        document.getElementById('tokenBalance').textContent = user.tokens || 0;
        document.getElementById('settingsName').value = user.name;
        document.getElementById('settingsEmail').value = user.email;
    }
}

// Setup navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = item.dataset.section;

            // Update active nav
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show section
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionId) {
                    section.classList.add('active');
                }
            });

            // Update title
            const titles = {
                overview: 'Dashboard',
                bots: 'Mis Bots',
                tokens: 'Comprar Tokens',
                history: 'Historial de Pagos',
                settings: 'Configuración'
            };
            document.getElementById('page-title').textContent = titles[sectionId];
        });
    });
}

// Load bots from API (mock for now)
async function loadBots() {
    // In production: const response = await fetch('/api/bots');
    // const bots = await response.json();

    // Mock data
    const bots = JSON.parse(localStorage.getItem('myBots') || '[]');

    const botsList = document.getElementById('botsList');
    const activeBots = document.getElementById('activeBots');

    if (bots.length === 0) {
        botsList.innerHTML = '<p class="empty-state">No tienes bots activos. Crea uno para comenzar.</p>';
        activeBots.textContent = '0';
        return;
    }

    activeBots.textContent = bots.length;

    botsList.innerHTML = bots.map(bot => `
        <div class="bot-item">
            <div class="bot-info">
                <h4>${bot.name}</h4>
                <div class="bot-meta">
                    <span>${getBotTypeLabel(bot.type)}</span>
                    <span>•</span>
                    <span>${bot.category}</span>
                    <span>•</span>
                    <span>${bot.roomUrl}</span>
                </div>
            </div>
            <div class="bot-status">
                <span class="status-dot ${bot.status === 'online' ? 'online' : 'offline'}"></span>
                <span>${bot.status === 'online' ? 'Activo' : 'Detenido'}</span>
            </div>
            <div class="bot-actions">
                <button class="btn-action" onclick="toggleBot('${bot.id}')">
                    ${bot.status === 'online' ? 'Detener' : 'Iniciar'}
                </button>
                <button class="btn-action" onclick="deleteBot('${bot.id}')">Eliminar</button>
            </div>
        </div>
    `).join('');
}

function getBotTypeLabel(type) {
    const labels = {
        music: '🎵 Bot Music',
        mod: '🛡️ Bot Mod',
        ia: '🤖 Bot IA',
        alfa: '⚡ Bot ALFA'
    };
    return labels[type] || type;
}

// Show create bot modal
function showCreateBotModal() {
    document.getElementById('createBotModal').classList.add('show');
}

// Show buy tokens modal
function showBuyTokensModal() {
    // Navigate to tokens section
    document.querySelector('[data-section="tokens"]').click();
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// Setup modal handlers
function setupModals() {
    // Create bot form
    const createBotForm = document.getElementById('createBotForm');
    if (createBotForm) {
        createBotForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('botName').value;
            const type = document.getElementById('botType').value;
            const category = document.getElementById('botCategory').value;
            const roomUrl = document.getElementById('botRoomUrl').value;

            const user = getCurrentUser();
            const tokensNeeded = category === 'GA' ? 0.5 : 0.83;
            const tokensPerDay = type === 'alfa' ? tokensNeeded * 2 : type === 'music' ? tokensNeeded : tokensNeeded * 0.8;

            if (user.tokens < tokensPerDay * 7) {
                alert(`Necesitas al menos ${Math.ceil(tokensPerDay * 7)} tokens para crear este bot (1 semana de operación)`);
                return;
            }

            const newBot = {
                id: Date.now().toString(),
                name,
                type,
                category,
                roomUrl,
                status: 'offline',
                createdAt: new Date().toISOString()
            };

            const bots = JSON.parse(localStorage.getItem('myBots') || '[]');
            bots.push(newBot);
            localStorage.setItem('myBots', JSON.stringify(bots));

            // Deduct tokens
            user.tokens -= Math.ceil(tokensPerDay * 7);
            localStorage.setItem('user', JSON.stringify(user));

            closeModal('createBotModal');
            createBotForm.reset();

            loadBots();
            loadUserData();
            updateStats();

            addActivity(`Bot "${name}" creado`);

            alert('Bot creado exitosamente');
        });
    }

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });
}

// Toggle bot status
async function toggleBot(botId) {
    const bots = JSON.parse(localStorage.getItem('myBots') || '[]');
    const bot = bots.find(b => b.id === botId);

    if (bot) {
        bot.status = bot.status === 'online' ? 'offline' : 'online';
        localStorage.setItem('myBots', JSON.stringify(bots));
        loadBots();
        addActivity(`Bot "${bot.name}" ${bot.status === 'online' ? 'iniciado' : 'detenido'}`);
    }
}

// Delete bot
async function deleteBot(botId) {
    if (!confirm('¿Estás seguro de eliminar este bot?')) return;

    const bots = JSON.parse(localStorage.getItem('myBots') || '[]');
    const bot = bots.find(b => b.id === botId);
    const filtered = bots.filter(b => b.id !== botId);

    localStorage.setItem('myBots', JSON.stringify(filtered));
    loadBots();
    updateStats();

    if (bot) {
        addActivity(`Bot "${bot.name}" eliminado`);
    }
}

// Buy tokens
function buyTokens(amount, price) {
    const method = confirm(`Comprar ${amount} tokens por $${price} USD\n\n¿Usar PayPal? (OK para PayPal, Cancelar para transferencia)`);

    if (method) {
        // PayPal flow
        alert('Redirigiendo a PayPal...\n\n(En producción: integración con PayPal SDK)');
        // Simulate successful payment
        setTimeout(() => {
            completeTokenPurchase(amount, price, 'PayPal');
        }, 2000);
    } else {
        // Transfer flow
        alert(`Para pagar por transferencia:\n\nNequi: 3001234567\nBancolombia: 1234567890\nTitular: Pixel Mafia\nValor: $${price} USD\n\nEnvía el comprobante a admin@pixelmafia.com`);
    }
}

function completeTokenPurchase(amount, price, method) {
    const user = getCurrentUser();
    if (!user) return;

    user.tokens = (user.tokens || 0) + amount;
    localStorage.setItem('user', JSON.stringify(user));

    // Add to history
    const history = JSON.parse(localStorage.getItem('paymentHistory') || '[]');
    history.unshift({
        date: new Date().toISOString(),
        description: `${amount} tokens (${method})`,
        amount: `$${price} USD`,
        status: 'Completado'
    });
    localStorage.setItem('paymentHistory', JSON.stringify(history));

    loadUserData();
    loadHistory();
    addActivity(`Comprados ${amount} tokens`);

    alert(`¡Compra exitosa! Ahora tienes ${user.tokens} tokens`);
}

// Load payment history
function loadHistory() {
    const history = JSON.parse(localStorage.getItem('paymentHistory') || '[]');
    const tbody = document.getElementById('historyTableBody');

    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">No hay pagos registrados</td></tr>';
        return;
    }

    tbody.innerHTML = history.map(item => `
        <tr>
            <td>${new Date(item.date).toLocaleDateString()}</td>
            <td>${item.description}</td>
            <td>${item.amount}</td>
            <td><span class="status-badge success">${item.status}</span></td>
        </tr>
    `).join('');
}

// Save settings
function saveSettings() {
    const name = document.getElementById('settingsName').value;
    const user = getCurrentUser();

    if (user) {
        user.name = name;
        localStorage.setItem('user', JSON.stringify(user));
        loadUserData();
        alert('Configuración guardada');
    }
}

// Add activity
function addActivity(message) {
    const activities = JSON.parse(localStorage.getItem('activities') || '[]');
    activities.unshift({
        message,
        time: new Date().toISOString()
    });
    localStorage.setItem('activities', JSON.stringify(activities.slice(0, 20)));
    loadActivities();
}

// Load activities
function loadActivities() {
    const activities = JSON.parse(localStorage.getItem('activities') || '[]');
    const list = document.getElementById('activityList');

    if (activities.length === 0) {
        list.innerHTML = '<p class="empty-state">No hay actividad reciente</p>';
        return;
    }

    list.innerHTML = activities.map(act => `
        <div class="activity-item">
            <span>${act.message}</span>
            <span class="activity-time">${new Date(act.time).toLocaleString()}</span>
        </div>
    `).join('');
}

// Update stats
function updateStats() {
    const user = getCurrentUser();
    if (user) {
        const tokens = user.tokens || 0;
        const tokensPerDay = 1; // Average consumption
        const daysRemaining = Math.floor(tokens / tokensPerDay);

        document.getElementById('daysRemaining').textContent = daysRemaining;
        document.getElementById('usersServed').textContent = Math.floor(Math.random() * 1000) + 100;
    }

    loadActivities();
    loadHistory();
}
