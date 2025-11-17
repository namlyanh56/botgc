const users = new Map();

function normId(uid) {
  const n = Number(uid);
  return Number.isFinite(n) ? n : uid;
}

function getUser(uid) {
  const key = normId(uid);
  if (!users.has(key)) {
    users.set(key, {
      accounts: new Map(),
      active: null
    });
  }
  return users.get(key);
}

function getAcc(uid) {
  const u = getUser(uid);
  if (u.active && u.accounts.has(u.active)) return u.accounts.get(u.active);
  // fallback: pick first
  const first = u.accounts.keys().next().value;
  if (first) {
    u.active = first;
    return u.accounts.get(first);
  }
  return null;
}

module.exports = {
  users,
  getUser,
  getAcc
};
