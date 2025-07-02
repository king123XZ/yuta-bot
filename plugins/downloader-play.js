import yts from "yt-search";
import fetch from "node-fetch";
import { ytv, yta } from "./_ytdl.js";

const limitMB = 100;

// Función para crear barra de carga estilo [▓▓▓▓▓░░░░░] 50%
const createProgressBar = (percentage) => {
  const totalBlocks = 10;
  const filledBlocks = Math.round((percentage / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  return `[${"▓".repeat(filledBlocks)}${"░".repeat(emptyBlocks)}] ${percentage}%`;
};

const handler = async (m, { conn, text, command }) => {
  if (!text) return m.reply("🌀 Invoca el nombre de un video o pega la URL de YouTube, hechicero.");

  try {
    await m.react("🪄");

    const res = await yts(text);
    if (!res || !res.all || res.all.length === 0) {
      return m.reply("⚠️ No se detectaron energías malditas, no se encontró el video.");
    }

    const video = res.all[0];

    const caption = `
\`\`\`╔═══𓂀═══╗
║  𝕐𝕌𝕁𝕀 𝕡𝕝𝕒𝕪  │ 呪術廻戦 │
╚═══𓂀═══╝\`\`\`

📜 *Título:* ${video.title}
👹 *Hechicero:* ${video.author.name}
⏳ *Duración:* ${video.duration.timestamp}
👁️ *Vistas:* ${video.views.toLocaleString()}
🔗 *Enlace:* ${video.url}
`;

    let thumbBuffer = null;
    try {
      const resThumb = await fetch(video.thumbnail);
      if (resThumb.ok) thumbBuffer = await resThumb.buffer();
    } catch (e) {
      console.log("Error descargando miniatura:", e);
    }

    if (thumbBuffer) {
      await conn.sendFile(m.chat, thumbBuffer, "jujutsu_thumb.jpg", caption, m);
    } else {
      await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
    }

    // Mensaje inicial de carga con barra en 0%
    const loadingMsg = await conn.sendMessage(m.chat, { text: `⚡ Invocando maldición... ${createProgressBar(0)}` }, { quoted: m });

    // Pasos con barra 10%, 70%, 100%
    const loadingSteps = [
      { pct: 10, txt: "🔥 Canalizando energía maldita..." },
      { pct: 70, txt: "⚡ Estabilizando maleficio..." },
      { pct: 100, txt: "✅ Invocación completada..." },
    ];

    for (const step of loadingSteps) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        await conn.sendMessage(m.chat, {
          edit: {
            text: `${step.txt} ${createProgressBar(step.pct)}`
          }
        }, { messageId: loadingMsg.key.id });
      } catch {
        break;
      }
    }

    if (command === "play") {
      const api = await yta(video.url);
      if (!api.status) throw new Error("❌ Maleficio fallido al procesar el audio.");

      await conn.sendFile(m.chat, api.result.download, `${api.result.title}.mp3`, null, m);
    } else if (command === "play2" || command === "playvid") {
      const api = await ytv(video.url);
      if (!api.status) throw new Error("❌ Maleficio fallido al procesar el video.");

      const resVid = await fetch(api.url);
      if (!resVid.ok) throw new Error("❌ No se pudo invocar el video");
      const sizeMB = (parseInt(resVid.headers.get("content-length")) || 0) / (1024 * 1024);
      const asDoc = sizeMB >= limitMB;

      await conn.sendFile(m.chat, api.url, `${api.title}.mp4`, null, m, null, { asDocument: asDoc, mimetype: "video/mp4" });
    }

    await m.react("✔️");

    await conn.sendMessage(m.chat, { delete: loadingMsg.key });

  } catch (err) {
    console.error("Error en handler Yūji play:", err);
    m.reply(`💀 Maldición detectada:\n${err.message || err}`);
  }
};

handler.help = ["play", "play2", "playvid"];
handler.tags = ["downloader", "jujutsu"];
handler.command = ["play", "play2", "playvid"];

export default handler;