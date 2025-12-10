const { InlineKeyboard } = require('grammy');
const { Api } = require('telegram');
const { MENU, mainMenu, inlineCancelKb } = require('../utils/menu');
const { getAcc } = require('../utils/helper');
const { WordlistManager, isValidUsername } = require('../utils/wordlist');
const HunterState = require('../model/HunterState');
const { DELAY_MS, DEBUG } = require('../config/setting');

// --- Helper Functions ---
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Sleep yang bisa dibatalkan (untuk Sniper)
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
  // Validasi: a-z di awal, min 5 char, max 32
  return /^[a-z][a-z0-9_]{3,31}$/i.test(u);
}

function parseWordlistInput(text) {
  return String(text || '')
    .split(/[\n,]/) // Pisah baris atau koma
    .map(s => s.trim().toLowerCase()) // Lowercase
    .filter(Boolean); // Hapus kosong
}

// --- Global State Managers ---
const activeHunts = new Map();     // Controller untuk Sniper
const activeAutoTakes = new Map(); // Controller untuk Auto Take Daemon
const wordlists = new Map();       // Manager Wordlist per user

function getWordlist(userId) {
  if (!wordlists.has(userId)) wordlists.set(userId, new WordlistManager());
  return wordlists.get(userId);
}

// Memastikan Daemon Auto Take berjalan jika belum
function ensureAutoTakeRunning(ctx, acc, state) {
  const userId = ctx.from.id;
  if (activeAutoTakes.has(userId)) return; // Sudah jalan

  const targets = state.data.autoTakeTargets || [];
  if (targets.length === 0) return; // Tidak ada target, jangan jalan

  state.setAutoTakeActive(true);
  const controller = { abort: false };
  activeAutoTakes.set(userId, controller);

  // Jalankan di background (Fire & Forget)
  autoTakeDaemon(ctx, acc, state, controller).catch(e => {
    console.error(`[AutoTake] Crash user ${userId}:`, e);
    activeAutoTakes.delete(userId);
  });
}

