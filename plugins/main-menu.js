import { promises } from 'fs'
import { join } from 'path'
import { xpRange } from '../lib/levelling.js'

const more = String.fromCharCode(8206);
const readMore = more.repeat(4001);

export default async function menuHandler(m, { conn, usedPrefix: _p, __dirname }) {
  try {
    // Usuario y timing
    let user = global.db.data.users[m.sender] || {}
    let { exp = 0, limit = 5, level = 1 } = user
    const { min, xp, max } = xpRange(level, global.multiplier)

    // Fechas y hora
    let d = new Date(Date.now() + 3600000)
    let locale = 'es'
    let week = d.toLocaleDateString(locale, { weekday: 'long' })
    let date = d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    let time = d.toLocaleTimeString(locale, { hour: 'numeric', minute: 'numeric', second: 'numeric' })

    // Uptime
    let uptime = clockString(process.uptime() * 1000)
    let muptime = ''
    if (process.send) {
      process.send('uptime')
      muptime = await new Promise(resolve => {
        process.once('message', resolve)
        setTimeout(resolve, 1000)
      }) * 1000
    }

    // Nombre de usuario y totales
    let name = await conn.getName(m.sender).catch(() => 'Usuario')
    let totalreg = Object.keys(global.db.data.users).length

    // Construcción del menú
    let before = `--------[ *I N F O - U S E R* ]----------

▧ Nombre : ${name}
▧ Experiencia: ${exp}
▧ Nivel : ${level}

--------[ *I N F O - B O T* ]----------

▧ Estado : ${global.opts.self ? 'Privado' : 'Público'}
▧ Uptime : ${muptime ? clockString(muptime) : ''}
▧ Usuarios : ${totalreg}

${readMore}`

    // Recolectar y agrupar comandos
    let help = Object.values(global.plugins)
      .filter(p => p.help && !p.disabled)
      .map(p => ({ tags: p.tags || ['otros'], help: Array.isArray(p.help) ? p.help : [p.help] }))
    let tags = {}
    for (let { tags: tlist, help: hlist } of help) {
      for (let tag of tlist) {
        tags[tag] = tags[tag] || []
        tags[tag].push(...hlist)
      }
    }

    // Generar texto de comandos
    let text = before + '\n'
    for (let tag in tags) {
      text += `┏━━━[ ${tag.toUpperCase()} ]━━━┓\n`
      for (let cmd of tags[tag]) text += `┃ ${_p}${cmd}\n`
      text += `┗━━━━━━━━━━━━━━━┛\n`
    }
    text += `\n🔹 Para más info: usa ${_p}help <comando>`

    // Enviar solo texto
    await conn.sendMessage(m.chat, { text }, { quoted: m })

  } catch (e) {
    console.error(e)
    await conn.reply(m.chat, '❎ Lo sentimos, el menú tiene un error.', m)
  }
}

function clockString(ms) {
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
}

menuHandler.command = ['allmenu','menucompleto','menúcompleto','help','menu2']
menuHandler.help = ['allmenu']
menuHandler.tags = ['main']
menuHandler.register = true
