const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');
const fsp = require('fs').promises;
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const procesos = {};
const logs = [];
const MAX_LOGS = 500;

function addLog(tipo, mensaje) {
    const entry = {
        time: new Date().toLocaleTimeString(),
        tipo,
        mensaje
    };
    logs.push(entry);
    if (logs.length > MAX_LOGS) logs.shift();
    broadcast({ type: 'log', data: entry });
}

let wsClients = [];

app.get('/api/status', (req, res) => {
    const status = {};
    for (const [key, proc] of Object.entries(procesos)) {
        status[key] = {
            running: proc && !proc.killed,
            pid: proc ? proc.pid : null
        };
    }
    res.json(status);
});

app.get('/api/logs', (req, res) => {
    res.json(logs);
});

app.post('/api/start', (req, res) => {
    const { tipo, nombre } = req.body;
    if (!tipo) return res.status(400).json({ error: 'Falta tipo' });

    if (procesos[tipo] && !procesos[tipo].killed) {
        return res.json({ error: 'Ya está corriendo' });
    }

    let script, args = [];
    const botName = nombre || getBotName(tipo);

    switch (tipo) {
        case 'music':
            script = path.join(__dirname, '..', 'bots', 'music', 'bot.js');
            break;
        case 'keep':
            script = path.join(__dirname, '..', 'keep_alive.js');
            break;
        case 'mod':
            script = path.join(__dirname, '..', 'bots', 'mod', 'bot.js');
            break;
        case 'ia':
            script = path.join(__dirname, '..', 'bots', 'ia', 'bot.js');
            break;
        case 'alfa':
            script = path.join(__dirname, '..', 'bots', 'alfa', 'bot.js');
            break;
        default:
            return res.status(400).json({ error: 'Tipo desconocido' });
    }

    if (!fs.existsSync(script)) {
        return res.json({ error: `Script no encontrado: ${script}` });
    }

    addLog('info', `Iniciando ${tipo}...`);

    const proc = spawn('node', [script], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, BOT_NAME: botName },
        windowsHide: true
    });

    proc.stdout.on('data', (d) => {
        const msg = d.toString().trim();
        if (msg) addLog(tipo, msg);
    });

    proc.stderr.on('data', (d) => {
        const msg = d.toString().trim();
        if (msg) addLog('error', msg);
    });

    proc.on('close', (code) => {
        addLog('info', `${tipo} cerrado (código: ${code})`);
        delete procesos[tipo];
        broadcast({ type: 'status', data: { tipo, running: false } });
    });

    proc.on('error', (err) => {
        addLog('error', `${tipo} error: ${err.message}`);
    });

    procesos[tipo] = proc;
    broadcast({ type: 'status', data: { tipo, running: true } });

    res.json({ ok: true, pid: proc.pid });
});

app.post('/api/stop', async (req, res) => {
    const { tipo } = req.body;
    if (!tipo || !procesos[tipo]) {
        return res.json({ error: 'No está corriendo' });
    }

    addLog('info', `Deteniendo ${tipo} (enviando despedida)...`);
    procesos[tipo].kill('SIGTERM');
    
    // Esperar hasta 5 segundos para cierre graceful
    let closed = false;
    for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 500));
        if (procesos[tipo].killed || procesos[tipo].exitCode !== null) {
            closed = true;
            break;
        }
    }
    
    if (!closed) {
        try { procesos[tipo].kill('SIGKILL'); } catch(e){}
    }
    
    delete procesos[tipo];
    res.json({ ok: true, graceful: closed });
});

app.post('/api/stop-all', async (req, res) => {
    addLog('info', 'Deteniendo todos los bots (enviando despedidas)...');
    for (const [key, proc] of Object.entries(procesos)) {
        try { 
            proc.kill('SIGTERM');
            // Esperar un poco para cada uno
            await new Promise(r => setTimeout(r, 1000));
            if (!proc.killed && proc.exitCode === null) {
                proc.kill('SIGKILL');
            }
        } catch (e) {}
    }
    Object.keys(procesos).forEach(k => delete procesos[k]);
    res.json({ ok: true });
});

function getBotName(tipo) {
    const names = {
        music: 'Bot Music v2.0',
        mod: 'Bot Mod v1.0',
        ia: 'Bot IA v1.0',
        alfa: 'BOT ALFA'
    };
    return names[tipo] || 'Pixel Mafia Bot';
}

function broadcast(msg) {
    const data = JSON.stringify(msg);
    wsClients = wsClients.filter(c => {
        try { c.write(data); return true; } catch (e) { return false; }
    });
}

app.get('/api/stream-logs', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    wsClients.push(res);

    req.on('close', () => {
        const idx = wsClients.indexOf(res);
        if (idx > -1) wsClients.splice(idx, 1);
    });
});

