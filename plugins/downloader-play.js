import fetch from "node-fetch";
import yts from "yt-search";
import axios from "axios";

const formatAudio = ["mp3", "m4a", "webm", "acc", "flac", "opus", "ogg", "wav"];
const formatVideo = ["360", "480", "720", "1080", "1440", "4k"];

// APIs alternativos para audio
const audioSources = [
  url => `https://api.siputzx.my.id/api/d/ytmp3?url=${url}`,
  url => `https://api.zenkey.my.id/api/download/ytmp3?apikey=zenkey&url=${url}`,
  url => `https://axeel.my.id/api/download/audio?url=${encodeURIComponent(url)}`,
  url => `https://delirius-apiofc.vercel.app/download/ytmp3?url=${url}`
];

const ddownr = {
  download: async (url, format) => {
    if (!formatAudio.includes(format) && !formatVideo.includes(format)) {
      throw new Error("⚠️ Formato no compatible.");
    }

    // Intenta primero con ddownr (por compatibilidad)
    try {
      const config = {
        method: "GET",
        url: `https://p.oceansaver.in/ajax/download.php?format=${format}&url=${encodeURIComponent(url)}&api=dfcb6d76f2f6a9894gjkege8a4ab232222`,
        headers: { "User-Agent": "Mozilla/5.0" }
      };
      const response = await axios.request(config);
      if (response.data?.success) {
        const { id, title, info } = response.data;
        // Espera máximo 15s por el progreso
        const downloadUrl = await ddownr.cekProgress(id, 15000);
        return { id, title, image: info.image, downloadUrl };
      }
    } catch (e) {
      // Si falla, sigue con otras APIs
    }

    // Prueba con otras APIs
    for (let getUrl of audioSources) {
      try {
        const res = await fetch(getUrl(url));
        const json = await res.json();
        const downloadUrl = json.data?.dl || json.result?.download?.url || json.downloads?.url || json.data?.download?.url;
        if (downloadUrl) {
          return { title: json.title || "audio", downloadUrl };
        }
      } catch (e) {
        // Intenta la siguiente
      }
    }
    throw new Error("⛔ No se pudo procesar el audio.");
  },

  cekProgress: async (id, timeout = 20000) => {
    const config = {
      method: "GET",
      url: `https://p.oceansaver.in/ajax/progress.php?id=${id}`,
      headers: { "User-Agent": "Mozilla/5.0" }
    };
    const start = Date.now();
    while (true) {
      const response = await axios.request(config);
      if (response.data?.success && response.data.progress === 1000) {
        return response.data.download_url;
      }
      if (Date.now() - start > timeout) throw new Error("⏳ Tiempo de espera agotado.");
      await new Promise(resolve => setTimeout(resolve, 1000)); // Espera solo 1s
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
    if (!search.all.length) return m.reply("🚫 No se encontraron resultados.");
    const videoInfo = search.all[0];
    const { title, thumbnail, timestamp, views, ago, url } = videoInfo;
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

    // ... (la parte de video igual que antes)
    // ...

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
