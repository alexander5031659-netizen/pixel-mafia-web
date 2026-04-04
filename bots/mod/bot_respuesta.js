const OWNER = "Ʀαιπ";
const usuariosSaludados = new Set();
const warns = new Map();

async function saludarUsuario(nombre, enviar) {
    if (!nombre || nombre.toLowerCase().includes("bot mod")) return;
    if (usuariosSaludados.has(nombre)) return;
    usuariosSaludados.add(nombre);
    setTimeout(() => usuariosSaludados.delete(nombre), 5 * 60 * 1000);

    if (nombre === OWNER) return enviar("👑 Hola jefe, moderación activa");
    await enviar(`👋 Hola ${nombre}, respeta las reglas de la sala`);
}

async function manejarComando(msg, nombre, enviar, contexto = {}) {
    msg = msg.trim();
    if (!msg) return;
    const n = nombre || "tu";
    const esDueno = nombre === OWNER;
    const esAdmin = esDueno || (contexto.mods && contexto.mods.includes(nombre));

    if (msg === "!hola") {
        if (esDueno) return enviar("👋 Hola jefe, moderación lista");
        return enviar(`👋 Hola ${n}, porta bien aquí`);
    }

    if (msg === "!help" || msg === "!ayuda") {
        return enviar("🛡️ COMANDOS: !rules | !warn @usuario | !mute @usuario | !kick @usuario | !hora | !fecha | !bot");
    }

    if (msg === "!hora") {
        const hora = new Date().toLocaleTimeString("es-CO", { timeZone: "America/Bogota" });
        return enviar(`🕐 ${hora}`);
    }

    if (msg === "!fecha") {
        const fecha = new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota", weekday: "long", year: "numeric", month: "long", day: "numeric" });
        return enviar(`📅 ${fecha}`);
    }

    if (msg === "!bot") {
        return enviar("✅ Bot Mod v1.0 activo");
    }

    if (msg === "!rules") {
        return enviar("📋 REGLAS: 1. Respeta a todos 2. No spam 3. No links sospechosos 4. Disfruta la sala");
    }

    if (msg.startsWith("!warn ") && esAdmin) {
        const target = msg.slice(6).trim().replace('@', '');
        if (!target) return enviar("Uso: !warn @usuario");
        const count = (warns.get(target) || 0) + 1;
        warns.set(target, count);
        if (count >= 3) {
            await enviar(`⚠️ ${target} tiene ${count} warns - ¡Cuidado!`);
        } else {
            await enviar(`⚠️ ${target} advertencia ${count}/3`);
        }
        return;
    }

    if (msg.startsWith("!mute ") && esAdmin) {
        const target = msg.slice(6).trim().replace('@', '');
        if (!target) return enviar("Uso: !mute @usuario");
        await enviar(`🔇 ${target} ha sido silenciado`);
        if (contexto.mute) contexto.mute(target);
        return;
    }

    if (msg.startsWith("!kick ") && esAdmin) {
        const target = msg.slice(6).trim().replace('@', '');
        if (!target) return enviar("Uso: !kick @usuario");
        await enviar(`👢 ${target} ha sido expulsado de la sala`);
        if (contexto.kick) contexto.kick(target);
        return;
    }

    if (msg === "!warns" && esAdmin) {
        if (warns.size === 0) return enviar("✅ Sin warns");
        let lista = "⚠️ Warns:";
        for (const [user, count] of warns.entries()) {
            lista += ` ${user}(${count}/3)`;
        }
        return enviar(lista);
    }

    if (msg === "!clearwarns" && esAdmin) {
        warns.clear();
        return enviar("✅ Warns limpiados");
    }
}

module.exports = { saludarUsuario, manejarComando };
