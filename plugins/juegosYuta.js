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
    if (!video?.url) throw new Error("❌ URL del video no disponible.");

    const caption = `
\`\`\`╔═══𓂀═══╗
║  𝕐𝕌𝕁𝕀 𝕡𝕝𝕒𝕪  │ 呪術廻戦 │
╚═══𓂀═══╝\`\`\`

📜 *Título:* ${video.title}
👹 *Hechicero:* ${video.author?.name || "Desconocido"}
⏳ *Duración:* ${video.duration?.timestamp || "?"}
👁️ *Vistas:* ${video.views?.toLocaleString() || "?"}
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

    // Mensaje de carga inicial (50%)
    await conn.sendMessage(
      m.chat,
      { text: `⚡ Invocando maldición... ${createProgressBar(50)}` },
      { quoted: m }
    );

    // Esperar y pasar a 100%
    await new Promise((r) => setTimeout(r, 2000));

    await conn.sendMessage(
      m.chat,
      { text: `✅ Invocación completada... ${createProgressBar(100)}` },
      { quoted: m }
    );

    if (command === "play") {
      const api = await yta(video.url);
      if (!api.status) throw new Error("❌ Maleficio roto al procesar audio.");
      // El enlace puede estar según el paquete en api.result.download ó api.url
      const audioUrl = api.result?.download || api.url;
      if (!audioUrl) throw new Error("❌ No se obtuvo enlace de descarga de audio.");

      const head = await fetch(audioUrl, { method: "HEAD" });
      let sizeMB = 0;
      if (head.ok) {
        const size = head.headers.get("content-length");
        sizeMB = size ? Number(size) / (1024 * 1024) : 0;
      }

      if (sizeMB > limitMB) {
        return m.reply(`⚠️ El audio pesa ${sizeMB.toFixed(1)} MB, excede el límite de ${limitMB} MB.`);
      }

      await conn.sendFile(
        m.chat,
        audioUrl,
        `${api.result?.title || api.title || "audio"}.mp3`,
        `🎵 *${api.result?.title || api.title || "Audio"}*`,
        m
      );
    } 
    else if (command === "play2" || command === "playvid") {
      const api = await ytv(video.url);

      // A veces el enlace está en api.result.download o api.url, ajustamos para soportar ambos
      const videoUrl = api.result?.download || api.url;
      const videoTitle = api.result?.title || api.title || "video";

      // Debug para ver estructura real si sigues teniendo problemas
      console.log("API YTV:", api);

      if (!api.status) throw new Error("❌ Maleficio roto al procesar video.");
      if (!videoUrl) throw new Error("❌ No se obtuvo enlace de descarga de video.");

      const head = await fetch(videoUrl, { method: "HEAD" });
      let sizeMB = 0;
      if (head.ok) {
        const size = head.headers.get("content-length");
        sizeMB = size ? Number(size) / (1024 * 1024) : 0;
      }

      const asDoc = !sizeMB || sizeMB >= limitMB;

      if (asDoc) {
        // WhatsApp a veces rechaza caption en documentos, por eso no lo mandamos aquí
        await conn.sendMessage(
          m.chat,
          {
            document: { url: videoUrl },
            mimetype: 'video/mp4',
            fileName: `${videoTitle}.mp4`
          },
          { quoted: m }
        );
      } else {
        await conn.sendFile(
          m.chat,
          videoUrl,
          `${videoTitle}.mp4`,
          `🎥 *${videoTitle}*`,
          m,
          null,
          { mimetype: "video/mp4" }
        );
      }
    }

    await m.react("✔️");

  } catch (err) {
    console.error("Error YujiPlay:", err);
    m.reply(`💀 Maldición fallida:\n${err.message || err}`);
  }
};

handler.help = ["play", "play2", "playvid"];
handler.tags = ["descargas", "descargas"];
handler.command = ["play", "play2", "playvid"];

export default handler;
