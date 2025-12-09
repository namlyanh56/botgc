const { MENU, inlineCancelKb } = require('../utils/menu');
const { getAcc } = require('../utils/helper');
const { DELAY_MS, MAX_GROUPS_PER_BATCH, MESSAGE_EFFECT_ID } = require('../config/setting');

module.exports = (bot) => {
  // Buat dari daftar (List Mode)
  bot.hears(MENU.createFromList, async (ctx) => {
    const a = getAcc(ctx.from.id);
    if (!a?.authed) return ctx.reply('🚫 *Akses Ditolak.* Silakan login terlebih dahulu.', { parse_mode: 'Markdown' });
    ctx.session = { act: 'create_from_list' };
    
    const msg = 
`📑 *BATCH GROUP CREATOR*

Silakan kirimkan daftar nama grup.
_Satu nama per baris._
Maksimal: *${MAX_GROUPS_PER_BATCH} Grup/Batch*.

*Format Input:*
\`Alpha Project
Beta Team
Gamma Squad\``;
    
    await ctx.reply(msg, {
      reply_markup: inlineCancelKb(),
      parse_mode: 'Markdown'
    });
  });

  // Buat berurutan (Sequential Mode)
  bot.hears(MENU.createSequential, async (ctx) => {
    const a = getAcc(ctx.from.id);
    if (!a?.authed) return ctx.reply('🚫 *Akses Ditolak.* Silakan login terlebih dahulu.', { parse_mode: 'Markdown' });
    ctx.session = { act: 'create_seq_name' };
    await ctx.reply('🔢 *INPUT PREFIX*\n\nMasukkan kata dasar nama grup.\n_Contoh: Jika input "Server", hasil: Server 1, Server 2..._', { 
      reply_markup: inlineCancelKb(),
      parse_mode: 'Markdown'
    });
  });

  // Hasil terakhir
  bot.hears(MENU.lastResult, async (ctx) => {
    const a = getAcc(ctx.from.id);
    if (!a) return ctx.reply('❌ Belum ada sesi aktif.');
    const list = a.lastResults || [];
    if (!list.length) return ctx.reply('ℹ️ *Log Kosong.* Belum ada aktivitas.', { parse_mode: 'Markdown' });
    
    const txt = list.map((x,i)=> `🔹 *${x.title}* — [Link Join](${x.link})`).join('\n');
    await ctx.reply(`📜 *ACTIVITY LOG (Terakhir):*\n\n${txt}`, { parse_mode: 'Markdown', disable_web_page_preview: true });
  });

  // Logic Handler
  bot.on('message:text', async (ctx, next) => {
    const s = ctx.session;
    if (!s) return next();
    const a = getAcc(ctx.from.id);
    if (!a?.authed) return ctx.reply('🚫 *Sesi Habis.* Silakan login ulang.', { parse_mode: 'Markdown' });

    // Handle List Mode
    if (s.act === 'create_from_list') {
      const namesAll = a.normalizeNamesFromList(ctx.message.text);
      if (!namesAll.length) return ctx.reply('⚠️ Tidak ada nama valid ditemukan.', { reply_markup: inlineCancelKb() });

      let names = namesAll;
      if (namesAll.length > MAX_GROUPS_PER_BATCH) {
        names = namesAll.slice(0, MAX_GROUPS_PER_BATCH);
        await ctx.reply(`🛡️ *Limit Protection:* Dipotong ke ${MAX_GROUPS_PER_BATCH} nama pertama.`, { parse_mode: 'Markdown' });
      }

      ctx.session = null;
      await ctx.reply(`⏳ *Processing...* Menginisialisasi ${names.length} grup.`, { parse_mode: 'Markdown' });
      try {
        const res = await a.createManyGroupsSequential(names, { delayMs: DELAY_MS });
        const txt = res.map((x,i)=> `✅ *${x.title}* — [Link](${x.link})`).join('\n');
        const opts = { parse_mode: 'Markdown', disable_web_page_preview: true };
        if (MESSAGE_EFFECT_ID) opts.message_effect_id = MESSAGE_EFFECT_ID;
        
        await ctx.reply(`🎉 *MISSION COMPLETE*\nTotal: ${res.length} Grup\n━━━━━━━━━━━━━━━━\n${txt}`, opts);
      } catch (e) {
        await ctx.reply('❌ *System Error:* ' + (e.message || e), { parse_mode: 'Markdown' });
      }
      return;
    }

    // Handle Sequential Mode - Name
    if (s.act === 'create_seq_name') {
      const name = String(ctx.message.text || '').trim();
      if (!name) return ctx.reply('⚠️ Nama tidak boleh kosong.', { reply_markup: inlineCancelKb() });
      ctx.session = { act: 'create_seq_count', tmpName: name };
      return ctx.reply(`🔢 *JUMLAH TARGET*\n\nMasukkan angka (1 - ${MAX_GROUPS_PER_BATCH})`, { 
        reply_markup: inlineCancelKb(),
        parse_mode: 'Markdown' 
      });
    }

    // Handle Sequential Mode - Count
    if (s.act === 'create_seq_count') {
      const count = parseInt(String(ctx.message.text || '').trim(), 10);
      if (!Number.isFinite(count) || count < 1) {
        return ctx.reply('⚠️ *Input Invalid.* Masukkan angka valid.', { reply_markup: inlineCancelKb(), parse_mode: 'Markdown' });
      }
      const safeCount = Math.min(count, MAX_GROUPS_PER_BATCH);
      if (count > MAX_GROUPS_PER_BATCH) {
        await ctx.reply(`⚠️ Limit otomatis ke ${MAX_GROUPS_PER_BATCH} demi keamanan.`);
      }
      const names = a.normalizeNamesFromPrefix(s.tmpName, safeCount);
      ctx.session = null;
      await ctx.reply(`⏳ *Processing...* Membuat ${names.length} grup berurutan.`, { parse_mode: 'Markdown' });
      try {
        const res = await a.createManyGroupsSequential(names, { delayMs: DELAY_MS });
        const txt = res.map((x,i)=> `✅ *${x.title}* — [Link](${x.link})`).join('\n');
        const opts = { parse_mode: 'Markdown', disable_web_page_preview: true };
        if (MESSAGE_EFFECT_ID) opts.message_effect_id = MESSAGE_EFFECT_ID;
        
        await ctx.reply(`🎉 *MISSION COMPLETE*\nTotal: ${res.length} Grup\n━━━━━━━━━━━━━━━━\n${txt}`, opts);
      } catch (e) {
        await ctx.reply('❌ *System Error:* ' + (e.message || e), { parse_mode: 'Markdown' });
      }
      return;
    }

    return next();
  });
};
