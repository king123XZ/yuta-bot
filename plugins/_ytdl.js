import crypto from "crypto";
import axios from "axios"; // ¡Faltaba importar axios!
import fetch from "node-fetch";

async function yta(link) {
  const format = "mp3"; 
  const apiBase = "https://media.savetube.me/api";
  const apiCDN = "/random-cdn";
  const apiInfo = "/v2/info";
  const apiDownload = "/download";

  const decryptData = async (enc) => {
    try {
      const key = Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12', 'hex');
      const data = Buffer.from(enc, 'base64');
      const iv = data.slice(0, 16);
      const content = data.slice(16);

      const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
      let decrypted = decipher.update(content);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return JSON.parse(decrypted.toString());
    } catch (error) {
      return null;
    }
  };

  const request = async (endpoint, data = {}, method = 'post') => {
    try {
      const { data: response } = await axios({
        method,
        url: `${endpoint.startsWith('http') ? '' : apiBase}${endpoint}`,
        data: method === 'post' ? data : undefined,
        params: method === 'get' ? data : undefined,
        headers: {
          'accept': '*/*',
          'content-type': 'application/json',
          'origin': 'https://yt.savetube.me',
          'referer': 'https://yt.savetube.me/',
          'user-agent': 'Postify/1.0.0'
        }
      });
      return { status: true, data: response };
    } catch (error) {
      return { status: false, error: error.message };
    }
  };

  const youtubeID = link.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  if (!youtubeID) return { status: false, error: "No se pudo extraer el ID del video." };

  const qualityOptions = ['1080', '720', '480', '360', '240']; 
  try {
    const cdnRes = await request(apiCDN, {}, 'get');
    if (!cdnRes.status) return cdnRes;
    const cdn = cdnRes.data.cdn;

    const infoRes = await request(`https://${cdn}${apiInfo}`, { url: `https://www.youtube.com/watch?v=${youtubeID[1]}` });
    if (!infoRes.status) return infoRes;

    const decrypted = await decryptData(infoRes.data.data);
    if (!decrypted) return { status: false, error: "Error al descifrar la data del video." };

    let downloadUrl = null;
    for (const quality of qualityOptions) {
      const downloadRes = await request(`https://${cdn}${apiDownload}`, {
        id: youtubeID[1],
        downloadType: format === 'mp3' ? 'audio' : 'video',
        quality,
        key: decrypted.key
      });
      if (downloadRes.status && downloadRes.data.data.downloadUrl) {
        downloadUrl = downloadRes.data.data.downloadUrl;
        break;
      }
    }

    if (!downloadUrl) {
      return { status: false, error: "No se encontró enlace de descarga para el video." };
    }

    // Obtener tamaño con HEAD
    const fileResponse = await axios.head(downloadUrl);
    const size = fileResponse.headers['content-length'];

    return {
      status: true,
      result: {
        title: decrypted.title || "Desconocido",
        type: format === 'mp3' ? 'audio' : 'video',
        format,
        download: downloadUrl,
        size: size ? `${(size / 1024 / 1024).toFixed(2)} MB` : 'Desconocido'
      }
    };
  } catch (error) {
    return { status: false, error: error.message };
  }
}

async function ytv(url) {
  try {
    const headers = {
      "accept": "*/*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "sec-ch-ua": "\"Not A(Brand\";v=\"8\", \"Chromium\";v=\"132\"",
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": "\"Android\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "Referer": "https://id.ytmp3.mobi/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    };

    const initial = await fetch(`https://d.ymcdn.org/api/v1/init?p=y&23=1llum1n471&_=${Math.random()}`, { headers });
    const init = await initial.json();
    if (!init || !init.convertURL) return { status: false, error: "No se pudo obtener URL de conversión." };

    const id = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*embed\/))([^&?/]+)/)?.[1];
    if (!id) return { status: false, error: "No se pudo extraer ID del video." };

    const convertURL = init.convertURL + `&v=${id}&f=mp4&_=${Math.random()}`;
    const converts = await fetch(convertURL, { headers });
    const convert = await converts.json();
    if (!convert || !convert.downloadURL || !convert.progressURL) return { status: false, error: "Error en respuesta de conversión." };

    let info = {};
    for (let i = 0; i < 3; i++) {
      const progressResponse = await fetch(convert.progressURL, { headers });
      info = await progressResponse.json();
      if (info.progress === 3) break;
      await new Promise(r => setTimeout(r, 1000)); // Esperar 1s antes de reintentar
    }

    if (!info.title) info.title = "Video desconocido";

    return {
      status: true,
      result: {
        url: convert.downloadURL,
        title: info.title
      }
    };
  } catch (error) {
    return { status: false, error: error.message };
  }
}

export { yta, ytv };