module.exports = (bot) => {

  // ==================================================================
  // 1. CUSTOM WORDLIST SETUP (Untuk Sniper)
  // ==================================================================
  bot.hears(MENU.customWordlist, async (ctx) => {
    const acc = getAcc(ctx.from.id);
    if (!acc?.authed) return ctx.reply('🚫 *Akses Ditolak.* Login dahulu.', { parse_mode: 'Markdown' });
    
    ctx.session = { act: 'set_manual_wordlist' };
    await ctx.reply(
`✍️ *WORDLIST CUSTOM (SNIPER)*

Kirim daftar kata yang ingin Anda scan menggunakan fitur *Start Scanner*.
_Maksimal 100 kata._
_Format: Dipisah baris baru atau koma._

*Contoh:*
\`king_of_crypto
super_admin
budi_santoso\``,
      { reply_markup: inlineCancelKb(), parse_mode: 'Markdown' }
    );
  });

  // ==================================================================
  // 2. SNIPER (Pencarian)
  // ==================================================================
  bot.hears(MENU.huntUsername, async (ctx) => {
    const acc = getAcc(ctx.from.id);
    if (!acc?.authed) return ctx.reply('🚫 *Akses Ditolak.* Login dahulu.', { parse_mode: 'Markdown' });

    const state = new HunterState(ctx.from.id);
    if (state.hunting) {
      return ctx.reply('⚠️ *Scanner Masih Aktif.* Stop dulu.', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    }

    const hasManual = (state.data.manualWordlist || []).length > 0;
    const kb = new InlineKeyboard()
      .text('📚 Database Bawaan', 'hunt:start:default')
      .text(hasManual ? '📂 Database Custom' : '🚫 Custom Kosong', 'hunt:start:manual');

    await ctx.reply(
      `🔭 *KONFIGURASI SNIPER*\n\nPilih sumber kata kunci:\n• *Bawaan*: Kombinasi acak (5-8 huruf).\n• *Custom*: Daftar spesifik Anda.`,
      { reply_markup: kb, parse_mode: 'Markdown' }
    );
  });

  bot.callbackQuery(/hunt:start:(default|manual)/, async (ctx) => {
    const mode = ctx.match[1];
    try { await ctx.answerCallbackQuery(); } catch {}
    const acc = getAcc(ctx.from.id);
    if (!acc?.authed) return;

    const state = new HunterState(ctx.from.id);
    const wl = getWordlist(ctx.from.id);

    if (mode === 'manual') {
      const manual = state.data.manualWordlist || [];
      if (!manual.length) return ctx.reply('❌ Wordlist Custom kosong.', { reply_markup: mainMenu(ctx) });
      // Perbaikan 1: Set Custom agar menggunakan kata mentah
      wl.setCustom(manual);
    } else {
      wl.setCustom(null); // Mode default
    }

    await startHunt(ctx, acc, state, wl);
  });

  bot.hears(MENU.stopHunt, async (ctx) => {
    // Perbaikan: Hanya stop Sniper (activeHunts), JANGAN stop Auto Take (activeAutoTakes)
    const controller = activeHunts.get(ctx.from.id);
    if (controller) controller.abort = true;
    activeHunts.delete(ctx.from.id);

    const state = new HunterState(ctx.from.id);
    state.hunting = false;

    await ctx.reply('🛑 *Sniper Dihentikan.* (Auto-Take tetap berjalan jika ada target).', { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
  });

  // ==================================================================
  // 3. AUTO TAKE (Sub-Menu & Logic)
  // ==================================================================
  bot.hears(MENU.autoTake, async (ctx) => {
    const acc = getAcc(ctx.from.id);
    if (!acc?.authed) return ctx.reply('🚫 *Akses Ditolak.* Login dahulu.', { parse_mode: 'Markdown' });

    const state = new HunterState(ctx.from.id);
    const targets = state.data.autoTakeTargets || [];
    const isRunning = activeAutoTakes.has(ctx.from.id);
    const statusIcon = isRunning ? '🟢 BERJALAN' : '⚪ STANDBY';

    // Pastikan daemon jalan jika ada target tapi belum jalan (recovery)
    if (targets.length > 0 && !isRunning) {
        ensureAutoTakeRunning(ctx, acc, state);
    }

    const kb = new InlineKeyboard()
      .text(`📋 Lihat Daftar (${targets.length})`, 'autotake:list')
      .text('➕ Tambah Target', 'autotake:add');

    const msg = 
`⚡ *AUTO CLAIM MANAGER*

Status: ${statusIcon}
Jumlah Target: *${targets.length} / 100*

_Fitur ini berjalan di latar belakang. Bot akan terus memantau daftar target dan otomatis mengklaim jika tersedia._`;

    await ctx.reply(msg, { reply_markup: kb, parse_mode: 'Markdown' });
  });

  bot.callbackQuery('autotake:list', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch {}
    const state = new HunterState(ctx.from.id);
    const targets = state.data.autoTakeTargets || [];

    if (!targets.length) {
      return ctx.editMessageText('ℹ️ *Daftar Kosong.* Tambahkan target terlebih dahulu.', { 
        parse_mode: 'Markdown', 
        reply_markup: new InlineKeyboard().text('➕ Tambah Target', 'autotake:add').text('🔙 Kembali', 'autotake:menu')
      });
    }

    // Tampilkan daftar bernomor
    let listTxt = targets.map((t, i) => `${i + 1}. \`${t}\``).join('\n');
    const msg = 
`📋 *DAFTAR TARGET AUTO-CLAIM*
━━━━━━━━━━━━━━━━━━
${listTxt}
━━━━━━━━━━━━━━━━━━
*Ingin menghapus?*
Pilih menu "Hapus Target" dan kirim nomor urut atau nama usernamenya.`;

    const kb = new InlineKeyboard()
      .text('🗑️ Hapus Target', 'autotake:delete')
      .text('🔙 Kembali', 'autotake:menu');

    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: kb });
  });

  bot.callbackQuery('autotake:add', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch {}
    ctx.session = { act: 'autotake_add' };
    await ctx.reply(
`➕ *TAMBAH TARGET*

Kirim username yang ingin dipantau.
_Format: pisah koma atau baris baru._
_Maksimal slot: 100._

Contoh:
\`cool_user, pro_gamer
super_bot\``, 
      { reply_markup: inlineCancelKb(), parse_mode: 'Markdown' }
    );
  });

  bot.callbackQuery('autotake:delete', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch {}
    ctx.session = { act: 'autotake_delete' };
    await ctx.reply(
`🗑️ *HAPUS TARGET*

Kirim *Nomor Urut* (lihat di menu list) atau *Nama Username* yang ingin dihapus.
_Bisa banyak sekaligus (pisah koma)._

Contoh:
\`1, 3, 5\` (Hapus nomor 1, 3, dan 5)
\`cool_user\` (Hapus nama cool_user)`, 
      { reply_markup: inlineCancelKb(), parse_mode: 'Markdown' }
    );
  });

  bot.callbackQuery('autotake:menu', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch {}
    try { await ctx.deleteMessage(); } catch {}
    // Trigger ulang menu utama auto take
    const h = require('./hunter'); // Self-reference workaround or just re-run logic
    // Simplest: just send the menu message again
    // Re-using the logic from MENU.autoTake block:
    const state = new HunterState(ctx.from.id);
    const targets = state.data.autoTakeTargets || [];
    const isRunning = activeAutoTakes.has(ctx.from.id);
    const statusIcon = isRunning ? '🟢 BERJALAN' : '⚪ STANDBY';
    const kb = new InlineKeyboard()
      .text(`📋 Lihat Daftar (${targets.length})`, 'autotake:list')
      .text('➕ Tambah Target', 'autotake:add');
    await ctx.reply(`⚡ *AUTO CLAIM MANAGER*\n\nStatus: ${statusIcon}\nJumlah Target: *${targets.length}*`, { reply_markup: kb, parse_mode: 'Markdown' });
  });

  // ==================================================================
  // 4. HANDLER INPUT TEKS
  // ==================================================================
  bot.on('message:text', async (ctx, next) => {
    const s = ctx.session;
    if (!s) return next();
    const acc = getAcc(ctx.from.id);

    // -- SET MANUAL WORDLIST (SNIPER) --
    if (s.act === 'set_manual_wordlist') {
      const words = parseWordlistInput(ctx.message.text).filter(w => isValidUsername(w));
      if (!words.length) {
        return ctx.reply('⚠️ Tidak ada kata valid (5-32 char).', { reply_markup: inlineCancelKb(), parse_mode: 'Markdown' });
      }
      const state = new HunterState(ctx.from.id);
      state.setManualWordlist(words); // Simpan mentah
      ctx.session = null;
      return ctx.reply(`✅ *Tersimpan.* ${words.length} kata siap di-scan.\nMasuk menu "Cari Username" > "Database Custom".`, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    }

    // -- ADD TARGET (AUTO TAKE) --
    if (s.act === 'autotake_add') {
        const state = new HunterState(ctx.from.id);
        const current = state.data.autoTakeTargets || [];
        const inputs = parseWordlistInput(ctx.message.text).filter(w => isValidCandidate(w));
        
        if (!inputs.length) return ctx.reply('⚠️ Username tidak valid.', { reply_markup: inlineCancelKb() });

        // Gabung dan unikkan
        const combined = [...new Set([...current, ...inputs])];
        
        // Batasi 100
        if (combined.length > 100) {
            return ctx.reply('⚠️ *Kuota Penuh.* Maksimal 100 target.', { reply_markup: inlineCancelKb(), parse_mode: 'Markdown' });
        }

        state.setAutoTakeTargets(combined);
        ctx.session = null;
        
        // Trigger Daemon
        ensureAutoTakeRunning(ctx, acc, state);

        return ctx.reply(`✅ *Ditambahkan.* Total target: ${combined.length}.\nDaemon berjalan di background.`, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    }

    // -- DELETE TARGET (AUTO TAKE) --
    if (s.act === 'autotake_delete') {
        const state = new HunterState(ctx.from.id);
        let current = state.data.autoTakeTargets || [];
        const inputs = ctx.message.text.split(/[\n,]/).map(s => s.trim()).filter(Boolean);

        const toRemoveIndexes = [];
        const toRemoveNames = [];

        // Identifikasi input (angka atau nama)
        inputs.forEach(i => {
            if (/^\d+$/.test(i)) toRemoveIndexes.push(parseInt(i, 10) - 1); // Konversi ke index 0-based
            else toRemoveNames.push(i.toLowerCase());
        });

        // Filter
        const startCount = current.length;
        current = current.filter((name, idx) => {
            if (toRemoveNames.includes(name)) return false;
            if (toRemoveIndexes.includes(idx)) return false;
            return true;
        });

        const deletedCount = startCount - current.length;
        state.setAutoTakeTargets(current);
        ctx.session = null;

        return ctx.reply(`🗑️ *Dihapus.* ${deletedCount} item dihapus. Sisa: ${current.length}.`, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
    }

    return next();
  });
};

// ==================================================================
// LOGIC LOOPS
// ==================================================================

// 1. SNIPER LOOP
async function startHunt(ctx, acc, state, wordlist) {
  state.hunting = true;
  state.setResult(null);

  await ctx.reply(
    `📡 *SNIPER DIMULAI*\n\n🎯 Target: \`${wordlist.remaining()}\`\n🚀 _Memindai..._`,
    { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' }
  );

  const controller = { abort: false };
  activeHunts.set(ctx.from.id, controller);
  await huntLoop(ctx, acc, state, wordlist, controller);
}

async function huntLoop(ctx, acc, state, wordlist, controller) {
  const userId = ctx.from.id;
  let checked = 0;
  let statusMsgId = null;

  try {
    const msg = await ctx.reply('🔍 *Memindai...*', { parse_mode: 'Markdown' });
    statusMsgId = msg.message_id;
  } catch {}

  while (!controller.abort && state.hunting) {
    // Ambil kata berikutnya
    const username = wordlist.next();

    // Perbaikan 2: Jika null (habis), hentikan loop dan beri pesan selesai
    if (!username) {
        state.hunting = false;
        if (statusMsgId) try { await ctx.api.deleteMessage(userId, statusMsgId); } catch {}
        await ctx.reply(`✅ *SELESAI.* Semua kata dalam daftar telah dipindai.\nTotal: ${checked} diperiksa.`, { reply_markup: mainMenu(ctx), parse_mode: 'Markdown' });
        activeHunts.delete(userId);
        return;
    }

    checked++;
    state.incrementChecked();
    if (!isValidCandidate(username)) continue;

    // UI Update (Setiap 5 kata)
    if (checked % 5 === 0 && statusMsgId) {
      try {
        await ctx.api.editMessageText(userId, statusMsgId, 
            `📡 *SCANNING...*\nCek: \`${checked}\`\nKata: \`${username}\`\nSisa: \`${wordlist.remaining()}\``, 
            { parse_mode: 'Markdown' }
        );
      } catch {}
    }

    if (controller.abort) break;

    try {
      // Cek koneksi
      await acc.ensureConnected();
      if (controller.abort) break;

      // Cek username
      const available = await acc.client.invoke(new Api.account.CheckUsername({ username }));
      if (available === true) {
        state.hunting = false;
        if (statusMsgId) try { await ctx.api.deleteMessage(userId, statusMsgId); } catch {}
        
        // Notifikasi Ditemukan
        await ctx.reply(
          `💎 *DITEMUKAN: @${username}* 💎\n\nSegera amankan!`,
          { 
            reply_markup: new InlineKeyboard().text('✅ KLAIM', 'hunter:accept').text('❌ LEWATI', 'hunter:reject'), 
            parse_mode: 'Markdown' 
          }
        );
        
        // Simpan sementara di state untuk tombol callback
        state.setLastClaim(username, null, null);
        activeHunts.delete(userId);
        return;
      }
    } catch (e) {
      if (String(e).includes('FLOOD_WAIT')) {
        const s = parseInt(String(e).match(/\d+/)?.[0] || '30', 10);
        if (statusMsgId) try { await ctx.api.editMessageText(userId, statusMsgId, `⏳ *Limit.* Tunggu ${s}d...`, { parse_mode: 'Markdown' }); } catch {}
        await abortableSleep(controller, s * 1000);
      }
    }

    if (controller.abort) break;
    await abortableSleep(controller, DELAY_MS);
  }

  if (statusMsgId) try { await ctx.api.deleteMessage(userId, statusMsgId); } catch {}
  activeHunts.delete(userId);
}

// 2. AUTO TAKE DAEMON (Latar Belakang)
async function autoTakeDaemon(ctx, acc, state, controller) {
    const userId = ctx.from.id;
    // Daemon berjalan selamanya sampai controller.abort true (yg hanya terjadi jika user logout atau bot restart/crash)
    // Atau jika list kosong.
    
    while (!controller.abort) {
        // Reload state terbaru setiap putaran (karena user bisa add/delete saat loop jalan)
        const currentState = new HunterState(userId);
        const targets = currentState.data.autoTakeTargets || [];

        // Jika list kosong, daemon tidur panjang atau mati sementara?
        // Kita matikan saja agar hemat resource. Nanti 'Add Target' akan menghidupkan lagi.
        if (targets.length === 0) {
            currentState.setAutoTakeActive(false);
            activeAutoTakes.delete(userId);
            break;
        }

        // Loop target
        for (const username of targets) {
            if (controller.abort) break;

            try {
                // Pastikan koneksi
                const connected = await acc.ensureConnected();
                if (!connected) { 
                    // Jika putus, tunggu agak lama lalu coba lagi
                    await sleep(5000); 
                    continue; 
                }

                const available = await acc.client.invoke(new Api.account.CheckUsername({ username }));
                
                if (available === true) {
                    log(`[AutoTake] AVAILABLE: ${username}`);
                    
                    // Eksekusi Claim
                    const updates = await acc.client.invoke(new Api.channels.CreateChannel({
                        title: username,
                        about: `Auto: @${username}`,
                        broadcast: true,
                        megagroup: false
                    }));
                    
                    const chan = (updates.chats || []).find(c => c.className === 'Channel');
                    if (chan) {
                        const inputChannel = new Api.InputChannel({ channelId: chan.id, accessHash: chan.accessHash });
                        await acc.client.invoke(new Api.channels.UpdateUsername({
                            channel: inputChannel,
                            username
                        }));
                        
                        // Sukses Claim!
                        // Hapus dari daftar target
                        const newState = new HunterState(userId);
                        const newTargets = (newState.data.autoTakeTargets || []).filter(t => t !== username);
                        newState.setAutoTakeTargets(newTargets);
                        
                        await ctx.reply(`⚡ *AUTO CLAIM SUKSES*\nTarget: @${username}\nStatus: Aman (Channel dibuat).`, { parse_mode: 'Markdown' });
                    }
                }
            } catch (e) {
                // Error handling (Flood wait, dll)
                if (String(e).includes('FLOOD_WAIT')) {
                    const s = parseInt(String(e).match(/\d+/)?.[0] || '60', 10);
                    await sleep(s * 1000);
                }
            }
            
            // Delay antar cek username agar tidak flood
            await sleep(2000);
        }

        // Delay antar putaran penuh seluruh list
        await sleep(5000);
    }
}
