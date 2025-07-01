let handler = async (m) => {
  const jid = m.sender // JID real del usuario (ej: 52123456789@s.whatsapp.net)

  // Si ya tiene @lid, lo usamos tal cual
  let lid = jid.endsWith('@lid')
    ? jid
    : jid.split('@')[0] + '@lid'

  await m.reply(`✅ *Tu LID:* ${lid}`)
}

handler.command = /^mylid$/i  // Usa !mylid

export default handler
