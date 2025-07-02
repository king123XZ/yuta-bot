import './config.js'
import { createRequire } from 'module'
import path, { join } from 'path'
import { fileURLToPath } from 'url'
import { platform } from 'process'
import { Low, JSONFile } from 'lowdb'
import yargs from 'yargs'
import { Boom } from '@hapi/boom'
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } from '@whiskeysockets/baileys'
import readline from 'readline'
import pino from 'pino'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

global.__filename = () => __filename
global.__dirname = () => __dirname

global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())

global.db = new Low(new JSONFile(`database.json`))
await global.db.read()
global.db.data ||= { users: {}, chats: {}, settings: {} }

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (texto) => {
  return new Promise((resolve) => rl.question(texto, (ans) => resolve(ans.trim())))
}

const { state, saveCreds } = await useMultiFileAuthState('./session')
const { version } = await fetchLatestBaileysVersion()

let opcion = ''
if (!process.argv.includes('--qr') && !process.argv.includes('--code')) {
  do {
    opcion = await question('\n📌 ¿Cómo deseas vincular?\n[1] Código QR\n[2] Código de 8 dígitos\n> ')
  } while (!['1', '2'].includes(opcion))
} else {
  opcion = process.argv.includes('--qr') ? '1' : '2'
}

const conn = makeWASocket({
  logger: pino({ level: 'silent' }),
  printQRInTerminal: opcion === '1',
  mobile: opcion === '2',
  browser: opcion === '1' ? ['Bot', 'Chrome', '10.0'] : ['Bot', 'Edge', '120.0'],
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
  },
  version
})

conn.ev.on('connection.update', async (update) => {
  const { connection, lastDisconnect } = update
  if (connection === 'open') {
    console.log('✅ Conexión abierta')
    if (opcion === '2') {
      rl.close()
      let numero = await question('\n📱 Ingresa tu número de WhatsApp (ej: +51999999999): ')
      numero = numero.replace(/\D/g, '')
      if (!numero.startsWith('+')) numero = '+' + numero
      try {
        const code = await conn.requestPairingCode(numero)
        console.log(`\n🔑 Tu código de vinculación es: ${code}`)
      } catch (e) {
        console.error('❌ Error al generar el código:', e)
      }
    }
  }

  if (connection === 'close') {
    const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
    if (reason === DisconnectReason.badSession) {
      console.log('❌ Sesión inválida, elimina ./session y vuelve a intentar.')
    } else {
      console.log('⚠️ Conexión cerrada, reiniciando...')
      process.exit()
    }
  }
})

conn.ev.on('creds.update', saveCreds)