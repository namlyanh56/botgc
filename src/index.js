const { BOT_TOKEN, MESSAGE_EFFECT_ID, HELP_EFFECT_ID, API_ID, API_HASH } = require('./config/setting');
const { Bot, session } = require('grammy');
const { mainMenu, MENU } = require('./utils/menu');
const { loadSessions } = require('./utils/sessionStore'); // <— baru
const { getUser } = require('./utils/helper'); // <— baru
const Account = require('./model/Account'); // <— baru

const auth = require('./handlers/auth');
const groups = require('./handlers/groups');
const hunter = require('./handlers/hunter');

const bot = new Bot(BOT_TOKEN);
bot.use(session({ initial: () => ({}) }));

// Bootstrap: load saved MTProto sessions so menu menampilkan tombol hunter setelah restart
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
  await ctx.reply('👋 Selamat datang! Silakan pilih menu:', { reply_markup: mainMenu(ctx) });
});

bot.hears(MENU.help, async (ctx) => {
  const text =
`🔥 Bot Pembuat Grup & Username Hunter 🔥

Fitur Grup:
• Login user (OTP/2FA) via bot
• Buat banyak supergroup berurutan
• Atur history agar terlihat
• Kirim link undangan setiap grup

🔎 Username Hunter:
• Cari username channel yang tersedia
• Wordlist otomatis 100,000+ kandidat
• Bahasa: English, Indonesia, Jawa
• Kata NFT/Crypto bernilai tinggi
• Prefix A-Z otomatis
• Filter: huruf a-z, panjang 5-8
• Konfirmasi Terima/Tolak hasil

Owner: @stuaart`;

  const effect = HELP_EFFECT_ID || MESSAGE_EFFECT_ID;
  const opts = { reply_markup: mainMenu(ctx) };
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
  await ctx.reply('↩️ Kembali ke menu awal.', { reply_markup: mainMenu(ctx) });
});

bot.catch((e) => console.error('Bot error:', e));
bot.start().then(() => console.log('✅ Bot started'));
