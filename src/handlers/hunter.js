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

function isValidCandidate(u) {
  return /^[a-z][a-z0-9_]{3,}$/i.test(u) && u.length >= 5 && u.length <= 32;
}

const activeHunts = new Map();
const activeAutoTakes = new Map();
const wordlists = new Map();
function getWordlist(userId) {
  if (!wordlists.has(userId)) wordlists.set(userId, new WordlistManager());
  return wordlists.get(userId);
}

function parseWordlistInput(text, { max = 50 } = {}) {
  const parts = String(text || '')
    .split(/[\n,]/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  const uniq = [];
  for (const p of parts) {
    if (!/^[a-z]{5,32}$/.test(p)) continue;
    if (uniq.includes(p)) continue;
    uniq.push(p);
    if (uniq.length >= max) break;
  }
  return uniq;
}

module.exports = (bot) => {
  // Custom Wordlist Menu
  bot.hears(MENU.customWordlist, async (ctx) => {
    const acc = getAcc(ctx.from.id);
    if (!acc?.authed) {
      return ctx.reply('🚫 *Akses Ditolak.* Silakan login dahulu.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    }
    ctx.session = { act: 'set_manual_wordlist' };
    await ctx.reply(
`⚙️ *KONFIGURASI CUSTOM WORDLIST*

Kirim kata kunci target Anda.
_Min 5 huruf, Max 50 kata._
Format: Pisahkan dengan baris baru atau koma.

*Contoh:*
\`crypto
bitcoin
invest, cuan, profit\``,
      { reply_markup: inlineCancelKb(), parse_mode: 'Markdown' }
    );
  });

  // Start Sniper Menu
  bot.hears(MENU.huntUsername, async (ctx) => {
    const acc = getAcc(ctx.from.id);
    if (!acc?.authed) {
      return ctx.reply('🚫 *Akses Ditolak.* Silakan login dahulu.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    }

    const state = new HunterState(ctx.from.id);
    if (state.hunting) {
      return ctx.reply('⚠️ *Scanner Active.* Harap hentikan proses yang berjalan.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    }

    const hasManual = (state.data.manualWordlist || []).length > 0;
    const kb = new InlineKeyboard()
      .text('💾 Database Bawaan', 'hunt:start:default')
      .text(hasManual ? '📂 Custom List Saya' : '❌ Custom Kosong', 'hunt:start:manual');
    await ctx.reply(
      `🔭 *SNIPER CONFIGURATION*\n\nSilakan pilih sumber target operasi:\n\n• *Database Bawaan:* Kombinasi EN/ID 5–8 huruf.\n• *Custom List:* Kata yang Anda input manual.`,
      { reply_markup: kb, parse_mode: 'Markdown' }
    );
  });

  bot.callbackQuery(/hunt:start:(default|manual)/, async (ctx) => {
    const mode = ctx.match[1];
    try { await ctx.answerCallbackQuery(); } catch {}
    const acc = getAcc(ctx.from.id);
    if (!acc?.authed) {
      return ctx.reply('🚫 *Akses Ditolak.* Silakan login dahulu.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    }

    const state = new HunterState(ctx.from.id);
    const wl = getWordlist(ctx.from.id);

    if (mode === 'manual') {
      const manual = state.data.manualWordlist || [];
      if (!manual.length) {
        return ctx.reply('❌ Wordlist custom kosong. Atur di menu utama.', { reply_markup: mainMenu(ctx) });
      }
      wl.setCustom(manual);
    } else {
      wl.setCustom(null);
    }

    await startHunt(ctx, acc, state, wl);
  });

  // Stop Action
  bot.hears(MENU.stopHunt, async (ctx) => {
    const controller = activeHunts.get(ctx.from.id);
    if (controller) controller.abort = true;
    activeHunts.delete(ctx.from.id);

    const autoCtl = activeAutoTakes.get(ctx.from.id);
    if (autoCtl) autoCtl.abort = true;
    activeAutoTakes.delete(ctx.from.id);

    const state = new HunterState(ctx.from.id);
    state.hunting = false;
    state.setAutoTakeActive(false);

    await ctx.reply('⏹️ *Task Terminated.* Semua operasi dihentikan.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
  });

  // Auto Take Menu
  bot.hears(MENU.autoTake, async (ctx) => {
    const acc = getAcc(ctx.from.id);
    if (!acc?.authed) {
      return ctx.reply('🚫 *Akses Ditolak.* Silakan login dahulu.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    }
    ctx.session = { act: 'auto_take_list' };
    await ctx.reply(
`⚡ *AUTO CLAIM SETUP*

Fitur ini akan memantau daftar username spesifik.
Jika target menjadi _Available_, bot otomatis membuat channel & mengklaimnya.

*Kirim daftar target:* (Max 50)`,
      { reply_markup: inlineCancelKb(), parse_mode: 'Markdown' }
    );
  });

  // CLAIM Action
  bot.callbackQuery('hunter:accept', async (ctx) => {
    try { await ctx.answerCallbackQuery('💎 Mengamankan Aset...'); } catch {}
    const state = new HunterState(ctx.from.id);
    const acc = getAcc(ctx.from.id);
    const username = state.data.lastUsername;

    if (!acc?.authed || !username) {
      return ctx.reply('❌ Sesi invalid.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
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
      if (!chan) throw new Error('Gagal membuat channel wadah.');

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
      await ctx.reply(`💎 *ASSET SECURED*\n\nUsername: @${username}\nStatus: _Tersimpan di Akun_\nFolder: _Public Channel_`, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });

    } catch (e) {
      await ctx.reply('❌ Gagal Claim: ' + (e.message || e), { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    } finally {
      const controller = activeHunts.get(ctx.from.id);
      if (controller) controller.abort = true;
      activeHunts.delete(ctx.from.id);
    }
  });

  // SKIP Action
  bot.callbackQuery('hunter:reject', async (ctx) => {
    try { await ctx.answerCallbackQuery('⏭️ Skipping...'); } catch {}
    const state = new HunterState(ctx.from.id);
    const acc = getAcc(ctx.from.id);
    if (!acc?.authed) {
      return ctx.reply('❌ Belum login.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    }

    state.setResult('rejected');
    state.hunting = true;

    const controller = { abort: false };
    activeHunts.set(ctx.from.id, controller);

    try { await ctx.deleteMessage(); } catch {}
    await huntLoop(ctx, acc, state, getWordlist(ctx.from.id), controller);
  });

  // Input Handlers
  bot.on('message:text', async (ctx, next) => {
    const s = ctx.session;
    if (!s) return next();
    const acc = getAcc(ctx.from.id);

    // Handler Custom Wordlist
    if (s.act === 'set_manual_wordlist') {
      const words = parseWordlistInput(ctx.message.text, { max: 50 }).filter(w => isValidUsername(w));
      if (!words.length) {
        return ctx.reply('⚠️ Tidak ada kata valid (min 5 huruf).', { reply_markup: inlineCancelKb(), parse_mode: 'Markdown' });
      }
      const state = new HunterState(ctx.from.id);
      state.setManualWordlist(words);
      ctx.session = null;
      return ctx.reply(`✅ *Database Updated.*\n${words.length} kata kustom tersimpan. Gunakan menu "Start Sniper" > "Custom List".`, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    }

    // Handler Auto Take List
    if (s.act === 'auto_take_list') {
      const list = parseWordlistInput(ctx.message.text, { max: 50 }).filter(u => isValidCandidate(u));
      if (!list.length) {
        return ctx.reply('⚠️ Tidak ada username valid.', { reply_markup: inlineCancelKb(), parse_mode: 'Markdown' });
      }
      const state = new HunterState(ctx.from.id);
      state.setAutoTakeTargets(list);
      state.setAutoTakeActive(true);
      ctx.session = null;

      const controller = { abort: false };
      activeAutoTakes.set(ctx.from.id, controller);
      autoTakeLoop(ctx, acc, state, controller).catch(e => console.error('AutoTake loop err:', e));

      return ctx.reply(`⚡ *AUTO CLAIM ACTIVE*\nTarget: ${list.length} Usernames.\nBot berjalan di latar belakang.`, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    }

    return next();
  });
};

// ----------- Loop Engine -------------
async function startHunt(ctx, acc, state, wordlist) {
  state.hunting = true;
  state.setResult(null);

  await ctx.reply(
    `📡 *RADAR ACTIVATED*\n━━━━━━━━━━━━━━━━\n🎯 Target: \`${wordlist.remaining()} kata\`\n⏱️ Estimasi: ${wordlist.estimateTotal().toLocaleString()}+\n🚀 _Initializing Network Scan..._`,
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

  try {
    const msg = await ctx.reply('🔍 *Scanning Network Nodes...*', { parse_mode: 'Markdown' });
    statusMsgId = msg.message_id;
  } catch {}

  while (!controller.abort && state.hunting) {
    const username = wordlist.next();
    checked++;
    state.incrementChecked();

    if (!isValidCandidate(username)) {
      continue;
    }

    log(`Checking: ${username} (${checked})`);

    // Update status UI every 10 checks
    if (checked % 10 === 0 && statusMsgId) {
      try {
        await ctx.api.editMessageText(
          userId,
          statusMsgId,
          `📡 *SCANNING IN PROGRESS*\n━━━━━━━━━━━━━━━━\n🔍 Scanned: \`${checked}\`\n📝 Node: \`${username}\`\n📊 Queue: \`${wordlist.remaining()}\`\n━━━━━━━━━━━━━━━━`,
          { parse_mode: 'Markdown' }
        );
      } catch {}
    }

    if (controller.abort) break;

    try {
      const ok = await acc.ensureConnected();
      if (!ok) {
        try { await acc.client.connect(); } catch (e) { log('connect fail:', e.message); }
      }
      if (controller.abort) break;

      const available = await acc.client.invoke(new Api.account.CheckUsername({ username }));
      if (controller.abort) break;

      if (available === true) {
        log(`AVAILABLE: ${username}`);
        state.setLastClaim(username, null, null);
        state.hunting = false;

        if (statusMsgId) {
          try { await ctx.api.deleteMessage(userId, statusMsgId); } catch {}
        }

        const kb = new InlineKeyboard()
          .text('💎 CLAIM SEKARANG', 'hunter:accept')
          .text('⏭️ SKIP / Next', 'hunter:reject');

        await ctx.reply(
          `✨ *HIDDEN GEM FOUND!* ✨\n━━━━━━━━━━━━━━━━\nUsername: *@${username}*\nAttempt: #${checked}\n━━━━━━━━━━━━━━━━\n\nApa tindakan Anda?`,
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
          try {
            await ctx.api.editMessageText(userId, statusMsgId, `⏳ *Rate Limit Detected...* Cooling down (${waitTime}s)`, { parse_mode: 'Markdown' });
          } catch {}
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

  if (statusMsgId) {
    try { await ctx.api.deleteMessage(userId, statusMsgId); } catch {}
  }

  if (!state.data.lastUsername) {
    await ctx.reply(`⏹️ *Scan Selesai.* Total checked: \`${checked}\``, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    state.clearManualWordlist(); 
  }

  activeHunts.delete(userId);
}

// ----------- Auto Take Loop -------------
async function autoTakeLoop(ctx, acc, state, controller) {
  const delayMs = Math.max(DELAY_MS, 3000);
  let statusMsgId = null;

  try {
    const msg = await ctx.reply('⚡ *Auto-Claim Daemon Started...*', { parse_mode: 'Markdown' });
    statusMsgId = msg.message_id;
  } catch {}

  while (!controller.abort && state.data.autoTakeActive) {
    const targets = state.data.autoTakeTargets || [];
    if (!targets.length) break;

    for (let i = targets.length - 1; i >= 0; i--) {
      if (controller.abort || !state.data.autoTakeActive) break;
      const username = targets[i];

      try {
        const ok = await acc.ensureConnected();
        if (!ok) { try { await acc.client.connect(); } catch {} }

        const available = await acc.client.invoke(new Api.account.CheckUsername({ username }));
        if (available === true) {
          log(`AUTO-TAKE AVAILABLE: ${username}`);

          const updates = await acc.client.invoke(new Api.channels.CreateChannel({
            title: username,
            about: `Auto-claimed: @${username}`,
            broadcast: true,
            megagroup: false
          }));

          const chan = (updates.chats || []).find(c => c.className === 'Channel' || c.title === username);
          if (!chan) throw new Error('Channel creation failed');

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

          targets.splice(i, 1);
          state.setAutoTakeTargets(targets);
          await ctx.reply(`⚡ *AUTO CLAIM SUCCESS*\nTarget: @${username}\nStatus: Secured`, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
        }
      } catch (e) {
        log('AutoTake error:', e.message || e);
      }

      if (controller.abort || !state.data.autoTakeActive) break;
      await abortableSleep(controller, delayMs);
    }

    if (!targets.length) break;
  }

  if (statusMsgId) {
    try { await ctx.api.deleteMessage(ctx.from.id, statusMsgId); } catch {}
  }

  state.setAutoTakeActive(false);
  activeAutoTakes.delete(ctx.from.id);
  
  if (!(state.data.autoTakeTargets || []).length) {
    await ctx.reply('✅ Semua target Auto-Claim telah diproses.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
  } else {
    await ctx.reply('⏹️ Auto-Claim Daemon dihentikan.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
  }
}
