const { Keyboard, InlineKeyboard } = require('grammy');
const { getAcc } = require('./helper');

const MENU = {
  // Login Flow
  login: '🔗 Hubungkan Akun',
  logout: '🔌 Putuskan Koneksi',
  
  // Group Tools
  createFromList: '📝 Buat Batch',
  createSequential: '🔢 Buat Urut',
  lastResult: '📂 Riwayat Log',
  
  // Hunter Tools
  huntUsername: '💎 Cari Username',
  stopHunt: '🛑 Stop Scan',
  customWordlist: '✍️ Wordlist Custom',
  autoTake: '⚡ Auto Claim',
  
  // General
  help: '💡 Bantuan'
};

// Tampilkan tombol dengan layout yang lebih rapi
function mainMenu(ctx) {
  const acc = ctx ? getAcc(ctx.from.id) : null;
  const loggedIn = !!(acc && acc.authed);

  const kb = new Keyboard();

  if (loggedIn) {
    // Menu Utama saat Login
    kb.text(MENU.createFromList).text(MENU.createSequential).row();
    kb.text(MENU.huntUsername).text(MENU.stopHunt).row();
    kb.text(MENU.customWordlist).text(MENU.autoTake).row();
    kb.text(MENU.lastResult).text(MENU.help).text(MENU.logout);
  } else {
    // Menu saat Belum Login
    kb.text(MENU.login).row();
    kb.text(MENU.help);
  }

  return kb.resized();
}

// Inline tombol BATAL dengan gaya minimalis
function inlineCancelKb() {
  return new InlineKeyboard().text('❌ Batalkan', 'action:cancel');
}

module.exports = { MENU, mainMenu, inlineCancelKb };
