// Bot Multi-Sala - Soporta múltiples salas simultáneas con 2FA y lectura de chat
const puppeteer = require("puppeteer-core");
const path = require("path");
require("dotenv").config();
const { manejarComando, saludarUsuario } = require("./bot_respuesta");

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

// Configuración de salas (se pasa por variable de entorno JSON)
const SALAS_CONFIG = JSON.parse(process.env.BOT_SALAS || '[{}]');
const BOT_NAME = process.env.BOT_NAME || "Bot Multi-Sala";
const BOT_ID = process.env.BOT_ID || `multi-${Date.now()}`;
const SESSION_DIR = process.env.BOT_SESSION_DIR || path.join(__dirname, '..', '..', 'instances', BOT_ID, 'session');
const HEADLESS = process.env.HEADLESS !== 'false';

// Configurar URL del servidor de radio para bot_respuesta
process.env.RADIO_URL = process.env.RADIO_SERVER_URL || 'http://localhost:5000';

const RADIO_SERVER = process.env.RADIO_URL; // URL del servidor de radio

// Estado global de salas
const salasActivas = new Map();
const mensajesBot = new Set();

function getChromePath() {
    const os = require('os');
    if (os.platform() === 'win32') return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    if (os.platform() === 'linux') return "/usr/bin/google-chrome";
    if (os.platform() === 'darwin') return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    return "chrome";
}

// Verificar si ya está logueado
async function verificarSesion(page) {
    try {
        const currentUrl = page.url();
        if (!currentUrl.includes('/login/') && !currentUrl.includes('/signin/')) {
            const tienePerfil = await page.evaluate(() => {
                return document.querySelector('.global-nav__profile-name') !== null ||
                       document.querySelector('[data-nav="profile-button"]') !== null ||
                       document.querySelector('.profile-container') !== null ||
                       document.querySelector('a[href*="/next/profile/"]') !== null;
            });
            if (tienePerfil) return true;
        }
        return false;
    } catch (e) {
        return false;
    }
}

