const https = require('https');

const URL = 'https://pixel-mafia-radio.onrender.com/salas';
const INTERVAL = 3 * 60 * 1000; // cada 3 minutos

function ping(){
    https.get(URL, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            const status = res.statusCode;
            const time = new Date().toLocaleTimeString();
            if(status === 200){
                console.log(`[${time}] ✅ OK (${res.responseTime || '?'}ms)`);
            } else {
                console.log(`[${time}] ⚠️ Status: ${status}`);
            }
        });
    }).on('error', (e) => {
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] ❌ Error: ${e.message}`);
    });
}

console.log('🔄 Keep-alive Pixel Mafia Radio');
console.log(`📡 Ping cada 3 minutos a: ${URL}\n`);

ping();
setInterval(ping, INTERVAL);
