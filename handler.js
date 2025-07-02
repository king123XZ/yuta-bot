import { smsg } from './lib/simple.js'
import { format } from 'util'
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'

const isNumber = x => typeof x === 'number' && !isNaN(x)
const delay = ms => new Promise(res => setTimeout(res, ms))

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

    const user = global.db.data.users[m.sender] ||= {
      exp: 0, limit: 10, premium: false, registered: false, name: m.name, age: -1, regTime: -1, afk: -1, afkReason: '', banned: false, useDocument: false, level: 0, bank: 0
    }

    const chat = global.db.data.chats[m.chat] ||= {
      isBanned: false, bienvenida: false, antiLink: false, detect: true, onlyLatinos: false, audios: false, modoadmin: false, nsfw: false, expired: 0, antiLag: false, per: []
    }

    const settings = global.db.data.settings[this.user.jid] ||= {
      self: false, autoread: false, antiPrivate: false, antiBot2: false, antiSpam: false
    }

    const mainBot = this.user.jid
    const isAllowed = chat.per.includes(mainBot)
    if (chat.antiLag && !isAllowed) return

    if (opts['nyimak'] || (!m.fromMe && opts['self']) || (opts['swonly'] && m.chat !== 'status@broadcast')) return

    m.text = m.text || ''
    m.exp = 0
    m.limit = false

    const sendNum = m.sender.replace(/\D/g, '')
    const isROwner = [this.decodeJid(this.user.id), ...global.owner.map(([n]) => n)].map(v => v.replace(/\D/g, '')).includes(sendNum)
    const isOwner = isROwner || m.fromMe
    const isMods = isOwner || global.mods.map(v => v.replace(/\D/g, '') + '@s.whatsapp.net').includes(m.sender)
    const isPrems = isROwner || global.prems.map(v => v.replace(/\D/g, '') + '@s.whatsapp.net').includes(m.sender) || user.premium

    if (opts['queque'] && m.text && !(isMods || isPrems)) {
      let queque = this.msgqueque, time = 5000
      const last = queque[queque.length - 1]
      queque.push(m.id || m.key.id)
      setInterval(() => {
        if (!queque.includes(last)) clearInterval(this)
      }, time)
      await delay(time)
    }

    if (m.isBaileys) return
    m.exp += Math.ceil(Math.random() * 10)

    const groupMetadata = m.isGroup ? ((this.chats[m.chat] || {}).metadata || await this.groupMetadata(m.chat).catch(_ => null)) || {} : {}
    const participants = m.isGroup ? groupMetadata.participants || [] : []

    const normalize = jid => jid?.replace(/\D/g, '')
    const userP = participants.find(u => normalize(u.id) === normalize(m.sender)) || {}
    const botP = participants.find(u => [normalize(this.user.jid), normalize(this.user.lid)].includes(normalize(u.id))) || {}

    const isRAdmin = userP.admin === 'superadmin'
    const isAdmin = isRAdmin || userP.admin === 'admin'
    const isBotAdmin = !!botP.admin

    const __plugins = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins')
    for (let name in global.plugins) {
      let plugin = global.plugins[name]
      if (!plugin || plugin.disabled) continue
      const __file = join(__plugins, name)

      if (typeof plugin.all === 'function') await plugin.all.call(this, m, { chatUpdate, __dirname: __plugins, __filename: __file })

      if (!opts['restrict'] && plugin.tags?.includes('admin')) continue

      const _prefix = plugin.customPrefix || this.prefix || global.prefix
      const str2Regex = s => s.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
      const match = (Array.isArray(_prefix) ? _prefix : [_prefix])
        .map(p => [new RegExp(p instanceof RegExp ? p.source : str2Regex(p)).exec(m.text), p])
        .find(([r]) => r)

      if (typeof plugin.before === 'function')
        if (await plugin.before.call(this, m, { match, conn: this, participants, groupMetadata, user: userP, bot: botP, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, chatUpdate, __dirname: __plugins, __filename: __file })) continue

      if (typeof plugin !== 'function') continue
      if (!match?.[0]) continue

      let noPrefix = m.text.replace(match[0][0], '').trim()
      let [command, ...args] = noPrefix.split` `.filter(v => v)
      let text = args.join` `

      const gruposOK = ['120363146549758457@g.us']
      const comandosOK = ['serbot', 'kick', 'bots', 'code', 'on', 'off']
      if (gruposOK.includes(m.chat) && !comandosOK.includes(command)) return

      const fail = plugin.fail || global.dfail
      const isAccept = plugin.command instanceof RegExp ? plugin.command.test(command) : Array.isArray(plugin.command) ? plugin.command.includes(command) : plugin.command === command
      if (!isAccept) continue

      m.plugin = name
      if (global.db.data.chats[m.chat].isBanned || user.banned) return

      if (global.db.data.chats[m.chat].modoadmin && !isOwner && !isROwner && m.isGroup && !isAdmin) return

      if (plugin.rowner && !isROwner) return fail('rowner', m, this)
      if (plugin.owner && !isOwner) return fail('owner', m, this)
      if (plugin.mods && !isMods) return fail('mods', m, this)
      if (plugin.premium && !isPrems) return fail('premium', m, this)
      if (plugin.group && !m.isGroup) return fail('group', m, this)
      if (plugin.botAdmin && !isBotAdmin) return fail('botAdmin', m, this)
      if (plugin.admin && !isAdmin) return fail('admin', m, this)
      if (plugin.private && m.isGroup) return fail('private', m, this)
      if (plugin.register && !user.registered) return fail('unreg', m, this)

      m.isCommand = true
      let xp = plugin.exp ?? 17
      m.exp += xp > 200 ? 0 : xp

      if (!isPrems && plugin.limit && user.limit < plugin.limit) {
        this.reply(m.chat, `🌀 *Yuta Okkotsu* dice: Sin Eris suficientes para este comando.`, m)
        continue
      }

      let extra = { match, usedPrefix: match[1], noPrefix, args, command, text, conn: this, participants, groupMetadata, user: userP, bot: botP, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, chatUpdate, __dirname: __plugins, __filename: __file }
      await plugin.call(this, m, extra)

      if (!isPrems) m.limit = plugin.limit || false

      if (typeof plugin.after === 'function') await plugin.after.call(this, m, extra)

      if (m.limit) this.reply(m.chat, `🗡️ *Jujutsu*: Usaste ${m.limit} Eris`, m)

      break
    }

  } catch (e) {
    console.error(chalk.redBright(`🔻 Error JJK:`), e)
  } finally {
    const idx = this.msgqueque.indexOf(m.id || m.key.id)
    if (idx !== -1) this.msgqueque.splice(idx, 1)

    user.exp += m.exp
    user.limit -= m.limit || 0

    if (opts['autoread']) await this.readMessages([m.key])
    if (global.db.data.settings[this.user.jid]?.autoread) await this.readMessages([m.key])
  }
}

global.dfail = (type, m, conn) => {
  const msg = {
    rowner: "🔒 Solo para *Maestros Hechiceros*",
    owner: "🔒 Solo para *Yuta Okkotsu*",
    mods: "⚡ Solo para *Exorcistas Autorizados*",
    premium: "💎 Necesitas *Energía Maldita Premium*",
    group: "👥 Solo en *Grupos de Jujutsu*",
    private: "🔒 Solo en *Chat Privado JJK*",
    admin: "🧿 Debes ser *Admin del Dominio*",
    botAdmin: "⚙️ *El Bot debe ser Admin* para esto",
    unreg: "📜 Regístrate primero: .reg nombre.edad"
  }[type]
  if (msg) return conn.reply(m.chat, msg, m)
}

let file = global.__filename(import.meta.url, true)
watchFile(file, async () => {
  unwatchFile(file)
  console.log(chalk.cyanBright(`💫 Se re-cargó *handler.js* - Dominios Jujutsu activados!`))
  if (global.reloadHandler) console.log(await global.reloadHandler())
})