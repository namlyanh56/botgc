const { InlineKeyboard } = require('grammy');
const { Api } = require('telegram');
const { MENU, mainMenu, inlineCancelKb } = require('../utils/menu');
const { getAcc } = require('../utils/helper');
const { WordlistManager, isValidUsername } = require('../utils/wordlist');
const HunterState = require('../model/HunterState');
const { DELAY_MS, DEBUG } = require('../config/setting');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function abortableSleep(controller, ms, step = 300) {
  let remain = ms;
  while (!controller.abort && remain > 0) {
    const chunk = Math.min(step, remain);
    await sleep(chunk);
    remain -= chunk;
  }
}
function log(...a) { if (DEBUG) console.log('[Hunter]', ...a); }
function isValidCandidate(u) { return /^[a-z][a-z0-9_]{3,}$/i.test(u) && u.length >= 5 && u.length <= 32; }

const activeHunts = new Map();
const activeAutoTakes = new Map();
const wordlists = new Map();
function getWordlist(userId) {
  if (!wordlists.has(userId)) wordlists.set(userId, new WordlistManager());
  return wordlists.get(userId);
}
function parseWordlistInput(text, { max = 100 } = {}) {
  const parts = String(text || '')
    .split(/[\n,]/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  const uniq = [];
  for (const p of parts) {
    if (!/^[a-z0-9_]{5,32}$/.test(p)) continue;
    if (uniq.includes(p)) continue;
    uniq.push(p);
    if (uniq.length >= max) break;
  }
  return uniq;
}
function formatTargets(targets) {
  if (!targets.length) return '❌ (kosong)';
  return targets.map((t, i) => `${i + 1}) ${t}`).join(', ');
}

module.exports = (bot) => {
  // Custom wordlist (untouched)
  bot.hears(MENU.customWordlist, async (ctx) => {
    const acc = getAcc(ctx.from.id);
    if (!acc?.authed) return ctx.reply('🚫 *Akses Ditolak.* Silakan login dahulu.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    ctx.session = { act: 'set_manual_wordlist' };
    await ctx.reply(
`📝 *CUSTOM WORDLIST MODE*

Kirim kata minimal 5 huruf (a-z), maksimal 50 kata.
Format: satu per baris *atau* dipisah koma.

Contoh:
\`alpha
galaxy
garuda, fintech, vector\``,
      { reply_markup: inlineCancelKb(), parse_mode: 'Markdown' }
    );
  });

  // Start Sniper: pilih sumber
  bot.hears(MENU.huntUsername, async (ctx) => {
    const acc = getAcc(ctx.from.id);
    if (!acc?.authed) return ctx.reply('🚫 *Akses Ditolak.* Silakan login dahulu.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });

    const state = new HunterState(ctx.from.id);
    if (state.hunting) return ctx.reply('⚠️ *Scanner Active.* Stop dulu sebelum mulai baru.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });

    const hasManual = (state.data.manualWordlist || []).length > 0;
    const kb = new InlineKeyboard()
      .text('🎯 Wordlist Bawaan', 'hunt:start:default')
      .text(hasManual ? '📝 Wordlist Custom' : '❌ Custom Kosong', 'hunt:start:manual');
    await ctx.reply(
      `📡 *PILIH SUMBER WORDLIST*\n\n• Bawaan: kombinasi EN/ID 5–8 huruf.\n• Custom: kata yang Anda tambah manual.`,
      { reply_markup: kb, parse_mode: 'Markdown' }
    );
  });

  bot.callbackQuery(/hunt:start:(default|manual)/, async (ctx) => {
    const mode = ctx.match[1];
    try { await ctx.answerCallbackQuery(); } catch {}
    const acc = getAcc(ctx.from.id);
    if (!acc?.authed) return ctx.reply('🚫 *Akses Ditolak.* Silakan login dahulu.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });

    const state = new HunterState(ctx.from.id);
    const wl = getWordlist(ctx.from.id);

    if (mode === 'manual') {
      const manual = state.data.manualWordlist || [];
      if (!manual.length) return ctx.reply('❌ Wordlist custom kosong. Tambahkan dulu lewat menu.', { reply_markup: mainMenu(ctx) });
      wl.setCustom(manual);
    } else {
      wl.setCustom(null);
    }

    await startHunt(ctx, acc, state, wl);
  });

  // Stop hanya menghentikan sniper (bukan auto-take)
  bot.hears(MENU.stopHunt, async (ctx) => {
    const controller = activeHunts.get(ctx.from.id);
    if (controller) controller.abort = true;
    activeHunts.delete(ctx.from.id);

    const state = new HunterState(ctx.from.id);
    state.hunting = false;

    await ctx.reply('🛑 *Scanner dihentikan.* (Auto-take tetap berjalan jika ada target)', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
  });

  // Auto Take submenu
  bot.hears(MENU.autoTake, async (ctx) => {
    const acc = getAcc(ctx.from.id);
    if (!acc?.authed) return ctx.reply('🚫 *Akses Ditolak.* Silakan login dahulu.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    const kb = new InlineKeyboard()
      .text('📋 Lihat/Hapus', 'auto:list')
      .text('➕ Tambah', 'auto:add');
    await ctx.reply('🎯 *AUTO TAKE MENU*\nPilih aksi.', { reply_markup: kb, parse_mode: 'Markdown' });
  });

  bot.callbackQuery('auto:list', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch {}
    const state = new HunterState(ctx.from.id);
    const targets = state.data.autoTakeTargets || [];
    const listStr = formatTargets(targets);
    const kb = new InlineKeyboard().text('🗑 Hapus Target', 'auto:delstart');
    await ctx.reply(`📋 *DAFTAR TARGET AUTO-TAKE*\n${listStr}\n\nKirim "Hapus Target" untuk menghapus.`, {
      reply_markup: targets.length ? kb : undefined,
      parse_mode: 'Markdown'
    });
  });

  bot.callbackQuery('auto:delstart', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch {}
    const state = new HunterState(ctx.from.id);
    const targets = state.data.autoTakeTargets || [];
    if (!targets.length) return ctx.reply('❌ Daftar kosong.', { reply_markup: mainMenu(ctx) });
    ctx.session = { act: 'auto_take_delete' };
    await ctx.reply(
`🗑 *HAPUS TARGET*

Kirim nomor atau username yang mau dihapus (koma/baris).
Contoh: \`1,3,alpha\``,
      { reply_markup: inlineCancelKb(), parse_mode: 'Markdown' }
    );
  });

  bot.callbackQuery('auto:add', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch {}
    const state = new HunterState(ctx.from.id);
    const current = state.data.autoTakeTargets || [];
    if (current.length >= 100) return ctx.reply('⚠️ Sudah mencapai 100 target. Hapus dulu sebelum menambah.', { reply_markup: mainMenu(ctx) });
    ctx.session = { act: 'auto_take_add' };
    await ctx.reply(
`➕ *TAMBAH TARGET AUTO-TAKE*

Kirim daftar username (5-32 huruf/angka/_), dipisah koma atau baris.
Maks total tersimpan: 100.`,
      { reply_markup: inlineCancelKb(), parse_mode: 'Markdown' }
    );
  });

  // CLAIM callback
  bot.callbackQuery('hunter:accept', async (ctx) => {
    try { await ctx.answerCallbackQuery('✅ Claim...'); } catch {}
    const state = new HunterState(ctx.from.id);
    const acc = getAcc(ctx.from.id);
    const username = state.data.lastUsername;

    if (!acc?.authed || !username) {
      return ctx.reply('❌ Sesi tidak valid atau belum login user.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    }

    try {
      await acc.ensureConnected();

      const updates = await acc.client.invoke(new Api.channels.CreateChannel({
        title: username,
        about: `Reserved: @${username}`,
        broadcast: true,
        megagroup: false
      }));

      const chan = (updates.chats || []).find(c => c.className === 'Channel' || c.title === username);
      if (!chan) throw new Error('Channel tidak ditemukan setelah dibuat.');

      const inputChannel = new Api.InputChannel({ channelId: chan.id, accessHash: chan.accessHash });

      try {
        await acc.client.invoke(new Api.channels.UpdateUsername({
          channel: inputChannel,
          username
        }));
      } catch (e) {
        try { await acc.client.invoke(new Api.channels.DeleteChannel({ channel: inputChannel })); } catch {}
        throw e;
      }

      state.setLastClaim(username, chan.id, chan.accessHash);
      state.hunting = false;
      state.clearManualWordlist();

      try { await ctx.deleteMessage(); } catch {}
      await ctx.reply(`🎉 *ASSET SECURED*\nUsername: @${username}\nStatus: _Saved in account_`, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });

    } catch (e) {
      await ctx.reply('❌ Claim gagal: ' + (e.message || e), { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    } finally {
      const controller = activeHunts.get(ctx.from.id);
      if (controller) controller.abort = true;
      activeHunts.delete(ctx.from.id);
    }
  });

  bot.callbackQuery('hunter:reject', async (ctx) => {
    try { await ctx.answerCallbackQuery('⏭️ Lanjut cari berikutnya'); } catch {}
    const state = new HunterState(ctx.from.id);
    const acc = getAcc(ctx.from.id);
    if (!acc?.authed) return ctx.reply('❌ Belum login user.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });

    state.setResult('rejected');
    state.hunting = true;

    const controller = { abort: false };
    activeHunts.set(ctx.from.id, controller);

    try { await ctx.deleteMessage(); } catch {}
    await huntLoop(ctx, acc, state, getWordlist(ctx.from.id), controller);
  });

  // Text handlers
  bot.on('message:text', async (ctx, next) => {
    const s = ctx.session;
    if (!s) return next();
    const acc = getAcc(ctx.from.id);

    if (s.act === 'set_manual_wordlist') {
      const words = parseWordlistInput(ctx.message.text, { max: 50 }).filter(w => /^[a-z]{5,32}$/.test(w));
      if (!words.length) return ctx.reply('⚠️ Tidak ada kata valid (min 5 huruf).', { reply_markup: inlineCancelKb(), parse_mode: 'Markdown' });
      const state = new HunterState(ctx.from.id);
      state.setManualWordlist(words);
      ctx.session = null;
      return ctx.reply(`✅ Wordlist custom tersimpan (${words.length} kata). Gunakan "Start Sniper" dan pilih *Custom*.`, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    }

    if (s.act === 'auto_take_add') {
      const state = new HunterState(ctx.from.id);
      const current = state.data.autoTakeTargets || [];
      const capacity = Math.max(0, 100 - current.length);
      if (capacity <= 0) {
        ctx.session = null;
        return ctx.reply('⚠️ Sudah 100 target. Hapus dulu sebelum menambah.', { reply_markup: mainMenu(ctx) });
      }
      const list = parseWordlistInput(ctx.message.text, { max: capacity }).filter(u => isValidCandidate(u));
      if (!list.length) return ctx.reply('⚠️ Tidak ada username valid (5-32, huruf/angka/_).', { reply_markup: inlineCancelKb(), parse_mode: 'Markdown' });
      const merged = Array.from(new Set([...current, ...list])).slice(0, 100);
      state.setAutoTakeTargets(merged);
      state.setAutoTakeActive(true);
      ctx.session = null;

      ensureAutoTakeLoop(ctx, acc, state);
      return ctx.reply(`✅ Ditambah ${merged.length - current.length} target. Total: ${merged.length}. Auto-take aktif.`, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    }

    if (s.act === 'auto_take_delete') {
      const state = new HunterState(ctx.from.id);
      let targets = state.data.autoTakeTargets || [];
      if (!targets.length) {
        ctx.session = null;
        return ctx.reply('❌ Daftar kosong.', { reply_markup: mainMenu(ctx) });
      }

      const tokens = parseWordlistInput(ctx.message.text, { max: targets.length * 2 });
      const toDelete = new Set();

      for (const t of tokens) {
        if (/^\d+$/.test(t)) {
          const idx = parseInt(t, 10) - 1;
          if (idx >= 0 && idx < targets.length) toDelete.add(targets[idx]);
        } else {
          toDelete.add(t);
        }
      }

      const before = targets.length;
      targets = targets.filter(x => !toDelete.has(x));
      state.setAutoTakeTargets(targets);
      if (!targets.length) state.setAutoTakeActive(false);

      ctx.session = null;
      const removed = before - targets.length;
      await ctx.reply(`🗑 ${removed} target dihapus. Sisa: ${targets.length}.`, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });

      if (targets.length) {
        ensureAutoTakeLoop(ctx, acc, state); // pastikan loop jalan
      }
      return;
    }

    return next();
  });
};

// ----------- Hunting loop -------------
async function startHunt(ctx, acc, state, wordlist) {
  state.hunting = true;
  state.setResult(null);

  await ctx.reply(
    `📡 *USERNAME SNIPER INITIATED*\n\n🎯 Target: \`${wordlist.remaining()} kata\`\n⏱️ Estimasi: ${wordlist.estimateTotal().toLocaleString()}+\n\n_Scanning network..._`,
    { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' }
  );

  const controller = { abort: false };
  activeHunts.set(ctx.from.id, controller);

  await huntLoop(ctx, acc, state, wordlist, controller);
}

async function huntLoop(ctx, acc, state, wordlist, controller) {
  const userId = ctx.from.id;
  const delayMs = Math.max(DELAY_MS, 2000);
  let checked = 0;
  let statusMsgId = null;

  try { const msg = await ctx.reply('🔍 *Scanning Network...*', { parse_mode: 'Markdown' }); statusMsgId = msg.message_id; } catch {}

  while (!controller.abort && state.hunting) {
    const username = wordlist.next();
    checked++;
    state.incrementChecked();

    if (!isValidCandidate(username)) { log(`Skip invalid: ${username}`); continue; }

    if (checked % 10 === 0 && statusMsgId) {
      try {
        await ctx.api.editMessageText(
          userId,
          statusMsgId,
          `📡 *SCANNING IN PROGRESS*\n━━━━━━━━━━━━━━━━\n🔍 Checked: \`${checked}\`\n📝 Current: \`${username}\`\n📊 Queue: \`${wordlist.remaining()}\`\n━━━━━━━━━━━━━━━━`,
          { parse_mode: 'Markdown' }
        );
      } catch {}
    }

    if (controller.abort) break;

    try {
      const ok = await acc.ensureConnected();
      if (!ok) { try { await acc.client.connect(); } catch (e) { log('connect fail:', e.message); } }
      if (controller.abort) break;

      const available = await acc.client.invoke(new Api.account.CheckUsername({ username }));
      if (controller.abort) break;

      if (available === true) {
        state.setLastClaim(username, null, null);
        state.hunting = false;

        if (statusMsgId) { try { await ctx.api.deleteMessage(userId, statusMsgId); } catch {} }

        const kb = new InlineKeyboard().text('✅ CLAIM', 'hunter:accept').text('❌ SKIP', 'hunter:reject');
        await ctx.reply(
          `💎 *USERNAME AVAILABLE!* 💎\n━━━━━━━━━━━━━━━━\nUsername: *@${username}*\nAttempt: #${checked}\n━━━━━━━━━━━━━━━━\n\nPilih aksi:`,
          { reply_markup: kb, parse_mode: 'Markdown' }
        );

        activeHunts.delete(userId);
        return;
      }

    } catch (e) {
      if (e.message && e.message.includes('FLOOD_WAIT')) {
        const waitMatch = e.message.match(/FLOOD_WAIT_(\d+)/);
        const waitTime = waitMatch ? parseInt(waitMatch[1], 10) : 30;
        if (statusMsgId) {
          try { await ctx.api.editMessageText(userId, statusMsgId, `⏳ *Cooling Down...* (${waitTime}s)`, { parse_mode: 'Markdown' }); } catch {}
        }
        await abortableSleep(controller, waitTime * 1000);
        if (controller.abort) break;
        continue;
      }
      log('CheckUsername error:', e.message || e);
    }

    if (controller.abort) break;
    await abortableSleep(controller, delayMs);
    if (controller.abort) break;
  }

  if (statusMsgId) { try { await ctx.api.deleteMessage(userId, statusMsgId); } catch {} }

  if (!state.data.lastUsername) {
    await ctx.reply(`⏹️ *Scan Complete.* Total checked: \`${checked}\``, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    state.clearManualWordlist();
  } else if (controller.abort) {
    await ctx.reply('⏹️ *Scan dihentikan.*', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
  }

  activeHunts.delete(userId);
}

// ----------- Auto Take loop -------------
function ensureAutoTakeLoop(ctx, acc, state) {
  if (activeAutoTakes.has(ctx.from.id)) return; // sudah jalan
  const controller = { abort: false };
  activeAutoTakes.set(ctx.from.id, controller);
  autoTakeLoop(ctx, acc, state, controller).catch(e => console.error('AutoTake loop err:', e));
}

async function autoTakeLoop(ctx, acc, state, controller) {
  const delayMs = Math.max(DELAY_MS, 3000);
  let statusMsgId = null;

  try { const msg = await ctx.reply('🎯 *Auto-Take Monitoring...*', { parse_mode: 'Markdown' }); statusMsgId = msg.message_id; } catch {}

  while (state.data.autoTakeActive) {
    let targets = state.data.autoTakeTargets || [];
    if (!targets.length) break;

    for (let i = targets.length - 1; i >= 0; i--) {
      const username = targets[i];

      try {
        const ok = await acc.ensureConnected();
        if (!ok) { try { await acc.client.connect(); } catch {} }

        const available = await acc.client.invoke(new Api.account.CheckUsername({ username }));
        if (available === true) {
          const updates = await acc.client.invoke(new Api.channels.CreateChannel({
            title: username,
            about: `Auto-claimed: @${username}`,
            broadcast: true,
            megagroup: false
          }));

          const chan = (updates.chats || []).find(c => c.className === 'Channel' || c.title === username);
          if (!chan) throw new Error('Channel tidak ditemukan setelah dibuat.');

          const inputChannel = new Api.InputChannel({ channelId: chan.id, accessHash: chan.accessHash });
          try {
            await acc.client.invoke(new Api.channels.UpdateUsername({ channel: inputChannel, username }));
          } catch (e) {
            try { await acc.client.invoke(new Api.channels.DeleteChannel({ channel: inputChannel })); } catch {}
            throw e;
          }

          targets.splice(i, 1);
          state.setAutoTakeTargets(targets);
          await ctx.reply(`✅ *AUTO-TAKE BERHASIL*\nUsername: @${username}\nStatus: Disimpan di channel baru.`, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
        }
      } catch (e) {
        log('AutoTake error:', e.message || e);
      }

      await abortableSleep(controller, delayMs); // controller.abort tidak pernah diubah kecuali internal
    }
  }

  if (statusMsgId) { try { await ctx.api.deleteMessage(ctx.from.id, statusMsgId); } catch {} }

  const remaining = state.data.autoTakeTargets?.length || 0;
  if (!remaining) state.setAutoTakeActive(false);
  await ctx.reply(remaining ? 'ℹ️ Auto-take berhenti: masih ada target, loop akan jalan lagi jika dipicu.' : 'ℹ️ Auto-take selesai (target habis).', {
    reply_markup: mainMenu(ctx),
    parse_mode: 'Markdown'
  });

  activeAutoTakes.delete(ctx.from.id);
}
