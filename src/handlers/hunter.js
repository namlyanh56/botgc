const { InlineKeyboard } = require('grammy');
const { Api } = require('telegram');
const { MENU, mainMenu } = require('../utils/menu');
const { getAcc } = require('../utils/helper');
const { WordlistManager } = require('../utils/wordlist');
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

const activeHunts = new Map();
const wordlists = new Map();
function getWordlist(userId) {
  if (!wordlists.has(userId)) wordlists.set(userId, new WordlistManager());
  return wordlists.get(userId);
}

// Detect limit on channel creation/update
function isChannelLimitError(e) {
  if (!e || !e.message) return null;
  const msg = e.message;
  if (msg.includes('FLOOD_WAIT_')) {
    const m = msg.match(/FLOOD_WAIT_(\d+)/);
    const seconds = m ? parseInt(m[1], 10) : 60;
    return { type: 'flood', waitSec: seconds };
  }
  if (msg.includes('CHANNELS_TOO_MUCH')) {
    // Biasanya limit harian; tidak ada wait time pasti
    return { type: 'too_many_channels', waitSec: null };
  }
  return null;
}

module.exports = (bot) => {
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

  bot.hears(MENU.stopHunt, async (ctx) => {
    const controller = activeHunts.get(ctx.from.id);
    if (controller) controller.abort = true;
    activeHunts.delete(ctx.from.id);

    const state = new HunterState(ctx.from.id);
    state.hunting = false;

    await ctx.reply('⏹️ Pencarian dihentikan.', { reply_markup: mainMenu(ctx) });
  });

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

  bot.callbackQuery('hunter:reject', async (ctx) => {
    try { await ctx.answerCallbackQuery('❌ Menghapus channel...'); } catch {}
    const state = new HunterState(ctx.from.id);
    const acc = getAcc(ctx.from.id);

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

    if (controller.abort) break;

    try {
      await acc.ensureConnected();
      if (controller.abort) break;

      // 1) Cek ketersediaan tanpa membuat channel
      const available = await acc.client.invoke(new Api.account.CheckUsername({ username }));
      if (controller.abort) break;

      if (!available) {
        log(`Username taken: ${username}`);
        await abortableSleep(controller, delayMs);
        if (controller.abort) break;
        continue;
      }

      // 2) Hanya buat satu channel publik setelah dipastikan available
      const updates = await acc.client.invoke(new Api.channels.CreateChannel({
        title: username,
        about: `Channel for @${username}`,
        broadcast: true,
        megagroup: false
      }));
      if (controller.abort) break;

      const chan = (updates.chats || []).find(c => c.className === 'Channel' || c.title === username);
      if (!chan) {
        log('Channel not found after creation');
        await abortableSleep(controller, delayMs);
        if (controller.abort) break;
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
        if (controller.abort) break;

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
        const limit = isChannelLimitError(e);
        if (limit) {
          state.hunting = false;
          controller.abort = true;
          activeHunts.delete(userId);
          const msg = limit.waitSec
            ? `⚠️ Akun limit saat set username.\nTunggu ~${Math.ceil(limit.waitSec / 60)} menit lalu coba lagi.`
            : '⚠️ Akun limit jumlah channel. Hentikan pencarian.';
          await ctx.reply(msg, { reply_markup: mainMenu(ctx) });
          break;
        }
        log('UpdateUsername failed (likely race):', e.message);
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

        await abortableSleep(controller, waitTime * 1000);
        if (controller.abort) break;
        continue;
      }
    }

    if (controller.abort) break;
    await abortableSleep(controller, delayMs);
    if (controller.abort) break;
  }

  if (statusMsgId) {
    try { await ctx.api.deleteMessage(userId, statusMsgId); } catch {}
  }

  if (!state.data.lastUsername) {
    await ctx.reply(`⏹️ Pencarian dihentikan.\n📊 Total dicek: ${checked}`, { reply_markup: mainMenu(ctx) });
  }

  activeHunts.delete(userId);
}
