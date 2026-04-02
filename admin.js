// admin.js - Admin panel functionality
document.addEventListener('DOMContentLoaded', () => {
    // Check admin authentication
    if (!requireAuth()) return;

    // Verify admin access (in production, check role from backend)
    const user = getCurrentUser();
    if (!user || user.email !== 'admin@pixelmafia.com') {
        alert('Acceso denegado');
        window.location.href = 'dashboard.html';
        return;
    }

    // Setup navigation
    setupNavigation();

    // Load all data
    loadOverview();
    loadClients();
    loadAllBots();
    loadCuentas();
    loadPagos();
    loadLogs();
});

// Setup navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = item.dataset.section;

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionId) {
                    section.classList.add('active');
                }
            });

            const titles = {
                overview: 'Panel de Administración',
                clients: 'Clientes',
                bots: 'Bots',
                cuentas: 'Cuentas',
                pagos: 'Pagos',
                logs: 'Logs'
            };
            document.getElementById('page-title').textContent = titles[sectionId];
        });
    });
}

// Load overview stats
function loadOverview() {
    // Get all data from localStorage
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const bots = JSON.parse(localStorage.getItem('allBots') || '[]');
    const cuentas = JSON.parse(localStorage.getItem('cuentasPool') || '[]');
    const payments = JSON.parse(localStorage.getItem('allPayments') || '[]');

    // Calculate stats
    document.getElementById('totalClients').textContent = users.length || 1;
    document.getElementById('totalBots').textContent = bots.length || 0;
    
    const monthlyRevenue = payments
        .filter(p => new Date(p.date).getMonth() === new Date().getMonth())
        .reduce((sum, p) => sum + (p.amount || 0), 0);
    document.getElementById('monthlyRevenue').textContent = `$${monthlyRevenue || 0}`;

    const availableCuentas = cuentas.filter(c => !c.enUso).length || 4;
    document.getElementById('availableAccounts').textContent = availableCuentas;

    // Quick stats
    const gaBots = bots.filter(b => b.category === 'GA').length || 0;
    const apBots = bots.filter(b => b.category === 'AP').length || 0;
    const pendingPayments = payments.filter(p => p.status === 'Pendiente').length || 0;

    document.getElementById('botsGA').textContent = gaBots;
    document.getElementById('botsAP').textContent = apBots;
    document.getElementById('pendingPayments').textContent = pendingPayments;

    // Check for alerts
    checkAlerts(availableCuentas, pendingPayments);
}

