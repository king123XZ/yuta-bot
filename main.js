process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1'
import './config.js'
import { createRequire } from 'module'
import path, { join } from 'path'
import { fileURLToPath } from 'url'
import { platform } from 'process'
import fs from 'fs'
import yargs from 'yargs'
import lodash from 'lodash'
import Pino from 'pino'
import { Boom } from '@hapi/boom'
import { makeWASocket, protoType, serialize } from './lib/simple.js'
import { Low, JSONFile } from 'lowdb'
import readline from 'readline'
import NodeCache from 'node-cache'
import pkg from 'google-libphonenumber'
const { PhoneNumberUtil } = pkg
const phoneUtil = PhoneNumberUtil.getInstance()
const { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = await import('@whiskeysockets/baileys')

protoType()
serialize()

global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
  return rmPrefix ? fileURLToPath(pathURL) : pathURL
}
global.__dirname = function dirname(pathURL) {
  return path.dirname(global.__filename(pathURL, true))
}
global.__require = function require(dir = import.meta.url) {
  return createRequire(dir)
}

const __dirname = global.__dirname(import.meta.url)
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())

global.db = new Low(new JSONFile(`database.json`))
await global.db.read()
global.db.data ||= { users: {}, chats: {}, settings: {} }
global.db.chain = lodash.chain(global.db.data)

const { state, saveCreds } = await useMultiFileAuthState('./session')
const { version } = await fetchLatestBaileysVersion()
const msgRetryCounterCache = new NodeCache()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
})

function question(text) {
  return new Promise(resolve => rl.question(text, ans => resolve(ans.trim())))
}

let opcion = process.argv.includes("qr") ? '1' : process.argv.includes("code") ? '2' : null

if (!opcion) {
  do {
    opcion = await question(`📌 Selecciona conexión:\n1) QR\n2) Código (8 dígitos)\n> `)
  } while (!['1', '2'].includes(opcion))
}

const connectionOptions = {
  logger: Pino({ level: 'silent' }),
  printQRInTerminal: opcion === '1',
  browser: ['BotNode', 'Chrome', '20.0.0'],
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: 'fatal' }))
  },
  msgRetryCounterCache,
  version
}

global.conn = makeWASocket(connectionOptions)

if (opcion === '2') {
  let number = ''
  do {
    number = await question(`📱 Tu número WhatsApp (incluye +): `)
    if (!number.startsWith('+')) number = '+' + number
  } while (!await isValidPhoneNumber(number))
  rl.close()
  const code = await global.conn.requestPairingCode(number)
  console.log(`✅ Vincula tu bot en tu WhatsApp:\nCódigo: ${code.match(/.{1,4}/g).join('-')}`)
}

async function isValidPhoneNumber(number) {
  try {
    const parsed = phoneUtil.parseAndKeepRawInput(number)
    return phoneUtil.isValidNumber(parsed)
  } catch {
    return false
  }
}

global.conn.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
  if (qr) console.log('🔗 Escanea QR en tu WhatsApp.')
  if (connection === 'open') console.log('✅ Bot conectado.')
  if (connection === 'close') {
    const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
    switch (reason) {
      case DisconnectReason.badSession:
        console.log('⚠️ Sesión inválida.')
        break
      default:
        console.log('🔄 Reconectando...')
        break
    }
  }
})

global.conn.ev.on('creds.update', saveCreds)

setInterval(async () => {
  await global.db.write()
}, 30 * 1000)

process.on('uncaughtException', console.error)