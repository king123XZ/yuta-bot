process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1';
import './config.js';
import { createRequire } from 'module';
import path, { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { platform } from 'process';
import * as ws from 'ws';
import fs, { readdirSync, statSync, unlinkSync, existsSync, readFileSync, writeFileSync, watch } from 'fs';
import yargs from 'yargs';
import { spawn } from 'child_process';
import lodash from 'lodash';
import chalk from 'chalk';
import syntaxerror from 'syntax-error';
import { tmpdir } from 'os';
import { format } from 'util';
import P from 'pino';
import { makeWASocket, protoType, serialize, DisconnectReason } from './lib/simple.js';
import { Low, JSONFile } from 'lowdb';
import { mongoDB, mongoDBV2 } from './lib/mongoDB.js';
import store from './lib/store.js';
import readline from 'readline';
import NodeCache from 'node-cache';
import pkg from 'google-libphonenumber';
const { PhoneNumberUtil } = pkg;
const phoneUtil = PhoneNumberUtil.getInstance();
const { makeInMemoryStore, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = await import('@whiskeysockets/baileys');
const { CONNECTING } = ws;
const { chain } = lodash;
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;
protoType();
serialize();

global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
  return rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathToFileURL(pathURL).toString();
};

global.__dirname = function dirname(pathURL) {
  return path.dirname(global.__filename(pathURL, true));
};

global.__require = function require(dir = import.meta.url) {
  return createRequire(dir);
};

global.API = (name, path = '/', query = {}, apikeyqueryname) => (name in global.APIs ? global.APIs[name] : name) + path + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({...query, ...(apikeyqueryname ? {[apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name]} : {})})) : '');

global.timestamp = {start: new Date};
global.videoList = [];
global.videoListXXX = [];

const __dirname = global.__dirname(import.meta.url);

global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse());
global.prefix = global.prefijo ? new RegExp('^' + global.prefijo) : new RegExp('^[' + (opts['prefix'] || '*/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.\\-.@').replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + ']');

global.db = new Low(/https?:\/\//.test(opts['db'] || '') ? new cloudDBAdapter(opts['db']) : new JSONFile(`${opts._[0] ? opts._[0] + '_' : ''}${global.dbname}`));

global.DATABASE = global.db; 
global.loadDatabase = async function loadDatabase() {
  if (global.db.READ) {
    return new Promise((resolve) => setInterval(async function() {
      if (!global.db.READ) {
        clearInterval(this);
        resolve(global.db.data == null ? global.loadDatabase() : global.db.data);
      }
    }, 1 * 1000));
  }
  if (global.db.data !== null) return;
  global.db.READ = true;
  await global.db.read().catch(console.error);
  global.db.READ = null;
  global.db.data = {
    users: {},
    chats: {},
    stats: {},
    msgs: {},
    sticker: {},
    settings: {},
    ...(global.db.data || {}),
  };
  global.db.chain = chain(global.db.data);
};
loadDatabase();

global.chatgpt = new Low(new JSONFile(path.join(__dirname, '/db/chatgpt.json')));
global.loadChatgptDB = async function loadChatgptDB() {
  if (global.chatgpt.READ) {
    return new Promise((resolve) =>
      setInterval(async function() {
        if (!global.chatgpt.READ) {
          clearInterval(this);
          resolve( global.chatgpt.data === null ? global.loadChatgptDB() : global.chatgpt.data );
        }
      }, 1 * 1000));
  }
  if (global.chatgpt.data !== null) return;
  global.chatgpt.READ = true;
  await global.chatgpt.read().catch(console.error);
  global.chatgpt.READ = null;
  global.chatgpt.data = {
    users: {},
    ...(global.chatgpt.data || {}),
  };
  global.chatgpt.chain = lodash.chain(global.chatgpt.data);
};
loadChatgptDB();

global.authFile = global.Sesion;
const {state, saveState, saveCreds} = await useMultiFileAuthState(global.authFile);
const msgRetryCounterMap = (MessageRetryMap) => { };
const msgRetryCounterCache = new NodeCache();
const {version} = await fetchLatestBaileysVersion();
let phoneNumber = global.botNumberCode;
const methodCodeQR = process.argv.includes("qr");
const methodCode = !!phoneNumber || process.argv.includes("code");
const MethodMobile = process.argv.includes("mobile");
let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
});

