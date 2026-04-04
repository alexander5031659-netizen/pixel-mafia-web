const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const express = require('express');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

let mainWindow;
let panelServer;
const procesos = {};
const logs = [];
const MAX_LOGS = 500;
const PORT = 3100;

const agentesPath = path.join(__dirname, '..', 'bots', 'ia', 'agentes.json');

function loadAgentesConfig() {
    try {
        if (fs.existsSync(agentesPath)) {
            return JSON.parse(fs.readFileSync(agentesPath, 'utf8'));
        }
    } catch (e) {}
    return {
        groq: { activo: true, apiKey: '', modelo: 'llama-3.3-70b-versatile', temperatura: 0.7, personalidad: '' },
        openai: { activo: false, apiKey: '', modelo: 'gpt-4o-mini', temperatura: 0.7, personalidad: '' },
        anthropic: { activo: false, apiKey: '', modelo: 'claude-3-5-haiku-20241022', temperatura: 0.7, personalidad: '' },
        google: { activo: false, apiKey: '', modelo: 'gemini-2.0-flash', temperatura: 0.7, personalidad: '' },
        ollama: { activo: false, url: 'http://localhost:11434', modelo: 'llama3.2', temperatura: 0.7, personalidad: '' },
        huggingface: { activo: false, apiKey: '', modelo: 'mistralai/Mistral-7B-Instruct-v0.3', temperatura: 0.7, personalidad: '' },
        nvidia: { activo: false, apiKey: '', modelo: 'meta/llama-3.1-70b-instruct', temperatura: 0.7, personalidad: '' }
    };
}

function saveAgentesConfig(config) {
    fs.writeFileSync(agentesPath, JSON.stringify(config, null, 2));
}

let agentesConfig = loadAgentesConfig();

