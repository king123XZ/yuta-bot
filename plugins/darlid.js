
let handler = async (m, { conn, command}) => {
  const botJid = conn.user?.jid || 'JID no disponible';
  await m.reply(`🤖 *JID del bot:* ${botJid}`);
};

handler.command = /^darlid$/i;
handler.owner = true; // Solo el owner puede usarlo, puedes ajustar esto si lo deseas

export default handler;