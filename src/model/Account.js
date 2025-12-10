const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram');
const { DEBUG, MESSAGE_EFFECT_ID } = require('../config/setting');
const { saveSession } = require('../utils/sessionStore');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

class Account {
  constructor(ownerId) {
    this.ownerId = ownerId;
    this.id = String(Date.now()).slice(-6);
    this.name = 'User';
    this.sess = '';
    this.client = null;
    this.authed = false;

    this.pendingCode = null;
    this.pendingPass = null;
    this.loadingMsgId = null;

    this.lastResults = [];
  }

  log(...a) { if (DEBUG) console.log('[Account]', this.ownerId, ...a); }

  get stringSession() {
    return new StringSession(this.sess || '');
  }

  buildClient(apiId, apiHash) {
    this.client = new TelegramClient(this.stringSession, apiId, apiHash, {
      connectionRetries: 5
    });
    return this.client;
  }

  async ensureConnected() {
    if (!this.client) return false;
    try {
      if (!this.client._sender || !this.client._sender.isConnected()) {
        await this.client.connect();
      }
      return true;
    } catch {
      return false;
    }
  }

  async login(ctx, apiId, apiHash, phone, getMainMenu, otpRetry = 0) {
    if (!this.client) this.buildClient(apiId, apiHash);

    const show = async (text, opts = {}) => {
      try {
        const finalOpts = { ...opts, parse_mode: 'Markdown' };
        const m = await ctx.reply(text, finalOpts);
        this.loadingMsgId = m.message_id;
      } catch {}
    };

    const clearLoading = async () => {
      if (this.loadingMsgId) {
        try { await ctx.api.deleteMessage(ctx.from.id, this.loadingMsgId); } catch {}
        this.loadingMsgId = null;
      }
    };

    await show('🔄 *Membangun Koneksi Aman...*');

    try {
      await this.client.start({
        phoneNumber: async () => phone,
        phoneCode: async () => {
          await clearLoading();
          const kb = { reply_markup: { inline_keyboard: [[{ text: '❌ Batalkan', callback_data: 'action:cancel' }]] } };
          await show('📨 *KODE OTP TERKIRIM*\n\nCek aplikasi Telegram Anda. Masukkan kode di sini.\n_Contoh: 1 2 3 4 5 (Gunakan spasi)_', kb);
          const code = await new Promise(resolve => {
            this.pendingCode = (c) => resolve(String(c).replace(/\D+/g, ''));
          });
          return code;
        },
        password: async () => {
          await clearLoading();
          const kb = { reply_markup: { inline_keyboard: [[{ text: '❌ Batalkan', callback_data: 'action:cancel' }]] } };
          await show('🔐 *VERIFIKASI 2FA*\n\nAkun dilindungi kata sandi Cloud (2FA). Silakan masukkan password:', kb);
          const pwd = await new Promise(resolve => {
            this.pendingPass = (p) => resolve(String(p).trim());
          });
          return pwd;
        },
        onError: (err) => { throw err; }
      });

      this.sess = this.client.session.save();
      this.authed = true;
      saveSession(this.ownerId, this.id, this.sess);
      await clearLoading();

      const opts = { parse_mode: 'Markdown' };
      if (MESSAGE_EFFECT_ID) opts.message_effect_id = MESSAGE_EFFECT_ID;
      if (typeof getMainMenu === 'function') {
        opts.reply_markup = getMainMenu(ctx);
      }

      await ctx.reply('✅ *KONEKSI BERHASIL*\nSelamat datang, identitas Anda telah diverifikasi.', opts);
      return true;

    } catch (e) {
      await clearLoading();

      if (e.message && e.message.includes('PHONE_CODE_INVALID') && otpRetry < 1) {
        await ctx.reply('⚠️ *OTP Salah.* Silakan coba lagi dengan kode yang benar.', { parse_mode: 'Markdown' });
        this.pendingCode = null;
        this.pendingPass = null;
        try { ctx.session = { act: 'login_waiting', id: this.id }; } catch {}
        return this.login(ctx, apiId, apiHash, phone, getMainMenu, otpRetry + 1);
      }

      await ctx.reply('❌ *Gagal Masuk:* ' + (e.message || String(e)), { parse_mode: 'Markdown' });
      return false;

    } finally {
      this.pendingCode = null;
      this.pendingPass = null;
    }
  }

  handleText(text, ctx) {
    const raw = String(text || '').trim();
    if (!raw) return false;

    const otpDigits = raw.replace(/\s+/g, '');
    if (this.pendingCode && /^\d{3,8}$/.test(otpDigits)) {
      const fn = this.pendingCode;
      this.pendingCode = null;
      try { ctx.reply('⏳ *Memverifikasi OTP...*', { parse_mode: 'Markdown' }).catch(() => {}); } catch {}
      try { fn(otpDigits); } catch {}
      return true;
    }

    if (this.pendingPass) {
      const fn = this.pendingPass;
      this.pendingPass = null;
      try { ctx.reply('⏳ *Memverifikasi Password...*', { parse_mode: 'Markdown' }).catch(() => {}); } catch {}
      try { fn(raw); } catch {}
      return true;
    }

    return false;
  }

  normalizeNamesFromList(text) {
    return String(text || '')
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  normalizeNamesFromPrefix(prefix, count) {
    const out = [];
    for (let i = 1; i <= count; i++) out.push(`${prefix} ${i}`);
    return out;
  }

  async createSupergroupAndInvite({ title, about = '' }) {
    await this.ensureConnected();

    const updates = await this.client.invoke(new Api.channels.CreateChannel({
      title,
      about,
      megagroup: true
    }));

    const chan = (updates.chats || []).find(c => c.className === 'Channel' || c._ === 'channel' || c.title === title);
    if (!chan) throw new Error('Channel tidak ditemukan dari hasil pembuatan.');

    const inputChannel = new Api.InputChannel({ channelId: chan.id, accessHash: chan.accessHash });
    const inputPeerChannel = new Api.InputPeerChannel({ channelId: chan.id, accessHash: chan.accessHash });

    try {
      await this.client.invoke(new Api.channels.TogglePreHistoryHidden({
        channel: inputChannel,
        enabled: false
      }));
    } catch (e) {
      this.log('TogglePreHistoryHidden warn:', e.message || e);
    }

    let link = null;
    try {
      const invite = await this.client.invoke(new Api.messages.ExportChatInvite({ peer: inputPeerChannel }));
      if (invite && invite.link) link = invite.link;
      else if (invite && invite.invite && invite.invite.link) link = invite.invite.link;
      else if (Array.isArray(invite.invites) && invite.invites[0]?.link) link = invite.invites[0].link;
    } catch (e) {
      this.log('ExportChatInvite error:', e.message || e);
    }

    return { title, link: link || '(tidak ada link)' };
  }

  async createManyGroupsSequential(names, { delayMs = 2000, about = '' } = {}) {
    const results = [];
    for (const name of names) {
      try {
        const res = await this.createSupergroupAndInvite({ title: name, about });
        results.push(res);
      } catch (e) {
        results.push({ title: name, link: '(gagal: ' + (e.message || e) + ')' });
      }
      if (delayMs > 0) await sleep(delayMs);
    }
    this.lastResults = results;
    return results;
  }
}

module.exports = Account;
