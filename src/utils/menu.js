const { Keyboard, InlineKeyboard } = require('grammy');
const { getAcc } = require('./helper');

const MENU = {
  login: '🔑 Login User 🔑',
  logout: '🚪 Logout 🚪',
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
  const acc = ctx ?  getAcc(ctx.from.id) : null;
  const loggedIn = ! !(acc && acc. authed);
  
  const kb = new Keyboard();
  
  if (loggedIn) {
    // Menu untuk user yang sudah login
    kb
      .text(MENU.createFromList). text(MENU.createSequential). row()
      .text(MENU.huntUsername).text(MENU.stopHunt).row()
      .text(MENU.lastResult).text(MENU.help).row()
      .text(MENU.logout).row();
  } else {
    // Menu untuk user yang belum login
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