// Hacer login con soporte mejorado para 2FA
async function hacerLogin(page, maxIntentos = 3) {
    for (let intento = 1; intento <= maxIntentos; intento++) {
        try {
            console.log(`\n🔐 Intento de login ${intento}/${maxIntentos}...`);
            
            // Verificar si ya está logueado
            if (await verificarSesion(page)) {
                console.log('✅ Sesión ya activa');
                return true;
            }
            
            // Navegar a login
            await page.goto('https://www.imvu.com/next/login/', { waitUntil: 'networkidle2', timeout: 30000 });
            await sleep(3000);
            
            // Verificar nuevamente tras navegar
            if (await verificarSesion(page)) {
                console.log('✅ Sesión activa (redirección automática)');
                return true;
            }
            
            // Buscar y clickear botón "Ingresar"
            const btnIngresar = await page.$('button.sign-in') || 
                               await page.$('button[data-testid="sign-in"]') ||
                               await page.$('button:has-text("Ingresar")') ||
                               await page.$('button:has-text("Sign In")');
            
            if (btnIngresar) {
                await btnIngresar.click();
                await sleep(3000);
            }
            
            // Rellenar credenciales
            const IMVU_USER = process.env.IMVU_USERNAME || '';
            const IMVU_PASS = process.env.IMVU_PASSWORD || '';
            
            if (!IMVU_USER || !IMVU_PASS) {
                console.log('❌ Faltan credenciales (IMVU_USERNAME / IMVU_PASSWORD)');
                return false;
            }
            
            // Usuario
            const userInput = await page.$('input[name="avatarname"]') ||
                              await page.$('input[type="text"]');
            if (userInput) {
                await userInput.click();
                await userInput.fill('');
                await userInput.type(IMVU_USER, { delay: 30 });
            }
            
            await sleep(500);
            
            // Contraseña
            const passInput = await page.$('input[name="password"]') ||
                              await page.$('input[type="password"]');
            if (passInput) {
                await passInput.click();
                await passInput.fill('');
                await passInput.type(IMVU_PASS, { delay: 30 });
            }
            
            await sleep(500);
            
            // Submit
            const btnSubmit = await page.$('button[type="submit"]') ||
                              await page.$('button:has-text("Entrar")') ||
                              await page.$('button:has-text("Login")');
            
            if (btnSubmit) {
                await btnSubmit.click();
            } else {
                await page.keyboard.press('Enter');
            }
            
            // Esperar resultado
            await sleep(5000);
            
            // Verificar si pide 2FA
            const es2FA = await page.evaluate(() => {
                return document.querySelector('input[name*="code"]') !== null ||
                       document.querySelector('input[placeholder*="code"]') !== null ||
                       document.body.innerText.toLowerCase().includes('código de verificación') ||
                       document.body.innerText.toLowerCase().includes('verification code') ||
                       document.body.innerText.toLowerCase().includes('2fa') ||
                       document.body.innerText.toLowerCase().includes('autenticación de dos factores');
            });
            
            if (es2FA) {
                console.log('🔐 2FA REQUERIDO');
                console.log('   Por favor ingresa el código de verificación en el navegador');
                console.log('   Esperando hasta 3 minutos...');
                
                // Esperar hasta 3 minutos para 2FA
                for (let i = 0; i < 180; i++) {
                    await sleep(1000);
                    
                    // Verificar si ya pasó el 2FA
                    if (await verificarSesion(page)) {
                        console.log('✅ Login exitoso después de 2FA');
                        return true;
                    }
                    
                    // Mostrar progreso cada 10 segundos
                    if (i % 10 === 0 && i > 0) {
                        console.log(`   ⏳ Esperando 2FA... ${i}s`);
                    }
                }
                
                console.log('❌ Timeout esperando 2FA');
                return false;
            }
            
            // Verificar login exitoso
            await sleep(3000);
            if (await verificarSesion(page)) {
                console.log('✅ Login exitoso');
                return true;
            }
            
            // Verificar error
            const errorMsg = await page.evaluate(() => {
                const error = document.querySelector('.error-message, .alert-danger, [data-testid="error"]');
                return error ? error.innerText : null;
            });
            
            if (errorMsg) {
                console.log(`❌ Error: ${errorMsg}`);
            }
            
        } catch (e) {
            console.log(`❌ Error en intento ${intento}: ${e.message}`);
        }
        
        await sleep(2000);
    }
    
    return false;
}