// ═══════════════════════════════════════════════════════════
// SISTEMA DE POOL DE CUENTAS BOT
// ═══════════════════════════════════════════════════════════

const CUENTAS_PATH = path.join(__dirname, '..', 'data', 'cuentas.json');
const INSTANCES_DIR = path.join(__dirname, '..', 'instances');
const BOTS_DIR = path.join(__dirname, '..', 'bots');

/** Lee el archivo cuentas.json y devuelve el array o array vacío */
async function leerCuentas() {
    try {
        const data = await fsp.readFile(CUENTAS_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        // Si no existe, crea el archivo con array vacío
        await fsp.writeFile(CUENTAS_PATH, '[]', 'utf8');
        return [];
    }
}

/** Guarda el array de cuentas en cuentas.json */
async function guardarCuentas(cuentas) {
    await fsp.writeFile(CUENTAS_PATH, JSON.stringify(cuentas, null, 2), 'utf8');
}

/** Obtiene una cuenta disponible de la categoría solicitada (GA o AP) */
async function obtenerCuentaDisponible(categoria) {
    const cuentas = await leerCuentas();
    const disponible = cuentas.find(c => c.categoria === categoria && !c.enUso);
    return disponible || null;
}

/** Marca una cuenta como en uso */
async function marcarCuentaEnUso(usuario, enUso) {
    const cuentas = await leerCuentas();
    const cuenta = cuentas.find(c => c.usuario === usuario);
    if (cuenta) {
        cuenta.enUso = enUso;
        await guardarCuentas(cuentas);
    }
}

/** Libera todas las cuentas en uso (al cerrar el servidor) */
async function liberarTodasLasCuentas() {
    const cuentas = await leerCuentas();
    cuentas.forEach(c => c.enUso = false);
    await guardarCuentas(cuentas);
}

// ═══════════════════════════════════════════════════════════
// SISTEMA DE INSTANCIAS
// ═══════════════════════════════════════════════════════════

/** Lee todas las instancias desde la carpeta instances/ */
async function leerInstancias() {
    const instancias = [];
    try {
        const carpetas = await fsp.readdir(INSTANCES_DIR);
        for (const carpeta of carpetas) {
            const configPath = path.join(INSTANCES_DIR, carpeta, 'config.json');
            try {
                const data = await fsp.readFile(configPath, 'utf8');
                const config = JSON.parse(data);
                config._corriendo = !!(procesos[config.id] && !procesos[config.id].killed);
                instancias.push(config);
            } catch (e) {
                // Config inválido, se ignora
            }
        }
    } catch (e) {
        // Carpeta no existe
    }
    return instancias;
}

/** Guarda o actualiza el config.json de una instancia */
async function guardarInstancia(id, config) {
    const dir = path.join(INSTANCES_DIR, id);
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(
        path.join(dir, 'config.json'),
        JSON.stringify(config, null, 2),
        'utf8'
    );
}

/** Elimina completamente la carpeta de una instancia */
async function eliminarInstancia(id) {
    const dir = path.join(INSTANCES_DIR, id);
    await fsp.rm(dir, { recursive: true, force: true });
}

/** Genera un slug seguro a partir de un nombre */
function generarSlug(nombre) {
    return nombre
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30);
}

/** Obtiene el script del bot según tipo */
function getBotScript(tipo) {
    const scripts = {
        music: path.join(BOTS_DIR, 'music', 'bot.js'),
        ia: path.join(BOTS_DIR, 'ia', 'bot.js'),
        mod: path.join(BOTS_DIR, 'mod', 'bot.js'),
        alfa: path.join(BOTS_DIR, 'alfa', 'bot.js')
    };
    return scripts[tipo];
}

/** Lanza el proceso de una instancia y lo registra en procesos[] */
function lanzarInstancia(config) {
    const script = getBotScript(config.tipo);
    if (!script || !fs.existsSync(script)) {
        throw new Error(`Script no encontrado para tipo: ${config.tipo}`);
    }

    const sessionDir = path.join(INSTANCES_DIR, config.id, 'session');
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    addLog('info', `Lanzando instancia ${config.id} (${config.clienteNombre})...`);

    const proc = spawn('node', [script], {
        cwd: path.join(__dirname, '..'),
        env: {
            ...process.env,
            BOT_NAME: config.clienteNombre,
            BOT_SESSION_DIR: sessionDir,
            BOT_ROOM_URL: config.salaUrl,
            BOT_ID: config.id,
            BOT_CATEGORIA: config.categoria
        },
        windowsHide: false
    });

    proc.stdout.on('data', (d) => {
        const msg = d.toString().trim();
        if (msg) addLog(config.tipo || 'instancia', msg);
    });

    proc.stderr.on('data', (d) => {
        const msg = d.toString().trim();
        if (msg) addLog('error', msg);
    });

    proc.on('close', (code) => {
        addLog('info', `Instancia ${config.id} cerrada (código: ${code})`);
        delete procesos[config.id];
        // Actualizar estado en config.json
        guardarInstancia(config.id, { ...config, estado: 'detenido' })
            .catch(() => {});
        broadcast({ type: 'status', data: { tipo: config.id, running: false } });
    });

    proc.on('error', (err) => {
        addLog('error', `Instancia ${config.id} error: ${err.message}`);
    });

    procesos[config.id] = proc;
    broadcast({ type: 'status', data: { tipo: config.id, running: true } });

    return proc;
}

