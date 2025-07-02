import { xpRange } from '../lib/levelling.js';
import path from 'path';
import fs from 'fs';

// Configuración de recursos
const AUDIO_PATH = path.resolve('./audiosYuta/audio-menuYuTa.mp3');
const IMAGE_URL = 'https://i.imgur.com/4XG8aXv.jpg'; // Imagen temática de Yuta

// Función para formatear uptime
const clockString = ms => {
  const pad = v => v.toString().padStart(2, '0');
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map(pad).join(':');
};

export default async function menuHandler(m, { conn, usedPrefix: prefix }) {
  try {
    // Obtener datos de usuario
    const { level = 1, exp = 0, limit = 5 } = global.db?.data?.users?.[m.sender] || {};
    const { min, xp: maxExp } = xpRange(level, global.multiplier || 1);
    const totalUsers = Object.keys(global.db?.data?.users || {}).length;
    const mode = global.opts.self ? 'Privado 🔒' : 'Público 🌐';
    const uptime = clockString(process.uptime() * 1000);

    let name = 'Usuario';
    try { name = await conn.getName(m.sender); } catch {}

    // Construir texto de menú
    const menuText = `*── ✦ YUTA MENU ✦ ──*

*👤 Nombre:* _${name}_
*💠 Nivel:* _${level}_
*✨ XP:* _${exp - min}/${maxExp}_
*🔖 Límite:* _${limit}_
*⌛ Uptime:* _${uptime}_
*🌐 Modo:* _${mode}_
*👥 Usuarios:* _${totalUsers}_

*Selecciona una opción:*`;

    // Botones interactivos
    const buttons = [
      { buttonId: `${prefix}commands`, buttonText: { displayText: '📚 Comandos' }, type: 1 },
      { buttonId: `${prefix}perfil`, buttonText: { displayText: '👤 Perfil' }, type: 1 },
      { buttonId: `${prefix}estadisticas`, buttonText: { displayText: '📊 Estadísticas' }, type: 1 }
    ];

    // Template moderno con imagen y audio
    const message = {
      image: { url: IMAGE_URL },
      caption: menuText,
      footer: 'Invoca a Rika cuando lo necesites. 🌀',
      buttons,
      headerType: 4
    };

    // Enviar el mensaje con botones
    await conn.sendMessage(m.chat, message, { quoted: m });

    // Opcional: enviar audio de fondo
    if (fs.existsSync(AUDIO_PATH)) {
      const buffer = fs.readFileSync(AUDIO_PATH);
      await conn.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/mpeg', ptt: true });
    }

  } catch (error) {
    console.error('Error en menuHandler:', error);
    await conn.reply(m.chat, '⚠️ Ocurrió un error al generar el menú.', m);
  }
}

menuHandler.command = ['menu','help','menú'];
menuHandler.help = ['menu','help'];
menuHandler.tags = ['main'];
