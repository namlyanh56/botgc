const { MENU, inlineCancelKb } = require('../utils/menu');
const { getAcc } = require('../utils/helper');
const { DELAY_MS, MAX_GROUPS_PER_BATCH, MESSAGE_EFFECT_ID } = require('../config/setting');

module.exports = (bot) => {
  // Buat dari daftar
  bot.hears(MENU.createFromList, async (ctx) => {
    const a = getAcc(ctx.from.id);
    if (!a?.authed) return ctx.reply('🚫 *Akses Ditolak.* Silakan login terlebih dahulu.', { parse_mode: 'Markdown' });
    ctx.session = { act: 'create_from_list' };
    
    const msg = 
`📝 *BATCH GROUP CREATOR*

Kirimkan daftar nama grup (satu nama per baris).
Maksimal: ${MAX_GROUPS_PER_BATCH} grup.

*Contoh:*
\`Project Alpha
Project Beta
Marketing Team\``;
    
    await ctx.reply(msg, {
      reply_markup: inlineCancelKb(),
      parse_mode: 'Markdown'
    });
  });

  // Buat berurutan
  bot.hears(MENU.createSequential, async (ctx) => {
    const a = getAcc(ctx.from.id);
    if (!a?.authed) return ctx.reply('🚫 *Akses Ditolak.* Silakan login terlebih dahulu.', { parse_mode: 'Markdown' });
    ctx.session = { act: 'create_seq_name' };
    await ctx.reply('🔡 *Masukkan Prefix Nama Grup:*\n\nContoh: Jika input "Server", hasil: Server 1, Server 2...', { 
      reply_markup: inlineCancelKb(),
      parse_mode: 'Markdown'
    });
  });

  // Hasil terakhir
  bot.hears(MENU.lastResult, async (ctx) => {
    const a = getAcc(ctx.from.id);
    if (!a) return ctx.reply('❌ Belum ada sesi.');
    const list = a.lastResults || [];
    if (!list.length) return ctx.reply('ℹ️ *Log Kosong.* Belum ada grup yang dibuat.', { parse_mode: 'Markdown' });
    
    const txt = list.map((x,i)=> `• ${x.title} — [Join Link](${x.link})`).join('\n');
    await ctx.reply(`📂 *LOG HASIL TERAKHIR:*\n\n${txt}`, { parse_mode: 'Markdown', disable_web_page_preview: true });
  });

  // Alur input
  bot.on('message:text', async (ctx, next) => {
    const s = ctx.session;
    if (!s) return next();
    const a = getAcc(ctx.from.id);
    if (!a?.authed) return ctx.reply('🚫 *Sesi habis.* Silakan login ulang.', { parse_mode: 'Markdown' });

    if (s.act === 'create_from_list') {
      const namesAll = a.normalizeNamesFromList(ctx.message.text);
      if (!namesAll.length) return ctx.reply('⚠️ Tidak ada nama valid ditemukan.', { reply_markup: inlineCancelKb() });

      let names = namesAll;
      if (namesAll.length > MAX_GROUPS_PER_BATCH) {
        names = namesAll.slice(0, MAX_GROUPS_PER_BATCH);
        await ctx.reply(`⚠️ *Limit Protection:* Hanya memproses ${MAX_GROUPS_PER_BATCH} nama pertama.`, { parse_mode: 'Markdown' });
      }

      ctx.session = null;
      await ctx.reply(`⏳ *Processing...* Membuat ${names.length} grup. Mohon tunggu.`, { parse_mode: 'Markdown' });
      try {
        const res = await a.createManyGroupsSequential(names, { delayMs: DELAY_MS });
        const txt = res.map((x,i)=> `• ${x.title} — [Link](${x.link})`).join('\n');
        const opts = { parse_mode: 'Markdown', disable_web_page_preview: true };
        if (MESSAGE_EFFECT_ID) opts.message_effect_id = MESSAGE_EFFECT_ID;
        await ctx.reply(`✅ *SUCCESS REPORT* (${res.length} Created)\n\n${txt}`, opts);
      } catch (e) {
        await ctx.reply('❌ *System Error:* ' + (e.message || e), { parse_mode: 'Markdown' });
      }
      return;
    }

    if (s.act === 'create_seq_name') {
      const name = String(ctx.message.text || '').trim();
      if (!name) return ctx.reply('⚠️ Nama tidak boleh kosong.', { reply_markup: inlineCancelKb() });
      ctx.session = { act: 'create_seq_count', tmpName: name };
      return ctx.reply(`🔢 *Jumlah Grup:*\nMasukkan angka (1 - ${MAX_GROUPS_PER_BATCH})`, { 
        reply_markup: inlineCancelKb(),
        parse_mode: 'Markdown' 
      });
    }

    if (s.act === 'create_seq_count') {
      const count = parseInt(String(ctx.message.text || '').trim(), 10);
      if (!Number.isFinite(count) || count < 1) {
        return ctx.reply('⚠️ *Input Invalid.* Masukkan angka.', { reply_markup: inlineCancelKb(), parse_mode: 'Markdown' });
      }
      const safeCount = Math.min(count, MAX_GROUPS_PER_BATCH);
      if (count > MAX_GROUPS_PER_BATCH) {
        await ctx.reply(`⚠️ Limit otomatis ke ${MAX_GROUPS_PER_BATCH}.`);
      }
      const names = a.normalizeNamesFromPrefix(s.tmpName, safeCount);
      ctx.session = null;
      await ctx.reply(`⏳ *Processing...* Membuat ${names.length} grup.`, { parse_mode: 'Markdown' });
      try {
        const res = await a.createManyGroupsSequential(names, { delayMs: DELAY_MS });
        const txt = res.map((x,i)=> `• ${x.title} — [Link](${x.link})`).join('\n');
        const opts = { parse_mode: 'Markdown', disable_web_page_preview: true };
        if (MESSAGE_EFFECT_ID) opts.message_effect_id = MESSAGE_EFFECT_ID;
        await ctx.reply(`✅ *SUCCESS REPORT* (${res.length} Created)\n\n${txt}`, opts);
      } catch (e) {
        await ctx.reply('❌ *System Error:* ' + (e.message || e), { parse_mode: 'Markdown' });
      }
      return;
    }

    return next();
  });
};
