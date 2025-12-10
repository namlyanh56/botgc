const { Keyboard, InlineKeyboard } = require('grammy');
const { getAcc } = require('./helper');

const MENU = {
  login: '🔐 Hubungkan Akun',
  logout: '🔓 Putuskan Sambungan',
  createFromList: '📝 Batch Create',
  createSequential: '🔢 Seq Create',
  lastResult: '📂 History Log',
  help: '💡 Panduan',
  huntUsername: '💎 Start Sniper',
  stopHunt: '🛑 Stop Scanner',
  customWordlist: '📝 Custom Wordlist',
  autoTake: '🎯 Auto Take'
};

function mainMenu(ctx) {
  const acc = ctx ? getAcc(ctx.from.id) : null;
  const loggedIn = !!(acc && acc.authed);

  const kb = new Keyboard();

  if (loggedIn) {
    kb.text(MENU.createFromList).text(MENU.createSequential).row();
    kb.text(MENU.huntUsername).text(MENU.stopHunt).row();
    kb.text(MENU.customWordlist).text(MENU.autoTake).row();
    kb.text(MENU.lastResult).text(MENU.help).text(MENU.logout);
  } else {
    kb.text(MENU.login).row();
    kb.text(MENU.help);
  }

  return kb.resized();
}

function inlineCancelKb() {
  return new InlineKeyboard().text('⛔ Batalkan Operasi', 'action:cancel');
}

module.exports = { MENU, mainMenu, inlineCancelKb };
