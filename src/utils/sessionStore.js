const fs = require('fs');
const path = require('path');

const SESS_FILE = path.join(__dirname, '../../data/sessions.json');

function ensureDir() {
  const dir = path.dirname(SESS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadRaw() {
  ensureDir();
  if (fs.existsSync(SESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SESS_FILE, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveRaw(data) {
  ensureDir();
  fs.writeFileSync(SESS_FILE, JSON.stringify(data, null, 2));
}

function loadSessions() {
  return loadRaw();
}

function saveSession(userId, accId, sess) {
  const data = loadRaw();
  const uid = String(userId);
  if (!data[uid]) data[uid] = [];
  const existingIdx = data[uid].findIndex((x) => x.id === accId);
  if (existingIdx >= 0) {
    data[uid][existingIdx].sess = sess;
  } else {
    data[uid].push({ id: accId, sess });
  }
  saveRaw(data);
}

function removeSession(userId, accId) {
  const data = loadRaw();
  const uid = String(userId);
  if (!data[uid]) return;
  data[uid] = data[uid].filter((x) => x.id !== accId);
  if (!data[uid].length) delete data[uid];
  saveRaw(data);
}

module.exports = { loadSessions, saveSession, removeSession };
