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

// Restore session saat startup
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
`⚡ *SYSTEM ONLINE*

Selamat datang, Commander.
*BotGC Prime* siap membantu manajemen aset Telegram Anda.

🔰 *Fitur Utama:*
• _Mass Group Creation_
• _Username Sniper & Claimer_
• _Secure Session Management_

Silakan pilih menu operasi di bawah ini.`;
  
  await ctx.reply(txt, { 
    reply_markup: mainMenu(ctx), 
    parse_mode: 'Markdown' 
  });
});

// Status Dashboard
bot.command('status', async (ctx) => {
  const u = getUser(ctx.from.id);
  const acc = getAcc(ctx.from.id);
  const accountsCount = u.accounts.size;
  const current = acc ? { id: acc.id, authed: !!acc.authed } : null;

  const statusIcon = current && current.authed ? '🟢 CONNECTED' : '🔴 DISCONNECTED';
  const accIdDisplay = current ? `\`${current.id}\`` : '—';

  const txt = 
`🖥️ *DASHBOARD STATUS*
━━━━━━━━━━━━━━━━━━━━
👤 *Operator:* ${ctx.from.first_name}
🗃️ *Vault Akun:* ${accountsCount} Tersimpan
🔑 *Sesi Aktif:* ${accIdDisplay}
📡 *Jaringan:* ${statusIcon}
━━━━━━━━━━━━━━━━━━━━`;

  await ctx.reply(txt, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
});

bot.hears(MENU.help, async (ctx) => {
  const text =
`📚 *MANUAL OPERASIONAL*
━━━━━━━━━━━━━━━━━━━━

📂 *MODUL GRUP*
🔹 *Batch List:* Input daftar nama, bot membuat grup sekaligus.
🔹 *Sequence:* Input satu nama, bot membuat _prefix 1, prefix 2, dst_.
✨ _Fitur:_ Auto-Invite Link & History Visible.

🔭 *MODUL SNIPER*
🔹 *Sniper Mode:* Mencari username 5-8 huruf (Rare/Brandable).
🔹 *Auto Claim:* Jika tersedia, otomatis diamankan ke Channel Publik.
🔹 *Database:* 100k+ kombinasi kata (EN/ID/Tech).

⚠️ *Disclaimer:*
_Gunakan tool ini dengan bijak. Risiko limitasi Telegram ditanggung pengguna._

🛠️ *Developer:* @stuaart`;

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
  await ctx.reply('🔙 *Operasi Dibatalkan.* Kembali ke standby.', { 
    reply_markup: mainMenu(ctx),
    parse_mode: 'Markdown' 
  });
});

bot.catch((e) => console.error('Bot error:', e));
bot.start().then(() => console.log('✅ Bot started cleanly'));