const question = (texto) => {
  rl.clearLine(rl.input, 0);
  return new Promise((resolver) => {
    rl.question(texto, (respuesta) => {
      rl.clearLine(rl.input, 0);
      resolver(respuesta.trim());
    });
  });
};
let opcion;
if (methodCodeQR) {
  opcion = '1';
}
if (!methodCodeQR && !methodCode && !fs.existsSync(`./${authFile}/creds.json`)) {
  do {
    let lineM = '⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ 》';
    opcion = await question('Seleccione una opción :\n1. Conexión mediante código QR.\n2. onexión mediante código de 8 dígitos.\n---> ');
    if (!/^[1-2]$/.test(opcion)) {
      console.log(' Por favor, seleccione solo 1 o 2. ATT YUTA\n');
    }
  } while (opcion !== '1' && opcion !== '2' || fs.existsSync(`./${authFile}/creds.json`));
}

const connectionOptions = {
  logger: pino({ level: 'silent' }),
  printQRInTerminal: opcion == '1' ? true : methodCodeQR ? true : false,
  mobile: MethodMobile, 
  browser: opcion == '1' ? ['YUTA BOT', 'Edge', '20.0.04'] : methodCodeQR ? ['YUTA', 'Edge', '20.0.04'] : ["Ubuntu", "Opera", "20.0.04"],
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: "fatal" }).child({ level: "fatal" })),
  },
  markOnlineOnConnect: true, 
  generateHighQualityLinkPreview: true, 
  syncFullHistory: false,
  getMessage: async (clave) => {
    let jid = jidNormalizedUser(clave.remoteJid);
    let msg = await store.loadMessage(jid, clave.id);
    return msg?.message || "";
  },
  msgRetryCounterCache,
  msgRetryCounterMap,
  defaultQueryTimeoutMs: undefined,
  version: [2, 3000, 1023223821],
};

global.conn = makeWASocket(connectionOptions);
if (!fs.existsSync(`./${authFile}/creds.json`)) {
  if (opcion === '2' || methodCode) {
    opcion = '2';
    if (!conn.authState.creds.registered) {
      let addNumber;
      if (!!phoneNumber) {
        addNumber = phoneNumber.replace(/[^0-9]/g, '');
      } else {
        do {
          phoneNumber = await question(chalk.bgBlack(chalk.bold.greenBright(` Por favor ingrese SU número de WhatsApp para que se pueda enviar el código y pueda ser yuta bot \n${chalk.bold.magentaBright('---> ')}`)));
          phoneNumber = phoneNumber.replace(/\D/g,'');
          if (!phoneNumber.startsWith('+')) {
            phoneNumber = `+${phoneNumber}`;
          }
        } while (!await isValidPhoneNumber(phoneNumber));
        rl.close();
        addNumber = phoneNumber.replace(/\D/g, '');
        setTimeout(async () => {
          let codeBot = await conn.requestPairingCode(addNumber);
          codeBot = codeBot?.match(/.{1,4}/g)?.join("-") || codeBot;
          console.log(chalk.bold.white(chalk.bgMagenta('Eso es tu Código de vinculación ponga esos dijistos :')), chalk.bold.white(chalk.white(codeBot)));
        }, 2000);
      }
    }
  }
}

conn.welcome = '*👋 ¡Hey @user!* \n\n                 *¡BIENVENIDO A LA GUERRA, @group!* \n\n⫹⫺ *Descripción:* \n@desc';
conn.bye = '👋 *Nos vemos, @user*\n\n                *¡QUE LA SUEERTE TE ACOMPAÑE EN LA SOMBRA!*';
conn.spromote = '*[ ℹ️ ] *@user* ahora es uno de los elegidos. ¡Administrador activado!*';
conn.sdemote = '*[ ℹ️ ] *@user* ha caído. Administrador desactivado.*';
conn.sDesc = '*[ ℹ️ ] *@group* ha cambiado su misión. La descripción del grupo ha sido modificada.*';
conn.sSubject = '*[ ℹ️ ] El nombre del clan ha sido renombrado. ¡El nuevo nombre es *@group*!*';
conn.sIcon = '*[ ℹ️ ] La apariencia del grupo ha sido modificada. ¡Nueva foto de perfil activada!*';
conn.sRevoke = '*[ ℹ️ ] *@group* ha reiniciado su acceso. El enlace de invitación ha sido restablecido.*';

async function connectionUpdate(update) {
  const {connection, lastDisconnect, isNewLogin} = update;
  global.stopped = connection;
  if (isNewLogin) conn.isInit = true;
  const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode;
  if (code && code !== DisconnectReason.loggedOut && conn?.ws.socket == null) {
    await global.reloadHandler(true).catch(console.error);
    global.timestamp.connect = new Date;
  }
  if (global.db.data == null) loadDatabase();
  if (update.qr != 0 && update.qr != undefined || methodCodeQR) {
    if (opcion == '1' || methodCodeQR) {
      console.log(chalk.yellow(' Escanea el código QR.'));
    }
  }
  if (connection == 'open') {
    console.log(chalk.yellow('Conectado A YUTA BOT correctamente.'));
  }
}

process.on('uncaughtException', console.error);
