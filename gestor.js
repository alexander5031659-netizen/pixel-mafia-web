const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const INSTANCES_DIR = path.join(__dirname, 'instances');
const BOTS_DIR = path.join(__dirname, 'bots');

const procesos = {};

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
            } catch (e) {
                console.error(`Error leyendo ${carpeta}:`, e.message);
            }
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
        mod: path.join(BOTS_DIR, 'mod', 'bot.js'),
        alfa: path.join(BOTS_DIR, 'alfa', 'bot.js')
    };
    return scripts[tipo];
}

function iniciarInstancia(id) {
    if (procesos[id]) return { error: 'Ya está corriendo' };

    const instancias = cargarInstancias();
    const config = instancias.find(i => i.id === id);
    if (!config) return { error: 'Instancia no encontrada' };

    const script = getBotScript(config.tipo);
    if (!script || !fs.existsSync(script)) return { error: `Script no encontrado para tipo: ${config.tipo}` };

    const sessionDir = path.join(INSTANCES_DIR, id, 'session');
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    console.log(`\n🚀 Iniciando ${config.nombre} (${config.id})...`);
    console.log(`   Tipo: ${config.tipo} | Categoría: ${config.categoria}`);
    console.log(`   Sala: ${config.sala}`);
    console.log(`   Sesión: ${sessionDir}`);

    const proc = spawn('node', [script], {
        cwd: __dirname,
        env: {
            ...process.env,
            BOT_NAME: config.nombre,
            BOT_SESSION_DIR: sessionDir,
            BOT_ROOM_URL: config.sala,
            BOT_ID: id,
            BOT_CATEGORIA: config.categoria
        },
        windowsHide: false
    });

    proc.stdout.on('data', (d) => {
        const msg = d.toString().trim();
        if (msg) console.log(`[${config.nombre}] ${msg}`);
    });

    proc.stderr.on('data', (d) => {
        const msg = d.toString().trim();
        if (msg) console.error(`[${config.nombre}] ERROR: ${msg}`);
    });

    proc.on('close', (code) => {
        console.log(`[${config.nombre}] Cerrado (código: ${code})`);
        delete procesos[id];
    });

    proc.on('error', (err) => {
        console.error(`[${config.nombre}] Error al iniciar: ${err.message}`);
    });

    procesos[id] = proc;
    config.activo = true;
    guardarInstancia(id, config);

    return { ok: true, pid: proc.pid };
}

function detenerInstancia(id) {
    if (!procesos[id]) return { error: 'No está corriendo' };
    console.log(`\n⏹️ Deteniendo ${id}...`);
    procesos[id].kill('SIGTERM');
    delete procesos[id];

    const instancias = cargarInstancias();
    const config = instancias.find(i => i.id === id);
    if (config) {
        config.activo = false;
        guardarInstancia(id, config);
    }

    return { ok: true };
}

function detenerTodo() {
    console.log('\n⏹️ Deteniendo todas las instancias...');
    for (const id of Object.keys(procesos)) {
        try { procesos[id].kill('SIGTERM'); } catch (e) {}
    }
    Object.keys(procesos).forEach(k => delete procesos[k]);

    const instancias = cargarInstancias();
    for (const config of instancias) {
        if (config.activo) {
            config.activo = false;
            guardarInstancia(config.id, config);
        }
    }
}

function listarInstancias() {
    const instancias = cargarInstancias();
    return instancias.map(i => ({
        id: i.id,
        nombre: i.nombre,
        tipo: i.tipo,
        categoria: i.categoria,
        sala: i.sala,
        activo: !!procesos[i.id],
        pid: procesos[i.id] ? procesos[i.id].pid : null
    }));
}

