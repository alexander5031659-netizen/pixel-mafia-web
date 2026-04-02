# Pixel Mafia - Plataforma Web

Plataforma web completa para gestión de bots de IMVU. Landing page + Dashboard + Panel Admin + API REST + MongoDB Atlas.

## 🎉 Estado Actual del Proyecto

| Componente | URL | Estado |
|------------|-----|--------|
| **Frontend (Vercel)** | https://pixel-mafia-web-k2tz.vercel.app/ | ✅ Online |
| **API (Render)** | https://pixel-mafia-api.onrender.com/ | ✅ Connected to MongoDB |
| **MongoDB Atlas** | cluster0.bh1pdnr.mongodb.net | ✅ Active |

### ✅ Funcionalidades Implementadas

- [x] Landing page con logo pixel art
- [x] Sistema de registro/login con JWT
- [x] Dashboard de cliente
- [x] Panel de administración
- [x] API REST con Express + MongoDB
- [x] Autenticación completa (usuarios + admin)
- [x] Conexión MongoDB Atlas
- [x] Despliegue automático (GitHub → Vercel/Render)

### � En Progreso / Pendiente

- [ ] Integración PayPal para pagos
- [ ] Conexión con bots reales (music/mod/ia)
- [ ] Sistema de tokens funcional
- [ ] Notificaciones email

## �📁 Estructura de Archivos

```
web/
├── index.html          # Landing page (marketing)
├── login.html          # Login de usuarios
├── register.html       # Registro de usuarios  
├── dashboard.html      # Dashboard del cliente
├── admin.html          # Panel de administrador
├── style.css           # Estilos landing page
├── auth.css            # Estilos login/register
├── dashboard.css       # Estilos dashboard
├── admin.css           # Estilos panel admin
├── app.js              # JavaScript landing
├── auth.js             # JavaScript autenticación
├── dashboard.js        # JavaScript dashboard cliente
├── admin.js            # JavaScript panel admin
├── config.js           # Configuración API
└── vercel.json         # Configuración Vercel
```

## 🚀 URLs de Producción (Activas)

- **Web:** https://pixel-mafia-web-k2tz.vercel.app/
- **API:** https://pixel-mafia-api.onrender.com/
- **API Health Check:** https://pixel-mafia-api.onrender.com/api/health

## 🔑 Credenciales de Prueba

### Usuario Administrador
- **Email:** `admin@pixelmafia.com`
- **Password:** `admin123`
- **Acceso:** Panel admin completo

### Usuario Normal (Registrarse en /register.html)
- Cualquier email/password válido
- Acceso: Dashboard cliente

### Opción 1: Vercel CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Ir a carpeta web
cd web

# Desplegar
vercel
```

### Opción 2: GitHub + Vercel (Recomendado)

1. Sube `web/` a un repositorio de GitHub
2. Ve a https://vercel.com
3. "Add New Project"
4. Importa tu repositorio
5. Configuración:
   - Framework Preset: **Other**
   - Build Command: (dejar vacío)
   - Output Directory: (dejar vacío)
6. Deploy automático en cada push a `main`

## 📦 Configuración

Crear `vercel.json` en carpeta `web/`:

```json
{
  "version": 2,
  "name": "pixel-mafia-web",
  "builds": [
    { "src": "*.html", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "/$1" }
  ]
}
```

## � Conectar con Backend (API)

### 1. Configurar URL de API

Editar `web/config.js`:

```javascript
const API_URL = 'https://pixel-mafia-api.onrender.com'; // Production API ✅
// const API_URL = 'http://localhost:3003'; // Desarrollo local
```

### 2. Endpoints disponibles

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login de usuario |
| `/api/auth/register` | POST | Registro de usuario |
| `/api/auth/me` | GET | Obtener usuario actual |
| `/api/bots/my-bots` | GET | Bots del usuario |
| `/api/bots/create` | POST | Crear nuevo bot |
| `/api/payments/create` | POST | Crear pago |
| `/api/payments/my-payments` | GET | Pagos del usuario |

### 3. Flujo de despliegue

```
1. Backend API (Render)
   └── Desplegar api/ a Render.com
   └── Configurar MONGODB_URI
   └── Obtener URL: https://pixel-api.onrender.com

2. Frontend Web (Vercel)
   └── Actualizar config.js con URL de API
   └── Desplegar web/ a Vercel
   └── Obtener URL: https://pixel-mafia.vercel.app

3. Probar conexión
   └── Registrar usuario en web
   └── Verificar en MongoDB Atlas
   └── Crear bot y verificar funcionamiento
```

## 🎨 Personalización

### Cambiar colores principales

Editar `style.css`:

```css
:root {
    --primary: #6366f1;      /* Cambiar este color */
    --secondary: #ec4899;    /* Cambiar este color */
    --dark: #0f172a;         /* Fondo oscuro */
}
```

### Cambiar precios de tokens

Editar `index.html` y `dashboard.html`:

```html
<!-- Starter -->
<div class="pricing-amount">30 tokens</div>
<div class="pricing-price">$10 USD</div>

<!-- Pro (popular) -->
<div class="pricing-amount">100 tokens</div>
<div class="pricing-price">$25 USD</div>

<!-- Elite -->
<div class="pricing-amount">365 tokens</div>
<div class="pricing-price">$80 USD</div>
```

### Cambiar precios de bots

Editar sección "Nuestros Bots" en `index.html`:

```html
<div class="bot-price">
    <span class="price-ga">$15/mes GA</span>
    <span class="price-ap">$25/mes AP</span>
</div>
```

## 🆘 Troubleshooting

### Error: "Cannot connect to API"
Verificar que:
1. Backend está corriendo en Render
2. URL en `config.js` es correcta
3. CORS está habilitado en backend

### Error: "MongoDB connection failed"
Verificar en Atlas:
1. IP whitelist incluye `0.0.0.0/0`
2. Usuario y password son correctos
3. Connection string está completa

### Error: "401 Unauthorized"
Verificar:
1. Token JWT no expiró
2. Header `Authorization: Bearer TOKEN` está presente
3. JWT_SECRET coincide en backend y frontend

## 📱 Responsive Testing

La web es responsive. Probar en:
- Desktop (1920x1080)
- Laptop (1366x768)
- Tablet iPad (768x1024)
- iPhone 14 (390x844)

Chrome DevTools → Toggle Device Toolbar

## 📝 Notas Importantes

- **Demo local:** Usa localStorage (datos se borran al limpiar navegador)
- **Producción:** Requiere backend con MongoDB
- **PayPal:** Sandbox para pruebas, Live para producción real
- **Tokens:** 1 token = 1 día de bot activo

## 📞 Soporte

¿Problemas? Verificar:
1. Consola del navegador (F12 → Console)
2. Logs del backend (`render logs`)
3. Estado de MongoDB Atlas

---

**Pixel Mafia** - Bots profesionales para IMVU