// Entrar a una sala específica
async function entrarSala(page, roomUrl, salaId) {
    try {
        console.log(`\n🏠 [${salaId}] Navegando a sala: ${roomUrl}`);
        
        await page.goto(roomUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(5000);
        
        // Verificar si necesita login
        const url = page.url();
        if (url.includes('login') || url.includes('accessdenied')) {
            console.log(`🔑 [${salaId}] Requiere login...`);
            const loginOk = await hacerLogin(page);
            if (!loginOk) {
                console.log(`❌ [${salaId}] Login falló`);
                return false;
            }
            await page.goto(roomUrl, { waitUntil: 'domcontentloaded' });
            await sleep(5000);
        }
        
        // Intentar unirse a la sala
        const intentoUnirse = await page.evaluate(() => {
            const botones = [...document.querySelectorAll('button')];
            for (const btn of botones) {
                const text = (btn.innerText || '').trim().toUpperCase();
                if (text.includes('UNIRSE') || text.includes('JOIN')) {
                    btn.click();
                    return true;
                }
            }
            return false;
        });
        
        if (intentoUnirse) {
            console.log(`✅ [${salaId}] Botón UNIRSE clickeado`);
            await sleep(3000);
        }
        
        // Verificar que estamos en el chat
        const chatListo = await verificarChatListo(page);
        if (chatListo) {
            console.log(`✅ [${salaId}] Chat listo`);
            // Construir URL de radio para esta sala
            const radioUrlSala = `${RADIO_SERVER}/stream/${salaId}`;
            // Enviar mensaje de bienvenida + URL de radio
            await enviarMensaje(page, `🎵 ${BOT_NAME} activo en esta sala`);
            await enviarMensaje(page, `📻 URL de radio: ${radioUrlSala}`);
            await enviarMensaje(page, `💡 Cópiala en: Configuración → Room Music`);
            console.log(`\n╔══════════════════════════════════════════════════════════╗`);
            console.log(`║  📻 URL DE RADIO PARA SALA ${salaId.padEnd(31)}  ║`);
            console.log(`║  ${radioUrlSala.padEnd(54)}  ║`);
            console.log(`╚══════════════════════════════════════════════════════════╝\n`);
            return true;
        }
        
        console.log(`⚠️ [${salaId}] Chat no detectado`);
        return false;
        
    } catch (e) {
        console.log(`❌ [${salaId}] Error entrando a sala: ${e.message}`);
        return false;
    }
}

// Verificar que el chat esté listo
async function verificarChatListo(page, maxIntentos = 5) {
    for (let i = 0; i < maxIntentos; i++) {
        const chatInput = await page.evaluate(() => {
            const selectors = [
                'textarea[placeholder]',
                'input[placeholder*="mensaje"]',
                'input[placeholder*="chat"]',
                'textarea.input-text',
                '[data-testid="chat-input"]',
                '[contenteditable="true"]'
            ];
            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el && el.offsetHeight > 0) return true;
            }
            return false;
        });
        
        if (chatInput) return true;
        await sleep(2000);
    }
    return false;
}

// Enviar mensaje a una sala
async function enviarMensaje(page, texto) {
    try {
        await sleep(300);
        
        // Buscar input del chat
        let input = await page.$('textarea[placeholder]:not([placeholder*="emisora"])') ||
                    await page.$('input[type="text"][placeholder]:not([placeholder*="emisora"])') ||
                    await page.$('textarea') ||
                    await page.$('input[type="text"]') ||
                    await page.$('[contenteditable="true"]');
        
        if (!input) {
            console.log('⚠️ No se encontró input del chat');
            return false;
        }
        
        await input.click();
        await input.fill('');
        await input.type(String(texto), { delay: 5 });
        await input.press('Enter');
        
        mensajesBot.add(texto.toLowerCase().slice(0, 60));
        console.log(`>> [${await page.title()}] ${texto}`);
        return true;
        
    } catch (e) {
        console.log(`❌ Error enviando mensaje: ${e.message}`);
        return false;
    }
}

