import { xpRange } from '../lib/levelling.js';
import { promises as fs } from 'fs';
import path from 'path';

const AUDIO_PATH = path.resolve('./audiosYuta/audio-menuYuTa.mp3');
const VIDEO_URL = 'https://cdn.russellxz.click/f630e442.mp4';

// Formato de uptime HH:MM:SS
const clockString = ms => {
  const pad = v => v.toString().padStart(2, '0');
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map(pad).join(':');
};

// Separador estilo Jujutsu Kaisen
const sectionDivider = '༒✧༒✧༒✧༒✧༒✧༒';

// Encabezado temático de Yuta
const menuHeaderTemplate = `
┏━『 🗡️ 𝚈𝚄𝚃𝙰 𝙾𝙺𝙺𝙾𝚃𝚂𝚄 🗡️ 』━┓
┃ 💠 Nombre: %name
┃ 💠 Nivel: %level | 𝑿𝑷: %exp/%max
┃ 💠 Límite: %limit | Modo: %mode
┃ 💠 Uptime: %uptime
┃ 💠 Usuarios: %total
┗━━━━━━━━━━━━━━━━━━━━━━━┛`.trim();

// Pie temático con Rika
const menuFooter = 'Invoca a Rika cuando lo necesites. 🌀';

const emojis = {
  anime: '🌸', info: 'ℹ️', search: '🔎', diversión: '🎉',
  subbots: '🤖', rpg: '🌀', registro: '📝', sticker: '🎨',
  imagen: '🖼️', logo: '🖌️', configuración: '⚙️', premium: '💎',
  descargas: '📥', herramientas: '🛠️', nsfw: '🔞',
  'base de datos': '📀', audios: '🔊', 'free fire': '🔥', otros: '🪪'
};
const orderedTags = ['anime','info','search','diversión','subbots','rpg','registro','sticker','imagen','logo','configuración','premium','descargas','herramientas','nsfw','base de datos','audios','free fire','otros'];

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

const generateMenuBody = (plugins, prefix) => {
  const categories = {};
  for (const plugin of Object.values(plugins)) {
    if (!plugin.help || plugin.disabled) continue;
    const tags = Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags || 'otros'];
    const tag = tags[0];
    categories[tag] = categories[tag] || new Set();
    const helps = Array.isArray(plugin.help) ? plugin.help : [plugin.help];
    helps.forEach(h => categories[tag].add(h));
  }
  return orderedTags
    .filter(tag => categories[tag])
    .map(tag => {
      const emoji = emojis[tag] || '✦';
      const cmds = [...categories[tag]].map(cmd => `┃ ✧ _${prefix}${cmd}_`).join('\n');
      return `┏━『 ${emoji} ${tag.toUpperCase()} 』━┓\n${cmds}\n${sectionDivider}`;
    })
    .join('\n\n');
};

export default async function menuHandler(m, { conn, usedPrefix: prefix }) {
  try {
    const { level = 1, exp = 0, limit = 5 } = global.db?.data?.users?.[m.sender] || {};
    const { min, xp: maxExp } = xpRange(level, global.multiplier || 1);
    const totalUsers = Object.keys(global.db?.data?.users || {}).length;
    const mode = global.opts.self ? 'Privado 🔒' : 'Público 🌐';
    const uptime = clockString(process.uptime() * 1000);

    let name = 'Usuario';
    try { name = await conn.getName(m.sender); } catch {};

    const header = generateHeader({ name, level, exp: exp - min, maxExp, limit, mode, uptime, totalUsers });
    const body = generateMenuBody(global.plugins, prefix);
    const menuText = `╭─────────────⟢\n${header}\n\n${body}\n╰─────────────⟢`;

    // Enviar audio
    try {
      const buffer = await fs.readFile(AUDIO_PATH);
      await conn.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/mpeg', ptt: true }, { quoted: m });
    } catch { console.warn('Audio no disponible'); }

    // Botones interactivos
    const buttons = [
      { buttonId: `${prefix}perfil`, buttonText: { displayText: '👤 Perfil' }, type: 1 },
      { buttonId: `${prefix}estadisticas`, buttonText: { displayText: '📊 Estadísticas' }, type: 1 },
      { buttonId: `${prefix}ayuda`, buttonText: { displayText: '🔄 Actualizar' }, type: 1 }
    ];

    // Enviar menú con video y botones
    await conn.sendMessage(m.chat, {
      video: { url: VIDEO_URL },
      caption: menuText,
      footer: menuFooter,
      buttons,
      headerType: 4,
      gifPlayback: true
    }, { quoted: m });

  } catch (err) {
    console.error('Error en menuHandler:', err);
    await conn.reply(m.chat, '⚠️ Ocurrió un error al generar el menú.', m);
  }
}

menuHandler.command = ['menu','help','menú'];
menuHandler.help = ['menu','help'];
menuHandler.tags = ['main'];
