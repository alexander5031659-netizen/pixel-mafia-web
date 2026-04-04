const OWNER = "Ʀαιπ";
const usuariosSaludados = new Set();

async function saludarUsuario(nombre, enviar) {
    if (!nombre || nombre.toLowerCase().includes("bot ia")) return;
    if (usuariosSaludados.has(nombre)) return;
    usuariosSaludados.add(nombre);
    setTimeout(() => usuariosSaludados.delete(nombre), 5 * 60 * 1000);
    await new Promise(r => setTimeout(r, 800));

    if (nombre === OWNER) return enviar("👑 Hola jefe, tu IA está lista");

    const saludos = [
        `👋 Hola ${nombre}, soy tu asistente IA`,
        `🤖 Hola ${nombre}, pregúntame lo que quieras`,
        `✨ Bienvenido ${nombre}, escribe !help`
    ];
    await enviar(saludos[Math.floor(Math.random() * saludos.length)]);
}

async function manejarComando(msg, nombre, enviar, contexto = {}) {
    msg = msg.trim();
    if (!msg) return;
    const n = nombre || "tu";
    const esDueno = nombre === OWNER;

    if (msg === "!hola") {
        if (esDueno) return enviar("👋 Hola jefe, ¿en qué te ayudo?");
        return enviar(`👋 Hola ${n}, soy tu asistente IA`);
    }

    if (msg === "!help" || msg === "!ayuda") {
        return enviar("🤖 COMANDOS: !ia <pregunta> | !buscar <tema> | !traducir <texto> | !hora | !fecha | !bot | !modelo");
    }

    if (msg === "!hora") {
        const hora = new Date().toLocaleTimeString("es-CO", { timeZone: "America/Bogota" });
        return enviar(`🕐 ${hora}`);
    }

    if (msg === "!fecha") {
        const fecha = new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota", weekday: "long", year: "numeric", month: "long", day: "numeric" });
        return enviar(`📅 ${fecha}`);
    }

    if (msg === "!bot") {
        return enviar("✅ Bot IA v1.0 activo");
    }

    if (msg === "!modelo" && esDueno) {
        return enviar("🤖 Modelo configurado en el panel de Agentes IA");
    }

    if (msg.startsWith("!decir ")) {
        return enviar(msg.slice(7));
    }

    // ── Comandos de IA ──
    if (msg.startsWith("!ia ") || msg.startsWith("!pregunta ")) {
        const q = msg.startsWith("!ia ") ? msg.slice(4).trim() : msg.slice(10).trim();
        if (!q) return enviar("Escribe algo para preguntar");

        await enviar("🤔 Pensando...");

        try {
            const agentesPath = require('path').join(__dirname, 'agentes.js');
            const { consultar } = require(agentesPath);
            const agentesConfigPath = require('path').join(__dirname, '..', '..', 'bots', 'ia', 'agentes.json');
            const fs = require('fs');
            let agenteConfig = { activo: true, apiKey: process.env.GROQ_API_KEY || '', modelo: 'llama-3.3-70b-versatile', temperatura: 0.7, personalidad: 'Eres un asistente útil y amigable en una sala de chat de IMVU.' };

            if (fs.existsSync(agentesConfigPath)) {
                const data = JSON.parse(fs.readFileSync(agentesConfigPath, 'utf8'));
                for (const [key, cfg] of Object.entries(data)) {
                    if (cfg.activo) {
                        agenteConfig = { ...cfg, proveedor: key };
                        break;
                    }
                }
            }

            const prompt = `${agenteConfig.personalidad}\n\nPregunta: ${q}`;
            const respuesta = await consultar(agenteConfig.proveedor || 'groq', agenteConfig, prompt);

            const MAX = 280;
            let textoFinal = respuesta;

            if (respuesta.length > MAX) {
                const punto = respuesta.lastIndexOf('. ', MAX);
                if (punto > 150) {
                    textoFinal = respuesta.slice(0, punto + 1);
                } else {
                    const espacio = respuesta.lastIndexOf(' ', MAX);
                    textoFinal = respuesta.slice(0, espacio) + '...';
                }
            }

            return enviar(`💡 ${textoFinal}`);
        } catch (e) {
            return enviar(`❌ Error: ${e.message}`);
        }
    }

    if (msg.startsWith("!buscar ") || msg.startsWith("!search ")) {
        const q = msg.startsWith("!buscar ") ? msg.slice(8).trim() : msg.slice(8).trim();
        if (!q) return enviar("Escribe algo para buscar");

        await enviar("🔍 Buscando...");

        try {
            const agentesPath = require('path').join(__dirname, 'agentes.js');
            const { consultar } = require(agentesPath);
            const agentesConfigPath = require('path').join(__dirname, '..', '..', 'bots', 'ia', 'agentes.json');
            const fs = require('fs');
            let agenteConfig = { activo: true, apiKey: process.env.GROQ_API_KEY || '', modelo: 'llama-3.3-70b-versatile', temperatura: 0.7, personalidad: 'Eres un asistente útil y amigable en una sala de chat de IMVU.' };

            if (fs.existsSync(agentesConfigPath)) {
                const data = JSON.parse(fs.readFileSync(agentesConfigPath, 'utf8'));
                for (const [key, cfg] of Object.entries(data)) {
                    if (cfg.activo) {
                        agenteConfig = { ...cfg, proveedor: key };
                        break;
                    }
                }
            }

            const prompt = `Explica brevemente en español sin links (máximo 280 caracteres): ${q}`;
            const respuesta = await consultar(agenteConfig.proveedor || 'groq', agenteConfig, prompt);

            const MAX = 280;
            let textoFinal = respuesta;

            if (respuesta.length > MAX) {
                const punto = respuesta.lastIndexOf('. ', MAX);
                if (punto > 150) {
                    textoFinal = respuesta.slice(0, punto + 1);
                } else {
                    const espacio = respuesta.lastIndexOf(' ', MAX);
                    textoFinal = respuesta.slice(0, espacio) + '...';
                }
            }

            return enviar(`📚 ${textoFinal}`);
        } catch (e) {
            return enviar("❌ Error en la búsqueda");
        }
    }

    if (msg.startsWith("!traducir ") || msg.startsWith("!translate ")) {
        const texto = msg.startsWith("!traducir ") ? msg.slice(10).trim() : msg.slice(11).trim();
        if (!texto) return enviar("Escribe algo para traducir");

        await enviar("🌐 Traduciendo...");

        try {
            const agentesPath = require('path').join(__dirname, 'agentes.js');
            const { consultar } = require(agentesPath);
            const agentesConfigPath = require('path').join(__dirname, '..', '..', 'bots', 'ia', 'agentes.json');
            const fs = require('fs');
            let agenteConfig = { activo: true, apiKey: process.env.GROQ_API_KEY || '', modelo: 'llama-3.3-70b-versatile', temperatura: 0.7, personalidad: 'Eres un asistente útil y amigable en una sala de chat de IMVU.' };

            if (fs.existsSync(agentesConfigPath)) {
                const data = JSON.parse(fs.readFileSync(agentesConfigPath, 'utf8'));
                for (const [key, cfg] of Object.entries(data)) {
                    if (cfg.activo) {
                        agenteConfig = { ...cfg, proveedor: key };
                        break;
                    }
                }
            }

            const prompt = `Traduce este texto al español de forma natural: "${texto}". Solo responde con la traducción.`;
            const traduccion = await consultar(agenteConfig.proveedor || 'groq', agenteConfig, prompt);

            const MAX = 280;
            let textoFinal = traduccion;

            if (traduccion.length > MAX) {
                const punto = traduccion.lastIndexOf('. ', MAX);
                if (punto > 150) {
                    textoFinal = traduccion.slice(0, punto + 1);
                } else {
                    const espacio = traduccion.lastIndexOf(' ', MAX);
                    textoFinal = traduccion.slice(0, espacio) + '...';
                }
            }

            return enviar(`🌐 ${textoFinal}`);
        } catch (e) {
            return enviar("❌ Error en la traducción");
        }
    }
}

module.exports = { saludarUsuario, manejarComando };
