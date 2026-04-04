const puppeteer = require("puppeteer-core");
const path = require("path");
require("dotenv").config();
const { manejarComando, saludarUsuario } = require("./bot_respuesta");

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

const BOT_NAME = process.env.BOT_NAME || "Bot Music v2.0";
const BOT_ID = process.env.BOT_ID || "music-default";
const BOT_ROOM = process.env.BOT_ROOM_URL || "";
const SESSION_DIR = process.env.BOT_SESSION_DIR || path.join(__dirname, '..', '..', 'instances', BOT_ID, 'session');
const HEADLESS = process.env.HEADLESS !== 'false';
const NODE_ENV = process.env.NODE_ENV || 'production';
const IS_DEV = NODE_ENV === 'development';

// Extraer ID de sala de la URL automáticamente
function extraerSalaId(url) {
    if (!url) return null;
    // Patrones: room-123456 o /chat/room-123456-64
    const match = url.match(/room-([0-9]+)/);
    if (match) return match[1];
    // Alternativo: último segmento de URL
    const parts = url.split('/').filter(p => p);
    const last = parts[parts.length - 1];
    if (last && /^[0-9]+$/.test(last)) return last;
    return BOT_ID; // fallback
}

const SALA_ID = extraerSalaId(BOT_ROOM) || BOT_ID;

function getChromePath() {
    const os = require('os');
    if (os.platform() === 'win32') return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    if (os.platform() === 'linux') return "/usr/bin/google-chrome";
    if (os.platform() === 'darwin') return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    return "chrome";
}

if (!BOT_ROOM) {
    console.error("❌ ERROR: BOT_ROOM_URL no está definida");
    process.exit(1);
}

