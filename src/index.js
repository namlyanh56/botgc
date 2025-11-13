const { BOT_TOKEN } = require('./config/setting');
const { Bot, session } = require('grammy');
const { mainMenu } = require('./utils/menu');

const auth = require('./handlers/auth');
const groups = require('./handlers/groups');

const bot = new Bot(BOT_TOKEN);

bot.use(session({ initial: () => ({}) }));

bot.command('start', async (ctx) => {
  await ctx.reply('Selamat datang! Silakan pilih menu.', { reply_markup: mainMenu() });
});

auth(bot);
groups(bot);

// route other text to possible login handlers (OTP/password)
bot.on('message:text', async (ctx) => {
  // If there is an active account and it expects OTP/password, it is handled inside auth handler.
  // Here we simply keep the main menu accessible.
  // You can add more global fallbacks if needed.
});

bot.catch((e) => console.error('Bot error:', e));
bot.start().then(()=> console.log('Bot started'));