const proveedoresInfo = {
    groq: {
        nombre: 'GROQ',
        precio: 'Gratis',
        limite: '6-30 req/min (gratis)',
        registro: 'https://console.groq.com',
        instrucciones: '1. Ve a console.groq.com\n2. Crea cuenta con Google/GitHub\n3. Ve a API Keys → Create Key\n4. Copia la key (empieza con gsk_)\n5. Pégala arriba y activa el toggle',
        modelos: [
            { id: 'llama-3.3-70b-versatile', nombre: 'Llama 3.3 70B (Recomendado)', gratis: true },
            { id: 'llama-3.1-8b-instant', nombre: 'Llama 3.1 8B (Rápido)', gratis: true },
            { id: 'mixtral-8x7b-32768', nombre: 'Mixtral 8x7B', gratis: true },
            { id: 'gemma2-9b-it', nombre: 'Gemma 2 9B', gratis: true }
        ]
    },
    openai: {
        nombre: 'OpenAI',
        precio: 'Pago ($0.002-$10/1M tokens)',
        limite: 'Según saldo',
        registro: 'https://platform.openai.com',
        instrucciones: '1. Ve a platform.openai.com\n2. Crea cuenta o inicia sesión\n3. Ve a Settings → Billing → Add payment\n4. Agrega al menos $5 de crédito\n5. Ve a API Keys → Create new secret key\n6. Copia la key (sk-...)',
        modelos: [
            { id: 'gpt-4o-mini', nombre: 'GPT-4o mini (Económico)', gratis: false },
            { id: 'gpt-4o', nombre: 'GPT-4o (Mejor calidad)', gratis: false },
            { id: 'gpt-4-turbo', nombre: 'GPT-4 Turbo', gratis: false },
            { id: 'gpt-3.5-turbo', nombre: 'GPT-3.5 Turbo (Barato)', gratis: false }
        ]
    },
    anthropic: {
        nombre: 'Anthropic Claude',
        precio: 'Pago ($0.25-$15/1M tokens)',
        limite: 'Según saldo',
        registro: 'https://console.anthropic.com',
        instrucciones: '1. Ve a console.anthropic.com\n2. Crea cuenta con email\n3. Ve a API Keys\n4. Click en Create Key\n5. Copia la key (sk-ant-...)\n6. Necesitas agregar método de pago',
        modelos: [
            { id: 'claude-3-5-haiku-20241022', nombre: 'Claude 3.5 Haiku (Rápido)', gratis: false },
            { id: 'claude-3-5-sonnet-20241022', nombre: 'Claude 3.5 Sonnet (Recomendado)', gratis: false },
            { id: 'claude-3-opus-20240229', nombre: 'Claude 3 Opus (Máxima calidad)', gratis: false }
        ]
    },
    google: {
        nombre: 'Google Gemini',
        precio: 'Gratis (hasta 15 req/min)',
        limite: '15 req/min gratis, luego pago',
        registro: 'https://aistudio.google.com',
        instrucciones: '1. Ve a aistudio.google.com\n2. Inicia sesión con Google\n3. Click en Get API Key\n4. Create API Key\n5. Copia la key\n6. Gratis hasta 15 peticiones/minuto',
        modelos: [
            { id: 'gemini-2.0-flash', nombre: 'Gemini 2.0 Flash (Recomendado)', gratis: true },
            { id: 'gemini-1.5-flash', nombre: 'Gemini 1.5 Flash', gratis: true },
            { id: 'gemini-1.5-pro', nombre: 'Gemini 1.5 Pro', gratis: true }
        ]
    },
    ollama: {
        nombre: 'Ollama (Local - Gratis)',
        precio: '100% Gratis (corre en tu PC)',
        limite: 'Sin límite (tu hardware)',
        registro: 'https://ollama.com',
        instrucciones: '1. Descarga ollama.com\n2. Instala en tu PC\n3. Abre terminal y ejecuta: ollama pull llama3.2\n4. El servidor corre en localhost:11434\n5. No necesitas API Key\n6. Modelos disponibles: llama3.2, mistral, phi3, gemma2, qwen2.5',
        modelos: [
            { id: 'llama3.2', nombre: 'Llama 3.2 (Recomendado)', gratis: true },
            { id: 'mistral', nombre: 'Mistral', gratis: true },
            { id: 'phi3', nombre: 'Phi 3 (Ligero)', gratis: true },
            { id: 'gemma2', nombre: 'Gemma 2', gratis: true },
            { id: 'qwen2.5', nombre: 'Qwen 2.5', gratis: true }
        ]
    },
    huggingface: {
        nombre: 'HuggingFace Inference',
        precio: 'Gratis (rate limitado)',
        limite: '~100 req/hora gratis',
        registro: 'https://huggingface.co',
        instrucciones: '1. Ve a huggingface.co\n2. Crea cuenta gratuita\n3. Ve a Settings → Access Tokens\n4. Create new token (tipo: Read)\n5. Copia el token (hf_...)\n6. Gratis con límites de uso',
        modelos: [
            { id: 'mistralai/Mistral-7B-Instruct-v0.3', nombre: 'Mistral 7B (Gratis)', gratis: true },
            { id: 'meta-llama/Meta-Llama-3-8B-Instruct', nombre: 'Llama 3 8B', gratis: true },
            { id: 'google/gemma-2-9b-it', nombre: 'Gemma 2 9B', gratis: true }
        ]
    },
    nvidia: {
        nombre: 'NVIDIA NIM',
        precio: 'Gratis (5000 req/mes gratis)',
        limite: '5000 requests/mes gratis',
        registro: 'https://build.nvidia.com',
        instrucciones: '1. Ve a build.nvidia.com\n2. Crea cuenta con email o Google\n3. Ve a "Get API Key"\n4. Copia la key (nvapi-...)\n5. Gratis hasta 5000 requests/mes\n6. Modelos: Llama 3.1 70B, Mistral Large, etc.',
        modelos: [
            { id: 'meta/llama-3.1-70b-instruct', nombre: 'Llama 3.1 70B (Recomendado)', gratis: true },
            { id: 'meta/llama-3.1-8b-instruct', nombre: 'Llama 3.1 8B (Rápido)', gratis: true },
            { id: 'mistralai/mistral-large-2-instruct', nombre: 'Mistral Large 2', gratis: true },
            { id: 'mistralai/mixtral-8x22b-instruct-v0.1', nombre: 'Mixtral 8x22B', gratis: true },
            { id: 'google/gemma-2-27b-it', nombre: 'Gemma 2 27B', gratis: true },
            { id: 'microsoft/phi-3-mini-128k-instruct', nombre: 'Phi-3 Mini (Ligero)', gratis: true }
        ]
    }
};

