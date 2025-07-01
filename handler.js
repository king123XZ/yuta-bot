import { smsg } from './lib/simple.js'
import { format } from 'util'
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'

const { proto } = (await import('@whiskeysockets/baileys')).default
const isNumber = x => typeof x === 'number' && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms))

export async function handler(chatUpdate) {
  this.msgqueque = this.msgqueque || []
  if (!chatUpdate) return
  this.pushMessage(chatUpdate.messages).catch(console.error)
  let m = chatUpdate.messages[chatUpdate.messages.length - 1]
  if (!m) return
  if (global.db.data == null) await global.loadDatabase()
  try {
    m = smsg(this, m) || m
    if (!m) return
    m.exp = 0
    m.limit = false

    let user = global.db.data.users[m.sender]
    if (typeof user !== 'object') global.db.data.users[m.sender] = {}
    if (user) {
      if (!isNumber(user.exp)) user.exp = 0
      if (!isNumber(user.limit)) user.limit = 10
      if (!('premium' in user)) user.premium = false
      if (!('registered' in user)) user.registered = false
    }

    let chat = global.db.data.chats[m.chat]
    if (typeof chat !== 'object') global.db.data.chats[m.chat] = {}
    if (chat && !('isBanned' in chat)) chat.isBanned = false

    let settings = global.db.data.settings[this.user.jid]
    if (typeof settings !== 'object') global.db.data.settings[this.user.jid] = { self: false }

    const mainBot = this.user?.jid
    if (opts['nyimak']) return
    if (!m.fromMe && opts['self']) return

    const sendNum = m.sender.replace(/[^0-9]/g, '')
    const isROwner = [this.decodeJid(this.user?.id), ...global.owner.map(([n]) => n)].some(n => n.includes(sendNum))
    const isOwner = isROwner || m.fromMe
    const isMods = isOwner || global.mods.includes(sendNum)
    const isPrems = isOwner || global.prems.includes(sendNum) || user.premium

    if (m.isBaileys) return
    m.exp += Math.ceil(Math.random() * 10)

    const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins')
    for (let name in global.plugins) {
      let plugin = global.plugins[name]
      if (!plugin || plugin.disabled) continue

      const __filename = join(___dirname, name)
      if (typeof plugin.all === 'function') {
        try { await plugin.all.call(this, m, { chatUpdate, __dirname: ___dirname, __filename }) }
        catch (e) { console.error(e) }
      }

      if (!opts['restrict'] && plugin.tags?.includes('admin')) continue

      const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
      let match = [[new RegExp(str2Regex(global.prefix)).exec(m.text), new RegExp(str2Regex(global.prefix))]].find(p => p[1])

      if (typeof plugin.before === 'function') {
        if (await plugin.before.call(this, m, { match, conn: this, isROwner, isOwner, isMods, isPrems, chatUpdate, __dirname: ___dirname, __filename })) continue
      }

      if (typeof plugin !== 'function') continue
      if ((match[0] || '')[0]) {
        let noPrefix = m.text.replace(match[0][0], '')
        let [command, ...args] = noPrefix.trim().split` `.filter(v => v)
        args = args || []
        let _args = noPrefix.trim().split` `.slice(1)
        let text = _args.join` `
        let isAccept = plugin.command instanceof RegExp ? plugin.command.test(command) : Array.isArray(plugin.command) ? plugin.command.includes(command) : plugin.command === command
        if (!isAccept) continue
        m.isCommand = true
        let xp = 'exp' in plugin ? parseInt(plugin.exp) : 17
        if (xp <= 200) m.exp += xp

        if (!isPrems && plugin.limit && user.limit < plugin.limit) {
          this.reply(m.chat, `🚫 Se agotaron tus límites.`, m)
          continue
        }

        let extra = { match, usedPrefix: global.prefix, noPrefix, _args, args, command, text, conn: this, isROwner, isOwner, isMods, isPrems, chatUpdate, __dirname: ___dirname, __filename }
        try { await plugin.call(this, m, extra) } catch (e) { console.error(e); m.reply(format(e)) }
        if (typeof plugin.after === 'function') await plugin.after.call(this, m, extra)
        break
      }
    }
  } catch (e) { console.error(e) }
}

global.dfail = (type, m, conn) => {
  let msg = {
    owner: "🚫 Este comando es solo para el owner.",
    mods: "🚫 Solo para mods.",
    premium: "🚫 Solo para usuarios premium.",
    group: "🚫 Solo disponible en grupos.",
    private: "🚫 Solo en privado.",
    admin: "🚫 Solo para admins.",
    botAdmin: "🚫 Necesito ser admin.",
    unreg: "🚫 Regístrate primero.",
    restrict: "🚫 Comando restringido."
  }[type]
  if (msg) return conn.reply(m.chat, msg, m)
}

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.redBright("Se actualizó 'handler.js'"))
  import(`${file}?update=${Date.now()}`)
})
