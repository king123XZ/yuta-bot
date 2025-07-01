import fetch from "node-fetch";
import yts from "yt-search";
import axios from "axios";

const formatAudio = ["mp3", "m4a", "webm", "acc", "flac", "opus", "ogg", "wav"];
const formatVideo = ["360", "480", "720", "1080", "1440", "4k"];

const videoSources = [
  url => `https://api.siputzx.my.id/api/d/ytmp4?url=${url}`,
  url => `https://api.zenkey.my.id/api/download/ytmp4?apikey=zenkey&url=${url}`,
  url => `https://axeel.my.id/api/download/video?url=${encodeURIComponent(url)}`,
  url => `https://delirius-apiofc.vercel.app/download/ytmp4?url=${url}`
];

const ddownr = {
  download: async (url, format) => {
    if (!formatAudio.includes(format) && !formatVideo.includes(format)) {
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
      throw new Error("⛔ No se pudo procesar el video (API principal).");
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
  await m.react("⚡️");

  if (!text.trim()) {
    return conn.reply(m.chat, "📌 *YutaBot* | Escribe el nombre de la canción o video.", m);
  }

  let loading = await conn.reply(m.chat, "🔄 *Yuta está buscando... 10%*", m);

  try {
    const search = await yts(text);
    if (!search.all.length) {
      return conn.reply(m.chat, "❌ *Yuta no encontró resultados.*", m);
    }

    const videoInfo = search.all[0];
    const { title, thumbnail, timestamp, views, ago, url } = videoInfo;
    const vistas = formatViews(views);
    const thumb = (await conn.getFile(thumbnail))?.data;

    await conn.sendMessage(m.chat, { text: "⏳ *50% completado...*" }, { quoted: loading });

    const infoMessage = `🔰 *YutaBot Downloader*
─────────────────────
🎵 *Título:* ${title}
⏱️ *Duración:* ${timestamp}
📺 *Canal:* ${(videoInfo.author?.name) || "Desconocido"}
👁️ *Vistas:* ${vistas}
📅 *Publicado:* ${ago}
🔗 *Enlace:* ${url}`;

    const ad = {
      contextInfo: {
        externalAdReply: {
          title: "YutaBot",
          body: "El poder de Yuta a tu servicio.",
          mediaType: 1,
          previewType: 0,
          mediaUrl: url,
          sourceUrl: url,
          thumbnail: thumb,
          renderLargerThumbnail: true
        }
      }
    };

    await conn.reply(m.chat, infoMessage, m, ad);

    await conn.sendMessage(m.chat, { text: "✅ *Carga completada 100%*" }, { quoted: loading });

    // AUDIO - play | yta | ytmp3
    if (["play", "yta", "ytmp3"].includes(command)) {
      try {
        const api = await ddownr.download(url, "mp3");
        return conn.sendMessage(m.chat, {
          audio: { url: api.downloadUrl },
          mimetype: "audio/mpeg",
          fileName: `${title}.mp3`
        }, { quoted: m });
      } catch (err) {
        console.log(`⚠️ Oceansaver falló: ${err.message}`);
        // Usa backup si falla
        let found = false;
        for (let getUrl of videoSources) {
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
    }

    // VIDEO - play2 | ytv | ytmp4
    if (["play2", "ytv", "ytmp4"].includes(command)) {
      let found = false;
      for (let getUrl of videoSources) {
        try {
          const res = await fetch(getUrl(url), {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
          });
          const json = await res.json();
          const downloadUrl = json.data?.dl || json.result?.download?.url || json.downloads?.url || json.data?.download?.url;

          if (downloadUrl) {
            found = true;
            await conn.sendMessage(m.chat, {
              video: { url: downloadUrl },
              mimetype: "video/mp4",
              fileName: `${title}.mp4`,
              caption: `🎥 *YutaBot* | Aquí está tu video.`,
              thumbnail: thumb
            }, { quoted: m });
            break;
          }
        } catch (e) {
          console.log(`⚠️ Fuente falló: ${getUrl(url)} | ${e.message}`);
        }
      }

      if (!found) {
        return conn.reply(m.chat, "❌ *Yuta no pudo encontrar un enlace válido para el video.*", m);
      }
    }

  } catch (error) {
    console.error("❌ Error general:", error);
    return conn.reply(m.chat, `⚠️ *YutaBot* | Error: ${error.message}`, m);
  }
};

handler.command = ["play", "play2", "yta", "ytmp3", "ytmp4", "ytv"];
handler.tags = ["downloader"];
handler.help = ["play", "play2", "yta", "ytmp3", "ytmp4", "ytv"];
handler.register = true;

export default handler;

function formatViews(views) {
  if (typeof views !== "number" || isNaN(views)) return "Desconocido";
  return views >= 1000
    ? (views / 1000).toFixed(1) + "k (" + views.toLocaleString() + ")"
    : views.toString();
}
