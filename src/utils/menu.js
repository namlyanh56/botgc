const { Keyboard } = require('grammy');

const MENU = {
  login: '🔑 Login User',
  createFromList: '🆕 Buat Grup dari Daftar',
  createSequential: '🆕 Buat Grup Berurutan',
  lastResult: '📋 Hasil Terakhir',
  cancel: '❌ Batal'
};

function mainMenu() {
  return new Keyboard()
    .text(MENU.login).row()
    .text(MENU.createFromList).row()
    .text(MENU.createSequential).row()
    .text(MENU.lastResult).row()
    .text(MENU.cancel)
    .resized();
}

module.exports = { MENU, mainMenu };
