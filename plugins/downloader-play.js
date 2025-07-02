import yts from "yt-search";
import fetch from "node-fetch"; // 👈 Asegúrate de tener esto si no lo tienes ya
import { ytv, yta } from "./_ytdl.js";

const limit = 100; // Límite en MB

const handler = async (m, { conn, text, command }) => {
  if (!text) {
    return m.reply("🌴 Ingresa el nombre de un video o una URL de YouTube.");
  }

  await m.react("🌱");

  try {
    const res = await yts(text);
    if (!res || !res.all || res.all.length === 0) {
      return m.reply("❌ No se encontraron resultados para tu búsqueda.");
    }

    const video = res.all[0];
    const total = Number(video.duration.seconds) || 0;

    const caption = `
\`\`\`⊜─⌈ 📻 ◜Yuta Play◞ 📻 ⌋─⊜\`\`\`

≡ 🌿 *Título:* ${video.title}
≡ 🌾 *Autor:* ${video.author.name}
≡ 🌱 *Duración:* ${video.duration.timestamp}
≡ 🌴 *Vistas:* ${video.views}
≡ ☘️ *URL:* ${video.url}

тнe вeѕт wнaтѕapp вy ι'м ғz
`;

    // 📌 Enviar miniatura primero
    const thumb = await fetch(video.thumbnail).then(v => v.buffer());
    await conn.sendFile(m.chat, thumb, "thumb.jpg", caption, m);

    if (command === "play") {
      // 📌 AUDIO
      const api = await yta(video.url);
      if (!api.status) throw new Error("❌ Error al procesar el audio.");
      await conn.sendFile(m.chat, api.result.download, `${api.result.title}.mp3`, null, m);
      await m.react("✔️");

    } else if (command === "play2" || command === "playvid") {
      // 📌 VIDEO
      const api = await ytv(video.url);
      if (!api.status) throw new Error("❌ Error al procesar el video.");

      // Verificar tamaño
      const resVid = await fetch(api.url);
      const size = parseInt(resVid.headers.get("content-length")) / (1024 * 1024);
      const asDoc = size >= limit;

      await conn.sendFile(
        m.chat,
        api.url,
        `${api.title}.mp4`,
        null,
        m,
        null,
        {
          asDocument: asDoc,
          mimetype: "video/mp4"
        }
      );
      await m.react("✔️");
    }

  } catch (err) {
    console.error(err);
    m.reply("⚠️ Ocurrió un error:\n" + (err.message || err));
  }
};

handler.help = ["play", "play2", "playvid"];
handler.tags = ["downloader"];
handler.command = ["play", "play2", "playvid"];

export default handler;