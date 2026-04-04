const puppeteer = require("puppeteer-core");
const path = require("path");
require("dotenv").config();
const { manejarComando, saludarUsuario } = require("./bot_respuesta");

// ── Configuración ─────────────────────────────────────────────────────────────

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

const BOT_NAME = process.env.BOT_NAME || "Bot IA v1.0";
const BOT_ID = process.env.BOT_ID || "ia-default";
const BOT_ROOM = process.env.BOT_ROOM_URL || "";
const SESSION_DIR = process.env.BOT_SESSION_DIR || path.join(__dirname, '..', '..', 'instances', BOT_ID, 'session');
const BOT_CATEGORIA = process.env.BOT_CATEGORIA || "GA";
const HEADLESS = process.env.HEADLESS !== 'false';
const NODE_ENV = process.env.NODE_ENV || 'production';
const IS_DEV = NODE_ENV === 'development';
const IMVU_USERNAME = process.env.IMVU_USERNAME || "";
const IMVU_PASSWORD = process.env.IMVU_PASSWORD || "";

// Ruta de Chrome según sistema operativo
function getChromePath() {
    const os = require('os');
    const platform = os.platform();
    if (platform === 'win32') return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    if (platform === 'linux') return "/usr/bin/google-chrome";
    if (platform === 'darwin') return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    return "chrome";
}

// ── Validación ────────────────────────────────────────────────────────────────

if (!BOT_ROOM) {
    console.error("❌ ERROR: BOT_ROOM_URL no está definida");
    process.exit(1);
}

console.log(`🤖 ${BOT_NAME} [${BOT_ID}] iniciando...`);
console.log(`📂 Categoría: ${BOT_CATEGORIA}`);
console.log(`💾 Sesión: ${SESSION_DIR}`);
console.log(`🔗 Sala: ${BOT_ROOM}`);
console.log(`🖥️ Headless: ${HEADLESS}`);
console.log(`🔧 Modo: ${NODE_ENV}`);

// ── Login automático ──────────────────────────────────────────────────────────

