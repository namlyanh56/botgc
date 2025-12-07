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
    return { type: 'too_many_channels', waitSec: null };
  }
  return null;
}

module.exports = (bot) => {
  bot.hears(MENU.huntUsername, async (ctx) => {
    const acc = getAcc(ctx.from.id);
    if (!acc?.authed) {
      return ctx.reply('🚫 *Akses Ditolak.* Silakan login dahulu.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    }

    const state = new HunterState(ctx.from.id);
    if (state.hunting) {
      return ctx.reply('⚠️ *Scanner Active.* Stop dulu sebelum mulai baru.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    }

    state.hunting = true;
    const wordlist = getWordlist(ctx.from.id);

    await ctx.reply(
      `📡 *USERNAME SNIPER INITIATED*\n\n🎯 Target: \`${wordlist.remaining()} words\`\n⏱️ Estimasi: ${wordlist.estimateTotal().toLocaleString()}+\n\n_Scanning network..._`,
      { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' }
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

    await ctx.reply('🛑 *Sniper Stopped.* Operasi dihentikan.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
  });

  bot.callbackQuery('hunter:accept', async (ctx) => {
    try { await ctx.answerCallbackQuery('✅ Disimpan!'); } catch {}
    const state = new HunterState(ctx.from.id);
    state.setResult('accepted');
    state.hunting = false;
    const controller = activeHunts.get(ctx.from.id);
    if (controller) controller.abort = true;
    activeHunts.delete(ctx.from.id);
    try { await ctx.deleteMessage(); } catch {}
    await ctx.reply(`🎉 *ASSET SECURED*\nUsername: @${state.data.lastUsername}\nStatus: _Saved in account_`, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
  });

  bot.callbackQuery('hunter:reject', async (ctx) => {
    try { await ctx.answerCallbackQuery('❌ Menghapus...'); } catch {}
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
      } catch (e) {}
    }

    state.setResult('rejected');
    state.hunting = false;
    const controller = activeHunts.get(ctx.from.id);
    if (controller) controller.abort = true;
    activeHunts.delete(ctx.from.id);

    try { await ctx.deleteMessage(); } catch {}
    await ctx.reply(`🗑️ *ASSET DISCARDED*\nUsername @${state.data.lastUsername} dilepas dan channel dihapus.`, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
  });
};

async function huntLoop(ctx, acc, state, wordlist, controller) {
  const userId = ctx.from.id;
  const delayMs = Math.max(DELAY_MS, 2000);
  let checked = 0;
  let statusMsgId = null;

  try {
    const msg = await ctx.reply('🔍 *Scanning Network...*', { parse_mode: 'Markdown' });
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
          `📡 *SCANNING IN PROGRESS*\n━━━━━━━━━━━━━━━━\n🔍 Checked: \`${checked}\`\n📝 Current: \`${username}\`\n📊 Queue: \`${wordlist.remaining()}\`\n━━━━━━━━━━━━━━━━`,
          { parse_mode: 'Markdown' }
        );
      } catch {}
    }

    if (controller.abort) break;

    try {
      await acc.ensureConnected();
      if (controller.abort) break;

      // 1) Cek ketersediaan
      const available = await acc.client.invoke(new Api.account.CheckUsername({ username }));
      if (controller.abort) break;

      if (!available) {
        await abortableSleep(controller, delayMs);
        if (controller.abort) break;
        continue;
      }

      // 2) Buat channel
      const updates = await acc.client.invoke(new Api.channels.CreateChannel({
        title: username,
        about: `Reserved: @${username}`,
        broadcast: true,
        megagroup: false
      }));
      if (controller.abort) break;

      const chan = (updates.chats || []).find(c => c.className === 'Channel' || c.title === username);
      if (!chan) {
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
          .text('✅ KEEP', 'hunter:accept')
          .text('❌ DROP', 'hunter:reject');

        await ctx.reply(
          `💎 *GEM FOUND!* 💎\n━━━━━━━━━━━━━━━━\nUsername: *@${username}*\nAttempt: #${checked}\n━━━━━━━━━━━━━━━━\n\n_Tentukan nasib username ini:_`,
          { reply_markup: kb, parse_mode: 'Markdown' }
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
            ? `⚠️ *Rate Limit.* Tunggu ~${Math.ceil(limit.waitSec / 60)} menit.`
            : '⚠️ *Channel Limit Reached.* Hapus beberapa channel publik.';
          await ctx.reply(msg, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
          break;
        }
        try {
          await acc.client.invoke(new Api.channels.DeleteChannel({ channel: inputChannel }));
        } catch {}
      }

    } catch (e) {
      if (e.message && e.message.includes('FLOOD_WAIT')) {
        const waitMatch = e.message.match(/FLOOD_WAIT_(\d+)/);
        const waitTime = waitMatch ? parseInt(waitMatch[1], 10) : 30;

        if (statusMsgId) {
          try {
            await ctx.api.editMessageText(userId, statusMsgId, `⏳ *Cooling Down...* (${waitTime}s)`, { parse_mode: 'Markdown' });
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
    await ctx.reply(`⏹️ *Scan Complete.* Total checked: \`${checked}\``, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
  }

  activeHunts.delete(userId);
}
