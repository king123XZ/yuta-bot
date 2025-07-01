import fetch from "node-fetch";
import yts from "yt-search";
import axios from "axios";

const formatAudio = ["mp3", "m4a", "webm", "acc", "flac", "opus", "ogg", "wav"];

// APIs principales en paralelo
const audioSources = [
  url => `https://api.siputzx.my.id/api/d/ytmp3?url=${url}`,
  url => `https://api.zenkey.my.id/api/download/ytmp3?apikey=zenkey&url=${url}`,
  url => `https://axeel.my.id/api/download/audio?url=${encodeURIComponent(url)}`,
  url => `https://delirius-apiofc.vercel.app/download/ytmp3?url=${url}`
];

// DDOWNR (última opción)
const ddownr = {
  download: async (url, format) => {
    if (!formatAudio.includes(format)) throw new Error("⚠️ Formato no compatible.");
    const config = {
      method: "GET",
      url: `https://p.oceansaver.in/ajax/download.php?format=${format}&url=${encodeURIComponent(url)}`,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    };
    const response = await axios.request(config);
    if (response.data?.success) {
      const { id, title, info } = response.data;
      const downloadUrl = await ddownr.cekProgress(id, 8000);
      return { title, downloadUrl };
    }
    throw new Error("❌ DDOWNR falló");
  },

  cekProgress: async (id, timeout = 8000) => {
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
      if (Date.now() - start > timeout) throw new Error("⏳ Timeout");
      await new Promise(r => setTimeout(r, 1000));
    }
  }
};

const handler = async (m, { conn, text, usedPrefix, command }) => {
  await m.react("🎵");
  if (!text.trim()) {
    return conn.reply(m.chat, "🎧 *YutaBot* | Escribe el nombre de la canción.", m);
  }

  const msg = await m.reply("⏳ *Buscando canción...*");

  try {
    const search = await yts(text);
    if (!search.all.length) return m.reply("🚫 No se encontraron resultados.");

    const videoInfo = search.all[0];
    const { title, url } = videoInfo;

    // 🔥 Ejecuta todas las APIs a la vez con User-Agent
    const tasks = audioSources.map(getUrl =>
      fetch(getUrl(url), {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      })
        .then(res => res.json())
        .then(json => {
          const downloadUrl =
            json.data?.dl ||
            json.result?.download?.url ||
            json.downloads?.url ||
            json.data?.download?.url;
          if (!downloadUrl) throw new Error("No válido");
          return { title, downloadUrl };
        })
    );

    // Agrega DDOWNR como último recurso
    tasks.push(ddownr.download(url, "mp3"));

    // Corre todo: primero que responde GANA
    const { downloadUrl } = await Promise.any(tasks);

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: downloadUrl },
        mimetype: "audio/mpeg",
        fileName: `${title}.mp3`
      },
      { quoted: m }
    );

    await m.react("✅");
  } catch (error) {
    console.error("❌ Error:", error);
    return m.reply(`⚠️ *YutaBot* | Error: ${error.message}`);
  }
};

handler.command = ["play", "yta", "ytmp3"];
handler.tags = ["downloader"];
handler.help = ["play", "yta", "ytmp3"];
handler.register = true;

export default handler;
