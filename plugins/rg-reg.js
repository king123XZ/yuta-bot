import { createHash } from 'crypto';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  let regFormat = /^([^\s]+)\.(\d+)\.(\w+)$/i;
  let userDB = global.db.data.users[m.sender];
  let videoUrl = 'https://d.uguu.se/OnNOpznk.mp4';

  if (userDB?.registered) {
    return m.reply(`✅ Ya estás registrado.\nSi deseas eliminar tu registro, usa: *${usedPrefix}unreg*`);
  }

  if (!regFormat.test(text)) {
    return m.reply(`❌ Formato incorrecto.\n\n📌 Usa: *${usedPrefix + command} Nombre.Edad.País*\n📍 Ejemplo: *${usedPrefix + command} Yuta.20.Japon*`);
  }

  let [_, name, age, country] = text.match(regFormat);
  age = parseInt(age);

  if (!name || name.length > 50) return m.reply('❌ Nombre inválido o demasiado largo.');
  if (isNaN(age) || age < 5 || age > 100) return m.reply('❌ Edad no válida.');
  if (!country || country.length > 30) return m.reply('❌ País inválido o demasiado largo.');

  let userHash = createHash('md5').update(m.sender).digest('hex');

  global.db.data.users[m.sender] = {
    name,
    age,
    country,
    registered: true,
    regTime: Date.now(),
    id: userHash
  };

  let confirmMsg = `✨ *YutaBot - Registro Completo!*

📄 *Datos Registrados:*
👤 *Nombre:* ${name}
🎂 *Edad:* ${age} años
🌏 *País:* ${country}
🆔 *Código ID:* ${userHash}

🔰 *Bienvenido a la familia de Yuta.*`;

  // Envía video/gif con tema de Yuta
  await conn.sendMessage(m.chat, {
    video: { url: videoUrl },
    caption: confirmMsg,
    gifPlayback: true
  });

  // Mensaje final
  await conn.sendMessage(m.chat, {
    text: `✅ *Verificación completada!*\n\n💙 Gracias por registrarte con *YutaBot*.\n✨ ¡Prepárate para vivir la experiencia!`
  });
};

handler.help = ['registrar <nombre.edad.país>'];
handler.tags = ['registro'];
handler.command = ['registrar', 'reg'];

export default handler;