// Configurar escucha de mensajes para una sala
async function configurarEscuchaChat(page, salaId, enviarFn) {
    const cola = [];
    let trabajando = false;
    
    function encolar(msg, nombre) {
        console.log(`📥 [${salaId}] ${nombre}: ${msg}`);
        cola.push({ msg, nombre });
        procesar();
    }
    
    async function procesar() {
        if (trabajando || cola.length === 0) return;
        
        trabajando = true;
        const { msg, nombre } = cola.shift();
        
        try {
            await manejarComando(msg, nombre, enviarFn, { salaId });
        } catch (e) {
            console.log(`❌ [${salaId}] Error procesando comando: ${e.message}`);
        }
        
        trabajando = false;
        setTimeout(procesar, 1500);
    }
    
    // Exponer funciones al navegador
    await page.exposeFunction("onChatMsg", ({ nombre, texto, sala }) => {
        if (!texto) return;
        
        // Ignorar mensajes propios
        const lowText = texto.toLowerCase();
        if (mensajesBot.has(lowText.slice(0, 60))) return;
        if (nombre.toLowerCase().includes('bot')) return;
        
        // Procesar comandos
        if (texto.startsWith('!')) {
            encolar(texto.trim(), nombre);
        }
    });
    
    await page.exposeFunction("onUserJoin", async (nombre) => {
        console.log(`👋 [${salaId}] Usuario se unió: ${nombre}`);
        await saludarUsuario(nombre, enviarFn);
    });
    
    // Script para detectar mensajes en el DOM
    await page.evaluate((salaId) => {
        const mensajesProcesados = new Set();
        const MAX_CACHE = 200;
        
        function procesarMensaje(elemento) {
            try {
                // Extraer nombre del usuario
                let nombre = '';
                const nombreSelectors = [
                    '.chat-message-username',
                    '.message-username',
                    '[data-testid="message-author"]',
                    '.user-name',
                    '.avatar-name',
                    'strong',
                    'b'
                ];
                
                for (const sel of nombreSelectors) {
                    const el = elemento.querySelector(sel);
                    if (el) {
                        nombre = el.innerText.trim();
                        break;
                    }
                }
                
                // Extraer texto del mensaje
                let texto = '';
                const textoSelectors = [
                    '.chat-message-text',
                    '.message-text',
                    '.message-content',
                    '[data-testid="message-content"]',
                    '.text-content'
                ];
                
                for (const sel of textoSelectors) {
                    const el = elemento.querySelector(sel);
                    if (el) {
                        texto = el.innerText.trim();
                        break;
                    }
                }
                
                // Si no encontró con selectores específicos, usar texto completo
                if (!texto) {
                    texto = elemento.innerText?.replace(nombre, '').trim() || '';
                }
                
                if (!nombre || !texto) return;
                
                // Crear ID único
                const msgId = `${salaId}:${nombre}:${texto.slice(0, 50)}:${Date.now()}`;
                if (mensajesProcesados.has(msgId)) return;
                
                mensajesProcesados.add(msgId);
                if (mensajesProcesados.size > MAX_CACHE) {
                    const first = mensajesProcesados.values().next().value;
                    mensajesProcesados.delete(first);
                }
                
                // Enviar al bot
                if (window.onChatMsg) {
                    window.onChatMsg({ nombre, texto, sala: salaId });
                }
                
            } catch (e) {
                console.log('Error procesando mensaje:', e);
            }
        }
        
        // Observer para nuevos mensajes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType !== 1) return;
                    
                    // Buscar mensajes en el nodo agregado
                    const msgSelectors = [
                        '.chat-message',
                        '.message-item',
                        '.message',
                        '[data-testid="chat-message"]',
                        '.room-chat-message'
                    ];
                    
                    for (const sel of msgSelectors) {
                        const mensajes = node.matches?.(sel) ? [node] : 
                                        node.querySelectorAll?.(sel) || [];
                        mensajes.forEach(procesarMensaje);
                    }
                });
            });
        });
        
        // Iniciar observer en el contenedor del chat
        const chatContainer = document.querySelector('.chat-messages') ||
                              document.querySelector('.room-chat') ||
                              document.querySelector('[data-testid="chat-container"]') ||
                              document.querySelector('.messages-container') ||
                              document.body;
        
        if (chatContainer) {
            observer.observe(chatContainer, { childList: true, subtree: true });
            console.log(`[${salaId}] Chat observer iniciado`);
        }
        
        // También buscar mensajes existentes
        const existentes = document.querySelectorAll('.chat-message, .message-item, [data-testid="chat-message"]');
        existentes.forEach(procesarMensaje);
        
    }, salaId);
    
    console.log(`✅ [${salaId}] Escucha de chat configurada`);
}

