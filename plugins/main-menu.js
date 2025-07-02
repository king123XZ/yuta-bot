import { xpRange } from '../lib/levelling.js';
import { promises as fs } from 'fs';
import path from 'path';

const AUDIO_PATH = path.resolve('./audiosYuta/audio-menuYuTa.mp3');
const VIDEO_URL = 'https://cdn.russellxz.click/f630e442.mp4';

// Formato de reloj\nconst clockString = ms => {
  const pad = v => v.toString().padStart(2, '0');
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map(pad).join(':');
};

// División temática de Yuta / Jujutsu Kaisen
const sectionDivider = '༒✧༒✧༒✧༒✧༒✧༒';

// Encabezado con estilo Yuta Okkotsu
const menuHeaderTemplate = `
┏━『 🗡️ 𝚈𝚄𝚃𝙰 𝙾𝙺𝙺𝙾𝚃𝚂𝚄 🗡️ 』━┓
┃ 💠 Nombre: %name
┃ 💠 Nivel: %level | 𝑿𝑷: %exp/%max
┃ 💠 Límite: %limit | Modo: %mode
┃ 💠 Uptime: %uptime
┃ 💠 Usuarios: %total
┗━━━━━━━━━━━━━━━━━━━━━━━┛`.trim();

// Pie temático con Rika y energía maldita
const menuFooter = `
┏━『 ✦ RIKA YUTA ✦ 』━┓
┃ Invoca a Rika cuando lo necesites. 🌀
┗━━━━━━━━━━━━━━━━━┛`.trim();

const emojis = {
  anime: '🌸', info: 'ℹ️', search: '🔎', diversión: '🎉',
  subbots: '🤖', rpg: '🌀', registro: '📝', sticker: '🎨',
  imagen: '🖼️', logo: '🖌️', configuración: '⚙️', premium: '💎',
  descargas: '📥', herramientas: '🛠️', nsfw: '🔞',
  'base de datos': '📀', audios: '🔊', 'free fire': '🔥', otros: '🪪'
};

const orderedTags = [
  'anime', 'info', 'search', 'diversión', 'subbots', 'rpg',
  'registro', 'sticker', 'imagen', 'logo', 'configuración',
  'premium', 'descargas', 'herramientas', 'nsfw', 'base de datos',
  'audios', 'free fire', 'otros'
];

/** Genera el encabezado temático */
const generateHeader = ({ name, level, exp, maxExp, limit, mode, uptime, totalUsers }) =>
  menuHeaderTemplate
    .replace('%name', name)
    .replace('%level', level)
    .replace('%exp', exp)
    .replace('%max', maxExp)
    .replace('%limit', limit)
    .replace('%mode', mode)
    .replace('%uptime', uptime)
    .replace('%total', totalUsers);

/** Genera el cuerpo con categorías y comandos */
const generateMenuBody = (plugins, prefix) => {
  const categories = {};
  Object.values(plugins)
    .filter(p => p.help && !p.disabled)
    .forEach(p => {
      const tags = Array.isArray(p.tags) ? p.tags : [typeof p.tags === 'string' ? p.tags : 'otros'];
      const tag = tags[0];
      const helps = Array.isArray(p.help) ? p.help : [p.help];
      categories[tag] = categories[tag] || new Set();
      helps.forEach(h => categories[tag].add(h));
    });

  return orderedTags
    .filter(tag => categories[tag])
    .map(tag => {
      const emoji = emojis[tag] || '✦';
      const cmds = [...categories[tag]]
        .map(cmd => `┃ ✧ _${prefix}${cmd}_`)
        .join('\n');
      return `┏━『 ${emoji} ${tag.toUpperCase()} 』━┓\n${cmds}\n${sectionDivider}`;
    })
    .join('\n\n');
};

export default async function menuHandler(m, { conn, usedPrefix: prefix }) {
  try {
    const userData = global.db?.data?.users?.[m.sender] || { level: 1, exp: 0, limit: 5 };
    const { level, exp, limit } = userData;
    const { min, xp: maxExp } = xpRange(level, global.multiplier || 1);
    const totalUsers = Object.keys(global.db?.data?.users || {}).length;
    const mode = global.opts?.self ? 'Privado 🔒' : 'Público 🌐';
    const uptime = clockString(process.uptime() * 1000);

    // Obtener nombre con manejo de errores
    let name = 'Usuario';
    try {
      name = await conn.getName(m.sender);
    } catch (e) {}

    const header = generateHeader({
      name,
      level,
      exp: exp - min,
      maxExp,
      limit,
      mode,
      uptime,
      totalUsers
    });

    const body = generateMenuBody(global.plugins, prefix);
    const menuText = `╭─────────────⟢\n${header}\n\n${body}\n\n${menuFooter}\n╰─────────────⟢`;

    // Enviar audio si existe
    fs.readFile(AUDIO_PATH)
      .then(buffer => conn.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/mpeg', ptt: true }, { quoted: m }))
      .catch(() => console.warn('Audio no disponible'));

    // Enviar menú en video GIF
    await conn.sendMessage(m.chat, {
      video: { url: VIDEO_URL },
      caption: menuText,
      gifPlayback: true,
      mentions: [m.sender]
    }, { quoted: m });

  } catch (err) {
    console.error('Error en menuHandler:', err);
    await conn.reply(m.chat, '⚠️ Ocurrió un error al generar el menú.', m);
  }
}

menuHandler.command = ['menu', 'help', 'menú'];
menuHandler.help = ['menu', 'help'];
menuHandler.tags = ['main'];
