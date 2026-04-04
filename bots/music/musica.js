// musica.js - Sistema de radio con cola
const https = require("https");
const http = require("http");
require("dotenv").config();

const SERVIDOR = process.env.RADIO_URL || "http://localhost:5000";

function httpGet(url) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith("https") ? https : http;
        mod.get(url, res => {
            let data = "";
            res.on("data", c => data += c);
            res.on("end", () => {
                try { resolve(JSON.parse(data)); }
                catch(e) { reject(e); }
            });
        }).on("error", reject);
    });
}

async function reproducirCancion(query, salaId = 'sala1') {
    try {
        const url = `${SERVIDOR}/play?q=${encodeURIComponent(query)}&sala=${salaId}`;
        console.log(`[musica.js] 📤 Haciendo request a: ${url}`);
        const data = await httpGet(url);
        console.log(`[musica.js] 📥 Respuesta recibida:`, JSON.stringify(data).substring(0, 100));
        if(data.error) return null;
        return data; // { titulo, duracion, posicion, radioUrl }
    } catch(e) {
        console.error("[musica.js] ❌ Error:", e.message);
        return null;
    }
}

async function verCola(salaId = 'sala1') {
    try {
        const data = await httpGet(`${SERVIDOR}/queue?sala=${salaId}`);
        return data;
    } catch(e) {
        console.error("Error obteniendo cola:", e.message);
        return null;
    }
}

async function saltarCancion(salaId = 'sala1') {
    try {
        const data = await httpGet(`${SERVIDOR}/skip?sala=${salaId}`);
        return data;
    } catch(e) {
        console.error("Error saltando canción:", e.message);
        return null;
    }
}

async function limpiarCola(salaId = 'sala1') {
    try {
        const data = await httpGet(`${SERVIDOR}/clear?sala=${salaId}`);
        return data;
    } catch(e) {
        console.error("Error limpiando cola:", e.message);
        return null;
    }
}

async function detenerMusica(salaId = 'sala1') {
    try {
        await httpGet(`${SERVIDOR}/stop?sala=${salaId}`);
    } catch(e) {}
}

module.exports = { 
    reproducirCancion, 
    detenerMusica,
    verCola,
    saltarCancion,
    limpiarCola
};

