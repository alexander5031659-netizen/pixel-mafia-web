const { reproducirCancion, detenerMusica, verCola, saltarCancion, limpiarCola } = require("./musica");
require("dotenv").config();

const RADIO_URL = process.env.RADIO_URL || "http://localhost:5000";

// Variable para trackear si ya se envió la URL de radio
let urlRadioEnviada = false;

async function manejarComando(msg, nombre, enviar, contexto = {}) {
    msg = msg.trim();
    if (!msg) return;
    const n = nombre || "tu";
    const salaId = contexto.salaId || 'sala1';

    // ── Comando de ayuda ──
    if (msg === "!help" || msg === "!ayuda") {
        return enviar("🎵 COMANDOS: !play <canción> | !stop | !skip | !queue | !np | !clear");
    }

    // ── Música ──
    if (msg.startsWith("!play ")) {
        const query = msg.slice(6).trim();
        if (!query) return enviar(`${n} pon el nombre de la canción`);

        if (query.startsWith('http://') || query.startsWith('https://')) {
            const esYouTube = query.includes('youtube.com') || query.includes('youtu.be');
            if (!esYouTube) return enviar("❌ Solo se permiten links de YouTube");
        }

        await enviar(`🔍 Buscando: ${query}`);

        try {
            const cancion = await reproducirCancion(query, salaId);
            if (!cancion) return enviar("❌ No encontré esa canción");

            const duracion = `${Math.floor(cancion.duracion / 60)}:${(cancion.duracion % 60).toString().padStart(2, '0')}`;
            const radioUrl = cancion.radioUrl;

            if (cancion.posicion === 1) {
                // Primera canción - enviar info + URL de radio (UNA SOLA VEZ)
                await enviar(`✅ ${cancion.titulo} [${duracion}]`);
                
                // Enviar URL de radio solo la primera vez
                if (!urlRadioEnviada) {
                    await enviar(`📻 URL de radio: ${radioUrl}\n📝 Cópiala en el panel de medios de IMVU`);
                    urlRadioEnviada = true;
                }
            } else {
                // Canciones siguientes - solo confirmar
                return enviar(`✅ ${cancion.titulo} [${duracion}] • Posición: ${cancion.posicion}`);
            }
        } catch (e) {
            console.log("Error en !play:", e.message);
            return enviar("❌ Error con la música");
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
