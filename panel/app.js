const API = '/api';
const state = { keep: false };
let instancias = [];

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        link.classList.add('active');
        document.getElementById(`page-${page}`).classList.add('active');
    });
});

function setupButtons() {
    document.getElementById('start-keep')?.addEventListener('click', () => toggleBot('keep'));
    document.getElementById('stopAllBtn')?.addEventListener('click', stopAll);
    document.getElementById('addInstanciaBtn')?.addEventListener('click', () => openModal());
    document.getElementById('modalClose')?.addEventListener('click', closeModal);
    document.getElementById('modalCancel')?.addEventListener('click', closeModal);
    document.getElementById('modalSave')?.addEventListener('click', saveInstancia);
    document.getElementById('saveConfigBtn')?.addEventListener('click', saveConfig);
    document.getElementById('clearLogsBtn')?.addEventListener('click', () => {
        document.getElementById('logsContainer').innerHTML = '';
    });
}

async function toggleBot(tipo) {
    const running = state[tipo];
    const endpoint = running ? '/stop' : '/start';
    try {
        const res = await fetch(`${API}${endpoint}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo })
        });
        const data = await res.json();
        if (data.error) addLogClient('info', data.error);
    } catch (e) { addLogClient('error', `Error: ${e.message}`); }
}

async function stopAll() {
    try { await fetch(`${API}/stop-all`, { method: 'POST' }); }
    catch (e) { addLogClient('error', `Error: ${e.message}`); }
}

function updateStatus(tipo, running) {
    state[tipo] = running;
    const statusEl = document.getElementById(`status-${tipo}`);
    const btnEl = document.getElementById(`start-${tipo}`);
    if (statusEl) {
        statusEl.textContent = running ? 'Activo' : 'Inactivo';
        statusEl.className = `stat-status ${running ? 'active' : 'inactive'}`;
    }
    if (btnEl) {
        btnEl.textContent = running ? 'Detener' : 'Iniciar';
        btnEl.className = `btn ${running ? 'btn-stop' : 'btn-start'}`;
    }
}

function addLogClient(tipo, mensaje) {
    renderLog({ time: new Date().toLocaleTimeString(), tipo, mensaje });
}

function renderLog(entry) {
    const container = document.getElementById('logsContainer');
    const preview = document.getElementById('logsPreview');
    const html = `<div class="log-entry"><span class="log-time">${entry.time}</span><span class="log-tipo ${entry.tipo}">${entry.tipo.toUpperCase()}</span><span class="log-msg">${escapeHtml(entry.mensaje)}</span></div>`;
    if (container) container.insertAdjacentHTML('beforeend', html);
    if (preview) {
        preview.insertAdjacentHTML('afterbegin', html);
        if (preview.children.length > 20) preview.removeChild(preview.lastChild);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ── Instancias ──
async function loadInstancias() {
    try {
        const res = await fetch(`${API}/instancias`);
        const data = await res.json();
        instancias = data || [];
        renderInstancias();
        document.getElementById('active-bots-count').textContent = instancias.filter(i => i.activo).length;
    } catch (e) { console.error('Error cargando instancias:', e); }
}

function renderInstancias() {
    const tbody = document.getElementById('instanciasBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (instancias.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No tienes bots creados. Haz clic en "+ Nuevo Bot" para empezar.</td></tr>`;
        return;
    }

    for (const inst of instancias) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="status-dot ${inst.activo ? 'active' : 'inactive'}"></span>${inst.activo ? 'Activo' : 'Inactivo'}</td>
            <td><strong>${escapeHtml(inst.nombre)}</strong></td>
            <td><code>${escapeHtml(inst.id)}</code></td>
            <td><span class="sala-url" title="${escapeHtml(inst.sala)}">${escapeHtml(inst.sala)}</span></td>
            <td><span class="badge badge-${inst.categoria.toLowerCase()}">${inst.categoria}</span></td>
            <td>
                <div class="table-actions">
                    ${inst.activo
                        ? `<button class="btn btn-stop" onclick="toggleInstancia('${inst.id}')">Detener</button>`
                        : `<button class="btn btn-start" onclick="toggleInstancia('${inst.id}')">Iniciar</button>`
                    }
                    <button class="btn btn-danger" onclick="deleteInstancia('${inst.id}')">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

async function toggleInstancia(id) {
    const inst = instancias.find(i => i.id === id);
    if (!inst) return;

    const endpoint = inst.activo ? '/instancias/stop' : '/instancias/start';
    try {
        const res = await fetch(`${API}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.error) addLogClient('error', data.error);
        else addLogClient('info', `${inst.activo ? 'Detenido' : 'Iniciado'}: ${inst.nombre}`);
        loadInstancias();
    } catch (e) { addLogClient('error', `Error: ${e.message}`); }
}

function openModal() {
    const modal = document.getElementById('modalInstancia');
    modal.classList.add('active');
    document.getElementById('inst-nombre').value = '';
    document.getElementById('inst-sala').value = '';
    document.getElementById('inst-id').value = '';
    document.getElementById('inst-usuario').value = '';
    document.getElementById('inst-password').value = '';
}

function closeModal() {
    document.getElementById('modalInstancia').classList.remove('active');
}

async function saveInstancia() {
    const nombre = document.getElementById('inst-nombre').value.trim();
    const sala = document.getElementById('inst-sala').value.trim();
    const categoria = document.getElementById('inst-categoria').value;
    const usuario = document.getElementById('inst-usuario').value.trim();
    const password = document.getElementById('inst-password').value;

    if (!nombre || !sala) return alert('Nombre y URL de sala son obligatorios');

    const id = `${nombre.replace(/\s+/g, '-').toLowerCase()}-${categoria.toLowerCase()}-${Date.now()}`.slice(0, 60);
    const config = { id, nombre, tipo: 'music', categoria, usuario, password, sala, notas: '' };

    try {
        const res = await fetch(`${API}/instancias/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config })
        });
        const data = await res.json();
        if (data.error) { alert(data.error); return; }
        addLogClient('info', `Bot creado: ${nombre}`);
        closeModal();
        loadInstancias();
    } catch (e) { addLogClient('error', `Error: ${e.message}`); }
}