function crearInstancia(id, config) {
    const dir = path.join(INSTANCES_DIR, id);
    if (fs.existsSync(dir)) return { error: 'Ya existe una instancia con ese ID' };

    fs.mkdirSync(dir, { recursive: true });
    fs.mkdirSync(path.join(dir, 'session'), { recursive: true });

    const fullConfig = {
        id,
        nombre: config.nombre || id,
        tipo: config.tipo || 'music',
        categoria: config.categoria || 'GA',
        usuario: config.usuario || '',
        password: config.password || '',
        sala: config.sala || '',
        activo: false,
        notas: config.notas || ''
    };

    guardarInstancia(id, fullConfig);
    return { ok: true, id };
}

function eliminarInstancia(id) {
    if (procesos[id]) {
        return { error: 'No se puede eliminar una instancia activa. Detenla primero.' };
    }

    const dir = path.join(INSTANCES_DIR, id);
    if (!fs.existsSync(dir)) return { error: 'Instancia no encontrada' };

    fs.rmSync(dir, { recursive: true, force: true });
    return { ok: true };
}

// ── CLI ──
const args = process.argv.slice(2);
const comando = args[0];

switch (comando) {
    case 'list':
        console.log('\n📋 Instancias disponibles:\n');
        const lista = listarInstancias();
        if (lista.length === 0) {
            console.log('   No hay instancias configuradas');
        } else {
            for (const inst of lista) {
                const status = inst.activo ? `✅ Activo (PID: ${inst.pid})` : '⏸️ Inactivo';
                console.log(`   ${inst.id} | ${inst.nombre} | ${inst.tipo} | ${inst.categoria} | ${status}`);
                console.log(`   Sala: ${inst.sala}`);
                console.log('');
            }
        }
        break;

    case 'start':
        if (!args[1]) { console.log('Uso: node gestor.js start <id>'); break; }
        const r1 = iniciarInstancia(args[1]);
        console.log(r1.error ? `❌ ${r1.error}` : `✅ Iniciado (PID: ${r1.pid})`);
        break;

    case 'stop':
        if (!args[1]) { console.log('Uso: node gestor.js stop <id>'); break; }
        const r2 = detenerInstancia(args[1]);
        console.log(r2.error ? `❌ ${r2.error}` : '✅ Detenido');
        break;

    case 'create':
        if (!args[1]) { console.log('Uso: node gestor.js create <id> --nombre "X" --tipo music --categoria GA --sala URL'); break; }
        const config = { nombre: args[1], tipo: 'music', categoria: 'GA', sala: '' };
        for (let i = 2; i < args.length; i++) {
            if (args[i] === '--nombre') config.nombre = args[++i];
            if (args[i] === '--tipo') config.tipo = args[++i];
            if (args[i] === '--categoria') config.categoria = args[++i];
            if (args[i] === '--sala') config.sala = args[++i];
        }
        const r3 = crearInstancia(args[1], config);
        console.log(r3.error ? `❌ ${r3.error}` : `✅ Instancia creada: ${r3.id}`);
        break;

    case 'delete':
        if (!args[1]) { console.log('Uso: node gestor.js delete <id>'); break; }
        const r4 = eliminarInstancia(args[1]);
        console.log(r4.error ? `❌ ${r4.error}` : '✅ Instancia eliminada');
        break;

    case 'stop-all':
        detenerTodo();
        console.log('✅ Todas las instancias detenidas');
        break;

    default:
        console.log(`
🤖 Pixel Mafia - Gestor de Bots

Uso:
  node gestor.js list                      - Ver todas las instancias
  node gestor.js start <id>                - Iniciar una instancia
  node gestor.js stop <id>                 - Detener una instancia
  node gestor.js create <id> [opciones]    - Crear nueva instancia
  node gestor.js delete <id>               - Eliminar instancia
  node gestor.js stop-all                  - Detener todo

Opciones de create:
  --nombre "Nombre"    Nombre del bot
  --tipo music|ia|mod  Tipo de bot
  --categoria GA|AP    Categoría de sala
  --sala URL           URL de la sala

Ejemplo:
  node gestor.js create cliente1 --nombre "DJ Max" --tipo music --categoria GA --sala "https://go.imvu.com/chat/room-123"
        `);
}

process.on('SIGINT', () => {
    detenerTodo();
    process.exit(0);
});
