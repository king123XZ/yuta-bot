import { xpRange } from '../lib/levelling.js';

const clockString = ms => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
};

const videoUrl = "https://cdn.russellxz.click/f630e442.mp4";

const menuHeader = `
╔═════『 𓆩⟦✦ 𝙹𝚄𝙹𝚄𝚃𝚂𝚄 𝙺𝙰𝙸𝚂𝙴𝙽 ✦⟧𓆪 』═════╗
║ 𖤐 𝙽𝚘𝚖𝚋𝚛𝚎: 𝑨 %name
║ 𖤐 𝙽𝚒𝚟𝚎𝚕: 𝑳 %level | 𝑿𝑷: %exp/%max
║ 𖤐 𝙻í𝚖𝚒𝚝𝚎: 𝑳 %limit | 𝙼𝚘𝚍𝚘: %mode
║ 𖤐 𝚄𝚙𝚝𝚒𝚖𝚎: 𝑼 %uptime
║ 𖤐 𝚄𝚜𝚞𝚊𝚛𝚒𝚘𝚜: 𝑼 %total
║ 𖤐 𝙱𝚘𝚝 𝚘𝚙𝚝𝚒𝚖𝚒𝚣𝚊𝚍𝚘 𝚙𝚊𝚛𝚊 𝚖𝚎𝚓𝚘𝚛 𝚛𝚎𝚗𝚍𝚒𝚖𝚒𝚎𝚗𝚝𝚘.
╚════════════════════════════╝
`.trim();

const sectionDivider = '╰⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻╯';

const menuFooter = `
╔═════『 𓆩⟦✦ YUTA ✦⟧𓆪 』═════╗
`.trim();

let handler = async (m, { conn, usedPrefix: _p }) => {
  try {
    const user = global.db?.data?.users?.[m.sender] || { level: 1, exp: 0, limit: 5 };
    const { exp, level, limit } = user;
    const { min, xp } = xpRange(level, global.multiplier || 1);
    const totalreg = Object.keys(global.db?.data?.users || {}).length;

    const mode = global.opts?.self ? '𝙿𝚛𝚒𝚟𝚊𝚍𝚘 🔒' : '𝙿𝚞́𝚋𝚕𝚒𝚌𝚘 🌐';
    const uptime = clockString(process.uptime() * 1000);

    let name = "𝑼𝒔𝒖𝒂𝒓𝒊𝒐";
    try { name = await conn.getName(m.sender); } catch {}

    let categorizedCommands = {};

    Object.values(global.plugins).filter(p => p?.help && !p.disabled).forEach(p => {
      const tags = Array.isArray(p.tags) ? p.tags : [typeof p.tags === 'string' ? p.tags : 'Otros'];
      const tag = tags[0] || 'Otros';
      const commands = Array.isArray(p.help) ? p.help : [p.help];
      categorizedCommands[tag] = categorizedCommands[tag] || new Set();
      commands.forEach(cmd => categorizedCommands[tag].add(cmd));
    });

    const emojis = {
      anime: "🌸", info: "ℹ️", search: "🔎", diversión: "🎉",
      subbots: "🤖", rpg: "🌀", registro: "📝", sticker: "🎨",
      imagen: "🖼️", logo: "🖌️", configuración: "⚙️", premium: "💎",
      descargas: "📥", herramientas: "🛠️", nsfw: "🔞",
      "base de datos": "📀", audios: "🔊", "free fire": "🔥",
      otros: "🪪"
    };

    // ORDEN opcional de categorías
    const orderedTags = ["anime", "info", "search", "diversión", "subbots", "rpg", "registro", "sticker", "imagen", "logo", "configuración", "premium", "descargas", "herramientas", "nsfw", "base de datos", "audios", "free fire", "otros"];

    const menuBody = orderedTags.filter(tag => categorizedCommands[tag] !== undefined).map(tag => {
      const emoji = emojis[tag] || "✦";
      const decoStart = "•⟡";
      const decoEnd = "⟡•";
      const entries = [...categorizedCommands[tag]].map(cmd =>
        `║ ${decoStart} _${_p}${cmd}_ ${decoEnd}`
      ).join('\n');
      return `╔═『 ${emoji} 𓃠 ${tag.toUpperCase()} 』═╗\n${entries}\n${sectionDivider}`;
    }).join('\n\n');

    const finalHeader = menuHeader
      .replace('%name', name)
      .replace('%level', level)
      .replace('%exp', exp - min)
      .replace('%max', xp)
      .replace('%limit', limit)
      .replace('%mode', mode)
      .replace('%uptime', uptime)
      .replace('%total', totalreg);

    const fullMenu = `⸻⸻⸻⸻⸻⸻⸻⸻ DV YER 🔥 ⸻⸻⸻⸻⸻⸻⸻⸻\n\n${finalHeader}\n\n${menuBody}\n\n${menuFooter}\n\n╔════════════════════════╗\n║ Recursos decorativos:  ║\n╠ Letras: 𝑨 𝑩 𝑪 𝑫 ...\n╠ Decos: ৡৢ͜͡ ᬊ͜͡ ೈ፝͜͡ ░⃟⃛ ➮ ⏤͟͟͞͞ ᭄ ⎊ ⎈ ꧁ ꧂ ࿗ ༒ ༆ༀ\n╚════════════════════════╝`;

    await conn.sendMessage(m.chat, {
      video: { url: videoUrl },
      gifPlayback: true,
      caption: fullMenu,
      mentions: [m.sender]
    }, { quoted: m });

  } catch (e) {
    console.error(e);
    conn.reply(m.chat, '⚠️ Ocurrió un error al generar el menú. Inténtalo de nuevo.', m);
  }
};

handler.command = ['menu', 'help', 'menú'];
export default handler;