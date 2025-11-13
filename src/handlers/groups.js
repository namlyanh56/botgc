const { MENU } = require('../utils/menu');
const { getAcc } = require('../utils/helper');
const { DELAY_MS } = require('../config/setting');

module.exports = (bot) => {
  // Create from list: one name per line
  bot.hears(MENU.createFromList, async (ctx) => {
    const a = getAcc(ctx.from.id);
    if (!a?.authed) return ctx.reply('❌ Login user dulu lewat menu: ' + MENU.login);
    ctx.session = { act: 'create_from_list' };
    await ctx.reply('Kirim daftar nama grup, satu per baris.\nContoh:\nGrup A\nGrup B\nGrup C');
  });

  // Create with prefix and count
  bot.hears(MENU.createSequential, async (ctx) => {
    const a = getAcc(ctx.from.id);
    if (!a?.authed) return ctx.reply('❌ Login user dulu lewat menu: ' + MENU.login);
    ctx.session = { act: 'create_sequential' };
    await ctx.reply('Kirim: Prefix | Jumlah\nContoh: Promo Batch | 5');
  });

  // Show last result
  bot.hears(MENU.lastResult, async (ctx) => {
    const a = getAcc(ctx.from.id);
    if (!a) return ctx.reply('❌ Belum ada sesi.');
    const list = a.lastResults || [];
    if (!list.length) return ctx.reply('ℹ️ Belum ada hasil.');
    const txt = list.map((x,i)=> `${i+1}. ${x.title} - ${x.link}`).join('\n');
    await ctx.reply(`📋 Hasil Terakhir:\n${txt}`);
  });

  // Cancel any flow
  bot.hears(MENU.cancel, async (ctx) => {
    ctx.session = null;
    await ctx.reply('❌ Dibatalkan.');
  });

  bot.on('message:text', async (ctx, next) => {
    const s = ctx.session;
    if (!s) return next();
    const a = getAcc(ctx.from.id);
    if (!a?.authed) return ctx.reply('❌ Login user dulu lewat menu: ' + MENU.login);

    if (s.act === 'create_from_list') {
      const names = a.normalizeNamesFromList(ctx.message.text);
      if (!names.length) return ctx.reply('❌ Tidak ada nama yang valid.');
      ctx.session = null;
      await ctx.reply(`⏳ Membuat ${names.length} grup... harap tunggu.`);
      try {
        const res = await a.createManyGroupsSequential(names, { delayMs: DELAY_MS });
        const txt = res.map((x,i)=> `${i+1}. ${x.title} - ${x.link}`).join('\n');
        await ctx.reply(`✅ Selesai membuat ${res.length} grup:\n${txt}`);
      } catch (e) {
        await ctx.reply('❌ Gagal: ' + (e.message || e));
      }
      return;
    }

    if (s.act === 'create_sequential') {
      const m = String(ctx.message.text || '').split('|');
      if (m.length < 2) return ctx.reply('❌ Format salah. Contoh: Promo Batch | 5');
      const prefix = m[0].trim();
      const count = parseInt(m[1], 10);
      if (!prefix || !Number.isFinite(count) || count < 1 || count > 200) {
        return ctx.reply('❌ Format salah. Jumlah 1-200.');
      }
      const names = a.normalizeNamesFromPrefix(prefix, count);
      ctx.session = null;
      await ctx.reply(`⏳ Membuat ${names.length} grup... harap tunggu.`);
      try {
        const res = await a.createManyGroupsSequential(names, { delayMs: DELAY_MS });
        const txt = res.map((x,i)=> `${i+1}. ${x.title} - ${x.link}`).join('\n');
        await ctx.reply(`✅ Selesai membuat ${res.length} grup:\n${txt}`);
      } catch (e) {
        await ctx.reply('❌ Gagal: ' + (e.message || e));
      }
      return;
    }

    return next();
  });
};
