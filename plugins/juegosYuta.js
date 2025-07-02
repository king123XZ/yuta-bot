import { randomUUID } from 'crypto';

// Base de datos de preguntas (puedes agregar más)
const questions = [
  {
    question: "¿Cuál es el nombre real de Sukuna?",
    answer: "Ryomen Sukuna"
  },
  {
    question: "¿Quién es el sensei de Itadori Yuji?",
    answer: "Gojo Satoru"
  },
  {
    question: "¿Cómo se llama la escuela donde estudian los hechiceros?",
    answer: "Colegio Técnico de Magia Metropolitana de Tokio"
  },
  {
    question: "¿Quién es el hermano de Megumi Fushiguro?",
    answer: "Toji Fushiguro"
  },
  {
    question: "¿Cuál es la técnica maldita de Nobara Kugisaki?",
    answer: "Resonancia"
  }
];

// Objeto para guardar preguntas activas por usuario
const activeGames = {};

/**
 * Handler para jugar trivia de Jujutsu Kaisen
 */
let handler = async (m, { conn, text, usedPrefix, command }) => {
  const id = m.sender;

  // Si ya hay una pregunta activa
  if (activeGames[id]) {
    const game = activeGames[id];
    if (!text) {
      return m.reply(`💀 *Responde la pregunta:* ${game.question}`);
    }

    // Verifica respuesta
    if (text.trim().toLowerCase() === game.answer.toLowerCase()) {
      delete activeGames[id];
      return m.reply(`✅ *Correcto!* 🎉 Has respondido bien.`);
    } else {
      return m.reply(`❌ *Incorrecto.* Intenta de nuevo o escribe *${usedPrefix + command}* para otra pregunta.`);
    }
  } else {
    // Genera nueva pregunta
    const random = questions[Math.floor(Math.random() * questions.length)];
    activeGames[id] = {
      id: randomUUID(),
      question: random.question,
      answer: random.answer
    };

    return m.reply(`🎭 *Trivia Jujutsu Kaisen*\n\n${random.question}\n\n_Responde este mensaje con tu respuesta._`);
  }
};

handler.help = ['jujutsutrivia'];
handler.tags = ['game', 'fun'];
handler.command = /^jujutsutrivia$/i;

export default handler;