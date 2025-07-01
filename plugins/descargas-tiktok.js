// ⚔️ YUTA OKKOTSU | TikTok Downloader
import axios from 'axios';

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `📌 *Invoca la Maldición*\n\n🔗 Proporciona la URL de TikTok.\n\n*Ejemplo:* ${usedPrefix + command} https://vt.tiktok.com/xxxxxx`;

    try {
        const { data } = await axios.get(`https://zennz-api.vercel.app/api/downloader/tiktok?url=${encodeURIComponent(text)}`);

        if (!data.status || !data.data?.no_watermark) throw '❌ *No se pudo liberar la maldición del video.*';

        const { title, no_watermark, music } = data.data;

        const caption = `
╭─────────────
│ ⚔️ *YUTA OKKOTSU | TikTok*
├─────────────
│ 📝 *Título:* ${title}
│ 🔗 *Enlace:* ${text}
╰─────────────`.trim();

        await conn.sendMessage(m.chat, {
            video: { url: no_watermark },
            caption,
            contextInfo: {
                externalAdReply: {
                    title: 'Yuta Okkotsu | TikTok Curse Breaker',
                    body: 'By Rika Orimoto',
                    sourceUrl: text,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m });

        if (music) {
            await conn.sendMessage(m.chat, {
                audio: { url: music },
                mimetype: 'audio/mpeg',
                fileName: `${title}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: 'Yuta Okkotsu | TikTok Curse Breaker',
                        body: 'Audio extraído',
                        sourceUrl: text,
                        mediaType: 1,
                        renderLargerThumbnail: false
                    }
                }
            }, { quoted: m });
        }

    } catch (e) {
        console.error('[YUTA ERROR]', e);
        throw `❌ *Error al romper la maldición.*\n\n📄 *Detalle:* ${e.message}`;
    }
};

handler.help = ['tiktok <url>'];
handler.tags = ['downloader'];
handler.command = /^(tiktok|tt|ttdl)$/i;
handler.limit = false;

export default handler;