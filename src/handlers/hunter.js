const { InlineKeyboard } = require('grammy');
const { Api } = require('telegram');
const { MENU, mainMenu } = require('../utils/menu');
const { getAcc } = require('../utils/helper');
const { WordlistManager } = require('../utils/wordlist');
const HunterState = require('../model/HunterState');
const { DELAY_MS, DEBUG } = require('../config/setting');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(...a) { if (DEBUG) console.log('[Hunter]', ...a); }

// Store aktif hunting loops per user
const activeHunts = new Map();
// Wordlist manager per user
const wordlists = new Map();

function getWordlist(userId) {
  if (!wordlists.has(userId)) wordlists.set(userId, new WordlistManager());
  return wordlists.get(userId);
}

module.exports = (bot) => {
  // Tombol Cari Username
  bot.hears(MENU.huntUsername, async (ctx) => {
    const acc = getAcc(ctx.from.id);
    if (!acc?.authed) {
      return ctx.reply('❌ Login user dulu lewat menu: ' + MENU.login, { reply_markup: mainMenu(ctx) });
    }

    const state = new HunterState(ctx.from.id);
    if (state.hunting) {
      return ctx.reply('⚠️ Pencarian sudah berjalan. Gunakan "⏹️ Stop Pencarian" untuk menghentikan.', { reply_markup: mainMenu(ctx) });
    }

    state.hunting = true;
    const wordlist = getWordlist(ctx.from.id);

    await ctx.reply(
      `🔎 Memulai pencarian username...\n📊 Kandidat tersedia: ${wordlist.remaining()}\n⏱️ Estimasi total: ${wordlist.estimateTotal().toLocaleString()}+`,
      { reply_markup: mainMenu(ctx) }
    );

    const controller = { abort: false };
    activeHunts.set(ctx.from.id, controller);

    await huntLoop(ctx, acc, state, wordlist, controller);
  });

  // Tombol Stop Pencarian
  bot.hears(MENU.stopHunt, async (ctx) => {
    const controller = activeHunts.get(ctx.from.id);
    if (controller) controller.abort = true;
    activeHunts.delete(ctx.from.id);

    const state = new HunterState(ctx.from.id);
    state.hunting = false;

    await ctx.reply('⏹️ Pencarian dihentikan.', { reply_markup: mainMenu(ctx) });
  });

  // Callback: Terima username
  bot.callbackQuery('hunter:accept', async (ctx) => {
    try { await ctx.answerCallbackQuery('✅ Username diterima!'); } catch {}

    const state = new HunterState(ctx.from.id);
    state.setResult('accepted');
    state.hunting = false;

    const controller = activeHunts.get(ctx.from.id);
    if (controller) controller.abort = true;
    activeHunts.delete(ctx.from.id);

    try { await ctx.deleteMessage(); } catch {}
    await ctx.reply(`✅ Username @${state.data.lastUsername} berhasil disimpan!`, { reply_markup: mainMenu(ctx) });
  });

  // Callback: Tolak username (hapus channel)
  bot.callbackQuery('hunter:reject', async (ctx) => {
    try { await ctx.answerCallbackQuery('❌ Menghapus channel...'); } catch {}

    const state = new HunterState(ctx.from.id);
    const acc = getAcc(ctx.from.id);

    // Hapus channel jika ada
    if (acc?.authed && state.data.lastChannelId && state.data.lastAccessHash) {
      try {
        await acc.ensureConnected();
        const inputChannel = new Api.InputChannel({
          channelId: BigInt(state.data.lastChannelId),
          accessHash: BigInt(state.data.lastAccessHash)
        });
        await acc.client.invoke(new Api.channels.DeleteChannel({ channel: inputChannel }));
        log('Channel deleted:', state.data.lastUsername);
      } catch (e) {
        log('Delete channel error:', e.message);
      }
    }

    state.setResult('rejected');
    state.hunting = false;

    const controller = activeHunts.get(ctx.from.id);
    if (controller) controller.abort = true;
    activeHunts.delete(ctx.from.id);

    try { await ctx.deleteMessage(); } catch {}
    await ctx.reply(`❌ Username @${state.data.lastUsername} ditolak dan channel dihapus.`, { reply_markup: mainMenu(ctx) });
  });
};