async function hacerLogin(page) {
    try {
        console.log('\n🔐 Iniciando Login Blindado...');
        const loginUrl = 'https://www.imvu.com/next/login/';
        
        // Verificar primero si ya estamos logueados por URL antes de navegar
        const currentUrl = page.url();
        console.log('📍 URL actual:', currentUrl);
        
        if (!currentUrl.includes('/login/') && !currentUrl.includes('/signin/')) {
            // Ya estamos en una página que no es login - verificar elementos de sesión
            const tienePerfil = await page.evaluate(() => {
                return document.querySelector('.global-nav__profile-name') !== null ||
                       document.querySelector('[data-nav="profile-button"]') !== null ||
                       document.querySelector('.profile-container') !== null ||
                       document.querySelector('.user-menu') !== null ||
                       document.querySelector('.avatar-dropdown') !== null ||
                       document.querySelector('button[aria-label*="perfil"]') !== null ||
                       document.querySelector('a[href*="/next/profile/"]') !== null;
            });
            
            if (tienePerfil) {
                console.log('✅ Sesión activa detectada (perfil visible en URL actual)');
                return true;
            }
        }
        
        // Navegar a login y verificar si redirige (indica sesión activa)
        console.log('⏳ Navegando a login para verificar sesión...');
        await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Esperar un momento para ver si hay redirección automática por sesión activa
        await sleep(3000);
        
        const urlDespues = page.url();
        console.log('📍 URL después de navegar:', urlDespues);
        
        // Si la URL cambió y ya no es login, hay sesión activa
        if (!urlDespues.includes('/login/') && !urlDespues.includes('/signin/')) {
            console.log('✅ Sesión activa detectada (redirección automática)');
            return true;
        }
        
        // Verificar elementos de sesión en la página actual
        const yaLogueado = await page.evaluate(() => {
            return document.querySelector('.global-nav__profile-name') !== null ||
                   document.querySelector('[data-nav="profile-button"]') !== null ||
                   document.querySelector('.profile-container') !== null ||
                   document.querySelector('.user-menu') !== null ||
                   document.querySelector('.avatar-dropdown') !== null ||
                   document.querySelector('button[aria-label*="perfil"]') !== null ||
                   document.querySelector('a[href*="/next/profile/"]') !== null ||
                   document.body.innerText.includes('Cerrar sesión') ||
                   document.body.innerText.includes('Log out') ||
                   document.body.innerText.includes('Mi perfil');
        });
        
        if (yaLogueado) {
            console.log('✅ Sesión ya activa, no requiere login');
            return true;
        }
        
        console.log('⏳ Buscando botón "Ingresar" para abrir formulario...');
        
        // PASO 1: Intentar hacer clic en botón "Ingresar"
        let formularioAbierto = false;
        
        for (let intento = 0; intento < 3; intento++) {
            const btnEncontrado = await page.evaluate(() => {
                const btn = document.querySelector('button.sign-in, button[class*="sign-in"]');
                if (btn && btn.offsetHeight > 0) {
                    btn.click();
                    return true;
                }
                const botones = [...document.querySelectorAll('button')];
                for (const b of botones) {
                    if (b.innerText && b.innerText.trim() === 'Ingresar' && b.offsetHeight > 0) {
                        b.click();
                        return true;
                    }
                }
                return false;
            });
            
            if (btnEncontrado) {
                console.log('🖱️ Botón "Ingresar" clickeado');
                await sleep(5000);
            }
            
            // Verificar si apareció el formulario
            const formReady = await page.waitForSelector('input[type="password"]', { timeout: 5000 }).catch(() => null);
            
            if (formReady) {
                console.log('🎯 Formulario de login detectado');
                formularioAbierto = true;
                break;
            }
            
            if (intento === 1) {
                console.log('🔄 Recargando página de login...');
                await page.goto(loginUrl, { waitUntil: 'networkidle2' });
                await sleep(3000);
            }
            
            await sleep(2000);
        }
        
        // Si aún no tenemos formulario, intentar URL alternativa
        if (!formularioAbierto) {
            console.log('⚠️ Intentando URL alternativa de login...');
            await page.goto('https://www.imvu.com/next/login/?next=/next/home/', { waitUntil: 'networkidle2' });
            await sleep(5000);
            
            const formAlt = await page.waitForSelector('input[type="password"]', { timeout: 5000 }).catch(() => null);
            if (formAlt) {
                console.log('🎯 Formulario detectado en URL alternativa');
                formularioAbierto = true;
            }
        }
        
        // Último intento: usar login clásico de IMVU
        if (!formularioAbierto) {
            console.log('⚠️ Intentando login clásico...');
            await page.goto('https://secure.imvu.com/login/', { waitUntil: 'domcontentloaded' });
            await sleep(5000);
            
            const formClassic = await page.waitForSelector('input[type="password"]', { timeout: 5000 }).catch(() => null);
            if (formClassic) {
                console.log('🎯 Formulario detectado en login clásico');
                formularioAbierto = true;
            }
        }
        
        if (!formularioAbierto) {
            const urlAhora = page.url();
            if (!urlAhora.includes('/login/')) {
                console.log('✅ Sesión activa detectada (redirección)');
                return true;
            }
            console.log('❌ No se detectó formulario de login');
            return false;
        }
        
        console.log('🎯 Formulario detectado. Rellenando datos...');

        if (!IMVU_USERNAME || !IMVU_PASSWORD) {
            console.log('❌ No hay credenciales configuradas');
            return false;
        }

        // Rellenar usuario con Puppeteer nativo
        console.log('👤 Ingresando usuario...');
        const userInput = await page.evaluateHandle(() => {
            const inputs = [...document.querySelectorAll('input[name="avatarname"], input[type="text"]')];
            return inputs.find(i => i.offsetHeight > 0 && i.type === 'text');
        }).then(handle => handle.asElement()).catch(() => null);
        
        if (!userInput) {
            console.log('❌ No se encontró campo de usuario visible');
            return false;
        }
        
        await userInput.click();
        await page.keyboard.down('Control');
        await page.keyboard.down('a');
        await page.keyboard.up('a');
        await page.keyboard.up('Control');
        await page.keyboard.press('Delete');
        await userInput.type(IMVU_USERNAME, { delay: 50 });
        console.log('✅ Usuario ingresado');
        await sleep(500);

        // Rellenar contraseña
        console.log('🔑 Ingresando contraseña...');
        const passInput = await page.evaluateHandle(() => {
            const inputs = [...document.querySelectorAll('input[name="password"], input[type="password"]')];
            return inputs.find(i => i.offsetHeight > 0 && i.type === 'password');
        }).then(handle => handle.asElement()).catch(() => null);
        
        if (!passInput) {
            console.log('❌ No se encontró campo de contraseña visible');
            return false;
        }
        
        await passInput.click();
        await page.keyboard.down('Control');
        await page.keyboard.down('a');
        await page.keyboard.up('a');
        await page.keyboard.up('Control');
        await page.keyboard.press('Delete');
        await passInput.type(IMVU_PASSWORD, { delay: 50 });
        console.log('✅ Contraseña ingresada');
        await sleep(500);

        // Click en botón de login o Enter
        const loginClicked = await page.evaluate(() => {
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) { submitBtn.click(); return true; }
            const botones = [...document.querySelectorAll('button')];
            for (const btn of botones) {
                const text = (btn.innerText || '').toLowerCase();
                if (text.includes('login') || text.includes('entrar') || text.includes('sign in')) {
                    btn.click(); return true;
                }
            }
            return false;
        });

        if (!loginClicked) {
            console.log('⌨️ Enviando Enter...');
            await page.keyboard.press('Enter');
        } else { 
            console.log('🖱️ Botón de login clickeado'); 
        }

        // Esperar navegación
        console.log('⏳ Esperando respuesta de IMVU (hasta 15s)...');
        await sleep(15000);
        
        const urlAfterSubmit = page.url();
        console.log('📍 URL después de submit:', urlAfterSubmit);
        
        if (!urlAfterSubmit.includes('/login/')) {
            console.log('✅ Login exitoso - URL cambió');
            await sleep(2000);
            return true;
        }
        
        const errorText = await page.evaluate(() => {
            const error = document.querySelector('.error-message, .alert-danger, [data-testid="error"]');
            return error ? error.innerText : null;
        });
        
        if (errorText) {
            console.log('❌ Error de login:', errorText);
            return false;
        }
        
        const es2FA = await page.evaluate(() => {
            return document.querySelector('input[name*="code"]') || 
                   document.querySelector('input[placeholder*="code"]') ||
                   document.body.innerText.toLowerCase().includes('verification') ||
                   document.body.innerText.toLowerCase().includes('código') ||
                   document.body.innerText.toLowerCase().includes('2fa');
        });

        if (es2FA) {
            console.log('⚠️ 2FA detectado. Esperando 60 segundos...');
            await sleep(60000);
            const urlFinal = page.url();
            if (!urlFinal.includes('/login/')) {
                console.log('✅ Login exitoso después de 2FA');
                return true;
            }
            console.log('❌ Login falló después de esperar 2FA');
            return false;
        }

        await sleep(3000);
        const urlFinal = page.url();
        
        if (!urlFinal.includes('/login/')) {
            console.log('✅ Login exitoso');
            return true;
        }

        const hasError = await page.evaluate(() => {
            const error = document.querySelector('.error-message, .alert-danger');
            return error && error.offsetHeight > 0;
        });

        if (hasError) {
            console.log('❌ Error de credenciales');
            return false;
        }

        console.log('⏳ Verificando estado final...');
        return !page.url().includes('/login/');

    } catch (e) {
        console.log(`❌ Error en hacerLogin: ${e.message}`);
        return false;
    }
}


