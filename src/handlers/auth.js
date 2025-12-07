const { MENU, inlineCancelKb, mainMenu } = require('../utils/menu');
const { getUser, getAcc } = require('../utils/helper');
const Account = require('../model/Account');
const { API_ID, API_HASH } = require('../config/setting');
const { Keyboard } = require('grammy');
const { removeSession } = require('../utils/sessionStore');

function normalizePhone(raw) {
  if (!raw) return '';
  let s = String(raw).trim();
  s = s.replace(/[^\d+]/g, '');
  if (/^0\d+/.test(s)) s = '+62' + s.slice(1);
  if (/^\d{8,15}$/.test(s) && !s.startsWith('+')) s = '+' + s;
  return s;
}

module.exports = (bot) => {
  // Login
  bot.hears(MENU.login, async (ctx) => {
    const current = getAcc(ctx.from.id);
    if (current?.authed) {
      return ctx.reply('✅ *Akun sudah terhubung.*', { 
        reply_markup: mainMenu(ctx), 
        parse_mode: 'Markdown' 
      });
    }

    const u = getUser(ctx.from.id);
    const acc = new Account(ctx.from.id);
    u.accounts.set(acc.id, acc);
    u.active = acc.id;

    const msg = 
`🔐 *AUTHENTICATION REQUIRED*

Silakan masukkan Nomor Telepon akun Telegram yang akan dihubungkan.
_Format: +628xxx_

Atau gunakan tombol di bawah untuk berbagi kontak secara aman.`;

    const kb = new Keyboard().requestContact('📲 Bagikan Kontak Saya').resized();
    ctx.session = { act: 'login_phone', id: acc.id };
    await ctx.reply(msg, { reply_markup: kb, parse_mode: 'Markdown' });
  });

  // Logout
  bot.hears(MENU.logout, async (ctx) => {
    const u = getUser(ctx.from.id);
    const acc = getAcc(ctx.from.id);

    if (acc) {
      if (acc.client) {
        try { await acc.client.disconnect(); } catch {}
      }
      removeSession(ctx.from.id, acc.id);
      u.accounts.delete(acc.id);
      u.active = null;
    }

    await ctx.reply('🔓 *Sesi diputuskan.* Data lokal telah dihapus.', {
      reply_markup: mainMenu(ctx),
      parse_mode: 'Markdown'
    });
  });

  // Handle contact share
  bot.on('message:contact', async (ctx, next) => {
    const s = ctx.session;
    if (!s || s.act !== 'login_phone') return next();

    const u = getUser(ctx.from.id);
    const acc = u.accounts.get(s.id);
    if (!acc) return ctx.reply('❌ Sesi tidak valid. Ulangi.', { reply_markup: mainMenu(ctx) });

    const phone = normalizePhone(ctx.message.contact?.phone_number || '');
    if (!/^\+\d{8,15}$/.test(phone)) {
      return ctx.reply('⚠️ *Format salah.* Gunakan +62...', { 
        reply_markup: inlineCancelKb(),
        parse_mode: 'Markdown'
      });
    }

    ctx.session = { act: 'login_waiting', id: acc.id };

    acc.login(ctx, API_ID, API_HASH, phone, mainMenu).catch((e) => {
      console.error('[login contact] error:', e);
    });
  });

  // Handle text input
  bot.on('message:text', async (ctx, next) => {
    const s = ctx.session;
    if (!s) return next();

    const u = getUser(ctx.from.id);
    const acc = u.accounts.get(s.id);
    if (!acc) return next();

    if (s.act === 'login_phone') {
      const phone = normalizePhone(ctx.message.text || '');
      if (!/^\+\d{8,15}$/.test(phone)) {
        return ctx.reply('⚠️ *Format salah.* Gunakan +62...', { 
          reply_markup: inlineCancelKb(),
          parse_mode: 'Markdown'
        });
      }

      ctx.session = { act: 'login_waiting', id: acc.id };

      acc.login(ctx, API_ID, API_HASH, phone, mainMenu).catch((e) => {
        console.error('[login text] error:', e);
      });
      return;
    }

    if (s.act === 'login_waiting') {
      if (acc.handleText(ctx.message.text, ctx)) return;
    }

    return next();
  });
};
