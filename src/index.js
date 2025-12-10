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
`👋 *Halo, Komandan.*

Sistem manajemen *Grup* dan *Username Sniper* siap digunakan. 
Silakan hubungkan akun Telegram Anda untuk memulai operasi.

_👇 Ketuk menu di bawah untuk navigasi._`;
  
  await ctx.reply(txt, { 
    reply_markup: mainMenu(ctx), 
    parse_mode: 'Markdown' 
  });
});

// Status dengan gaya dashboard minimalis
bot.command('status', async (ctx) => {
  const u = getUser(ctx.from.id);
  const acc = getAcc(ctx.from.id);
  const accountsCount = u.accounts.size;
  const current = acc ? { id: acc.id, authed: !!acc.authed } : null;

  const statusIcon = current && current.authed ? '🟢 TERHUBUNG' : '🔴 TERPUTUS';

  const txt = 
`🖥 *STATUS SISTEM*
──────────────
👤 Pengguna : \`${ctx.from.first_name}\`
📂 Akun Tersimpan : \`${accountsCount}\`
🔑 ID Sesi : \`${current ? current.id : 'N/A'}\`
📡 Koneksi : ${statusIcon}
──────────────`;

  await ctx.reply(txt, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
});

bot.hears(MENU.help, async (ctx) => {
  const text =
`💡 *PANDUAN SISTEM*
──────────────

🔹 *MANAJEMEN GRUP*
• *${MENU.createFromList}*: Buat banyak grup sekaligus dari daftar teks.
• *${MENU.createSequential}*: Buat grup dengan penomoran otomatis.

🔹 *USERNAME SNIPER*
• *${MENU.huntUsername}*: Cari username unik/langka secara otomatis.
• *${MENU.stopHunt}*: Hentikan proses pencarian.
• *${MENU.customWordlist}*: Gunakan kata kunci racikan sendiri.
• *${MENU.autoTake}*: Pantau & klaim username target secara otomatis.

⚠️ _Gunakan fitur ini dengan bijak untuk menghindari pembatasan Telegram._

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
  await ctx.reply('🔙 *Operasi Dibatalkan.*', { 
    reply_markup: mainMenu(ctx),
    parse_mode: 'Markdown' 
  });
});

bot.catch((e) => console.error('Bot error:', e));
bot.start().then(() => console.log('✅ Bot started'));
