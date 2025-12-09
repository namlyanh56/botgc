const { Keyboard, InlineKeyboard } = require('grammy');
const { getAcc } = require('./helper');

const MENU = {
  // Auth
  login: '🔗 Hubungkan Sesi',
  logout: '🔌 Putuskan Koneksi',
  
  // Group Tools
  createFromList: '📑 Buat Grup (List)',
  createSequential: '🔢 Buat Grup (Urut)',
  lastResult: '📜 Riwayat Log',
  
  // System
  help: '📚 Panduan',
  
  // Sniper Tools
  huntUsername: '🔭 Sniper Mode',
  stopHunt: '⏹️ Hentikan Tugas',
  customWordlist: '⚙️ Wordlist Custom',
  autoTake: '⚡ Auto Claim'
};

// Tampilkan tombol dengan layout yang lebih rapi dan simetris
function mainMenu(ctx) {
  const acc = ctx ? getAcc(ctx.from.id) : null;
  const loggedIn = !!(acc && acc.authed);

  const kb = new Keyboard();

  if (loggedIn) {
    // Baris 1: Fitur Utama Grup
    kb.text(MENU.createFromList).text(MENU.createSequential).row();
    // Baris 2: Fitur Sniper
    kb.text(MENU.huntUsername).text(MENU.autoTake).row();
    // Baris 3: Utilitas Tambahan
    kb.text(MENU.customWordlist).text(MENU.lastResult).row();
    // Baris 4: System
    kb.text(MENU.help).text(MENU.stopHunt).text(MENU.logout);
  } else {
    // Menu saat Belum Login
    kb.text(MENU.login).row();
    kb.text(MENU.help);
  }

  return kb.resized();
}

// Inline tombol BATAL dengan gaya minimalis
function inlineCancelKb() {
  return new InlineKeyboard().text('❌ Batalkan Operasi', 'action:cancel');
}

module.exports = { MENU, mainMenu, inlineCancelKb };