console.log(`🎵 ${BOT_NAME} [${BOT_ID}] iniciando...`);
console.log(`🔗 Sala URL: ${BOT_ROOM}`);
console.log(`🏠 Sala ID: ${SALA_ID}`);
console.log(`🖥️ Headless: ${HEADLESS}`);
console.log(`🔧 Modo: ${NODE_ENV}`);

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
                await sleep(5000); // Esperar más tiempo para que el formulario se abra completamente
            }
            
            // Verificar si apareció el formulario
            const formReady = await page.waitForSelector('input[type="password"]', { timeout: 5000 }).catch(() => null);
            
            if (formReady) {
                console.log('🎯 Formulario de login detectado');
                formularioAbierto = true;
                break;
            }
            
            // Si no encontramos el formulario, intentar recargar la página
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
            // Verificar si ya estamos logueados (la página cambió)
            const urlAhora = page.url();
            if (!urlAhora.includes('/login/')) {
                console.log('✅ Sesión activa detectada (redirección)');
                return true;
            }
            console.log('❌ No se detectó formulario de login');
            return false;
        }
        
        console.log('🎯 Formulario detectado. Rellenando datos...');

        if (!process.env.IMVU_USERNAME || !process.env.IMVU_PASSWORD) {
            console.log('❌ No hay credenciales configuradas');
            return false;
        }

        // Rellenar usuario con Puppeteer nativo (más confiable)
        console.log('👤 Ingresando usuario...');
        
        // Buscar input de usuario visible (name="avatarname")
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
        await userInput.type(process.env.IMVU_USERNAME, { delay: 50 });
        console.log('✅ Usuario ingresado');
        await sleep(500);

        // Rellenar contraseña con Puppeteer nativo
        console.log('🔑 Ingresando contraseña...');
        
        // Buscar input de contraseña visible (name="password")
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
        await passInput.type(process.env.IMVU_PASSWORD, { delay: 50 });
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

        // Esperar navegación o 2FA
        console.log('⏳ Esperando respuesta de IMVU (hasta 15s)...');
        await sleep(15000);
        
        // Verificar URL actual
        const urlAfterSubmit = page.url();
        console.log('📍 URL después de submit:', urlAfterSubmit);
        
        // Si ya no estamos en login, éxito
        if (!urlAfterSubmit.includes('/login/')) {
            console.log('✅ Login exitoso - URL cambió');
            await sleep(2000);
            return true;
        }
        
        // Verificar si hay mensaje de error
        const errorText = await page.evaluate(() => {
            const error = document.querySelector('.error-message, .alert-danger, [data-testid="error"]');
            return error ? error.innerText : null;
        });
        
        if (errorText) {
            console.log('❌ Error de login:', errorText);
            return false;
        }
        
        // Verificar si pide 2FA
        const es2FA = await page.evaluate(() => {
            return document.querySelector('input[name*="code"]') || 
                   document.querySelector('input[placeholder*="code"]') ||
                   document.body.innerText.toLowerCase().includes('verification') ||
                   document.body.innerText.toLowerCase().includes('código') ||
                   document.body.innerText.toLowerCase().includes('2fa');
        });

        if (es2FA) {
            console.log('⚠️ 2FA detectado. Esperando 60 segundos para que ingreses el código...');
            console.log('   Por favor ingresa el código en el navegador');
            await sleep(60000);
            
            // Verificar si el login fue exitoso después del 2FA
            const urlFinal = page.url();
            if (!urlFinal.includes('/login/')) {
                console.log('✅ Login exitoso después de 2FA');
                return true;
            }
            console.log('❌ Login falló después de esperar 2FA');
            return false;
        }

        // Verificar si el login fue exitoso (sin 2FA)
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
    console.log('🚀 Verificando acceso a la sala...');
    await page.goto(roomUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(5000);
    
    const url = page.url();
    if (url.includes('login') || url.includes('signin') || url.includes('accessdenied')) {
        console.log('🔑 Sesión no encontrada, iniciando login automático...');
        const loginOk = await hacerLogin(page);
        if (loginOk) {
            console.log('🔄 Volviendo a la sala tras login...');
            await page.goto(roomUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await sleep(10000);
        } else { console.log('❌ Falló el login automático'); return false; }
    }
    
    const finalUrl = page.url();
    if (finalUrl.includes('chat/room') || finalUrl.includes('room-')) {
        console.log('⏳ Buscando botón para entrar a la sala (UNIRSE)...');
        
        // Intentar hacer clic en botón UNIRSE/JOIN
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
            return false;
        });
        
        if (botonEntrarChat) {
            console.log('✅ Botón "UNIRSE" clickeado. Entrando al chat...');
            await sleep(5000);
        } else {
            console.log('ℹ️ No se encontró botón UNIRSE, posiblemente ya dentro');
        }
        
        // Verificar que el input del chat esté disponible (con reintentos)
        console.log('⏳ Verificando carga del chat...');
        
        // Hacer clic en el área del chat para activarlo (headless workaround)
        await page.mouse.click(960, 700);
        await sleep(2000);
        
        let chatListo = false;
        for (let intento = 1; intento <= 5; intento++) {
            chatListo = await page.evaluate(() => {
                const selectors = ['textarea', 'textarea.input-text', 'input[placeholder*="mensaje"]', 'input[placeholder*="say"]', 'input[placeholder*="Di algo"]', 'input[placeholder*="chat"]'];
                for (const sel of selectors) {
                    const input = document.querySelector(sel);
                    if (input && input.offsetHeight > 0) return true;
                }
                // También buscar por tipo
                const anyInput = document.querySelector('textarea, input[type="text"]');
                if (anyInput && anyInput.offsetHeight > 0) return true;
                return false;
            });
            
            if (chatListo) {
                console.log('✅ Chat detectado');
                break;
            }
            console.log(`⏳ Intento ${intento}/5 - esperando chat...`);
            await sleep(5000);
        }
        
        if (!chatListo) {
            console.log('⚠️ No se detectó el input del chat después de 5 intentos');
            return false;
        }
        
        console.log('✅ Sala cargada correctamente - Chat listo');
        
        const enviar = async (texto) => {
            try {
                let input = await page.$("textarea[placeholder]:not([placeholder*='emisora']):not([placeholder*='url'])");
                if (!input) input = await page.$("input[type='text'][placeholder]");
                if (input) {
                    await input.click({ clickCount: 3 });
                    await input.type(texto, { delay: 2 });
                    await input.press("Enter");
                    console.log(">>", texto);
                }
            } catch (e) {}
        };
        await enviar(`🎵 ${BOT_NAME} activo y listo`);
        return true;
    } else {
        console.log('⚠️ No se detectó la sala. URL actual:', finalUrl);
        return false;
    }
}

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
    
    // 🔐 PASO 1: Login primero
    console.log('\n🔐 Iniciando flujo de Login Directo...');
    await page.goto('https://www.imvu.com/next/login/', { waitUntil: 'networkidle2' });
    
    const logueado = await hacerLogin(page);
    if (!logueado) {
        console.log('❌ Error: El login falló');
        console.log('🛑 Deteniendo el bot');
        await browser.close();
        process.exit(1);
    }
    console.log('✅ Sesión confirmada');
    
    // 🌐 PASO 2: Navegar a la sala ya logueado
    console.log(`\n🌐 Navegando a la sala: ${BOT_ROOM}`);
    const entro = await verificarYEntrarSala(page, BOT_ROOM);
    if (!entro) {
        console.log('⚠️ El bot continuará aunque no se detectó la sala correctamente');
    }

    const mensajesBot = new Set();

    async function enviar(texto) {
        try {
            await sleep(300);
            let input = await page.$("textarea[placeholder]:not([placeholder*='emisora']):not([placeholder*='url'])");
            if (!input) input = await page.$("input[type='text'][placeholder]:not([placeholder*='emisora']):not([placeholder*='url'])");
            if (!input) input = await page.$("textarea");
            if (!input) input = await page.$("input[type='text']");
            if (!input) return;
            await input.click({ clickCount: 3 });
            await input.press("Backspace");
            await input.type(String(texto), { delay: 2 });
            await input.press("Enter");
            mensajesBot.add(texto.toLowerCase().slice(0, 60));
            console.log(">>", texto);
        } catch (e) { console.log("Error enviar:", e.message); }
    }

    const cola = [];
    let trabajando = false;
    function encolar(msg, nombre) { 
        console.log(`📥 Encolando: ${nombre}: ${msg}`);
        cola.push({ msg, nombre }); 
        console.log(`📊 Cola ahora tiene ${cola.length} items, trabajando=${trabajando}`);
        procesar(); 
    }
    async function procesar() {
        if (trabajando) { 
            console.log(`⏳ Ocupado, esperando...`);
            return; 
        }
        if (cola.length === 0) { 
            console.log(`📭 Cola vacía`);
            return; 
        }
        trabajando = true;
        const { msg, nombre } = cola.shift();
        console.log(`⚡ Ejecutando: ${nombre} ${msg}`);
        try { 
            await manejarComando(msg, nombre, enviar, { salaId: SALA_ID }); 
            console.log(`✅ Comando ejecutado: ${msg}`);
        }
        catch (e) { 
            console.log(`❌ Error en manejarComando:`, e.message);
            console.log(e.stack);
        }
        finally { 
            trabajando = false; 
            console.log(`🔄 Procesando siguiente...`);
            setTimeout(procesar, 2000); 
        }
    }

    await page.exposeFunction("onMsg", ({ nombre, texto }) => {
        if (!texto) return;
        window.updateActividad && window.updateActividad(); // Marcar actividad
        const low = texto.toLowerCase();
        const botNameLower = BOT_NAME.toLowerCase();
        if (!texto.startsWith("!")) {
            if (mensajesBot.has(low.slice(0, 60))) return;
            if (low.includes(botNameLower) || low.includes("bienvenido")) return;
        }
        const lineas = texto.split("\n");
        for (const linea of lineas) {
            const t = linea.trim();
            if (t.startsWith("!")) { console.log(`Detectado: ${nombre} ${t}`); encolar(t, nombre); }
        }
    });

    await page.exposeFunction("onJoin", async (nombre) => { await saludarUsuario(nombre, enviar); });

    // Sistema mejorado de detección de mensajes
    await page.evaluate((botNameLower) => {
        const cache = new Map();
        const MAX_CACHE = 100;
        
        // Función para procesar mensajes
        function procesarMensaje(nombre, mensaje) {
            if (!mensaje || !nombre) return;
            
            // Ignorar mensajes del propio bot
            if (nombre.toLowerCase().includes(botNameLower)) return;
            if (nombre.toLowerCase().includes('bot')) return;
            
            // Crear ID único del mensaje
            const msgId = Date.now() + ':' + nombre + ':' + mensaje.slice(0, 50);
            if (cache.has(msgId)) return;
            
            // Agregar al cache
            cache.set(msgId, true);
            if (cache.size > MAX_CACHE) {
                const firstKey = cache.keys().next().value;
                cache.delete(firstKey);
            }
            
            // Verificar si es comando
            const texto = mensaje.trim();
            if (texto.startsWith('!')) {
                console.log(`🎵 COMANDO: ${nombre}: ${texto}`);
                if (window.onMsg) window.onMsg({ nombre, texto });
            }
        }
        
        // Observer para nuevos mensajes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType !== 1) return; // Solo elementos HTML
                    
                    // Estrategia 1: Buscar elementos con data-testid o atributos de mensaje
                    const mensajeElements = node.querySelectorAll ? 
                        node.querySelectorAll('[data-testid*="message"], .chat-message, .message-item, .imvu-message, [class*="message"], [class*="chat"]') : [];
                    
                    mensajeElements.forEach((el) => {
                        const texto = el.innerText || el.textContent || '';
                        if (!texto.trim()) return;
                        
                        // Extraer nombre y mensaje
                        const lineas = texto.split('\n').map(l => l.trim()).filter(l => l);
                        if (lineas.length >= 2) {
                            const nombre = lineas[0];
                            const mensaje = lineas.slice(1).join(' ');
                            procesarMensaje(nombre, mensaje);
                        }
                    });
                    
                    // Estrategia 2: Revisar el texto completo del nodo agregado
                    const textoCompleto = node.innerText || node.textContent || '';
                    if (textoCompleto && textoCompleto.includes('!')) {
                        const lineas = textoCompleto.split('\n').map(l => l.trim()).filter(l => l);
                        if (lineas.length >= 2) {
                            const nombre = lineas[0];
                            const mensaje = lineas.slice(1).join(' ');
                            if (mensaje.startsWith('!')) {
                                procesarMensaje(nombre, mensaje);
                            }
                        }
                    }
                });
            });
        });
        
        // Iniciar observer
        observer.observe(document.body, { 
            childList: true, 
            subtree: true,
            characterData: true 
        });
        
        console.log('✅ Sistema de detección de comandos iniciado');
    }, BOT_NAME.toLowerCase());

    console.log(`\n✅ ${BOT_NAME} listo y escuchando comandos`);
    
    // Sistema de polling activo para detectar mensajes (respaldo del MutationObserver)
    let ultimosMensajes = new Set();
    let ultimoMensajeBot = ''; // Para evitar procesar mensajes del propio bot
    
    setInterval(async () => {
        try {
            const mensajesNuevos = await page.evaluate((botNameLower) => {
                const mensajes = [];
                const ahora = Date.now();
                
                // Buscar elementos de mensaje específicos de IMVU Next
                const selectores = [
                    // Selectores específicos de IMVU Next Chat
                    '[data-testid="chat-message"]',
                    '[class*="ChatMessage"]',
                    '[class*="chat-message"]',
                    '[class*="MessageBubble"]',
                    '[class*="message-bubble"]',
                    // Fallbacks
                    '[class*="Conversation"] [class*="message"]',
                    'div[class*="chat"] div[class*="message"]'
                ];
                
                for (const selector of selectores) {
                    const elementos = document.querySelectorAll(selector);
                    elementos.forEach(el => {
                        // Ignorar elementos del propio bot
                        const textoEl = el.innerText || el.textContent || '';
                        if (textoEl.toLowerCase().includes(botNameLower)) return;
                        if (textoEl.includes('🎵') && textoEl.includes('activo')) return;
                        
                        // Buscar estructura: nombre + mensaje
                        // En IMVU Next, usualmente hay spans o divs separados
                        const spans = el.querySelectorAll('span, div');
                        let nombre = '';
                        let mensaje = '';
                        
                        // Estrategia 1: Buscar spans con data-testid o class específico
                        for (const span of spans) {
                            const spanText = span.innerText || span.textContent || '';
                            const spanClass = span.className || '';
                            
                            // Si el span tiene clase de nombre/autor
                            if (spanClass.toLowerCase().includes('name') || 
                                spanClass.toLowerCase().includes('author') ||
                                spanClass.toLowerCase().includes('user')) {
                                nombre = spanText.trim();
                            }
                            // Si el span tiene clase de mensaje/contenido
                            else if (spanClass.toLowerCase().includes('content') || 
                                     spanClass.toLowerCase().includes('text') ||
                                     spanClass.toLowerCase().includes('message')) {
                                mensaje = spanText.trim();
                            }
                        }
                        
                        // Estrategia 2: Si no encontramos con clases, usar líneas
                        if (!nombre || !mensaje) {
                            const lineas = textoEl.split('\n').map(l => l.trim()).filter(l => l);
                            if (lineas.length >= 2) {
                                // La primera línea corta es usualmente el nombre
                                if (lineas[0].length < 50 && !lineas[0].includes('!')) {
                                    nombre = lineas[0];
                                    mensaje = lineas.slice(1).join(' ');
                                }
                            }
                        }
                        
                        // Solo agregar si es comando válido y tiene nombre
                        if (nombre && mensaje && mensaje.trim().startsWith('!') && mensaje.length < 200) {
                            // Limpiar nombre
                            nombre = nombre.replace(/[🎵✅🔍❌⚡📥📊⏳]/g, '').trim();
                            // Limpiar mensaje
                            mensaje = mensaje.replace(/[🎵✅🔍❌⚡📥📊⏳]/g, '').trim();
                            
                            // Ignorar si parece ser del bot
                            if (nombre.toLowerCase().includes(botNameLower)) return;
                            if (mensaje.includes('activo y listo')) return;
                            
                            mensajes.push({
                                nombre: nombre,
                                texto: mensaje,
                                timestamp: ahora,
                                raw: textoEl.slice(0, 80)
                            });
                        }
                    });
                }
                return mensajes;
            }, BOT_NAME.toLowerCase());
            
            // Procesar mensajes encontrados
            for (const msg of mensajesNuevos) {
                // Crear ID único incluyendo timestamp
                const msgId = msg.nombre + ':' + msg.texto;
                
                if (!ultimosMensajes.has(msgId)) {
                    ultimosMensajes.add(msgId);
                    // Limpiar cache si es muy grande
                    if (ultimosMensajes.size > 100) {
                        const entries = Array.from(ultimosMensajes);
                        ultimosMensajes = new Set(entries.slice(-50));
                    }
                    
                    console.log(`🎵 [POLLING] COMANDO: ${msg.nombre}: ${msg.texto}`);
                    try {
                        encolar(msg.texto.trim(), msg.nombre);
                        console.log(`✅ [POLLING] Encolado: ${msg.texto.trim()}`);
                    } catch (err) {
                        console.log(`❌ [POLLING] Error encolando: ${err.message}`);
                    }
                }
            }
        } catch (e) {
            // Silenciar errores de polling
        }
    }, 1500); // Verificar cada 1.5 segundos (un poco más lento para evitar duplicados)
    
    console.log('🔄 Sistema de polling activo iniciado (1.5s)');
    
    // Sistema de reconexión automática
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
            
            // Si no estamos en la sala o no hay chat, reconectar
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
                // Intentar volver a la sala
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
    
    // Manejar señal de apagado gracefully - enviar mensaje de despedida
    let shuttingDown = false;
    async function gracefulShutdown(signal) {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log(`\n🛑 Recibida señal ${signal}, enviando mensaje de despedida...`);
        
        // Timeout de seguridad para forzar cierre
        const forceExit = setTimeout(() => {
            console.log('⚠️ Forzando cierre...');
            process.exit(0);
        }, 5000);
        
        try {
            await enviar(`👋 ${BOT_NAME} se despide. ¡Hasta luego!`);
            await sleep(2000);
        } catch (e) {
            console.log('⚠️ Error enviando despedida (ignorado):', e.message);
        }
        
        console.log('🔒 Cerrando navegador...');
        try { 
            await browser.close(); 
        } catch(e) {
            console.log('⚠️ Error cerrando navegador (ignorado):', e.message);
        }
        
        clearTimeout(forceExit);
        console.log('✅ Bot cerrado correctamente');
        process.exit(0);
    }
    
    // Manejar rechazos de promesas no capturados
    process.on('unhandledRejection', (reason, promise) => {
        console.log('⚠️ Unhandled Rejection (ignorado en shutdown):', reason);
    });
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
})();
