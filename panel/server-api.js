// panel/server-api.js - Panel conectado a API de Render
const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const API_URL = 'https://pixel-mafia-api.onrender.com';
const POLL_INTERVAL = 30000;
const procesos = {};

// Logger
function log(tipo, mensaje) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] [${tipo.toUpperCase()}] ${mensaje}`);
}

// Obtener bots pendientes de la API
async function getPendingBots() {
    try {
        const response = await fetch(`${API_URL}/api/bots/pending`);
        const data = await response.json();
        return data?.bots || [];
    } catch (e) {
        log('error', `API Error: ${e.message}`);
        return [];
    }
}

// Actualizar estado en API
async function updateBotStatus(botId, estado, pid = null) {
    try {
        await fetch(`${API_URL}/api/bots/${botId}/panel-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado, pid })
        });
    } catch (e) {
        log('error', `Error actualizando estado: ${e.message}`);
    }
}

// Ejecutar bot con credenciales de instancia
function ejecutarBot(bot) {
    const { id, tipo, categoria } = bot;
    
    // Leer config local
    const configPath = path.join(__dirname, '..', 'instances', id, 'config.json');
    if (!fs.existsSync(configPath)) {
        log('error', `No existe instancia ${id}`);
        return null;
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    log('info', `Iniciando ${id} (${tipo}) para sala ${config.sala}`);
    
    const botPath = path.join(__dirname, '..', 'bots', tipo, 'bot.js');
    if (!fs.existsSync(botPath)) {
        log('error', `Bot no encontrado: ${botPath}`);
        return null;
    }
    
    const env = {
        ...process.env,
        BOT_ID: id,
        BOT_TYPE: tipo,
        BOT_CATEGORY: categoria,
        ROOM_URL: config.sala,
        BOT_NAME: config.nombre || `Bot ${tipo}`,
        IMVU_USERNAME: config.usuario,
        IMVU_PASSWORD: config.password,
        HEADLESS: 'true',
        RADIO_URL: 'https://pixel-mafia-radio.onrender.com'
    };
    
    const proceso = spawn('node', [botPath], {
        env,
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Logs
    proceso.stdout.on('data', (data) => {
        const line = data.toString().trim();
        log('bot', `[${id}] ${line}`);
    });
    
    proceso.stderr.on('data', (data) => {
        const line = data.toString().trim();
        log('error', `[${id}] ${line}`);
    });
    
    proceso.on('close', (code) => {
        log('info', `Bot ${id} terminado (${code})`);
        delete procesos[id];
        updateBotStatus(id, 'detenido');
    });
    
    procesos[id] = { proceso, pid: proceso.pid, config };
    updateBotStatus(id, 'corriendo', proceso.pid);
    
    return proceso;
}

// Ciclo de sincronización
async function syncLoop() {
    const bots = await getPendingBots();
    
    for (const bot of bots) {
        const { id, estado } = bot;
        
        if (estado === 'pendiente_iniciar' || estado === 'creado') {
            if (!procesos[id] || procesos[id].proceso.killed) {
                ejecutarBot(bot);
            }
        } else if (estado === 'pendiente_detener') {
            if (procesos[id]) {
                procesos[id].proceso.kill('SIGTERM');
                updateBotStatus(id, 'detenido');
            }
        }
    }
    
    log('info', `Sync completado. Bots activos: ${Object.keys(procesos).length}`);
}

// API del panel
app.get('/api/status', (req, res) => {
    const status = {};
    for (const [id, proc] of Object.entries(procesos)) {
        status[id] = {
            running: proc.proceso && !proc.proceso.killed,
            pid: proc.pid,
            config: proc.config
        };
    }
    res.json(status);
});

app.post('/api/start', (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Falta id' });
    
    if (procesos[id] && !procesos[id].proceso.killed) {
        return res.json({ error: 'Ya está corriendo' });
    }
    
    // Simular bot pendiente para probar
    const bot = { id, tipo: 'music', categoria: 'GA' };
    const proceso = ejecutarBot(bot);
    
    if (proceso) {
        res.json({ ok: true, pid: proceso.pid });
    } else {
        res.status(500).json({ error: 'No se pudo iniciar' });
    }
});

app.post('/api/stop', (req, res) => {
    const { id } = req.body;
    if (!procesos[id]) return res.json({ error: 'No está corriendo' });
    
    procesos[id].proceso.kill('SIGTERM');
    res.json({ ok: true });
});

// Iniciar
const PORT = 3100;
app.listen(PORT, () => {
    console.log(`╔════════════════════════════════════════╗`);
    console.log(`║   Panel Pixel Mafia - API Connected    ║`);
    console.log(`║   http://localhost:${PORT}              ║`);
    console.log(`╚════════════════════════════════════════╝`);
    
    // Iniciar sync
    syncLoop();
    setInterval(syncLoop, POLL_INTERVAL);
    
    log('info', `Sincronización con API cada ${POLL_INTERVAL/1000}s`);
});

// Cierre graceful
process.on('SIGINT', () => {
    log('info', 'Cerrando panel...');
    for (const [id, proc] of Object.entries(procesos)) {
        proc.proceso.kill('SIGTERM');
    }
    process.exit(0);
});
