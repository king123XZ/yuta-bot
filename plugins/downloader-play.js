import yts from "yt-search";
import fetch from "node-fetch";
import { ytv, yta } from "./_ytdl.js";

const limitMB = 100;

const handler = async (m, { conn, text, command }) => {
  if (!text) return m.reply("🌴 Ingresa el nombre de un video o una URL de YouTube.");

  try {
    await m.react("🌱");

    const res = await yts(text);
    if (!res || !res.all || res.all.length === 0) {
      return m.reply("❌ No se encontraron resultados para tu búsqueda.");
    }

    const video = res.all[0];

    const caption = `
\`\`\`⊜─⌈ 📻 ◜Yuta Play◞ 📻 ⌋─⊜\`\`\`

≡ 🌿 *Título:* ${video.title}
≡ 🌾 *Autor:* ${video.author.name}
≡ 🌱 *Duración:* ${video.duration.timestamp}
≡ 🌴 *Vistas:* ${video.views}
≡ ☘️ *URL:* ${video.url}
`;

    // Descargar la miniatura con manejo de error
    let thumbBuffer;
    try {
      const resThumb = await fetch(video.thumbnail);
      if (!resThumb.ok) throw new Error("No se pudo descargar la miniatura");
      thumbBuffer = await resThumb.buffer();
    } catch (e) {
      console.log("Error descargando miniatura:", e);
      thumbBuffer = null;
    }

    if (thumbBuffer) {
      await conn.sendFile(m.chat, thumbBuffer, "thumb.jpg", caption, m);
    } else {
      // Si no hay miniatura, mandar solo texto
      await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
    }

    if (command === "play") {
      const api = await yta(video.url);
      if (!api.status) throw new Error("Error al procesar el audio.");
      await conn.sendFile(m.chat, api.result.download, `${api.result.title}.mp3`, null, m);
      await m.react("✔️");
    } else if (command === "play2" || command === "playvid") {
      const api = await ytv(video.url);
      if (!api.status) throw new Error("Error al procesar el video.");

      const resVid = await fetch(api.url);
      if (!resVid.ok) throw new Error("No se pudo descargar el video");
      const sizeMB = parseInt(resVid.headers.get("content-length") || "0") / (1024 * 1024);
      const asDoc = sizeMB >= limitMB;

      await conn.sendFile(m.chat, api.url, `${api.title}.mp4`, null, m, null, { asDocument: asDoc, mimetype: "video/mp4" });
      await m.react("✔️");
    }

  } catch (err) {
    console.error("Error en handler play:", err);
    m.reply(`⚠️ Ocurrió un error:\n${err.message || err}`);
  }
};

handler.help = ["play", "play2", "playvid"];
handler.tags = ["downloader"];
handler.command = ["play", "play2", "playvid"];

export default handler;