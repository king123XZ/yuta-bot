import yts from "yt-search";
import fetch from "node-fetch";
import { ytv, yta } from "./_ytdl.js";

const limitMB = 100;

const createProgressBar = (percentage) => {
  const totalBlocks = 10;
  const filledBlocks = Math.round((percentage / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  return `[${"▓".repeat(filledBlocks)}${"░".repeat(emptyBlocks)}] ${percentage}%`;
};

const handler = async (m, { conn, text, command }) => {
  if (!text) return m.reply("🌊 Invoca el nombre de un video o pega el enlace de YouTube, hechicero.");

  try {
    await m.react("🪄");

    const res = await yts(text);
    if (!res?.all?.length) return m.reply("⚠️ No se encontró energía maldita (video no hallado).");

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

    let thumbBuffer;
    try {
      const resThumb = await fetch(video.thumbnail);
      if (resThumb.ok) thumbBuffer = await resThumb.buffer();
    } catch (e) {
      console.log("Miniatura fallida:", e);
    }

    if (thumbBuffer) {
      await conn.sendFile(m.chat, thumbBuffer, "jujutsu_thumb.jpg", caption, m);
    } else {
      await m.reply(caption);
    }

    const loadingMsg = await conn.sendMessage(
      m.chat,
      { text: `⚡ Invocando maldición... ${createProgressBar(0)}` },
      { quoted: m }
    );

    const steps = [
      { pct: 10, txt: "🔥 Canalizando energía maldita..." },
      { pct: 70, txt: "⚡ Refinando maleficio..." },
      { pct: 100, txt: "✅ Invocación completada..." },
    ];

    for (const step of steps) {
      await new Promise((r) => setTimeout(r, 1400));
      try {
        await conn.sendMessage(
          m.chat,
          { text: `${step.txt} ${createProgressBar(step.pct)}` },
          { quoted: loadingMsg }
        );
      } catch (e) {
        console.log("Error edit carga:", e);
      }
    }

    if (command === "play") {
      const api = await yta(video.url);
      if (!api.status) throw new Error("❌ Maleficio roto al procesar audio.");

      // Verificar tamaño del archivo antes de enviar
      const head = await fetch(api.result.download, { method: "HEAD" });
      let sizeMB = 0;
      if (head.ok) {
        const size = head.headers.get("content-length");
        sizeMB = size ? Number(size) / (1024 * 1024) : 0;
      }
      console.log("Tamaño del audio:", sizeMB.toFixed(2), "MB");

      if (sizeMB > limitMB) {
        return m.reply(`⚠️ El audio pesa ${sizeMB.toFixed(1)} MB, excede el límite de ${limitMB} MB.`);
      }

      await conn.sendFile(
        m.chat,
        api.result.download,
        `${api.result.title}.mp3`,
        `🎵 *${api.result.title}*`,
        m
      );
    } else if (command === "play2" || command === "playvid") {
      const api = await ytv(video.url);
      if (!api.status) throw new Error("❌ Maleficio roto al procesar video.");

      const head = await fetch(api.url, { method: "HEAD" });
      let sizeMB = 0;
      if (head.ok) {
        const size = head.headers.get("content-length");
        sizeMB = size ? Number(size) / (1024 * 1024) : 0;
      }
      console.log("Tamaño del video:", sizeMB.toFixed(2), "MB");

      const asDoc = sizeMB >= limitMB;

      await conn.sendFile(
        m.chat,
        api.url,
        `${api.title}.mp4`,
        `🎥 *${api.title}*`,
        m,
        null,
        { asDocument: asDoc, mimetype: "video/mp4" }
      );
    }

    await m.react("✔️");

  } catch (err) {
    console.error("Error YujiPlay:", err);
    m.reply(`💀 Maldición fallida:\n${err.message || err}`);
  }
};

handler.help = ["play", "play2", "playvid"];
handler.tags = ["downloader", "jujutsu"];
handler.command = ["play", "play2", "playvid"];

export default handler;