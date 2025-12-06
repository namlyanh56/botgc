const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram');
const { DEBUG, MESSAGE_EFFECT_ID } = require('../config/setting');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

class Account {
  constructor(ownerId) {
    this. ownerId = ownerId;
    this.id = String(Date.now()). slice(-6);
    this. name = 'User';
    this. sess = '';
    this.client = null;
    this.authed = false;

    // Interactive login helpers
    this.pendingCode = null;
    this. pendingPass = null;
    this.loadingMsgId = null;

    // Last results cache
    this.lastResults = [];
  }

  log(... a) { if (DEBUG) console. log('[Account]', this. ownerId, ...a); }

  get stringSession() {
    return new StringSession(this. sess || '');
  }

  buildClient(apiId, apiHash) {
    this. client = new TelegramClient(this.stringSession, apiId, apiHash, {
      connectionRetries: 5
    });
    return this.client;
  }

  async ensureConnected() {
    if (!this.client) return false;
    try {
      if (!this.client._sender || !this.client._sender.isConnected()) {
        await this.client. connect();
      }
      return true;
    } catch {
      return false;
    }
  }

  async login(ctx, apiId, apiHash, phone, getMainMenu) {
    if (! this.client) this.buildClient(apiId, apiHash);

    const show = async (text, opts = {}) => {
      try { 
        const m = await ctx.reply(text, opts); 
        this. loadingMsgId = m.message_id; 
      } catch {}
    };
    
    const clearLoading = async () => {
      if (this.loadingMsgId) {
        try { await ctx.api.deleteMessage(ctx.from.id, this. loadingMsgId); } catch {}
        this.loadingMsgId = null;
      }
    };
    
    await show('⏳ Memulai login...');

    try {
      await this.client.start({
        phoneNumber: async () => phone,
        phoneCode: async () => {
          await clearLoading();
          const kb = { reply_markup: { inline_keyboard: [[{ text: '❌ Batal', callback_data: 'action:cancel' }]] } };
          await show('📱 Kirim kode OTP (boleh dipisah spasi), contoh: 1 2 3 4 5', kb);
          const code = await new Promise(resolve => { 
            this.pendingCode = (c) => resolve(String(c). replace(/\D+/g, '')); 
          });
          return code;
        },
        password: async () => {
          await clearLoading();
          const kb = { reply_markup: { inline_keyboard: [[{ text: '❌ Batal', callback_data: 'action:cancel' }]] } };
          await show('🔐 Akun Anda pakai 2FA.  Kirim password sekarang:', kb);
          const pwd = await new Promise(resolve => { 
            this.pendingPass = (p) => resolve(String(p).trim()); 
          });
          return pwd;
        },
        onError: (err) => { throw err; }
      });

      this.sess = this.client.session.save();
      this. authed = true;
      await clearLoading();

      // ✅ PERBAIKAN: Kirim pesan sukses dengan menu utama
      const opts = {};
      if (MESSAGE_EFFECT_ID) opts.message_effect_id = MESSAGE_EFFECT_ID;
      
      // Gunakan callback untuk mendapatkan menu terbaru
      if (typeof getMainMenu === 'function') {
        opts.reply_markup = getMainMenu(ctx);
      }
      
      await ctx. reply('✅ Login berhasil!  Silakan pilih menu di bawah:', opts);

      return true;
    } catch (e) {
      await clearLoading();
      await ctx.reply('❌ Login gagal: ' + (e.message || String(e)));
      return false;
    } finally {
      this.pendingCode = null;
      this.pendingPass = null;
      try { ctx.session = null; } catch {}
    }
  }

  handleText(text, ctx) {
    const raw = String(text || ''). trim();
    if (! raw) return false;

    const otpDigits = raw.replace(/\s+/g, '');
    if (this.pendingCode && /^\d{3,8}$/.test(otpDigits)) {
      const fn = this.pendingCode; 
      this.pendingCode = null;
      try { ctx.reply('⏳ Memverifikasi kode... '). catch(() => {}); } catch {}
      try { fn(otpDigits); } catch {}
      return true;
    }

    if (this. pendingPass) {
      const fn = this.pendingPass; 
      this.pendingPass = null;
      try { ctx. reply('⏳ Memverifikasi password...').catch(() => {}); } catch {}
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
    for (let i = 1; i <= count; i++) {
      out.push(`${prefix} ${i}`);
    }
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
    if (! chan) throw new Error('Channel tidak ditemukan dari hasil pembuatan.');

    const inputChannel = new Api.InputChannel({ channelId: chan. id, accessHash: chan.accessHash });
    const inputPeerChannel = new Api.InputPeerChannel({ channelId: chan.id, accessHash: chan. accessHash });

    try {
      await this.client.invoke(new Api.channels. TogglePreHistoryHidden({
        channel: inputChannel,
        enabled: false
      }));
    } catch (e) {
      this.log('TogglePreHistoryHidden warn:', e. message || e);
    }

    let link = null;
    try {
      const invite = await this.client.invoke(new Api.messages.ExportChatInvite({
        peer: inputPeerChannel
      }));
      if (invite && invite.link) link = invite.link;
      else if (invite && invite. invite && invite.invite.link) link = invite. invite.link;
      else if (Array.isArray(invite. invites) && invite.invites[0]?.link) link = invite.invites[0].link;
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
