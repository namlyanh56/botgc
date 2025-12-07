const { BOT_TOKEN, MESSAGE_EFFECT_ID, HELP_EFFECT_ID, API_ID, API_HASH } = require('./config/setting');
const { Bot, session } = require('grammy');
const { mainMenu, MENU } = require('./utils/menu');
const { loadSessions } = require('./utils/sessionStore');
const { getUser, getAcc } = require('./utils/helper');
const Account = require('./model/Account');

const auth = require('./handlers/auth');
const groups = require('./handlers/groups');
const hunter = require('./handlers/hunter');

const bot = new Bot(BOT_TOKEN);
bot.use(session({ initial: () => ({}) }));

(function restoreSessions() {
  const saved = loadSessions();
  Object.keys(saved || {}).forEach((userId) => {
    const u = getUser(userId);
    for (const sess of saved[userId]) {
      const acc = new Account(userId);
      acc.id = sess.id;
      acc.sess = sess.sess;
      acc.authed = true;
      acc.buildClient(API_ID, API_HASH);
      u.accounts.set(acc.id, acc);
      if (!u.active) u.active = acc.id;
    }
  });
})();

bot.command('start', async (ctx) => {
  const txt = 
`*👋 WELCOME, COMMANDER.*

Sistem siap digunakan. Silakan hubungkan akun Telegram Anda untuk memulai manajemen Grup atau Username Sniper.

_Pilih menu di bawah untuk navigasi._`;
  
  await ctx.reply(txt, { 
    reply_markup: mainMenu(ctx), 
    parse_mode: 'Markdown' 
  });
});

// Status dengan gaya terminal
bot.command('status', async (ctx) => {
  const u = getUser(ctx.from.id);
  const acc = getAcc(ctx.from.id);
  const accountsCount = u.accounts.size;
  const current = acc ? { id: acc.id, authed: !!acc.authed } : null;

  const statusIcon = current && current.authed ? '🟢 ONLINE' : '🔴 OFFLINE';

  const txt = 
`💻 *SYSTEM STATUS*
━━━━━━━━━━━━━━━━━━
👤 *User:* \`${ctx.from.first_name}\`
📂 *Saved Accounts:* \`${accountsCount}\`
🔑 *Active Session:* \`${current ? current.id : 'N/A'}\`
📡 *Connection:* ${statusIcon}
━━━━━━━━━━━━━━━━━━`;

  await ctx.reply(txt, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
});

bot.hears(MENU.help, async (ctx) => {
  const text =
`🤖 *BOT MANUAL INTERFACE*
━━━━━━━━━━━━━━━━━━━━

🔹 *GROUP MANAGER*
• *Batch Create*: Buat banyak grup sekaligus dari daftar nama.
• *Seq Create*: Buat grup berurutan (Grup 1, Grup 2, dst).
• *Fitur*: Auto set history visible & generate invite link.

🔹 *USERNAME SNIPER*
• *Start Sniper*: Mencari username cantik/langka secara otomatis.
• *Database*: 100k+ kata dasar (Crypto, NFT, Indo, Jawa).
• *Action*: Bot akan menahan username di channel publik.

⚠️ *Note:* _Gunakan dengan bijak untuk menghindari limit Telegram._

Owner: @stuaart`;

  const effect = HELP_EFFECT_ID || MESSAGE_EFFECT_ID;
  const opts = { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' };
  if (effect) opts.message_effect_id = effect;
  await ctx.reply(text, opts);
});

auth(bot);
groups(bot);
hunter(bot);

bot.callbackQuery('action:cancel', async (ctx) => {
  try { await ctx.answerCallbackQuery(); } catch {}
  try { ctx.session = null; } catch {}
  try { await ctx.deleteMessage(); } catch {}
  await ctx.reply('🔙 *Operasi dibatalkan.* Kembali ke menu utama.', { 
    reply_markup: mainMenu(ctx),
    parse_mode: 'Markdown' 
  });
});

bot.catch((e) => console.error('Bot error:', e));
bot.start().then(() => console.log('✅ Bot started'));
