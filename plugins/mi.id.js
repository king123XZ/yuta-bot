let handler = async (m, { conn }) => {
  const miJid = conn.user.id   // JID de tu bot (tú)
  const numero = miJid.split('@')[0] // solo número

  await m.reply(`✅ *Mi JID:* ${miJid}\n📌 *Mi número:* ${numero}`)
}

handler.command = /^mijid$/i  // Escribes: !mijid

export default handler

