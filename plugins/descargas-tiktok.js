// ⚔️ YUTA OKKOTSU | TikTok Downloader
import axios from 'axios';

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `📌 *Invocación de Maldición*\n\n🔗 𝙋𝙧𝙤𝙫𝙚𝙚 𝙪𝙣𝙖 𝙐𝙍𝙇 𝙙𝙚 𝙏𝙞𝙠𝙏𝙤𝙠.\n\n*Ejemplo:* ${usedPrefix + command} https://vt.tiktok.com/xxxxxx`;

    try {
        let loading = await m.reply('🔮 *Yuta invoca a Rika...*\n⏳ 𝘌𝘴𝘱𝘦𝘳𝘢 𝘮𝘪𝘦𝘯𝘵𝘳𝘢𝘴 𝘴𝘦 𝘭𝘪𝘣𝘦𝘳𝘢 𝘭𝘢 𝘮𝘢𝘭𝘥𝘪𝘤𝘪ó𝘯...');

        const { data } = await axios.get(`https://zennz-api.vercel.app/api/downloader/tiktok?url=${encodeURIComponent(text)}`);

        if (!data.status || !data.data?.no_watermark) throw '❌ *La maldición falló.*\n𝙉𝙤 𝙥𝙪𝙙𝙤 𝙙𝙚𝙨𝙚𝙣𝙘𝙖𝙙𝙚𝙣𝙖𝙧 𝙚𝙡 𝙫𝙞𝙙𝙚𝙤.';

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
            await m.reply('🎵 *Liberando la banda sonora maldita...*');
            await conn.sendMessage(m.chat, {
                audio: { url: music },
                mimetype: 'audio/mpeg',
                fileName: `${title}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: 'Yuta Okkotsu | TikTok Curse Breaker',
                        body: 'Banda sonora',
                        sourceUrl: text,
                        mediaType: 1,
                        renderLargerThumbnail: false
                    }
                }
            }, { quoted: m });
        } else {
            m.reply('✅ *La maldición se liberó, pero no se encontró pista de audio.*');
        }

    } catch (e) {
        console.error('[YUTA ERROR]', e);
        throw `❌ *Rika no pudo romper la maldición.*\n\n📄 *Registro:* ${e.message}`;
    }
};

handler.help = ['tiktok <url>'];
handler.tags = ['downloader'];
handler.command = /^(tiktok|tt|ttdl)$/i;
handler.limit = false;

export default handler;