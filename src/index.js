const { BOT_TOKEN, MESSAGE_EFFECT_ID, HELP_EFFECT_ID } = require('./config/setting');
const { Bot, session } = require('grammy');
const { mainMenu, MENU } = require('./utils/menu');

const auth = require('./handlers/auth');
const groups = require('./handlers/groups');

const bot = new Bot(BOT_TOKEN);

bot.use(session({ initial: () => ({}) }));

bot.command('start', async (ctx) => {
  await ctx.reply('Selamat datang! Silakan pilih menu.', { reply_markup: mainMenu(ctx) });
});

// Tombol bantuan
bot.hears(MENU.help, async (ctx) => {
  const text =
`🔥 Bot Pembuat Grup Otomatis 🔥

Fungsi:
• Login user (OTP/2FA) via bot
• Buat banyak supergroup berurutan
• Atur history agar terlihat
• Kirim link undangan setiap grup

Owner: @stuaart
Note: Hindari jumlah terlalu besar untuk meminimalkan FLOOD_WAIT.`;

  const effect = HELP_EFFECT_ID || MESSAGE_EFFECT_ID;
  const opts = { reply_markup: mainMenu(ctx) };
  if (effect) opts.message_effect_id = effect;
  await ctx.reply(text, opts);
});

auth(bot);
groups(bot);

// Callback tombol Batal (inline)
bot.callbackQuery('action:cancel', async (ctx) => {
  try { await ctx.answerCallbackQuery(); } catch {}
  try { ctx.session = null; } catch {}
  // Hapus pesan yang menampilkan tombol batal (opsional)
  try { await ctx.deleteMessage(); } catch {}
  await ctx.reply('Kembali ke menu awal.', { reply_markup: mainMenu(ctx) });
});

// Fallback global
bot.on('message:text', async (ctx) => {
  // Biarkan handler lain menangani; kita hanya menjaga menu tetap mudah diakses.
});

bot.catch((e) => console.error('Bot error:', e));
bot.start().then(()=> console.log('Bot started'));
