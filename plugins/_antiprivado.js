export async function before(m, { conn, isOwner, isROwner}) {
  if (m.isBaileys && m.fromMe) return true;
  if (m.isGroup ||!m.message) return false;

  const senderJID = m.sender;
  const numericID = senderJID.split('@')[0];

  const arabicCountryCodes = [
    /^212/, /^213/, /^216/, /^218/, /^20/, /^966/, /^971/,
    /^965/, /^974/, /^973/, /^968/, /^962/, /^963/, /^961/,
    /^970/, /^964/, /^967/
  ];

  const isArabicNumber = arabicCountryCodes.some(prefix => prefix.test(numericID));
  const command = m.text?.trim().split(' ')[0] || '';
  const allowedCommands = ['.code', '.serbot'];

  if (!isOwner &&!isROwner) {
    // 🔒 Bloqueo por país
    if (isArabicNumber) {
      await conn.updateBlockStatus(senderJID, 'block');
      console.log(`🛑 Usuario ${senderJID} (posible árabe) bloqueado por privado.`);
      return true;
}

    // 🚫 Bloqueo por comando no autorizado
    const isAllowedCommand = allowedCommands.includes(command);
    if (command.startsWith('.') &&!isAllowedCommand) {
      await conn.sendMessage(m.chat, {
        text: '❌ Este comando no está permitido en el chat privado.\nSolo puedes usar ".code" y ".serbot".'
}, { quoted: m});

      await conn.updateBlockStatus(senderJID, 'block');
      console.log(`🛑 Usuario ${senderJID} bloqueado por comando no permitido.`);
      return true;
}
}

  return false;
}