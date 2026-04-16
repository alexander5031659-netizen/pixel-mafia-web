# 📻 Cómo Usar el Bot de Radio en IMVU

## 🚀 Inicio Rápido

### 1. Iniciar el Servidor de Radio

**Opción A - Panel Completo (Recomendado):**
```bash
cd "c:\Users\User\Desktop\IMVU\Bot"
node panel-completo.js
```

**Opción B - Solo Servidor de Radio:**
```bash
cd "c:\Users\User\Desktop\IMVU\Bot\bots\music"
node servidor.js
```

### 2. Abrir el Panel
El panel se abrirá automáticamente en: `http://localhost:8080`

---

## 🎵 Configurar el Bot para una Sala

### Paso 1: Crear el Bot en el Panel
1. Abre el panel web
2. En **"ID Bot"** pon un nombre único (ej: `dj-sala-123`)
3. En **"Nombre"** pon el nombre que verán en el chat (ej: `DJ Pixel`)
4. En **"Salas IMVU"** agrega la URL de tu sala:
   - Ejemplo: `https://go.imvu.com/chat/room-381685932-64`
5. (Opcional) Pon tus credenciales de IMVU
6. Click en **"🚀 Iniciar Bot"**

### Paso 2: Copiar la URL de Radio
Cuando el bot entre a la sala, verás en los logs:
```
╔══════════════════════════════════════════════════════════╗
║  📻 URL DE RADIO PARA IMVU                               ║
║  http://localhost:8080/stream/sala-381685932             ║
║                                                          ║
║  💡 Copia esta URL y pégsala en:                         ║
║     Configuración de Sala → Room Music → Audio URL      ║
╚══════════════════════════════════════════════════════════╝
```

**El bot también enviará el mensaje al chat de IMVU:**
```
🎵 DJ Pixel activo y listo
📻 URL de radio: http://localhost:8080/stream/sala-381685932
💡 Cópiala en: Configuración de Sala → Room Music
```

### Paso 3: Configurar en IMVU
1. Ve a tu sala en IMVU (como administrador)
2. Abre **Configuración de la Sala** (icono de engranaje)
3. Busca la sección **"Room Music"** o **"Audio"**
4. Pega la URL de radio: `http://localhost:8080/stream/sala-381685932`
5. Guarda los cambios

---

## 🎮 Comandos del Bot

Una vez configurado, cualquier persona en la sala puede usar:

| Comando | Descripción |
|---------|-------------|
| `!play <canción>` | Agrega una canción a la cola |
| `!play <youtube-url>` | Usa URL directa de YouTube |
| `!stop` | Detiene la música |
| `!skip` | Salta a la siguiente canción |
| `!queue` | Muestra la cola actual |
| `!np` | Muestra qué está sonando |
| `!clear` | Limpia la cola |
| `!help` | Muestra ayuda |

**Ejemplos:**
```
!play bad bunny diles
!play https://youtube.com/watch?v=dQw4w9WgXcQ
!play vvs1
!skip
!queue
```

---

## 🌐 Usar Servidor Externo (Render)

Si quieres que el bot funcione 24/7 sin tener tu PC encendida:

### 1. URL del Servidor en Render
```
https://pixel-mafia-radio.onrender.com/stream/sala-381685932
```

### 2. En el Panel
- Cambia **"Servidor de Radio"** a: `https://pixel-mafia-radio.onrender.com`
- El resto del proceso es igual

### 3. Configurar en IMVU
- Pega la URL completa de Render en Room Music

---

## 🔄 Flujo de Trabajo Completo

```
1. Inicias el Panel (node panel-completo.js)
   ↓
2. Panel abre en localhost:8080
   ↓
3. Configuras sala y credenciales
   ↓
4. Click "Iniciar Bot"
   ↓
5. Bot entra a IMVU
   ↓
6. Bot muestra/envía URL de radio
   ↓
7. Copias URL y la pegas en Configuración de Sala IMVU
   ↓
8. ¡La música suena en la sala!
   ↓
9. Los usuarios usan !play para agregar canciones
```

---

## ❓ Solución de Problemas

### "No encuentro Room Music en IMVU"
- Algunas salas no tienen esta función habilitada
- Solo funciona en salas que permiten streaming de audio
- Pregunta al soporte de IMVU si tu sala lo soporta

### "El bot entró pero no veo la URL"
- Revisa los logs en el panel (parte inferior)
- Busca la línea que dice `📻 URL DE RADIO PARA IMVU`
- También revisa el chat de IMVU, el bot envió el mensaje ahí

### "La URL no funciona"
- Asegúrate de que el servidor de radio esté corriendo
- Prueba la URL en tu navegador: `http://localhost:8080/stream/sala-XXX`
- Debería descargar un archivo de audio (MP3 stream)

### "!play no encuentra la canción"
- El servidor usa `play-dl` para buscar en YouTube
- Prueba con nombres más específicos
- O usa URL directa de YouTube

---

## 📝 Resumen de URLs

| Servicio | URL Base | URL de Radio para Sala |
|----------|----------|----------------------|
| **Local** | `http://localhost:8080` | `http://localhost:8080/stream/sala-XXX` |
| **Render** | `https://pixel-mafia-radio.onrender.com` | `https://pixel-mafia-radio.onrender.com/stream/sala-XXX` |

---

## 🎯 Tips

- **Sala ID** se extrae automáticamente de la URL de IMVU
- Cada sala tiene su propia URL de radio única
- Puedes tener múltiples bots en múltiples salas
- El bot puede correr en headless (sin ventana de Chrome)

¡Listo! 🎵 Disfruta tu radio en IMVU
