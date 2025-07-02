process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1'
import './config.js'
import { createRequire } from 'module'
import path, { join } from 'path'
import { fileURLToPath } from 'url'
import { platform } from 'process'
import fs, { readdirSync, existsSync, watch } from 'fs'
import readline from 'readline'
import yargs from 'yargs'
import pino from 'pino'
import { Boom } from '@hapi/boom'
import NodeCache from 'node-cache'
import lodash from 'lodash'
import { Low, JSONFile } from 'lowdb'
import { makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
global.__filename = fileURLToPath
global.__dirname = __dirname
global.__require = createRequire(import.meta.url)

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function question(text) {
  return new Promise(resolve => rl.question(text, ans => resolve(ans.trim())))
}

// === DB ===
global.db = new Low(new JSONFile('database.json'))
await global.db.read()
global.db.data ||= { users: {}, chats: {}, settings: {} }
global.db.chain = lodash.chain(global.db.data)

// === Auth ===
const { state, saveCreds } = await useMultiFileAuthState('./session')
const { version } = await fetchLatestBaileysVersion()
const msgRetryCounterCache = new NodeCache()

// === Selección ===
let opcion = ''
if (!process.argv.includes('--qr') && !process.argv.includes('--code')) {
  do {
    opcion = await question('\n[1] QR\n[2] CODE\n> ')
  } while (!['1', '2'].includes(opcion))
} else {
  opcion = process.argv.includes('--qr') ? '1' : '2'
}

// === Conexión ===
const conn = makeWASocket({
  logger: pino({ level: 'silent' }),
  printQRInTerminal: opcion === '1',
  mobile: opcion === '2',
  browser: ['Bot', 'Chrome', '120.0.1'],
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
  },
  version,
  msgRetryCounterCache
})

global.conn = conn

// === Si CODE ===
if (opcion === '2' && !conn.authState.creds.registered) {
  conn.ev.once('connection.update', async ({ connection }) => {
    if (connection === 'open') {
      let numero = ''
      do {
        numero = await question('📱 Tu número (+51...): ')
      } while (!numero)
      numero = numero.replace(/\D/g, '')
      if (!numero.startsWith('+')) numero = '+' + numero
      const code = await conn.requestPairingCode(numero)
      console.log(`✅ Código de vinculación: ${code}`)
      rl.close()
    }
  })
}

// === Manejo de conexión ===
conn.ev.on('connection.update', async update => {
  const { connection, lastDisconnect } = update
  if (connection === 'open') console.log('✅ Conexión establecida.')
  if (connection === 'close') {
    const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
    if (reason === DisconnectReason.loggedOut) {
      console.log('❌ Sesión cerrada, borra la carpeta ./session y vuelve a iniciar.')
    } else {
      console.log('♻️ Reiniciando...')
      process.exit()
    }
  }
})

conn.ev.on('creds.update', saveCreds)

// === Plugins / Handler dummy ===
console.log('✨ Bot iniciado.')
// Aquí carga tus plugins reales si quieres

setInterval(async () => {
  await global.db.write()
}, 30 * 1000)

process.on('uncaughtException', console.error)