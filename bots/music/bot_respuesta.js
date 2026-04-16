const { reproducirCancion, detenerMusica, verCola, saltarCancion, limpiarCola } = require("./musica");
require("dotenv").config();

const RADIO_URL = process.env.RADIO_URL || "http://localhost:5000";

// Map de URLs de radio enviadas por sala
const urlRadioEnviadaPorSala = new Map();

async function manejarComando(msg, nombre, enviar, contexto = {}) {
    msg = msg.trim();
    if (!msg) return;
    const n = nombre || "tu";
    const salaId = contexto.salaId || 'sala1';
    
    // Obtener estado de URL para esta sala
    let urlRadioEnviada = urlRadioEnviadaPorSala.get(salaId) || false;

    // ── Comando de ayuda ──
    if (msg === "!help" || msg === "!ayuda") {
        return enviar("🎵 COMANDOS: !play <canción> | !stop | !skip | !queue | !np | !clear\n🎧 Usamos Spotify para !play (YouTube está bloqueado en la nube)");
    }

    // ── Música ──
    if (msg.startsWith("!play ")) {
        const query = msg.slice(6).trim();
        if (!query) return enviar(`${n} pon el nombre de la canción`);

        // Ya no restringimos a YouTube - usamos Spotify ahora
        if (query.startsWith('http://') || query.startsWith('https://')) {
            return enviar("❌ Por favor escribe el nombre de la canción, no pegues links\n💡 Ejemplo: !play Bad Bunny Tití Me Preguntó");
        }

        await enviar(`🔍 Buscando en Spotify: ${query}`);

        try {
            const cancion = await reproducirCancion(query, salaId);
            if (!cancion) return enviar("❌ No encontré esa canción en Spotify");

            const duracion = `${Math.floor(cancion.duracion / 60)}:${(cancion.duracion % 60).toString().padStart(2, '0')}`;
            const radioUrl = cancion.radioUrl;

            if (cancion.posicion === 1) {
                // Primera canción - enviar info + URL de radio (UNA SOLA VEZ)
                await enviar(`✅ ${cancion.titulo} [${duracion}]`);
                
                // Enviar URL de radio solo la primera vez por sala
                if (!urlRadioEnviada) {
                    await enviar(`📻 URL de radio: ${radioUrl}\n📝 Cópiala en el panel de medios de IMVU`);
                    urlRadioEnviadaPorSala.set(salaId, true);
                }
            } else {
                // Canciones siguientes - solo confirmar
                return enviar(`✅ ${cancion.titulo} [${duracion}] • Posición: ${cancion.posicion}`);
            }
        } catch (e) {
            console.log("Error en !play:", e.message);
            return enviar("❌ Error al buscar la canción");
        }
    }

    if (msg === "!stop") {
        await detenerMusica(salaId);
        return enviar("⏹️ Radio detenida");
    }

    if (msg === "!skip" || msg === "!next") {
        try {
            const resultado = await saltarCancion(salaId);
            if (resultado && resultado.ok) {
                return enviar("⏭️ Canción saltada");
            } else {
                return enviar("⏸️ No hay canción reproduciéndose");
            }
        } catch (e) {
            return enviar("❌ Error saltando canción");
        }
    }

    if (msg === "!queue" || msg === "!cola") {
        try {
            const info = await verCola(salaId);
            if (!info) return enviar("❌ Error obteniendo cola");
            if (info.total === 0 && !info.actual) return enviar("📭 Cola vacía");
            let mensaje = `🎵 Reproduciendo: ${info.actual || 'Nada'}`;
            if (info.total > 0) mensaje += ` • ${info.total} en cola`;
            return enviar(mensaje);
        } catch (e) {
            return enviar("❌ Error obteniendo cola");
        }
    }

    if (msg === "!clear") {
        try {
            const resultado = await limpiarCola(salaId);
            if (resultado && resultado.eliminadas > 0) {
                return enviar(`�️ Cola limpiada (${resultado.eliminadas} canciones)`);
            } else {
                return enviar("📭 La cola ya estaba vacía");
            }
        } catch (e) {
            return enviar("❌ Error limpiando cola");
        }
    }

    if (msg === "!np" || msg === "!nowplaying") {
        try {
            const https = RADIO_URL.startsWith('https') ? require('https') : require('http');
            const url = `${RADIO_URL}/now?sala=${salaId}`;

            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const info = JSON.parse(data);
                        if (info && info.actual) {
                            const duracion = `${Math.floor(info.actual.duracion / 60)}:${(info.actual.duracion % 60).toString().padStart(2, '0')}`;
                            let msg = `🎵 ${info.actual.titulo} [${duracion}]`;
                            if (info.totalCola > 0) msg += ` • ${info.totalCola} en cola`;
                            enviar(msg);
                        } else {
                            enviar("⏸️ No hay música");
                        }
                    } catch (e) { enviar("⏸️ No hay música"); }
                });
            }).on('error', () => enviar("⏸️ No hay música"));
        } catch (e) { return enviar("⏸️ No hay música"); }
        return;
    }
}

module.exports = { manejarComando };