// Iniciar una sala individual
async function iniciarSala(config, browser) {
    const { url, nombre, id } = config;
    const salaId = id || `sala-${Date.now()}`;
    
    try {
        console.log(`\n🚀 Iniciando sala: ${salaId} - ${nombre || 'Sin nombre'}`);
        
        // Crear nueva página
        const page = await browser.newPage();
        
        // Login (solo una vez por browser, las demás salas comparten sesión)
        const logueado = await hacerLogin(page);
        if (!logueado) {
            console.log(`❌ [${salaId}] No se pudo hacer login`);
            await page.close();
            return null;
        }
        
        // Entrar a la sala
        const entro = await entrarSala(page, url, salaId);
        if (!entro) {
            console.log(`⚠️ [${salaId}] No se pudo entrar a la sala`);
        }
        
        // Guardar info de sala
        const salaInfo = {
            id: salaId,
            url,
            nombre: nombre || salaId,
            radioUrl: `${RADIO_SERVER}/stream?sala=${salaId}`
        };
        
        // Preparar función de envío para esta sala
        const enviarFn = async (texto) => {
            return await enviarMensaje(page, texto);
        };
        
        // Configurar escucha de chat
        await configurarEscuchaChat(page, salaId, enviarFn);
        
        // Guardar referencia
        salasActivas.set(salaId, {
            page,
            url,
            nombre: nombre || salaId,
            enviar: enviarFn,
            activa: true
        });
        
        console.log(`✅ [${salaId}] Sala iniciada correctamente`);
        
        // Monitorear salud de la sala
        setInterval(async () => {
            try {
                const url = page.url();
                if (url.includes('login') || url.includes('error')) {
                    console.log(`⚠️ [${salaId}] Detectado problema, reintentando...`);
                    await entrarSala(page, config.url, salaId);
                }
            } catch (e) {}
        }, 30000);
        
        return salaId;
        
    } catch (e) {
        console.log(`❌ [${salaId}] Error iniciando sala: ${e.message}`);
        return null;
    }
}

// Función principal
async function main() {
    console.log(`\n🤖 ${BOT_NAME} [${BOT_ID}]`);
    console.log(`📊 Configuración: ${SALAS_CONFIG.length} sala(s)`);
    console.log(`🔧 Headless: ${HEADLESS}`);
    console.log(`📂 Session: ${SESSION_DIR}`);
    
    if (SALAS_CONFIG.length === 0 || !SALAS_CONFIG[0].url) {
        console.log('❌ No hay salas configuradas');
        console.log('   Usa: BOT_SALAS=[{"url":"https://...","nombre":"Sala 1"}]');
        process.exit(1);
    }
    
    // Launch browser
    const browser = await puppeteer.launch({
        headless: HEADLESS,
        executablePath: getChromePath(),
        userDataDir: SESSION_DIR,
        defaultViewport: null,
        dumpio: false,  // No mostrar logs de Chrome/DevTools
        args: HEADLESS ? [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--window-size=1920,1080"
        ] : ["--start-maximized", "--no-sandbox"]
    });
    
    console.log('\n🌐 Browser iniciado');
    
    // Iniciar cada sala en paralelo
    const promesas = SALAS_CONFIG.map(config => iniciarSala(config, browser));
    const resultados = await Promise.all(promesas);
    
    const exitosos = resultados.filter(r => r !== null);
    console.log(`\n✅ ${exitosos.length}/${SALAS_CONFIG.length} salas activas`);
    
    if (exitosos.length === 0) {
        console.log('❌ Ninguna sala pudo iniciarse');
        await browser.close();
        process.exit(1);
    }
    
    // Mantener vivo
    console.log('\n💡 Comandos disponibles:');
    console.log('   !play <canción> - Buscar y reproducir');
    console.log('   !skip - Saltar canción');
    console.log('   !queue - Ver cola');
    console.log('   !stop - Detener música');
    console.log('\nPresiona Ctrl+C para detener todas las salas\n');
    
    // Manejar cierre
    process.on('SIGINT', async () => {
        console.log('\n\n👋 Cerrando bot...');
        for (const [id, sala] of salasActivas) {
            try {
                await sala.enviar('👋 Bot desconectándose...');
                await sleep(1000);
            } catch (e) {}
        }
        await browser.close();
        process.exit(0);
    });
}

main().catch(e => {
    console.log(`❌ Error fatal: ${e.message}`);
    process.exit(1);
});
