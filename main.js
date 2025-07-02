process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1'
import './config.js'
import { createRequire } from 'module'
import path, { join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { platform } from 'process'
import * as ws from 'ws'
import fs, { readdirSync, statSync, unlinkSync, existsSync, readFileSync, watch } from 'fs'
import yargs from 'yargs'
import { spawn } from 'child_process'
import lodash from 'lodash'
import chalk from 'chalk'
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
  return rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathToFileURL(pathURL).toString()
}
global.__dirname = function dirname(pathURL) {
  return path.dirname(global.__filename(pathURL, true))
}
global.__require = function require(dir = import.meta.url) {
  return createRequire(dir)
}

global.timestamp = { start: new Date }
const __dirname = global.__dirname(import.meta.url)
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
global.prefix = new RegExp('^[' + (opts['prefix'] || '*/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.\\-.@').replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + ']')

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

function question(texto) {
  return new Promise(resolve => rl.question(texto, ans => resolve(ans.trim())))
}

let opcion = process.argv.includes("qr") ? '1' : process.argv.includes("code") ? '2' : null

if (!opcion) {
  do {
    opcion = await question(`🌱 Selecciona una opción:\n1) Conexión QR\n2) Conexión con código de 8 dígitos\n---> `)
    if (!/^[1-2]$/.test(opcion)) console.log(`❌ Opción inválida.\n`)
  } while (!/^[1-2]$/.test(opcion))
}

const connectionOptions = {
  logger: Pino({ level: 'silent' }),
  printQRInTerminal: opcion === '1',
  browser: ['WaBot', 'Edge', '20.0.04'],
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: 'fatal' }))
  },
  msgRetryCounterCache,
  version
}

global.conn = makeWASocket(connectionOptions)

if (opcion === '2') {
  let number
  do {
    number = await question(`📱 Ingresa tu número de WhatsApp (+51...): `)
    number = number.replace(/\D/g, '')
    if (!number.startsWith('+')) number = `+${number}`
  } while (!await isValidPhoneNumber(number))

  const code = await global.conn.requestPairingCode(number)
  console.log(`🔑 Tu código de vinculación:\n👉 ${code.match(/.{1,4}/g).join('-')}`)
  rl.close()
}

async function isValidPhoneNumber(number) {
  try {
    const parsedNumber = phoneUtil.parseAndKeepRawInput(number)
    return phoneUtil.isValidNumber(parsedNumber)
  } catch {
    return false
  }
}

async function connectionUpdate(update) {
  const { connection, lastDisconnect } = update
  const reason = new Boom(lastDisconnect?.error)?.output?.statusCode

  if (update.qr) console.log(`🧿 Escanea el QR en tu WhatsApp`)

  if (connection === 'open') console.log(`✅ Bot conectado!`)

  if (connection === 'close') {
    switch (reason) {
      case DisconnectReason.badSession:
        console.log(`⚠️ Sesión inválida.`)
        break
      default:
        console.log(`🔄 Reintentando conexión...`)
        break
    }
  }
}

global.conn.ev.on('connection.update', connectionUpdate)
global.conn.ev.on('creds.update', saveCreds)

setInterval(async () => {
  await global.db.write()
}, 30 * 1000)

process.on('uncaughtException', console.error)