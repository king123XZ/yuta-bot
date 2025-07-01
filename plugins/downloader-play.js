import fetch from "node-fetch";
import yts from "yt-search";
import axios from "axios";

const formatAudio = ["mp3", "m4a", "webm", "acc", "flac", "opus", "ogg", "wav"];

// APIs backup por si oceansaver falla
const audioSources = [
  url => `https://api.siputzx.my.id/api/d/ytmp3?url=${url}`,
  url => `https://api.zenkey.my.id/api/download/ytmp3?apikey=zenkey&url=${url}`,
  url => `https://axeel.my.id/api/download/audio?url=${encodeURIComponent(url)}`,
  url => `https://delirius-apiofc.vercel.app/download/ytmp3?url=${url}`
];

const ddownr = {
  download: async (url, format) => {
    if (!formatAudio.includes(format)) {
      throw new Error("⚠️ Formato no compatible.");
    }

    const config = {
      method: "GET",
      url: `https://p.oceansaver.in/ajax/download.php?format=${format}&url=${encodeURIComponent(url)}`,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    };

    const response = await axios.request(config);
    if (response.data?.success) {
      const { id, title, info } = response.data;
      const downloadUrl = await ddownr.cekProgress(id, 15000);
      return { id, title, image: info.image, downloadUrl };
    } else {
      throw new Error("⛔ No se pudo procesar el audio (API principal).");
    }
  },

  cekProgress: async (id, timeout = 15000) => {
    const config = {
      method: "GET",
      url: `https://p.oceansaver.in/ajax/progress.php?id=${id}`,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    };
    const start = Date.now();
    while (true) {
      const response = await axios.request(config);
      if (response.data?.success && response.data.progress === 1000) {
        return response.data.download_url;
      }
      if (Date.now() - start > timeout) throw new Error("⏳ Tiempo de espera agotado.");
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

const handler = async (m, { conn, text, command }) => {
  await m.react("🎵");

  if (!text.trim()) {
    return conn.reply(m.chat, "📌 *YutaBot* | Escribe el nombre de la canción.", m);
  }

  const loading = await conn.reply(m.chat, "🔄 *Yuta está buscando tu canción...*", m);

  try {
    const search = await yts(text);
    if (!search.all.length) {
      return conn.reply(m.chat, "❌ *Yuta no encontró resultados.*", m);
    }

    const videoInfo = search.all[0];
    const { title, thumbnail, timestamp, views, ago, url } = videoInfo;
    const vistas = formatViews(views);
    const thumb = (await conn.getFile(thumbnail))?.data;

    const infoMessage = `🎧 *YutaBot Music Downloader*
─────────────────────
🎵 *Título:* ${title}
⏱️ *Duración:* ${timestamp}
📺 *Canal:* ${(videoInfo.author?.name) || "Desconocido"}
👁️ *Vistas:* ${vistas}
📅 *Publicado:* ${ago}
🔗 *Enlace:* ${url}`;

    await conn.reply(m.chat, infoMessage, m, {
      contextInfo: {
        externalAdReply: {
          title: "YutaBot",
          body: "El poder de Yuta descargando música.",
          mediaType: 1,
          previewType: 0,
          mediaUrl: url,
          sourceUrl: url,
          thumbnail: thumb,
          renderLargerThumbnail: true
        }
      }
    });

    await conn.sendMessage(m.chat, { text: "⏳ *Procesando audio...*" }, { quoted: loading });

    try {
      const api = await ddownr.download(url, "mp3");
      return conn.sendMessage(m.chat, {
        audio: { url: api.downloadUrl },
        mimetype: "audio/mpeg",
        fileName: `${title}.mp3`
      }, { quoted: m });
    } catch (err) {
      console.log(`⚠️ Oceansaver falló: ${err.message}`);

      let found = false;
      for (let getUrl of audioSources) {
        try {
          const res = await fetch(getUrl(url), {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
          });
          const json = await res.json();
          const downloadUrl = json.data?.dl || json.result?.download?.url || json.downloads?.url || json.data?.download?.url;

          if (downloadUrl) {
            found = true;
            await conn.sendMessage(m.chat, {
              audio: { url: downloadUrl },
              mimetype: "audio/mpeg",
              fileName: `${title}.mp3`
            }, { quoted: m });
            break;
          }
        } catch (e2) {
          console.log(`⚠️ Backup falló: ${getUrl(url)} | ${e2.message}`);
        }
      }

      if (!found) {
        return conn.reply(m.chat, "❌ *Yuta no pudo encontrar un enlace válido para el audio.*", m);
      }
    }

  } catch (error) {
    console.error("❌ Error:", error);
    return conn.reply(m.chat, `⚠️ *YutaBot* | Error: ${error.message}`, m);
  }
};

handler.command = ["play", "yta", "ytmp3"];
handler.tags = ["downloader"];
handler.help = ["play", "yta", "ytmp3"];
handler.register = true;

export default handler;

function formatViews(views) {
  if (typeof views !== "number" || isNaN(views)) return "Desconocido";
  return views >= 1000
    ? (views / 1000).toFixed(1) + "k (" + views.toLocaleString() + ")"
    : views.toString();
}
