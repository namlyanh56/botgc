const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '../../data/hunter-state.json');

// Pastikan folder data ada
function ensureDir() {
  const dir = path.dirname(STATE_FILE);
  if (!fs. existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadState() {
  ensureDir();
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveState(state) {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Hunter State per user
 */
class HunterState {
  constructor(userId) {
    this.userId = String(userId);
    this.state = loadState();
    if (!this.state[this.userId]) {
      this.state[this.userId] = {
        hunting: false,
        lastUsername: null,
        lastChannelId: null,
        lastAccessHash: null,
        lastResult: null, // 'accepted' | 'rejected' | null
        checked: 0,
        found: 0
      };
    }
  }

  get data() {
    return this.state[this.userId];
  }

  set hunting(val) {
    this.data.hunting = val;
    this.save();
  }

  get hunting() {
    return this.data. hunting;
  }

  setLastClaim(username, channelId, accessHash) {
    this. data.lastUsername = username;
    this.data.lastChannelId = String(channelId);
    this.data.lastAccessHash = String(accessHash);
    this.data.lastResult = null;
    this. data.found++;
    this. save();
  }

  setResult(result) {
    this.data. lastResult = result;
    this.save();
  }

  incrementChecked() {
    this.data. checked++;
    this.save();
  }

  reset() {
    this.data.hunting = false;
    this.data.lastUsername = null;
    this.data.lastChannelId = null;
    this. data.lastAccessHash = null;
    this.data.lastResult = null;
    this.save();
  }

  save() {
    this.state[this. userId] = this. data;
    saveState(this.state);
  }
}

module.exports = HunterState;
