// iniciar_cloudflare.js - Script para iniciar el bot con Cloudflare Tunnel
const { spawnSync } = require('child_process');

console.log("🔍 Verificando dependencias...\n");

// Verificar cloudflared
const cloudflared = spawnSync('cloudflared', ['--version'], { encoding: 'utf8' });
if(cloudflared.error || cloudflared.status !== 0){
    console.log("❌ cloudflared no está instalado o no está en el PATH");
    console.log("\n📥 Para instalar cloudflared:");
    console.log("   1. Descarga desde: https://github.com/cloudflare/cloudflared/releases");
    console.log("   2. O usa winget: winget install --id Cloudflare.cloudflared");
    console.log("   3. Cierra y abre una nueva terminal después de instalar");
    console.log("\n⚠️ IMPORTANTE: Debes cerrar esta terminal y abrir una nueva para que cloudflared funcione\n");
    process.exit(1);
}

console.log("✅ cloudflared instalado:", cloudflared.stdout.trim());

// Verificar yt-dlp
const ytdlp = spawnSync('python', ['-m', 'yt_dlp', '--version'], { encoding: 'utf8' });
if(ytdlp.error || ytdlp.status !== 0){
    console.log("❌ yt-dlp no está instalado");
    console.log("   Instala con: pip install yt-dlp");
    process.exit(1);
}

console.log("✅ yt-dlp instalado:", ytdlp.stdout.trim());

// Verificar ffmpeg
const ffmpeg = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
if(ffmpeg.error || ffmpeg.status !== 0){
    console.log("❌ ffmpeg no está instalado o no está en el PATH");
    console.log("   Instala con: winget install ffmpeg");
    console.log("   Luego cierra y abre una nueva terminal");
    process.exit(1);
}

console.log("✅ ffmpeg instalado");

console.log("\n✨ Todas las dependencias están listas!");
console.log("🚀 Iniciando bot multi-sala con Cloudflare Tunnel...\n");

// Iniciar el bot manager
require('./bot_manager.js');