// Check and display alerts
function checkAlerts(availableCuentas, pendingPayments) {
    const alerts = [];
    
    if (availableCuentas < 2) {
        alerts.push({
            type: 'warning',
            message: `Solo quedan ${availableCuentas} cuentas disponibles`,
            time: new Date().toISOString()
        });
    }

    if (pendingPayments > 0) {
        alerts.push({
            type: 'error',
            message: `${pendingPayments} pagos pendientes de confirmar`,
            time: new Date().toISOString()
        });
    }

    const alertsList = document.getElementById('alertsList');
    if (alerts.length === 0) {
        alertsList.innerHTML = '<p class="empty-state">No hay alertas</p>';
    } else {
        alertsList.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.type}">
                <span class="alert-message">${alert.message}</span>
                <span class="alert-time">${new Date(alert.time).toLocaleTimeString()}</span>
            </div>
        `).join('');
    }
}

// Load clients
function loadClients() {
    const users = JSON.parse(localStorage.getItem('users') || '[{"name":"Demo User","email":"demo@pixelmafia.com","tokens":100,"createdAt":"2024-01-01"}]');
    const tbody = document.getElementById('clientsTableBody');

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No hay clientes</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.tokens || 0}</td>
            <td>${(user.bots || []).length}</td>
            <td>${new Date(user.createdAt || Date.now()).toLocaleDateString()}</td>
            <td>
                <button class="btn-action-sm" onclick="editClient('${user.email}')">Editar</button>
                <button class="btn-action-sm danger" onclick="deleteClient('${user.email}')">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

// Load all bots
function loadAllBots() {
    const bots = JSON.parse(localStorage.getItem('allBots') || '[]');
    const tbody = document.getElementById('botsTableBody');

    if (bots.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No hay bots registrados</td></tr>';
        return;
    }

    tbody.innerHTML = bots.map(bot => `
        <tr>
            <td>${bot.id.slice(0, 20)}...</td>
            <td>${bot.clientName || 'Desconocido'}</td>
            <td>${getBotTypeLabel(bot.type)}</td>
            <td>${bot.roomUrl || 'N/A'}</td>
            <td><span class="status-badge ${bot.status}">${bot.status === 'online' ? 'Activo' : 'Detenido'}</span></td>
            <td>
                <button class="btn-action-sm" onclick="restartBot('${bot.id}')">Reiniciar</button>
                <button class="btn-action-sm danger" onclick="deleteBotAdmin('${bot.id}')">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

// Load cuentas pool
function loadCuentas() {
    const cuentas = JSON.parse(localStorage.getItem('cuentasPool') || '[{"id":"bot-ga-01","usuario":"botpixel01","categoria":"GA","enUso":false,"instanciaAsignada":null},{"id":"bot-ga-02","usuario":"botpixel02","categoria":"GA","enUso":false,"instanciaAsignada":null},{"id":"bot-ap-01","usuario":"botpixelap01","categoria":"AP","enUso":false,"instanciaAsignada":null},{"id":"bot-ap-02","usuario":"botpixelap02","categoria":"AP","enUso":false,"instanciaAsignada":null}]');
    const tbody = document.getElementById('cuentasTableBody');

    tbody.innerHTML = cuentas.map(cuenta => `
        <tr>
            <td>${cuenta.id}</td>
            <td>${cuenta.usuario}</td>
            <td>${cuenta.categoria}</td>
            <td><span class="status-badge ${cuenta.enUso ? 'error' : 'success'}">${cuenta.enUso ? 'En Uso' : 'Libre'}</span></td>
            <td>${cuenta.instanciaAsignada || '-'}</td>
            <td>
                <button class="btn-action-sm" onclick="editCuenta('${cuenta.id}')">Editar</button>
                <button class="btn-action-sm danger" onclick="deleteCuenta('${cuenta.id}')">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

// Load pagos
function loadPagos() {
    const payments = JSON.parse(localStorage.getItem('allPayments') || '[]');
    const tbody = document.getElementById('pagosTableBody');

    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">No hay pagos registrados</td></tr>';
        return;
    }

    tbody.innerHTML = payments.map(payment => `
        <tr>
            <td>${new Date(payment.date).toLocaleDateString()}</td>
            <td>${payment.clientName || 'Desconocido'}</td>
            <td>${payment.description}</td>
            <td>$${payment.amount}</td>
            <td>${payment.method}</td>
            <td><span class="status-badge ${payment.status === 'Completado' ? 'success' : 'pending'}">${payment.status}</span></td>
            <td>
                ${payment.status === 'Pendiente' 
                    ? `<button class="btn-action-sm" onclick="confirmPayment('${payment.id}')">Confirmar</button>` 
                    : '-'
                }
            </td>
        </tr>
    `).join('');
}

// Load logs
function loadLogs() {
    const logs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
    const container = document.getElementById('logsContainer');

    if (logs.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay logs</p>';
        return;
    }

    container.innerHTML = logs.slice(-100).map(log => `
        <div class="log-entry">
            <span class="log-time">${new Date(log.time).toLocaleString()}</span>
            <span class="log-type ${log.type}">${log.type.toUpperCase()}</span>
            <span class="log-message">${log.message}</span>
        </div>
    `).join('');

    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Show add account modal
function showAddAccountModal() {
    document.getElementById('addAccountModal').classList.add('show');
}

// Add account form
function setupAddAccountForm() {
    const form = document.getElementById('addAccountForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const newCuenta = {
                id: `bot-${document.getElementById('accountCategory').value.toLowerCase()}-${Date.now()}`,
                usuario: document.getElementById('accountUser').value,
                password: document.getElementById('accountPass').value,
                categoria: document.getElementById('accountCategory').value,
                enUso: false,
                instanciaAsignada: null
            };

            const cuentas = JSON.parse(localStorage.getItem('cuentasPool') || '[]');
            cuentas.push(newCuenta);
            localStorage.setItem('cuentasPool', JSON.stringify(cuentas));

            closeModal('addAccountModal');
            form.reset();
            loadCuentas();
            loadOverview();
            addLog('info', `Cuenta agregada: ${newCuenta.usuario}`);
        });
    }
}

// Filter payments
function filterPayments(filter) {
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const payments = JSON.parse(localStorage.getItem('allPayments') || '[]');
    let filtered = payments;

    if (filter === 'pending') {
        filtered = payments.filter(p => p.status === 'Pendiente');
    } else if (filter === 'completed') {
        filtered = payments.filter(p => p.status === 'Completado');
    }

    const tbody = document.getElementById('pagosTableBody');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">No hay pagos</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(payment => `
        <tr>
            <td>${new Date(payment.date).toLocaleDateString()}</td>
            <td>${payment.clientName || 'Desconocido'}</td>
            <td>${payment.description}</td>
            <td>$${payment.amount}</td>
            <td>${payment.method}</td>
            <td><span class="status-badge ${payment.status === 'Completado' ? 'success' : 'pending'}">${payment.status}</span></td>
            <td>
                ${payment.status === 'Pendiente' 
                    ? `<button class="btn-action-sm" onclick="confirmPayment('${payment.id}')">Confirmar</button>` 
                    : '-'
                }
            </td>
        </tr>
    `).join('');
}

// Confirm payment (manual)
function confirmPayment(paymentId) {
    const payments = JSON.parse(localStorage.getItem('allPayments') || '[]');
    const payment = payments.find(p => p.id === paymentId);

    if (payment) {
        payment.status = 'Completado';
        localStorage.setItem('allPayments', JSON.stringify(payments));

        // Add tokens to user
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === payment.clientEmail);
        if (user) {
            user.tokens = (user.tokens || 0) + payment.tokens;
            localStorage.setItem('users', JSON.stringify(users));
        }

        loadPagos();
        loadOverview();
        addLog('info', `Pago confirmado: ${payment.id}`);
        alert('Pago confirmado y tokens agregados');
    }
}

// Admin actions
function restartBot(botId) {
    addLog('info', `Bot reiniciado: ${botId}`);
    alert('Bot reiniciado');
}

function deleteBotAdmin(botId) {
    if (!confirm('¿Eliminar este bot?')) return;

    const bots = JSON.parse(localStorage.getItem('allBots') || '[]');
    const filtered = bots.filter(b => b.id !== botId);
    localStorage.setItem('allBots', JSON.stringify(filtered));

    loadAllBots();
    loadOverview();
    addLog('warn', `Bot eliminado: ${botId}`);
}

function editClient(email) {
    alert('Editar cliente: ' + email);
}

function deleteClient(email) {
    if (!confirm('¿Eliminar este cliente?')) return;

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const filtered = users.filter(u => u.email !== email);
    localStorage.setItem('users', JSON.stringify(filtered));

    loadClients();
    loadOverview();
    addLog('warn', `Cliente eliminado: ${email}`);
}

function deleteCuenta(id) {
    if (!confirm('¿Eliminar esta cuenta?')) return;

    const cuentas = JSON.parse(localStorage.getItem('cuentasPool') || '[]');
    const filtered = cuentas.filter(c => c.id !== id);
    localStorage.setItem('cuentasPool', JSON.stringify(filtered));

    loadCuentas();
    loadOverview();
    addLog('warn', `Cuenta eliminada: ${id}`);
}

function editCuenta(id) {
    alert('Editar cuenta: ' + id);
}

function searchClients() {
    const query = document.getElementById('searchClients').value.toLowerCase();
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const filtered = users.filter(u => 
        u.name.toLowerCase().includes(query) || 
        u.email.toLowerCase().includes(query)
    );

    const tbody = document.getElementById('clientsTableBody');
    tbody.innerHTML = filtered.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.tokens || 0}</td>
            <td>${(user.bots || []).length}</td>
            <td>${new Date(user.createdAt || Date.now()).toLocaleDateString()}</td>
            <td>
                <button class="btn-action-sm" onclick="editClient('${user.email}')">Editar</button>
                <button class="btn-action-sm danger" onclick="deleteClient('${user.email}')">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

function refreshBots() {
    loadAllBots();
    addLog('info', 'Lista de bots actualizada');
}

function clearLogs() {
    if (!confirm('¿Limpiar todos los logs?')) return;
    localStorage.setItem('systemLogs', '[]');
    loadLogs();
}

// Add system log
function addLog(type, message) {
    const logs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
    logs.push({
        type,
        message,
        time: new Date().toISOString()
    });
    localStorage.setItem('systemLogs', JSON.stringify(logs.slice(-500)));
    loadLogs();
}

// Initialize add account form
setupAddAccountForm();
