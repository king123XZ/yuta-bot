import fetch from "node-fetch";
import yts from "yt-search";
import axios from "axios";

const formatAudio = ["mp3", "m4a", "webm", "acc", "flac", "opus", "ogg", "wav"];
const formatVideo = ["360", "480", "720", "1080", "1440", "4k"];

const ddownr = {
  download: async (url, format) => {
    if (!formatAudio.includes(format) && !formatVideo.includes(format)) {
      throw new Error("⚠️ Formato no compatible.");
    }

    const config = {
      method: "GET",
      url: `https://p.oceansaver.in/ajax/download.php?format=${format}&url=${encodeURIComponent(url)}&api=dfcb6d76f2f6a9894gjkege8a4ab232222`,
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    };

    const response = await axios.request(config);
    if (response.data?.success) {
      const { id, title, info } = response.data;
      const downloadUrl = await ddownr.cekProgress(id);
      return { id, title, image: info.image, downloadUrl };
    } else {
      throw new Error("⛔ No se pudo procesar el video.");
    }
  },

  cekProgress: async (id) => {
    const config = {
      method: "GET",
      url: `https://p.oceansaver.in/ajax/progress.php?id=${id}`,
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    };

    while (true) {
      const response = await axios.request(config);
      if (response.data?.success && response.data.progress === 1000) {
        return response.data.download_url;
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
};

const handler = async (m, { conn, text, usedPrefix, command }) => {
  await m.react('⚡️');

  if (!text.trim()) {
    return conn.reply(m.chat, "🔹 *YutaBot* | Escribe el nombre de la canción o video.", m);
  }

  let progressMsg = await conn.reply(m.chat, "⏳ Cargando... 10%", m);

  try {
    const search = await yts(text);
    if (!search.all.length) {
      return m.reply("🚫 No se encontraron resultados.");
    }

    const videoInfo = search.all[0];
    const { title, thumbnail, timestamp, views, ago, url } = videoInfo;

    // Actualiza progreso
    await conn.sendMessage(m.chat, { text: "⏳ Cargando... 50%" }, { quoted: progressMsg });

    const thumb = (await conn.getFile(thumbnail))?.data;
    const vistas = formatViews(views);

    const infoMessage = `🎧 *YutaBot Downloader*
─────────────────────
🎵 *Título:* ${title}
⏱️ *Duración:* ${timestamp}
📺 *Canal:* ${videoInfo.author?.name || "Desconocido"}
👁️ *Vistas:* ${vistas}
📅 *Publicado:* ${ago}
🔗 *Enlace:* ${url}`;

    const external = {
      contextInfo: {
        externalAdReply: {
          title: "YutaBot",
          body: "El bot que siempre te respalda.",
          mediaType: 1,
          previewType: 0,
          mediaUrl: url,
          sourceUrl: url,
          thumbnail: thumb,
          renderLargerThumbnail: true
        }
      }
    };

    await m.react('🎧');
    await conn.reply(m.chat, infoMessage, m, external);

    await conn.sendMessage(m.chat, { text: "✅ Carga completa: 100%" }, { quoted: progressMsg });

    if (["play", "yta", "ytmp3"].includes(command)) {
      const api = await ddownr.download(url, "mp3");
      return conn.sendMessage(m.chat, {
        audio: { url: api.downloadUrl },
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`
      }, { quoted: m });
    }

    if (["play2", "ytv", "ytmp4"].includes(command)) {
      const sources = [
        `https://api.siputzx.my.id/api/d/ytmp4?url=${url}`,
        `https://api.zenkey.my.id/api/download/ytmp4?apikey=zenkey&url=${url}`,
        `https://axeel.my.id/api/download/video?url=${encodeURIComponent(url)}`,
        `https://delirius-apiofc.vercel.app/download/ytmp4?url=${url}`
      ];

      let success = false;
      for (let source of sources) {
        try {
          const res = await fetch(source);
          const { data, result, downloads } = await res.json();
          const downloadUrl = data?.dl || result?.download?.url || downloads?.url || data?.download?.url;

          if (downloadUrl) {
            success = true;
            await conn.sendMessage(m.chat, {
              video: { url: downloadUrl },
              mimetype: "video/mp4",
              fileName: `${title}.mp4`,
              caption: "🎬 Aquí está tu video, cortesía de *YutaBot*.",
              thumbnail: thumb
            }, { quoted: m });
            break;
          }
        } catch (e) {
          console.error(`⚠️ Error con ${source}:`, e.message);
        }
      }

      if (!success) {
        return m.reply("❌ No se encontró enlace válido para descargar.");
      }
    }

  } catch (error) {
    console.error("❌ Error:", error);
    return m.reply(`⚠️ Error: ${error.message}`);
  }
};

handler.command = ["play15", "play2", "yta", "ytmp3", "ytv", "ytmp4"];
handler.tags = ["downloader"];
handler.help = ["play", "play2", "yta", "ytmp3", "ytv", "ytmp4"];
handler.register = true;

export default handler;

function formatViews(views) {
  if (typeof views !== "number" || isNaN(views)) return "Desconocido";
  return views >= 1000
    ? (views / 1000).toFixed(1) + "k (" + views.toLocaleString() + ")"
    : views.toString();
}
