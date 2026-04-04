# 🎵 Pixel Mafia Music

Plataforma profesional de bots de música para salas de IMVU. Servicio 24/7 en la nube con panel de control web.

## 🚀 Estructura del Proyecto

```text
├── web/                   # Página web pública (Landing, Login, Dashboard)
│   ├── index.html         # Landing page
│   ├── login.html         # Página de login
│   ├── register.html      # Página de registro
│   ├── dashboard.html     # Panel del usuario
│   ├── style.css          # Estilos de la web
│   └── ...
├── panel/                 # Panel de administración (Electron)
│   ├── main.js            # Proceso principal Electron
│   ├── server.js          # API del panel
│   ├── index.html         # Interfaz del panel
│   └── ...
├── bots/                  # Bots por tipo
│   ├── music/             # Bot de Música
│   ├── mod/               # Bot de Moderación
│   └── ia/                # Bot de IA
├── gestor.js              # Gestor de instancias multi-bot
├── servidor.js            # Servidor de streaming de radio
├── musica.js              # API de música
├── ia.js                  # Integración con IA
├── keep_alive.js          # Mantiene Render activo
├── package.json           # Dependencias del proyecto
└── .env                   # Variables de entorno (NO SUBIR A GIT)
```

## 📦 Instalación

### Requisitos
- Node.js 18+
- Python 3.8+ (para yt-dlp)
- ffmpeg
- Google Chrome instalado

### Pasos
```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/pixel-mafia.git
cd pixel-mafia

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
# Crea un archivo .env con:
# IMVU_USERNAME=tu_usuario
# IMVU_PASSWORD=tu_contraseña
# GROQ_API_KEY=tu_key
# RADIO_URL=https://tu-servidor.onrender.com

# 4. Abrir el Panel de Control
# Doble click en "Ejecutar Panel.vbs"
```

## 🎵 Comandos del Bot

| Comando | Descripción |
|---------|-------------|
| `!play <canción>` | Busca y reproduce (nombre o URL de YouTube) |
| `!stop` | Detiene la radio |
| `!skip` | Salta la canción actual |
| `!queue` | Ver cola de reproducción |
| `!np` | Canción actual |
| `!help` | Ver todos los comandos |

## 🌐 Panel de Control

El panel permite:
- Crear y gestionar instancias de bots
- Iniciar/detener bots individuales
- Ver logs en tiempo real
- Configurar credenciales y servidor de radio

## 📡 Servidor de Radio

Deploy en Render (gratis):
1. Conecta tu repo a [render.com](https://render.com)
2. Build: `pip install yt-dlp && npm install`
3. Start: `node servidor.js`

## ⚠️ Notas de Seguridad

- **Nunca subas el archivo `.env`** a GitHub.
- Las sesiones de Chrome se guardan en `instances/` (ignoradas por git).
- Cada bot tiene su propia sesión aislada para evitar conflictos.

## 📄 Licencia

Proyecto personal para uso en IMVU. Todos los derechos reservados.

---

**Pixel Mafia Music** - Música 24/7 para tu sala de IMVU 🎮
