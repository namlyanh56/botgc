// Wordlist Logic
// Mode Default: Generate varian.
// Mode Custom: Gunakan apa adanya (Raw).

function isValidUsername(str) {
  // Validasi dasar Telegram (5-32 char, a-z, 0-9, underscore)
  return /^[a-z][a-z0-9_]{3,31}$/i.test(str);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Seed kata dasar (hanya digunakan jika mode Default)
const SEED = [
  'alpha','arcane','astro','auric','axion','azure','bionic','bitron','blocky','bright','byteon','calyp','canyon','carbon',
  'celest','celium','cinder','cobalt','cosmic','cruxly','cypher','daring','datium','delta','dynamo','ember','ethrix','fathom',
  'forged','galaxy','gamma','glance','glider','glitch','glofox','helium','horizon','ignite','ionics','jetset','kinetic','lancer',
  'lumina','lupine','matrix','meteor','modish','nebula','nexbit','nexus','novaly','obsidi','onyxia','orbitx','orion','oxford',
  'pinnix','pixelx','plasma','polaris','portal','primex','pulsar','quanta','quanty','quarky','radial','radium','raptor','ranger',
  'ripple','rocket','scalar','scopic','script','signal','silica','silver','sierra','sonicx','sparkx','spectr','stellar','stream',
  'summit','syntex','tachyon','talent','tandem','tensor','terra','titan','topaz','triton','trusty','upward','vector','venice',
  'vertex','vigil','vortex','xenial','xiphos','zenith','zephyr','zircon','garuda','merapi','jayala','sigap','mahir','terang',
  'cerdas','selaras','unggul','amanah','sahabat','sentra','nusaku','jayaku','mandal','santara','gemilang','cakraw','gelora',
  'samudr','angkasa','pelita','gembira','lestari','sejah','tekun','tangguh','lincah','handal','andalan','laskar','satria',
  'finova','finhub','paymax','paytek','duitku','danaku','invest','sahamx','reksa','tabung','modalx','profit','divida','cashly',
  'paynet','ledger','market','trader','broker','bullix','beacon','stable','credit','faktur','invoice','aiindo','aivisu','aipint',
  'dataku','dataid','dataset','algora','neuron','vector','prompt','replic','vision','voicex','folium','galaxi','magnet','marvel',
  'mirage','mystic','nomade','novice','opalis','oracle','pandai','paradi','patron','pelari','pelaut','pilotx','pirate','portal',
  'primeo','prisma','proton','quant','rapid','reason','reliable','rivals','rocket','rumble','salmon','sapphire','saturn','scarab',
  'seeker','sentio','serene','shadow','shifter','signal','silent','silver','simply','sirius','sketch','solver','sonata','spirit',
  'spring','sterna','stride','strong','studio','sunray','swiftx','tangent','turing','valley','vector','veloce','victor','violet',
  'vision','vitals','vocali','wander','wealth','wonder','zenite','zenova'
];

// Generator varian (Hanya untuk Default)
function generateVariants(word) {
  const res = new Set();
  const base = word.toLowerCase().replace(/[^a-z]/g, '');
  const len = base.length;
  
  // Kata asli jika panjangnya valid 5-8 (untuk sniper default biasanya cari pendek)
  if (len >= 5 && len <= 8) res.add(base);

  // Varian: Duplikasi huruf depan (apple -> aapple)
  if (len >= 5 && len <= 7) {
    const dup = (base[0] + base);
    if (isValidUsername(dup)) res.add(dup);
  }
  // Varian: Akhiran k/n (budi -> budik, budin)
  if (len >= 5 && len <= 8) {
    const last = base.slice(0, -1);
    const v1 = last + 'k';
    const v2 = last + 'n';
    if (isValidUsername(v1)) res.add(v1);
    if (isValidUsername(v2)) res.add(v2);
  }
  return Array.from(res);
}

class WordlistManager {
  constructor() {
    this.candidates = [];
    this.index = 0;
    this.usedSet = new Set(); // Mencegah duplikasi dalam 1 sesi
    this.generation = 0;
    this.custom = null; // Jika array, maka mode Custom
    this.refresh();
  }

  setCustom(list) {
    // Pastikan list bersih
    this.custom = Array.isArray(list) ? list.filter(isValidUsername) : null;
    this.reset(); // Reset total agar mulai dari awal list custom
  }

  refresh() {
    this.generation++;
    const newSet = new Set();

    if (this.custom && this.custom.length > 0) {
      // MODE CUSTOM: Gunakan EXACT MATCH, jangan diubah-ubah
      for (const w of this.custom) {
        if (!this.usedSet.has(w)) newSet.add(w);
      }
    } else {
      // MODE DEFAULT: Gunakan generator varian
      for (const w of SEED) {
        for (const v of generateVariants(w)) {
          if (!this.usedSet.has(v)) newSet.add(v);
        }
      }
    }

    // Acak urutan agar tidak monoton
    this.candidates = shuffle(Array.from(newSet));
    this.index = 0;
  }

  next() {
    if (this.index >= this.candidates.length) {
      // Jika mode custom, dan sudah habis, return null (selesai)
      if (this.custom) return null;
      // Jika mode default, refresh lagi (mencoba varian lain atau loop ulang)
      this.refresh();
    }
    
    // Safety check jika refresh pun kosong
    if (this.candidates.length === 0) return null;

    const candidate = this.candidates[this.index++];
    this.usedSet.add(candidate);
    return candidate;
  }

  remaining() {
    return this.candidates.length - this.index;
  }

  estimateTotal() {
    return this.candidates.length + this.usedSet.size;
  }

  reset() {
    this.usedSet.clear();
    this.generation = 0;
    this.refresh();
  }
}

module.exports = { WordlistManager, isValidUsername };