// ═══════════════════════════════════════════════════════════
// NUEVOS ENDPOINTS
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/onboarding
 * Crea una nueva instancia para un cliente
 * Body: { clienteNombre, salaUrl, tipo, categoria }
 */
app.post('/api/onboarding', async (req, res) => {
    try {
        const { clienteNombre, salaUrl, tipo, categoria } = req.body;

        if (!clienteNombre || !salaUrl || !tipo || !categoria) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        if (!['music', 'ia', 'mod', 'alfa'].includes(tipo)) {
            return res.status(400).json({ error: 'Tipo de bot inválido' });
        }

        if (!['GA', 'AP'].includes(categoria)) {
            return res.status(400).json({ error: 'Categoría debe ser GA o AP' });
        }

        // Buscar cuenta disponible en el pool
        const cuenta = await obtenerCuentaDisponible(categoria);
        if (!cuenta) {
            return res.json({ error: `No hay cuentas disponibles para ${categoria}` });
        }

        // Generar ID único
        const slug = generarSlug(clienteNombre);
        const timestamp = Date.now();
        const id = `${slug}-${tipo}-${categoria.toLowerCase()}-${timestamp}`.slice(0, 60);

        // Crear config de la instancia
        const config = {
            id,
            clienteNombre,
            salaUrl,
            tipo,
            categoria,
            cuenta: cuenta.usuario,
            estado: 'creado',
            creadoEn: new Date().toISOString()
        };

        // Guardar instancia
        await guardarInstancia(id, config);

        // Crear carpeta de sesión
        const sessionDir = path.join(INSTANCES_DIR, id, 'session');
        await fsp.mkdir(sessionDir, { recursive: true });

        // Marcar cuenta como en uso
        await marcarCuentaEnUso(cuenta.usuario, true);

        addLog('info', `Onboarding: instancia creada ${id} con cuenta ${cuenta.usuario}`);

        res.json({
            ok: true,
            instanciaId: id,
            cuentaAsignada: cuenta.usuario,
            mensaje: 'Instancia creada exitosamente'
        });

    } catch (e) {
        addLog('error', `Onboarding error: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/instancias
 * Lista todas las instancias
 */
app.get('/api/instancias', async (req, res) => {
    try {
        const instancias = await leerInstancias();
        res.json(instancias);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * DELETE /api/instancias/:id
 * Elimina una instancia y libera su cuenta
 */
app.delete('/api/instancias/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Leer config antes de eliminar
        const configPath = path.join(INSTANCES_DIR, id, 'config.json');
        if (!fs.existsSync(configPath)) {
            return res.json({ error: 'Instancia no encontrada' });
        }

        const configData = await fsp.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);

        // Detener proceso si está corriendo
        if (procesos[id] && !procesos[id].killed) {
            procesos[id].kill('SIGTERM');
            delete procesos[id];
            addLog('info', `Instancia ${id} detenida antes de eliminar`);
        }

        // Liberar cuenta
        if (config.cuenta) {
            await marcarCuentaEnUso(config.cuenta, false);
            addLog('info', `Cuenta ${config.cuenta} liberada`);
        }

        // Eliminar carpeta
        await eliminarInstancia(id);
        addLog('info', `Instancia ${id} eliminada`);

        res.json({ ok: true });

    } catch (e) {
        addLog('error', `Eliminar instancia error: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/instancias/:id/start
 * Inicia el bot de una instancia
 */
app.post('/api/instancias/:id/start', async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que no esté ya corriendo
        if (procesos[id] && !procesos[id].killed) {
            return res.json({ error: 'Ya está corriendo' });
        }

        // Leer config
        const configPath = path.join(INSTANCES_DIR, id, 'config.json');
        if (!fs.existsSync(configPath)) {
            return res.json({ error: 'Instancia no encontrada' });
        }

        const configData = await fsp.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);

        // Verificar script
        const script = getBotScript(config.tipo);
        if (!script || !fs.existsSync(script)) {
            return res.json({ error: `Script no encontrado para tipo: ${config.tipo}` });
        }

        // Lanzar
        lanzarInstancia(config);

        // Actualizar estado
        config.estado = 'activo';
        await guardarInstancia(id, config);

        res.json({ ok: true, pid: procesos[id]?.pid });

    } catch (e) {
        addLog('error', `Start instancia error: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/instancias/:id/stop
 * Detiene el bot de una instancia (envía mensaje de despedida primero)
 */
app.post('/api/instancias/:id/stop', async (req, res) => {
    try {
        const { id } = req.params;

        if (!procesos[id] || procesos[id].killed) {
            return res.json({ error: 'No está corriendo' });
        }

        addLog('info', `Deteniendo instancia ${id} (enviando despedida)...`);
        
        // Enviar SIGTERM para que el bot envíe mensaje de despedida gracefully
        procesos[id].kill('SIGTERM');
        
        // Esperar hasta 5 segundos para que el bot se cierre gracefully
        let closed = false;
        for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 500));
            if (procesos[id].killed || procesos[id].exitCode !== null) {
                closed = true;
                break;
            }
        }
        
        // Si no se cerró, forzar kill
        if (!closed) {
            addLog('warn', `Instancia ${id} no respondió, forzando cierre...`);
            try { procesos[id].kill('SIGKILL'); } catch(e){}
        }
        
        delete procesos[id];

        // Actualizar estado
        const configPath = path.join(INSTANCES_DIR, id, 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = await fsp.readFile(configPath, 'utf8');
            const config = JSON.parse(configData);
            config.estado = 'detenido';
            await guardarInstancia(id, config);
        }

        res.json({ ok: true, graceful: closed });

    } catch (e) {
        addLog('error', `Stop instancia error: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/cuentas
 * Agrega una cuenta al pool
 * Body: { usuario, password, categoria }
 */
app.post('/api/cuentas', async (req, res) => {
    try {
        const { usuario, password, categoria } = req.body;

        if (!usuario || !password || !categoria) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        if (!['GA', 'AP'].includes(categoria)) {
            return res.status(400).json({ error: 'Categoría debe ser GA o AP' });
        }

        const cuentas = await leerCuentas();

        // Verificar que no exista ya
        if (cuentas.find(c => c.usuario === usuario)) {
            return res.json({ error: 'Esa cuenta ya existe en el pool' });
        }

        cuentas.push({
            usuario,
            password,
            categoria,
            enUso: false
        });

        await guardarCuentas(cuentas);
        addLog('info', `Cuenta agregada al pool: ${usuario} (${categoria})`);

        res.json({ ok: true, cuenta: usuario });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/cuentas
 * Lista todas las cuentas del pool
 */
app.get('/api/cuentas', async (req, res) => {
    try {
        const cuentas = await leerCuentas();
        // No enviar passwords
        const safe = cuentas.map(c => ({
            usuario: c.usuario,
            categoria: c.categoria,
            enUso: c.enUso
        }));
        res.json(safe);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * DELETE /api/cuentas/:usuario
 * Elimina una cuenta del pool (solo si no está en uso)
 */
app.delete('/api/cuentas/:usuario', async (req, res) => {
    try {
        const { usuario } = req.params;
        const cuentas = await leerCuentas();
        const cuenta = cuentas.find(c => c.usuario === usuario);

        if (!cuenta) {
            return res.json({ error: 'Cuenta no encontrada' });
        }

        if (cuenta.enUso) {
            return res.json({ error: 'No se puede eliminar una cuenta en uso' });
        }

        const filtradas = cuentas.filter(c => c.usuario !== usuario);
        await guardarCuentas(filtradas);
        addLog('info', `Cuenta eliminada del pool: ${usuario}`);

        res.json({ ok: true });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ═══════════════════════════════════════════════════════════
// INICIO DEL SERVIDOR
// ═══════════════════════════════════════════════════════════

const PORT = 3100;
app.listen(PORT, () => {
    console.log(`Panel Pixel Mafia: http://localhost:${PORT}`);
    const { exec } = require('child_process');
    exec(`start http://localhost:${PORT}`);
});

// Al cerrar el servidor, liberar todas las cuentas
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando panel...');
    await liberarTodasLasCuentas();
    process.exit(0);
});

process.on('exit', () => {
    // Sincrono: no se puede usar async aquí
    try {
        const cuentas = JSON.parse(fs.readFileSync(CUENTAS_PATH, 'utf8'));
        cuentas.forEach(c => c.enUso = false);
        fs.writeFileSync(CUENTAS_PATH, JSON.stringify(cuentas, null, 2));
    } catch (e) {}
});
