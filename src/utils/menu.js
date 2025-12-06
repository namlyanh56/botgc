const { Keyboard, InlineKeyboard } = require('grammy');
const { getAcc } = require('./helper');

const MENU = {
  login: '🔑 Login User 🔑',
  createFromList: '📝 Buat Grup dari Daftar 📝',
  createSequential: '🚀 Buat Grup Berurutan 🚀',
  lastResult: '📋 Hasil Terakhir 📋',
  help: '❓ Bantuan ❓',
  // Username Hunter
  huntUsername: '🔎 Cari Username 🔎',
  stopHunt: '⏹️ Stop Pencarian ⏹️'
};

// Tampilkan tombol sesuai status login
function mainMenu(ctx) {
  const loggedIn = ! !(ctx && getAcc(ctx. from.id)?.authed);
  const kb = new Keyboard();
  if (loggedIn) {
    kb
      .text(MENU.createFromList). text(MENU.createSequential). row()
      .text(MENU.huntUsername).text(MENU.stopHunt). row()
      . text(MENU. lastResult).text(MENU.help).row();
  } else {
    kb
      .text(MENU.login).text(MENU.help).row();
  }
  return kb. resized();
}

// Inline tombol BATAL untuk kembali ke menu awal
function inlineCancelKb() {
  return new InlineKeyboard(). text('❌ Batal', 'action:cancel');
}

module.exports = { MENU, mainMenu, inlineCancelKb };
