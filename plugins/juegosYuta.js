import { randomUUID } from 'crypto';
import fs from 'fs';

// === 🗂️ Datos Base ===

const trivia = [
  { question: "¿Quién es el sensei de Yuji?", answer: "Gojo Satoru" },
  { question: "¿Quién es el Rey de las Maldiciones?", answer: "Ryomen Sukuna" },
  { question: "¿Quién maneja las Sombras?", answer: "Megumi Fushiguro" },
];

const adivina = [
  { img: 'https://i.imgur.com/XtXnJXd.jpg', answer: 'Gojo Satoru' }, // Usa links o rutas locales
  { img: 'https://i.imgur.com/hvH7b7y.jpg', answer: 'Ryomen Sukuna' },
  { img: 'https://i.imgur.com/Atn1UJ8.jpg', answer: 'Nobara Kugisaki' },
];

const activeGames = {};

// === ⚙️ Handler ===

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const id = m.sender;

  // Si el usuario ya tiene un juego activo
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

    // Aquí puedes manejar otros tipos si tienen respuesta
  }

  // Si no tiene juego activo, mostrar menú
  let menu = `
🎮 *Juegos Anime - Jujutsu Kaisen*

1️⃣ Trivia Anime
2️⃣ Adivina el Personaje
3️⃣ Piedra, Papel o Tijera
4️⃣ Ahorcado Anime
5️⃣ Pelea RPG
6️⃣ Misión Aleatoria
7️⃣ Sistema de Clanes

Envía el número del juego que quieres jugar.
`.trim();

  if (!text) return m.reply(menu);

  // === Selección de juego ===
  switch (text.trim()) {
    case '1':
      let t = trivia[Math.floor(Math.random() * trivia.length)];
      activeGames[id] = { type: 'trivia', answer: t.answer, id: randomUUID() };
      return m.reply(`🧩 *Trivia Anime*\n\n${t.question}\n\n_Responde aquí._`);

    case '2':
      let a = adivina[Math.floor(Math.random() * adivina.length)];
      activeGames[id] = { type: 'adivina', answer: a.answer, id: randomUUID() };
      return conn.sendFile(m.chat, a.img, 'personaje.jpg', `👀 *Adivina quién es este personaje*\n_Responde aquí._`, m);

    case '3':
      let opciones = ['Piedra', 'Papel', 'Tijera'];
      let bot = opciones[Math.floor(Math.random() * opciones.length)];
      return m.reply(`✊ Piedra, ✋ Papel o ✌️ Tijera?\n\nResponde con una de ellas.`);

    case '4':
      return m.reply(`🔤 *Ahorcado Anime* — (Demo)\nAún no implementado. 😅`);

    case '5':
      return m.reply(`⚔️ *Pelea RPG* — (Demo)\nAún no implementado. 😅`);

    case '6':
      let mision = ['Exorcizar una maldición de nivel C', 'Investigar una aparición', 'Proteger un objeto maldito'];
      let mis = mision[Math.floor(Math.random() * mision.length)];
      return m.reply(`🎯 *Misión Anime*\nTu misión: *${mis}*`);

    case '7':
      return m.reply(`🏯 *Sistema de Clanes*\nTe unirás al clan *Gojo*. Próximamente funciones avanzadas.`);

    default:
      return m.reply(`❌ *Opción no válida.* Escribe 1 - 7 para elegir.`);
  }
};

handler.help = ['juego'];
handler.tags = ['game', 'fun'];
handler.command = /^juego$/i;

export default handler;