async function huntLoop(ctx, acc, state, wordlist, controller) {
  const userId = ctx.from.id;
  const delayMs = Math.max(DELAY_MS, 2000);
  let checked = 0;
  let statusMsgId = null;

  try {
    const msg = await ctx.reply('🔍 Mencari username yang tersedia...');
    statusMsgId = msg.message_id;
  } catch {}

  while (!controller.abort && state.hunting) {
    const username = wordlist.next();
    checked++;
    state.incrementChecked();

    log(`Checking: ${username} (${checked})`);

    if (checked % 10 === 0 && statusMsgId) {
      try {
        await ctx.api.editMessageText(
          userId,
          statusMsgId,
          `🔍 Sudah cek ${checked} username...\n📝 Terakhir: ${username}\n📊 Sisa batch: ${wordlist.remaining()}`
        );
      } catch {}
    }

    try {
      await acc.ensureConnected();

      // 1) Cek ketersediaan tanpa membuat channel
      const available = await acc.client.invoke(new Api.account.CheckUsername({ username }));
      if (!available) {
        log(`Username taken: ${username}`);
        if (controller.abort) break;
        await sleep(delayMs);
        continue;
      }

      // 2) Hanya buat satu channel publik setelah dipastikan available
      const updates = await acc.client.invoke(new Api.channels.CreateChannel({
        title: username,
        about: `Channel for @${username}`,
        broadcast: true,
        megagroup: false
      }));

      const chan = (updates.chats || []).find(c => c.className === 'Channel' || c.title === username);
      if (!chan) {
        log('Channel not found after creation');
        await sleep(delayMs);
        continue;
      }

      const inputChannel = new Api.InputChannel({
        channelId: chan.id,
        accessHash: chan.accessHash
      });

      try {
        await acc.client.invoke(new Api.channels.UpdateUsername({
          channel: inputChannel,
          username
        }));

        log(`Username set: @${username}`);

        state.setLastClaim(username, chan.id, chan.accessHash);
        state.hunting = false;

        if (statusMsgId) {
          try { await ctx.api.deleteMessage(userId, statusMsgId); } catch {}
        }

        const kb = new InlineKeyboard()
          .text('✅ Terima', 'hunter:accept')
          .text('❌ Tolak', 'hunter:reject');

        await ctx.reply(
          `🎉 Berhasil klaim @${username}!\n\n📊 Total dicek: ${checked}\n\nPilih aksi:`,
          { reply_markup: kb }
        );

        activeHunts.delete(userId);
        return;

      } catch (e) {
        log('UpdateUsername failed (likely sudah diambil race):', e.message);
        try {
          await acc.client.invoke(new Api.channels.DeleteChannel({ channel: inputChannel }));
        } catch {}
      }

    } catch (e) {
      log('Check error:', e.message);

      if (e.message && e.message.includes('FLOOD_WAIT')) {
        const waitMatch = e.message.match(/FLOOD_WAIT_(\d+)/);
        const waitTime = waitMatch ? parseInt(waitMatch[1], 10) : 30;

        if (statusMsgId) {
          try {
            await ctx.api.editMessageText(userId, statusMsgId, `⚠️ Rate limit! Menunggu ${waitTime} detik...`);
          } catch {}
        }

        await sleep(waitTime * 1000);
        continue;
      }
    }

    if (controller.abort) break;
    await sleep(delayMs);
  }

  if (statusMsgId) {
    try { await ctx.api.deleteMessage(userId, statusMsgId); } catch {}
  }

  if (!state.data.lastUsername) {
    await ctx.reply(`⏹️ Pencarian dihentikan.\n📊 Total dicek: ${checked}`, { reply_markup: mainMenu(ctx) });
  }

  activeHunts.delete(userId);
}