async function deleteInstancia(id) {
    if (!confirm('¿Eliminar este bot? Se borrará la sesión de Chrome.')) return;
    try {
        const res = await fetch(`${API}/instancias/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.error) { alert(data.error); return; }
        addLogClient('info', `Bot eliminado: ${id}`);
        loadInstancias();
    } catch (e) { addLogClient('error', `Error: ${e.message}`); }
}

function saveConfig() {
    const config = {
        imvuUser: document.getElementById('cfg-imvu-user').value,
        imvuPass: document.getElementById('cfg-imvu-pass').value,
        radioUrl: document.getElementById('cfg-radio-url').value
    };
    localStorage.setItem('pixelmafia_config', JSON.stringify(config));
    addLogClient('info', 'Configuración guardada');
    alert('Configuración guardada');
}

function loadConfig() {
    try {
        const saved = localStorage.getItem('pixelmafia_config');
        if (saved) {
            const config = JSON.parse(saved);
            if (config.imvuUser) document.getElementById('cfg-imvu-user').value = config.imvuUser;
            if (config.imvuPass) document.getElementById('cfg-imvu-pass').value = config.imvuPass;
            if (config.radioUrl) document.getElementById('cfg-radio-url').value = config.radioUrl;
        }
    } catch (e) {}
}

// Polling
let lastLogCount = 0;
function pollLogs() {
    fetch(`${API}/logs`).then(r => r.json()).then(logs => {
        if (logs.length > lastLogCount) {
            for (let i = lastLogCount; i < logs.length; i++) renderLog(logs[i]);
            lastLogCount = logs.length;
        }
    }).catch(() => {});

    fetch(`${API}/status`).then(r => r.json()).then(data => {
        for (const [tipo, info] of Object.entries(data)) updateStatus(tipo, info.running);
    }).catch(() => {});
}

if (window.electronAPI) {
    window.electronAPI.onLog((data) => renderLog(data));
    window.electronAPI.onStatus((data) => updateStatus(data.tipo, data.running));
}

setupButtons();
loadConfig();
pollLogs();
loadInstancias();
setInterval(pollLogs, 2000);

window.toggleInstancia = toggleInstancia;
window.deleteInstancia = deleteInstancia;