async function verificarYEntrarSala(page, roomUrl) {
    const MAX_INTENTOS = 3;

    for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
        console.log(`\n🌐 Intento ${intento}/${MAX_INTENTOS}: Navegando a la sala...`);

        try {
            await page.goto(roomUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await sleep(6000);

            const urlActual = page.url();
            const esPaginaLogin = urlActual.includes('login') || urlActual.includes('signin');

            // Ver si hay botón INGRESAR o formulario
            const necesitaLogin = await page.evaluate(() => {
                const botones = [...document.querySelectorAll('button')];
                const tieneBotonEntrar = botones.some(b => {
                    const t = (b.innerText || '').toLowerCase();
                    return t.includes('ingresar') || t.includes('log in') || t.includes('sign in');
                });
                const tieneInputs = document.querySelectorAll('input[type="password"]').length > 0;
                return tieneBotonEntrar || tieneInputs;
            });

            console.log('⏳ Buscando botón para entrar a la sala (UNIRSE)...');
            const botonEntrarChat = await page.evaluate(() => {
                const botones = [...document.querySelectorAll('button')];
                for (const btn of botones) {
                    const text = (btn.innerText || '').trim().toUpperCase();
                    if (text === 'UNIRSE' || text === 'JOIN' || text === 'UNIRSE AHORA' || text === 'JOIN ROOM') {
                        if (btn.offsetHeight > 0) {
                            btn.click();
                            return true;
                        }
                    }
                }
                const goldBtn = document.querySelector('button[class*="Gold"], button[class*="Primary"]');
                if (goldBtn && goldBtn.innerText.length < 15) {
                    goldBtn.click();
                    return true;
                }
                return false;
            });

            if (botonEntrarChat) {
                console.log('✅ Botón "UNIRSE" clickeado. Entrando al chat...');
            } else {
                console.log('⚠️ No se encontró el botón "UNIRSE", tal vez ya estamos dentro.');
                await page.mouse.click(900, 650);
            }

            console.log('⏳ Verificando carga completa del chat (15 segundos)...');
            await sleep(15000);

            const chatListo = await page.evaluate(() => {
                const selectors = ['textarea', 'textarea.input-text', 'input[placeholder*="mensaje"]', 'input[placeholder*="say"]', 'input[placeholder*="Di algo"]', 'input[placeholder*="algo"]'];
                for (const sel of selectors) {
                    const input = document.querySelector(sel);
                    if (input && input.offsetHeight > 0) return true;
                }
                return false;
            });


            if (chatListo) {
                console.log('✅ Confirmado: El bot ya está en el chat');
                return true;
            } else {
                console.log(`⚠️ Advertencia: No se detectó el input del chat (Intento ${intento})`);
                if (intento < MAX_INTENTOS) await sleep(3000);
            }

        } catch (e) {
            console.log(`❌ Error navegación: ${e.message}`);
            if (intento < MAX_INTENTOS) await sleep(3000);
        }
    }

    return false;
}



