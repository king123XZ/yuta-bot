import { randomUUID } from 'crypto';
import fs from 'fs';

// === 🗂️ Datos Base ===

const trivia = [
  { question: "¿Quién es el sensei de Yuji?", answer: "Gojo Satoru" },
  { question: "¿Quién es el Rey de las Maldiciones?", answer: "Ryomen Sukuna" },
  { question: "¿Quién maneja las Sombras?", answer: "Megumi Fushiguro" },
];

const adivina = [
  { img: 'https://o.uguu.se/tsTBXJoX.jpg', answer: 'Gojo Satoru' },
  { img: 'https://o.uguu.se/Urhctjsi.jpg', answer: 'Ryomen Sukuna' },
  { img: 'https://o.uguu.se/WUfPqdZd.jpg', answer: 'Nobara Kugisaki' },
];

const activeGames = {};

// === ⚙️ Handler ===

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const id = m.sender;

  // --- Si está jugando ---
  if (activeGames[id]) {
    const game = activeGames[id];

    if (game.type === 'trivia') {
      if (text.trim().toLowerCase() === game.answer.toLowerCase()) {
        delete activeGames[id];
        return m.reply(`✅ *Correcto!* 🎉`);
      } else {
        return m.reply(`❌ *Incorrecto.* Intenta de nuevo.`);
      }
    }

    if (game.type === 'adivina') {
      if (text.trim().toLowerCase() === game.answer.toLowerCase()) {
        delete activeGames[id];
        return m.reply(`✅ *Correcto!* Era ${game.answer}.`);
      } else {
        return m.reply(`❌ *Incorrecto.* Prueba de nuevo.`);
      }
    }
    return; // Si ya se gestionó, salimos.
  }

  // --- Si NO está jugando, mostrar menú ---
  if (!text.startsWith(usedPrefix)) return; // Si no es comando, ignora

  if (text.trim() === usedPrefix + 'juego') {
    let menu = `
🎮 *Juegos Anime - Jujutsu Kaisen*

1️⃣ Trivia Anime
2️⃣ Adivina el Personaje
`.trim();
    return m.reply(menu);
  }

  switch (text.trim().slice(1)) { // Quita prefijo
    case '1':
      let t = trivia[Math.floor(Math.random() * trivia.length)];
      activeGames[id] = { type: 'trivia', answer: t.answer, id: randomUUID() };
      return m.reply(`🧩 *Trivia Anime*\n\n${t.question}\n\n_Responde aquí._`);

    case '2':
      let a = adivina[Math.floor(Math.random() * adivina.length)];
      activeGames[id] = { type: 'adivina', answer: a.answer, id: randomUUID() };
      return conn.sendFile(m.chat, a.img, 'personaje.jpg', `👀 *Adivina quién es este personaje*\n_Responde aquí._`, m);
  }
};

handler.customPrefix = /^.+/;
handler.command = new RegExp(); // Atrapa todo
handler.help = ['juego'];
handler.tags = ['game', 'fun'];

export default handler;