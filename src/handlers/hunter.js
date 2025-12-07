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

module.exports = (bot) => {
  // Start Sniper
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
      `📡 *USERNAME SNIPER INITIATED*\n\n🎯 Target: \`${wordlist.remaining()} kata\`\n⏱️ Estimasi: ${wordlist.estimateTotal().toLocaleString()}+\n\n_Scanning network..._`,
      { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' }
    );

    const controller = { abort: false };
    activeHunts.set(ctx.from.id, controller);

    await huntLoop(ctx, acc, state, wordlist, controller);
  });

  // Stop Sniper
  bot.hears(MENU.stopHunt, async (ctx) => {
    const controller = activeHunts.get(ctx.from.id);
    if (controller) controller.abort = true;
    activeHunts.delete(ctx.from.id);

    const state = new HunterState(ctx.from.id);
    state.hunting = false;

    await ctx.reply('🛑 *Sniper Stopped.* Operasi dihentikan.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
  });

  // CLAIM: baru buat channel + set username sekali
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

  // SKIP: langsung lanjut scanning (tanpa buat channel)
  bot.callbackQuery('hunter:reject', async (ctx) => {
    try { await ctx.answerCallbackQuery('⏭️ Lanjut cari berikutnya'); } catch {}
    const state = new HunterState(ctx.from.id);
    const acc = getAcc(ctx.from.id);
    if (!acc?.authed) {
      return ctx.reply('❌ Belum login user.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    }

    state.setResult('rejected');
    state.hunting = true;

    // Mulai lagi loop baru
    const controller = { abort: false };
    activeHunts.set(ctx.from.id, controller);

    try { await ctx.deleteMessage(); } catch {}
    await huntLoop(ctx, acc, state, getWordlist(ctx.from.id), controller);
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
          `📡 *SCANNING IN PROGRESS*\n━━━━━━━━━━━━━━━━\n🔍 Checked: \`${checked}\`\n📝 Current: \`${username}\`\n📊 Queue: \`${wordlist.remaining()}\`\n━━━━━━━━━━━━━━━━`
        );
      } catch {}
    }

    if (controller.abort) break;

    try {
      await acc.ensureConnected();
      if (controller.abort) break;

      // Cek ketersediaan saja
      const available = await acc.client.invoke(new Api.account.CheckUsername({ username }));
      if (controller.abort) break;

      if (!available) {
        await abortableSleep(controller, delayMs);
        if (controller.abort) break;
        continue;
      }

      // Ditemukan available -> tawarkan CLAIM/SKIP, hentikan loop
      state.setLastClaim(username, null, null);
      state.hunting = false;

      if (statusMsgId) {
        try { await ctx.api.deleteMessage(userId, statusMsgId); } catch {}
      }

      const kb = new InlineKeyboard()
        .text('✅ CLAIM', 'hunter:accept')
        .text('❌ SKIP', 'hunter:reject');

      await ctx.reply(
        `💎 *USERNAME AVAILABLE!* 💎\n━━━━━━━━━━━━━━━━\nUsername: *@${username}*\nAttempt: #${checked}\n━━━━━━━━━━━━━━━━\n\nPilih aksi:`,
        { reply_markup: kb, parse_mode: 'Markdown' }
      );

      activeHunts.delete(userId);
      return;

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