// ── Inicio principal ──────────────────────────────────────────────────────────

(async () => {
    await sleep(2000);

    const browser = await puppeteer.launch({
        headless: HEADLESS,
        executablePath: getChromePath(),
        userDataDir: SESSION_DIR,
        defaultViewport: null,
        args: HEADLESS ? [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--disable-web-security",
            "--disable-features=IsolateOrigins,site-per-process",
            "--window-size=1920,1080"
        ] : ["--start-maximized", "--no-sandbox"]
    });

    const page = await browser.newPage();

    // 🚀 PASO 1: Navegar directamente al Login (Login-First)
    console.log('\n🔐 Iniciando flujo de Login Directo...');
    await page.goto('https://www.imvu.com/next/login/', { waitUntil: 'networkidle2' });
    
    // PASO 2: Login
    const logueado = await hacerLogin(page);
    if (!logueado) {
        console.log('❌ Error: El login falló y no se detectó ninguna sesión activa.');
        console.log('🛑 Deteniendo el bot por seguridad. Revisa la ventana del navegador.');
        return; // Salto de emergencia
    } else {
        console.log('✅ Sesión confirmada.');
    }

    // PASO 3: Navegar a la sala
    console.log(`\n🌐 Navegando a la sala: ${BOT_ROOM}`);
    await page.goto(BOT_ROOM, { waitUntil: 'domcontentloaded', timeout: 45000 });
    
    // PASO 4: Entrar a la sala con verificación
    const entro = await verificarYEntrarSala(page, BOT_ROOM);
    if (!entro) {
        console.log('⚠️ El bot continuará aunque no se detectó la sala correctamente');
    }

    const mensajesBot = new Set();

    // ── Función enviar ────────────────────────────────────────────────────

    async function enviar(texto) {
        try {
            await sleep(300);

            let input = await page.$("textarea[placeholder]:not([placeholder*='emisora']):not([placeholder*='url'])");
            if (!input) input = await page.$("input[type='text'][placeholder]:not([placeholder*='emisora']):not([placeholder*='url'])");
            if (!input) input = await page.$("textarea");
            if (!input) input = await page.$("input[type='text']");

            if (!input) { console.log("⚠️ No se encontró el input de texto"); return false; }

            const isVisible = await input.isVisible().catch(() => false);
            if (!isVisible) { console.log("⚠️ Input no visible"); return false; }

            await input.click({ clickCount: 3 });
            await input.press("Backspace");
            await input.type(String(texto), { delay: 2 });
            await input.press("Enter");
            mensajesBot.add(texto.toLowerCase().slice(0, 60));
            if (mensajesBot.size > 200) mensajesBot.clear();
            console.log(">>", texto);
            return true;
        } catch (e) {
            if (e.message.includes('detached Frame')) {
                console.log("⚠️ Frame desconectado, reintentando...");
                await sleep(1500);
                try {
                    let input = await page.$("textarea[placeholder]:not([placeholder*='emisora']):not([placeholder*='url'])");
                    if (!input) input = await page.$("textarea");
                    if (input) {
                        await input.click({ clickCount: 3 });
                        await input.press("Backspace");
                        await input.type(String(texto), { delay: 2 });
                        await input.press("Enter");
                        console.log(">> (reintento)", texto);
                        return true;
                    }
                } catch (e2) {
                    console.log("Error enviar (reintento):", e2.message);
                }
            }
            console.log("Error enviar:", e.message);
            return false;
        }
    }

    // Saludo inicial para aparecer en la sala
    await sleep(2000);
    await enviar(`🤖 ${BOT_NAME} activo - pregúntame lo que quieras`);

    // ── Cola de comandos ──────────────────────────────────────────────────

    const cola = [];
    let trabajando = false;
    const ultimaEjecucion = {};

    function encolar(msg, nombre) {
        if (!nombre) nombre = "tu";
        const key = nombre + ":" + msg;
        const ahora = Date.now();
        if (ultimaEjecucion[key] && ahora - ultimaEjecucion[key] < 1000) return;
        ultimaEjecucion[key] = ahora;
        cola.push({ msg, nombre });
        procesar();
    }

    async function procesar() {
        if (trabajando || cola.length === 0) return;
        trabajando = true;
        const { msg, nombre } = cola.shift();
        console.log(`Ejecutando: ${nombre} ${msg} [Cola] Quedan ${cola.length} comandos pendientes`);
        try {
            const contexto = { salaId: BOT_ID };
            await manejarComando(msg, nombre, enviar, contexto);
        } catch (e) {
            console.log("❌ Error procesando comando:", e.message);
        } finally {
            trabajando = false;
            setTimeout(procesar, 2000);
        }
    }

    // ── Exponer funciones al DOM ──────────────────────────────────────────

    await page.exposeFunction("onMsg", ({ nombre, texto }) => {
        if (!texto) return;
        const low = texto.toLowerCase();
        const botNameLower = BOT_NAME.toLowerCase();
        const ignorar = [botNameLower, "bienvenido", "llego", "hola a todos", "comandos", "error"];
        if (!texto.startsWith("!")) {
            if (mensajesBot.has(low.slice(0, 60))) return;
            for (const f of ignorar) { if (low.includes(f)) return; }
        }
        const lineas = texto.split("\n");
        for (const linea of lineas) {
            const t = linea.trim();
            if (t.startsWith("!")) {
                console.log(`Detectado: ${nombre} ${t}`);
                encolar(t, nombre);
            }
        }
    });

    await page.exposeFunction("onJoin", async (nombre) => {
        const key = "join:" + nombre;
        const ahora = Date.now();
        if (ultimaEjecucion[key] && ahora - ultimaEjecucion[key] < 10000) return;
        ultimaEjecucion[key] = ahora;
        await saludarUsuario(nombre, enviar);
    });

    // ── MutationObserver ──────────────────────────────────────────────────

    await page.evaluate((botNameLower) => {
        const cache = new Map();
        const observer = new MutationObserver(muts => {
            for (const m of muts) {
                for (const n of m.addedNodes) {
                    if (n.nodeType !== 1 || !n.innerText) continue;
                    const txt = n.innerText.trim();
                    if (!txt) continue;

                    if (txt.includes("se ha unido") || txt.includes("joined")) {
                        const nombre = txt.split(" ")[0];
                        if (nombre && window.onJoin) window.onJoin(nombre);
                        continue;
                    }

                    if (txt.includes("Amazing Poses") || txt.includes("No tienes ninguna")) continue;
                    if (/^bx(sit)?\d+$/.test(txt)) continue;

                    const lineas = txt.split("\n").map(l => l.trim()).filter(l => l);
                    if (lineas.length < 2) continue;

                    const nombre = lineas[0];
                    const mensaje = lineas[1];

                    if (nombre.toLowerCase().includes(botNameLower)) continue;

                    const msgId = nombre + ":" + mensaje;
                    const ahora = Date.now();
                    if (cache.has(msgId) && ahora - cache.get(msgId) < 1500) continue;
                    cache.set(msgId, ahora);

                    if (window.onMsg) {
                        window.onMsg({ nombre, texto: mensaje });
                    }
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }, BOT_NAME.toLowerCase());

    // ── Sistema de reconexión automática ─────────────────────────────────

    let reconectando = false;
    let ultimaActividad = Date.now();

    async function verificarConexion() {
        if (reconectando || shuttingDown) return true;

        try {
            const url = page.url();
            const tieneChat = await page.evaluate(() => {
                const input = document.querySelector('textarea, input[type="text"]');
                return input && input.offsetHeight > 0;
            });

            if (!url.includes('chat') && !url.includes('room')) {
                console.log('⚠️ Bot fuera de la sala, reconectando...');
                return false;
            }
            if (!tieneChat && Date.now() - ultimaActividad > 60000) {
                console.log('⚠️ Chat no detectado, reconectando...');
                return false;
            }
            return true;
        } catch (e) {
            console.log('⚠️ Error verificando conexión:', e.message);
            return false;
        }
    }

    async function reconectar() {
        if (reconectando) return;
        reconectando = true;

        console.log('\n🔄 INICIANDO RECONEXIÓN...');
        try {
            await enviar(`⚠️ ${BOT_NAME} se desconectó, reconectando...`);
        } catch(e) {}

        let intentos = 0;
        const maxIntentos = 5;

        while (intentos < maxIntentos) {
            intentos++;
            console.log(`🔄 Intento ${intentos}/${maxIntentos}...`);

            try {
                const entro = await verificarYEntrarSala(page, BOT_ROOM);
                if (entro) {
                    console.log('✅ Reconexión exitosa');
                    await enviar(`✅ ${BOT_NAME} reconectado y listo`);
                    reconectando = false;
                    ultimaActividad = Date.now();
                    return true;
                }
            } catch (e) {
                console.log(`❌ Error en intento ${intentos}:`, e.message);
            }

            await sleep(5000);
        }

        console.log('❌ Fallaron todos los intentos de reconexión');
        reconectando = false;
        return false;
    }

    // Verificar conexión cada 30 segundos
    setInterval(async () => {
        const conectado = await verificarConexion();
        if (!conectado) {
            const exito = await reconectar();
            if (!exito) {
                console.log('🛑 No se pudo reconectar, deteniendo bot...');
                await gracefulShutdown('RECONNECT_FAILED');
            }
        }
    }, 30000);

    // Actualizar actividad cuando hay mensajes
    await page.exposeFunction("updateActividad", () => {
        ultimaActividad = Date.now();
    });

    // ── Debug solo en desarrollo ──────────────────────────────────────────

    if (process.env.NODE_ENV === 'development') {
        global.debugIMVU = async () => {
            const info = await page.evaluate(() => ({
                url: window.location.href,
                title: document.title,
                inputs: [...document.querySelectorAll('input')].map(i => ({
                    name: i.name, type: i.type, placeholder: i.placeholder, visible: i.offsetHeight > 0
                })),
                buttons: [...document.querySelectorAll('button')].map(b => ({
                    text: b.innerText, disabled: b.disabled, visible: b.offsetHeight > 0
                }))
            }));
            console.log(JSON.stringify(info, null, 2));
        };
    }

    // ── Cierre graceful con mensaje de despedida ───────────────────────────

    let shuttingDown = false;
    async function gracefulShutdown(signal) {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log(`\n🛑 Recibida señal ${signal}, enviando mensaje de despedida...`);
        try {
            await enviar(`👋 ${BOT_NAME} se despide. ¡Hasta luego!`);
            await sleep(2000);
        } catch (e) {
            console.log('Error enviando despedida:', e.message);
        }
        console.log('🔒 Cerrando navegador...');
        try { await browser.close(); } catch(e){}
        process.exit(0);
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
})();