function addLog(tipo, mensaje) {
    const entry = { time: new Date().toLocaleTimeString(), tipo, mensaje };
    logs.push(entry);
    if (logs.length > MAX_LOGS) logs.shift();
    if (mainWindow) mainWindow.webContents.send('log', entry);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1100,
        height: 750,
        minWidth: 900,
        minHeight: 600,
        title: 'Pixel Mafia - Panel de Control',
        backgroundColor: '#0a0a0f',
        icon: path.join(__dirname, '..', 'logo.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadURL(`http://localhost:${PORT}`);

    mainWindow.on('closed', () => {
        mainWindow = null;
        stopAll();
    });
}

function startPanelServer() {
    const expressApp = express();
    expressApp.use(require('cors')());
    expressApp.use(require('express').json());

    expressApp.use((req, res, next) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        next();
    });

    expressApp.use(express.static(path.join(__dirname), {
        setHeaders: (res) => {
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        }
    }));

    expressApp.get('/api/status', (req, res) => {
        const status = {};
        for (const [key, proc] of Object.entries(procesos)) {
            status[key] = { running: proc && !proc.killed, pid: proc ? proc.pid : null };
        }
        res.json(status);
    });

    expressApp.get('/api/logs', (req, res) => res.json(logs));

    expressApp.post('/api/start', (req, res) => {
        const { tipo, nombre } = req.body;
        if (!tipo) return res.status(400).json({ error: 'Falta tipo' });
        if (procesos[tipo] && !procesos[tipo].killed) return res.json({ error: 'Ya está corriendo' });

        let script;
        const botName = nombre || getBotName(tipo);
        const rootDir = path.join(__dirname, '..');

        switch (tipo) {
            case 'music': script = path.join(rootDir, 'bots', 'music', 'bot.js'); break;
            case 'keep': script = path.join(rootDir, 'keep_alive.js'); break;
            case 'mod': script = path.join(rootDir, 'bots', 'mod', 'bot.js'); break;
            case 'ia': script = path.join(rootDir, 'bots', 'ia', 'bot.js'); break;
            case 'alfa': script = path.join(rootDir, 'bots', 'alfa', 'bot.js'); break;
            default: return res.status(400).json({ error: 'Tipo desconocido' });
        }

        if (!fs.existsSync(script)) return res.json({ error: `Script no encontrado` });

        addLog('info', `Iniciando ${botName}...`);

        const proc = spawn('node', [script], {
            cwd: rootDir,
            env: { ...process.env, BOT_NAME: botName },
            windowsHide: true
        });

        proc.stdout.on('data', (d) => { if (d.toString().trim()) addLog(tipo, d.toString().trim()); });
        proc.stderr.on('data', (d) => { if (d.toString().trim()) addLog('error', d.toString().trim()); });
        proc.on('close', (code) => {
            addLog('info', `${tipo} cerrado (código: ${code})`);
            delete procesos[tipo];
            if (mainWindow) mainWindow.webContents.send('status', { tipo, running: false });
        });
        proc.on('error', (err) => addLog('error', `${tipo} error: ${err.message}`));

        procesos[tipo] = proc;
        if (mainWindow) mainWindow.webContents.send('status', { tipo, running: true });
        res.json({ ok: true, pid: proc.pid });
    });

    expressApp.post('/api/stop', async (req, res) => {
        const { tipo } = req.body;
        if (!tipo || !procesos[tipo]) return res.json({ error: 'No está corriendo' });
        addLog('info', `Deteniendo ${tipo} (esperando despedida)...`);
        
        // En Windows usar SIGINT (Ctrl+C) que funciona mejor que SIGTERM
        const isWindows = process.platform === 'win32';
        const signal = isWindows ? 'SIGINT' : 'SIGTERM';
        procesos[tipo].kill(signal);
        
        // Esperar hasta 8 segundos para cierre graceful
        let closed = false;
        for (let i = 0; i < 16; i++) {
            await new Promise(r => setTimeout(r, 500));
            if (procesos[tipo].killed || procesos[tipo].exitCode !== null) {
                closed = true;
                break;
            }
        }
        
        if (!closed) {
            addLog('warn', `${tipo} no respondió, forzando cierre...`);
            try { procesos[tipo].kill('SIGKILL'); } catch(e){}
        }
        
        delete procesos[tipo];
        res.json({ ok: true, graceful: closed });
    });

    expressApp.post('/api/stop-all', (req, res) => {
        addLog('info', 'Deteniendo todo...');
        for (const proc of Object.values(procesos)) { try { proc.kill('SIGTERM'); } catch (e) {} }
        Object.keys(procesos).forEach(k => delete procesos[k]);
        res.json({ ok: true });
    });

    expressApp.post('/api/config', (req, res) => {
        const config = req.body;
        const envPath = path.join(__dirname, '..', '.env');
        let content = '';
        if (config.imvuUser) content += `IMVU_USERNAME=${config.imvuUser}\n`;
        if (config.imvuPass) content += `IMVU_PASSWORD=${config.imvuPass}\n`;
        if (config.roomId) content += `ROOM_ID=${config.roomId}\n`;
        if (config.groqKey) content += `GROQ_API_KEY=${config.groqKey}\n`;
        if (config.radioUrl) content += `RADIO_URL=${config.radioUrl}\n`;
        fs.writeFileSync(envPath, content);
        addLog('info', 'Configuración guardada');
        res.json({ ok: true });
    });

    // ── Agentes IA ──
    expressApp.get('/api/agentes', (req, res) => {
        agentesConfig = loadAgentesConfig();
        res.json({ proveedores: proveedoresInfo, config: agentesConfig });
    });

    expressApp.post('/api/agentes', (req, res) => {
        const { config } = req.body;
        if (!config) return res.status(400).json({ error: 'Falta config' });
        saveAgentesConfig(config);
        agentesConfig = config;
        addLog('info', 'Configuración de agentes actualizada');
        res.json({ ok: true });
    });

    expressApp.post('/api/agentes/test', async (req, res) => {
        const { proveedor, prompt } = req.body;
        if (!proveedor || !prompt) return res.status(400).json({ error: 'Faltan datos' });

        const config = agentesConfig[proveedor];
        if (!config) return res.json({ error: 'Proveedor no configurado' });
        if (!config.activo) return res.json({ error: 'Proveedor no activo' });

        try {
            const axios = require('axios');
            let url, headers, body;

            switch (proveedor) {
                case 'groq':
                    url = 'https://api.groq.com/openai/v1/chat/completions';
                    headers = { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' };
                    body = { model: config.modelo || 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 200, temperature: config.temperatura || 0.7 };
                    break;
                case 'openai':
                    url = 'https://api.openai.com/v1/chat/completions';
                    headers = { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' };
                    body = { model: config.modelo || 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 200, temperature: config.temperatura || 0.7 };
                    break;
                case 'anthropic':
                    url = 'https://api.anthropic.com/v1/messages';
                    headers = { 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' };
                    body = { model: config.modelo || 'claude-3-5-haiku-20241022', max_tokens: 200, messages: [{ role: 'user', content: prompt }], temperature: config.temperatura || 0.7 };
                    break;
                case 'google':
                    url = `https://generativelanguage.googleapis.com/v1beta/models/${config.modelo || 'gemini-2.0-flash'}:generateContent?key=${config.apiKey}`;
                    headers = { 'Content-Type': 'application/json' };
                    body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 200, temperature: config.temperatura || 0.7 } };
                    break;
                case 'ollama':
                    url = `${config.url || 'http://localhost:11434'}/api/generate`;
                    headers = { 'Content-Type': 'application/json' };
                    body = { model: config.modelo || 'llama3.2', prompt, stream: false };
                    break;
                case 'huggingface':
                    url = `https://api-inference.huggingface.co/models/${config.modelo || 'mistralai/Mistral-7B-Instruct-v0.3'}`;
                    headers = { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' };
                    body = { inputs: prompt, parameters: { max_new_tokens: 200, return_full_text: false } };
                    break;
                case 'nvidia':
                    url = 'https://integrate.api.nvidia.com/v1/chat/completions';
                    headers = { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' };
                    body = { model: config.modelo || 'meta/llama-3.1-70b-instruct', messages: [{ role: 'user', content: prompt }], max_tokens: 200, temperature: config.temperatura || 0.7 };
                    break;
                default:
                    return res.json({ error: 'Proveedor desconocido' });
            }

            const apiRes = await axios.post(url, body, { headers, timeout: 15000 });
            let respuesta = '';

            if (proveedor === 'anthropic') respuesta = apiRes.data.content[0].text;
            else if (proveedor === 'google') respuesta = apiRes.data.candidates[0].content.parts[0].text;
            else if (proveedor === 'ollama') respuesta = apiRes.data.response;
            else if (proveedor === 'huggingface') respuesta = Array.isArray(apiRes.data) ? apiRes.data[0].generated_text : apiRes.data.generated_text;
            else respuesta = apiRes.data.choices[0].message.content;

            addLog('info', `Test ${proveedor}: OK`);
            res.json({ ok: true, respuesta: respuesta.trim().slice(0, 200) });
        } catch (e) {
            const msg = e.response?.data?.error?.message || e.response?.data?.error || e.message;
            addLog('error', `Test ${proveedor}: ${msg}`);
            res.json({ error: msg || 'Error en la prueba' });
        }
    });

    // ── Instancias ──
    const INSTANCES_DIR = path.join(__dirname, '..', 'instances');
    const BOTS_DIR = path.join(__dirname, '..', 'bots');
    const instanciasProcesos = {};

    function cargarInstancias() {
        const instancias = [];
        if (!fs.existsSync(INSTANCES_DIR)) return instancias;
        for (const carpeta of fs.readdirSync(INSTANCES_DIR)) {
            const configPath = path.join(INSTANCES_DIR, carpeta, 'config.json');
            if (fs.existsSync(configPath)) {
                try {
                    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    config.id = carpeta;
                    instancias.push(config);
                } catch (e) {}
            }
        }
        return instancias;
    }

    function guardarInstancia(id, config) {
        const dir = path.join(INSTANCES_DIR, id);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(config, null, 2));
    }

    function getBotScript(tipo) {
        const scripts = {
            music: path.join(BOTS_DIR, 'music', 'bot.js'),
            ia: path.join(BOTS_DIR, 'ia', 'bot.js'),
            mod: path.join(BOTS_DIR, 'mod', 'bot.js')
        };
        return scripts[tipo];
    }

    expressApp.get('/api/instancias', (req, res) => {
        const instancias = cargarInstancias();
        const result = instancias.map(i => ({
            id: i.id, nombre: i.nombre, tipo: i.tipo, categoria: i.categoria,
            sala: i.sala, activo: !!instanciasProcesos[i.id], notas: i.notas || ''
        }));
        res.json(result);
    });

    expressApp.post('/api/instancias/create', (req, res) => {
        const { config } = req.body;
        if (!config || !config.id) return res.status(400).json({ error: 'Falta ID' });
        const dir = path.join(INSTANCES_DIR, config.id);
        if (fs.existsSync(dir)) return res.json({ error: 'Ya existe una instancia con ese ID' });
        fs.mkdirSync(dir, { recursive: true });
        fs.mkdirSync(path.join(dir, 'session'), { recursive: true });
        const fullConfig = {
            id: config.id, nombre: config.nombre || config.id,
            tipo: config.tipo || 'music', categoria: config.categoria || 'GA',
            usuario: config.usuario || '', password: config.password || '',
            sala: config.sala || '', activo: false, notas: config.notas || ''
        };
        guardarInstancia(config.id, fullConfig);
        addLog('info', `Instancia creada: ${config.id}`);
        res.json({ ok: true });
    });

    expressApp.post('/api/instancias/update', (req, res) => {
        const { id, config } = req.body;
        if (!id || !config) return res.status(400).json({ error: 'Faltan datos' });
        const dir = path.join(INSTANCES_DIR, id);
        if (!fs.existsSync(dir)) return res.json({ error: 'Instancia no encontrada' });
        const existing = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
        const updated = { ...existing, ...config, id };
        guardarInstancia(id, updated);
        addLog('info', `Instancia actualizada: ${id}`);
        res.json({ ok: true });
    });

    expressApp.post('/api/instancias/delete', (req, res) => {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Falta ID' });
        if (instanciasProcesos[id]) return res.json({ error: 'No se puede eliminar una instancia activa' });
        const dir = path.join(INSTANCES_DIR, id);
        if (!fs.existsSync(dir)) return res.json({ error: 'Instancia no encontrada' });
        fs.rmSync(dir, { recursive: true, force: true });
        addLog('info', `Instancia eliminada: ${id}`);
        res.json({ ok: true });
    });

    expressApp.post('/api/instancias/start', (req, res) => {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Falta ID' });
        if (instanciasProcesos[id]) return res.json({ error: 'Ya está corriendo' });

        const instancias = cargarInstancias();
        const config = instancias.find(i => i.id === id);
        if (!config) return res.json({ error: 'Instancia no encontrada' });

        const script = getBotScript(config.tipo);
        if (!script || !fs.existsSync(script)) return res.json({ error: `Script no encontrado para: ${config.tipo}` });

        const sessionDir = path.join(INSTANCES_DIR, id, 'session');
        if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

        addLog('info', `Iniciando ${config.nombre} (${config.id})...`);

        const proc = spawn('node', [script], {
            cwd: path.join(__dirname, '..'),
            env: {
                ...process.env,
                BOT_NAME: config.nombre,
                BOT_SESSION_DIR: sessionDir,
                BOT_ROOM_URL: config.sala,
                BOT_ID: id,
                BOT_CATEGORIA: config.categoria,
                HEADLESS: 'true',
                IMVU_USERNAME: config.usuario || process.env.IMVU_USERNAME || '',
                IMVU_PASSWORD: config.password || process.env.IMVU_PASSWORD || ''
            },
            windowsHide: false
        });

        proc.stdout.on('data', (d) => { const m = d.toString().trim(); if (m) addLog(config.tipo, m); });
        proc.stderr.on('data', (d) => { const m = d.toString().trim(); if (m) addLog('error', m); });
        proc.on('close', (code) => {
            addLog('info', `${config.nombre} cerrado (código: ${code})`);
            delete instanciasProcesos[id];
            if (mainWindow) mainWindow.webContents.send('status', { tipo: `inst-${id}`, running: false });
        });

        instanciasProcesos[id] = proc;
        config.activo = true;
        guardarInstancia(id, config);
        if (mainWindow) mainWindow.webContents.send('status', { tipo: `inst-${id}`, running: true });
        res.json({ ok: true, pid: proc.pid });
    });

    expressApp.post('/api/instancias/stop', async (req, res) => {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Falta ID' });
        if (!instanciasProcesos[id]) return res.json({ error: 'No está corriendo' });
        
        addLog('info', `Deteniendo ${id} (esperando despedida)...`);
        
        // En Windows usar SIGINT que funciona mejor que SIGTERM
        const isWindows = process.platform === 'win32';
        const signal = isWindows ? 'SIGINT' : 'SIGTERM';
        instanciasProcesos[id].kill(signal);
        
        // Esperar hasta 8 segundos
        let closed = false;
        for (let i = 0; i < 16; i++) {
            await new Promise(r => setTimeout(r, 500));
            if (instanciasProcesos[id].killed || instanciasProcesos[id].exitCode !== null) {
                closed = true;
                break;
            }
        }
        
        // Si no cerró, forzar
        if (!closed) {
            addLog('warn', `${id} no respondió, forzando cierre...`);
            try { instanciasProcesos[id].kill('SIGKILL'); } catch(e){}
        }
        
        delete instanciasProcesos[id];
        const instancias = cargarInstancias();
        const config = instancias.find(i => i.id === id);
        if (config) { config.activo = false; guardarInstancia(id, config); }
        if (mainWindow) mainWindow.webContents.send('status', { tipo: `inst-${id}`, running: false });
        res.json({ ok: true, graceful: closed });
    });

    panelServer = expressApp.listen(PORT, () => {
        addLog('info', `Panel listo en http://localhost:${PORT}`);
    });
}

function getBotName(tipo) {
    const names = { music: 'Bot Music v2.0', mod: 'Bot Mod v1.0', ia: 'Bot IA v1.0', alfa: 'BOT ALFA' };
    return names[tipo] || 'Pixel Mafia Bot';
}

function stopAll() {
    for (const proc of Object.values(procesos)) { try { proc.kill('SIGTERM'); } catch (e) {} }
    if (panelServer) panelServer.close();
}

app.whenReady().then(() => {
    startPanelServer();
    createWindow();
});

app.on('window-all-closed', () => {
    stopAll();
    app.quit();
});
