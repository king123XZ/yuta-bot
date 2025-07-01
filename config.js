import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import fs from 'fs'
import cheerio from 'cheerio'
import fetch from 'node-fetch'
import axios from 'axios'

//────────────────────────────
// 🔗 Datos del dueño
global.owner = [
  ['51907376960', 'Dueño Principal', true]
]
global.mods = ['51907376960']
global.prems = ['51907376960']

//────────────────────────────
// 🤖 Identidad del bot
global.packname = 'sᥲsᥙkᥱ ᑲ᥆𝗍 🌀'
global.author = 'sᥲsᥙkᥱ ᑲ᥆𝗍 mძ 🌀'
global.stickpack = '© sᥲsᥙkᥱ ᑲ᥆𝗍 mძ 🌀'
global.stickauth = 'ᑲᥡ sᥲsᥙkᥱ ᑲ᥆𝗍'
global.wm = 'sᥲsᥙkᥱ 🌀'
global.dev = '© 𝖯᥆𝗐ᥱ𝗋ᥱძ ᑲᥡ 𝖲ᥙᥒ𝖿ᥣᥲ𝗋ᥱ ☂ 𝖳ᥱᥲ𝗆'
global.wait = '🌪 Aɢᴜᴀʀᴅᴇ ᴜɴ ᴍᴏᴍᴇɴᴛᴏ... ฅ^•ﻌ•^ฅ'
global.botname = '[ sᥲsᥙkᥱ ᑲ᥆𝗍 mძ 🌀 ]'
global.textbot = '⍴᥆ᥕᥱrᥱძ ᑲᥡ sᥲsᥙkᥱ 🌀'
global.listo = 'Aqui tiene ฅ^•ﻌ•^ฅ'
global.namechannel = 'sᥲsᥙkᥱ ᑲ᥆𝗍 mძ 🌀'
global.channel = 'https://whatsapp.com/channel/0029Vaua0ZD3gvWjQaIpSy18'

//────────────────────────────
// 📸 Archivos multimedia
global.catalogo = fs.readFileSync('./storage/img/catalogo.png')
global.miniurl = fs.readFileSync('./storage/img/miniurl.jpg')

//────────────────────────────
// 📎 Links
global.group = 'https://chat.whatsapp.com/CBuLXuVZcg9FEfCSHiY6b0'
global.canal = 'https://whatsapp.com/channel/0029Vaua0ZD3gvWjQaIpSy18'
global.insta = 'https://www.insta.com/sebastian_barboza13'

//────────────────────────────
// 🧩 Dependencias
global.cheerio = cheerio
global.fs = fs
global.fetch = fetch
global.axios = axios

//────────────────────────────
// ⚙️ Config base
global.jadi = 'Sesiones/Subbots'
global.Sesion = 'Sesiones/Principal'
global.dbname = 'database.json'

//────────────────────────────
// 🎮 Economía
global.multiplier = 69
global.maxwarn = 2

//────────────────────────────
// 🔄 Recarga automática
let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.redBright("Se actualizó 'config.js'"))
  import(`${file}?update=${Date.now()}`)
})
