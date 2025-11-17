const { MENU } = require('../utils/menu');
const { getUser } = require('../utils/helper');
const Account = require('../model/Account');
const { API_ID, API_HASH } = require('../config/setting');
const { Keyboard } = require('grammy');

function normalizePhone(raw) {
  if (!raw) return '';
  let s = String(raw).trim();
  s = s.replace(/[^\d+]/g, '');
  if (/^0\d+/.test(s)) s = '+62' + s.slice(1); // contoh lokal Indonesia
  if (/^\d{8,15}$/.test(s) && !s.startsWith('+')) s = '+' + s;
  return s;
}

module.exports = (bot) => {
  bot.hears(MENU.login, async (ctx) => {
    const u = getUser(ctx.from.id);
    const acc = new Account(ctx.from.id);
    u.accounts.set(acc.id, acc);
    u.active = acc.id;

    const kb = new Keyboard()
      .requestContact('📂 Kirim nomor 📂')
      .text(MENU.cancel)
      .resized();

    ctx.session = { act: 'login_phone', id: acc.id };
    await ctx.reply('📱 Kirim Nomor Telepon Anda (format: +628xxx) atau gunakan tombol di bawah untuk membagikan kontak.', { reply_markup: kb });
  });

  bot.on('message:contact', async (ctx, next) => {
    const s = ctx.session;
    if (!s || s.act !== 'login_phone') return next();
    const u = getUser(ctx.from.id);
    const acc = u.accounts.get(s.id);
    if (!acc) return ctx.reply('Sesi login tidak ditemukan. Ulangi.');

    const phone = normalizePhone(ctx.message.contact?.phone_number || '');
    if (!/^\+\d{8,15}$/.test(phone)) return ctx.reply('❌ Format salah. Contoh: +6281234567890');

    // Jangan await agar update OTP berikutnya tidak terblokir
    ctx.session = { act: 'login_waiting', id: acc.id };
    acc.login(ctx, API_ID, API_HASH, phone).catch((e) => {
      console.error('[login contact] error:', e);
    });
    // Jangan hapus ctx.session di sini; akan dibersihkan di akhir login()
  });

  bot.on('message:text', async (ctx, next) => {
    const s = ctx.session;
    if (!s) return next();
    const u = getUser(ctx.from.id);
    const acc = u.accounts.get(s.id);
    if (!acc) return next();

    if (s.act === 'login_phone') {
      const phone = normalizePhone(ctx.message.text || '');
      if (!/^\+\d{8,15}$/.test(phone)) return ctx.reply('❌ Format salah. Contoh: +6281234567890');

      // Jangan await agar update OTP berikutnya tidak terblokir
      ctx.session = { act: 'login_waiting', id: acc.id };
      acc.login(ctx, API_ID, API_HASH, phone).catch((e) => {
        console.error('[login text] error:', e);
      });
      // Jangan hapus ctx.session di sini; akan dibersihkan di akhir login()
      return;
    }

    if (s.act === 'login_waiting') {
      // route OTP or password
      if (acc.handleText(ctx.message.text, ctx)) return;
    }

    return next();
  });
};
