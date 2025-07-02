const buttons = [
  { buttonId: '.ping', buttonText: { displayText: '✅ Ping' }, type: 1 },
  { buttonId: '.estado', buttonText: { displayText: '🔄 Estado' }, type: 1 },
  { buttonId: '.listcmds', buttonText: { displayText: '📃 Lista' }, type: 1 },
];

await conn.sendMessage(m.chat, {
  text: '✨ *Prueba de botones funcionales*',
  footer: 'DV YER 🔥 BOT',
  buttons: buttons,
  headerType: 1
}, { quoted: m });