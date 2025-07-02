import './config.js'
import { createRequire } from 'module'
import path, { join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { platform } from 'process'
import * as ws from 'ws'
import fs, { readdirSync, statSync, unlinkSync, existsSync, readFileSync, watch, mkdirSync } from 'fs'
import yargs from 'yargs'
import { spawn } from 'child_process'
import lodash from 'lodash'
import chalk from 'chalk'
import syntaxerror from 'syntax-error'
import Pino from 'pino'
import { Boom } from '@hapi/boom'
import { makeWASocket, protoType, serialize } from './lib/simple.js'
import { Low, JSONFile } from 'lowdb'
import NodeCache from 'node-cache'
import readline from 'readline'

const { PhoneNumberUtil } = (await import('google-libphonenumber')).default
const phoneUtil = PhoneNumberUtil.getInstance()
const { makeInMemoryStore, DisconnectReason, useMultiFileAuthState, MessageRetryMap, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = await import('@whiskeysockets/baileys')

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

global.db = new Low(new JSONFile(`${opts._[0] ? opts._[0] + '_' : ''}database.json`))
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

const connectionOptions = {
  logger: Pino({ level: 'silent' }),
  printQRInTerminal: true,
  browser: ['YutaOkkotsu', 'Chrome', '10.0.0'],
  auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: "fatal" })) },
  msgRetryCounterCache,
  version
}

global.conn = makeWASocket(connectionOptions)

async function connectionUpdate(update) {
  const { connection, lastDisconnect } = update
  const reason = new Boom(lastDisconnect?.error)?.output?.statusCode

  if (update.qr) {
    console.log(chalk.yellow('🧿 Escanea el QR para expandir tu Dominio.'))
  }
  if (connection === 'open') {
    console.log(chalk.green('💠 Conexión establecida: Dominio Expandido.'))
  }
  if (connection === 'close') {
    switch (reason) {
      case DisconnectReason.badSession:
        console.log('🔮 Sesión inválida, elimina credenciales.')
        break
      case DisconnectReason.connectionClosed:
        console.log('⚔️ Conexión cerrada, reiniciando...')
        await reloadHandler(true)
        break
      case DisconnectReason.connectionLost:
        console.log('🧿 Conexión perdida, intentando restaurar...')
        await reloadHandler(true)
        break
      case DisconnectReason.connectionReplaced:
        console.log('💠 Conexión reemplazada, otra sesión abierta.')
        break
      case DisconnectReason.loggedOut:
        console.log('📜 Desvinculado, elimina la carpeta de sesión.')
        break
      case DisconnectReason.restartRequired:
        console.log('🔑 Reinicio necesario.')
        await reloadHandler(true)
        break
      default:
        console.log('🎴 Desconexión desconocida.')
        break
    }
  }
}

global.conn.connectionUpdate = connectionUpdate
global.conn.credsUpdate = saveCreds

global.conn.welcome = `✨ *Yuta Okkotsu te da la bienvenida, @user* ✨\n\n⚔️ *Dominio: @group*\n🔮 *Descripción:*\n@desc`
global.conn.bye = `⚰️ *@user se ha ido del Dominio.*`
global.conn.spromote = `🎖️ *@user ahora es hechicero de alto rango.*`
global.conn.sdemote = `🪶 *@user ha sido degradado.*`
global.conn.sDesc = `📜 *Descripción del Dominio modificada.*`
global.conn.sSubject = `🗡️ *Nombre del Dominio alterado.*`
global.conn.sIcon = `🌀 *Imagen del Dominio cambiada.*`
global.conn.sRevoke = `🔑 *Enlace de invitación reiniciado.*`

// === Plugin Loader ===
global.plugins = {}
const pluginFolder = join(__dirname, './plugins')
const pluginFilter = f => /\.js$/.test(f)

async function filesInit() {
  for (const filename of readdirSync(pluginFolder).filter(pluginFilter)) {
    try {
      const file = global.__filename(join(pluginFolder, filename))
      const module = await import(file)
      global.plugins[filename] = module.default || module
    } catch (e) {
      console.error(e)
    }
  }
}
await filesInit()

global.reload = async (_ev, filename) => {
  if (pluginFilter(filename)) {
    const file = global.__filename(join(pluginFolder, filename))
    try {
      const module = (await import(`${file}?update=${Date.now()}`))
      global.plugins[filename] = module.default || module
      console.log(`🧿 Plugin actualizado: ${filename}`)
    } catch (e) {
      console.error(`Error cargando plugin ${filename}`, e)
    }
  }
}
watch(pluginFolder, global.reload)

global.reloadHandler = async function restatConn() {
  const handler = await import(`./handler.js?update=${Date.now()}`).catch(console.error)
  global.conn.handler = handler.handler.bind(global.conn)
  global.conn.ev.on('messages.upsert', global.conn.handler)
  global.conn.ev.on('connection.update', global.conn.connectionUpdate)
  global.conn.ev.on('creds.update', global.conn.credsUpdate)
  console.log('💠 Handler recargado.')
}

await global.reloadHandler()

setInterval(async () => {
  await global.db.write()
}, 30 * 1000)

setInterval(() => {
  if (process.send) {
    console.log('🔮 Reinicio automático programado.')
    process.send('reset')
  }
}, 1000 * 60 * 45)

process.on('uncaughtException', console.error)