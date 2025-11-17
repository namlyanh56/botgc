const { MENU, inlineCancelKb } = require('../utils/menu');
const { getAcc } = require('../utils/helper');
const { DELAY_MS, MAX_GROUPS_PER_BATCH, MESSAGE_EFFECT_ID } = require('../config/setting');

module.exports = (bot) => {
  // Buat dari daftar (satu nama per baris)
  bot.hears(MENU.createFromList, async (ctx) => {
    const a = getAcc(ctx.from.id);
    if (!a?.authed) return ctx.reply('❌ Login user dulu lewat menu: ' + MENU.login);
    ctx.session = { act: 'create_from_list' };
    await ctx.reply('Kirim daftar nama grup, satu per baris.\nContoh:\nGrup A\nGrup B\nGrup C', {
      reply_markup: inlineCancelKb()
    });
  });

  // Buat berurutan: tanya nama dulu, baru jumlah
  bot.hears(MENU.createSequential, async (ctx) => {
    const a = getAcc(ctx.from.id);
    if (!a?.authed) return ctx.reply('❌ Login user dulu lewat menu: ' + MENU.login);
    ctx.session = { act: 'create_seq_name' };
    await ctx.reply('Masukkan nama/prefix grup:', { reply_markup: inlineCancelKb() });
  });

  // Hasil terakhir
  bot.hears(MENU.lastResult, async (ctx) => {
    const a = getAcc(ctx.from.id);
    if (!a) return ctx.reply('❌ Belum ada sesi.');
    const list = a.lastResults || [];
    if (!list.length) return ctx.reply('ℹ️ Belum ada hasil.');
    const txt = list.map((x,i)=> `${i+1}. ${x.title} - ${x.link}`).join('\n');
    await ctx.reply(`📋 Hasil Terakhir:\n${txt}`);
  });

  // Alur input
  bot.on('message:text', async (ctx, next) => {
    const s = ctx.session;
    if (!s) return next();
    const a = getAcc(ctx.from.id);
    if (!a?.authed) return ctx.reply('❌ Login user dulu lewat menu: ' + MENU.login);

    if (s.act === 'create_from_list') {
      const namesAll = a.normalizeNamesFromList(ctx.message.text);
      if (!namesAll.length) return ctx.reply('❌ Tidak ada nama yang valid.', { reply_markup: inlineCancelKb() });

      let names = namesAll;
      if (namesAll.length > MAX_GROUPS_PER_BATCH) {
        names = namesAll.slice(0, MAX_GROUPS_PER_BATCH);
        await ctx.reply(`⚠️ Jumlah diminta ${namesAll.length} dibatasi ke ${MAX_GROUPS_PER_BATCH} untuk keamanan.`);
      }

      ctx.session = null;
      await ctx.reply(`⏳ Membuat ${names.length} grup... harap tunggu.`);
      try {
        const res = await a.createManyGroupsSequential(names, { delayMs: DELAY_MS });
        const txt = res.map((x,i)=> `${i+1}. ${x.title} - ${x.link}`).join('\n');
        const opts = {};
        if (MESSAGE_EFFECT_ID) opts.message_effect_id = MESSAGE_EFFECT_ID;
        await ctx.reply(`✅ Selesai membuat ${res.length} grup:\n${txt}`, opts);
      } catch (e) {
        await ctx.reply('❌ Gagal: ' + (e.message || e));
      }
      return;
    }

    if (s.act === 'create_seq_name') {
      const name = String(ctx.message.text || '').trim();
      if (!name) return ctx.reply('❌ Nama tidak boleh kosong.', { reply_markup: inlineCancelKb() });
      ctx.session = { act: 'create_seq_count', tmpName: name };
      return ctx.reply('Masukkan jumlah grup (1 - ' + MAX_GROUPS_PER_BATCH + '):', { reply_markup: inlineCancelKb() });
    }

    if (s.act === 'create_seq_count') {
      const count = parseInt(String(ctx.message.text || '').trim(), 10);
      if (!Number.isFinite(count) || count < 1) {
        return ctx.reply('❌ Jumlah tidak valid.', { reply_markup: inlineCancelKb() });
      }
      const safeCount = Math.min(count, MAX_GROUPS_PER_BATCH);
      if (count > MAX_GROUPS_PER_BATCH) {
        await ctx.reply(`⚠️ Jumlah ${count} dibatasi ke ${MAX_GROUPS_PER_BATCH} untuk keamanan.`);
      }
      const names = a.normalizeNamesFromPrefix(s.tmpName, safeCount);
      ctx.session = null;
      await ctx.reply(`⏳ Membuat ${names.length} grup... harap tunggu.`);
      try {
        const res = await a.createManyGroupsSequential(names, { delayMs: DELAY_MS });
        const txt = res.map((x,i)=> `${i+1}. ${x.title} - ${x.link}`).join('\n');
        const opts = {};
        if (MESSAGE_EFFECT_ID) opts.message_effect_id = MESSAGE_EFFECT_ID;
        await ctx.reply(`✅ Selesai membuat ${res.length} grup:\n${txt}`, opts);
      } catch (e) {
        await ctx.reply('❌ Gagal: ' + (e.message || e));
      }
      return;
    }

    return next();
  });
};
