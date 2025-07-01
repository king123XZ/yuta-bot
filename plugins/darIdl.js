const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const senderId = msg.key.participant || msg.key.remoteJid;

  // Reacción inicial
  await conn.sendMessage(chatId, {
    react: { text: '🛰️', key: msg.key }
  });

  // Extraer contexto de mensaje citado (si existe)
  const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
  const citado = contextInfo?.participant;

  // Determinar objetivo (citado o quien envió)
  const objetivo = citado || senderId;

  // Revisar tipo (LID oculto o número normal)
  let tipo = 'Número visible (@s.whatsapp.net)';
  if (objetivo.endsWith('@lid')) {
    tipo = 'LID oculto (@lid)';
  }

  // Extraer número limpio (si tiene formato)
  const numero = objetivo.replace(/\D/g, '');

  // Construir mensaje de respuesta
  const mensaje = `
📡 *Identificador LID*
👤 *Usuario:* ${objetivo}
🔢 *Número:* +${numero}
🔐 *Tipo:* ${tipo}
`.trim();

  // Enviar mensaje citado
  await conn.sendMessage(chatId, {
    text: mensaje
  }, { quoted: msg });
};

handler.command = ['damelid'];
handler.help = ['damelid'];
handler.tags = ['tools'];

module.exports = handler;