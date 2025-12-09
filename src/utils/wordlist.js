// Wordlist Inggris + Indonesia 5–8 huruf, tanpa angka/spasi.
// Fokus kata mudah diingat atau bernilai (tech/business/brandable).
// Menambah varian otomatis: duplikasi huruf depan, ganti huruf akhir ke k/n, potong 8 jika terlalu panjang.

function isValidUsername(str) {
  return /^[a-z]{5,8}$/.test(str);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Seed kata Inggris & Indonesia (brandable, tech, finansial, umum)
const SEED = [
  // English short brandables
  'alpha','arcane','astro','auric','axion','azure','bionic','bitron','blocky','bright','byteon','calyp','canyon','carbon','caviar',
  'celest','celium','cinder','cobalt','cosmic','cruxly','cypher','daring','datium','delta','dynamo','ember','ethrix','fathom','fluxor',
  'forged','galaxy','gamma','glance','glider','glitch','glofox','helium','horizon','ignite','ionics','jetset','kinetic','lancer','lumina',
  'lupine','matrix','meteor','modish','nebula','nexbit','nexus','novaly','obsidi','onyxia','orbitx','orion','oxford','pinnix','pixelx',
  'plasma','polaris','portal','primex','pulsar','quanta','quanty','quarky','radial','radium','raptor','ranger','ripple','rocket','scalar',
  'scopic','script','signal','silica','silver','sierra','sonicx','sparkx','spectr','stellar','stream','summit','syntex','tachyon','talent',
  'tandem','tensor','terra','titan','topaz','triton','trusty','upward','vector','venice','vertex','vigil','vortex','xenial','xiphos',
  'zenith','zephyr','zircon',
  // Indonesia / mudah diingat
  'garuda','merapi','jayala','sigap','mahir','terang','cerdas','selaras','unggul','amanah','sahabat','sentra','nusaku','jayaku','mandal',
  'santara','gemilang','cakraw','gelora','samudr','angkasa','pelita','gembira','lestari','sejah','tekun','tangguh','lincah','handal',
  'andalan','laskar','satria','wiraus','wiraid','wiraan','wiraid','wirani','wiraus','wiraon',
  // Finansial/bisnis/tech
  'finova','finhub','paymax','paytek','duitku','danaku','invest','sahamx','reksa','tabung','modalx','profit','divida','cashly','paynet',
  'billie','ledger','market','trader','broker','bullix','beacon','stable','credit','faktur','invoice','payday','saving','secure','riskon',
  // AI/data
  'aiindo','aivisu','aipint','dataku','dataid','dataset','datase','datava','algora','neuron','vector','prompt','replic','vision','voicex',
  'models','agents','botind','botlab','botmax','botpro',
  // Lain-lain brandable pendek
  'folium','galaxi','magnet','marvel','mirage','mystic','nomade','novice','opalis','oracle','pandai','paradi','patron','pelari','pelaut',
  'pilotx','pirate','portal','primeo','prisma','proton','quant','rapid','reason','reliable','rivals','rocket','rumble','salmon','sapphire',
  'saturn','scarab','seeker','sentio','serene','shadow','shifter','signal','silent','silver','simply','sirius','sketch','solver','sonata',
  'spirit','spring','sterna','stride','strong','studio','sunray','swiftx','tangent','turing','valley','vector','veloce','victor','violet',
  'vision','vitals','vocali','wander','wealth','wonder','zenite','zenova'
];

// Buat varian ringan:
// - Jika panjang 5–8: simpan asli; duplikasi huruf depan jika masih muat (len<=7); ganti huruf terakhir ke k/n.
// - Jika panjang >8: potong jadi 8; juga duplikasi huruf depan lalu potong jadi 8.
function generateVariants(word) {
  const res = new Set();
  const base = word.toLowerCase().replace(/[^a-z]/g, '');
  const len = base.length;
  if (len >= 5 && len <= 8) res.add(base);

  if (len >= 5 && len <= 7) {
    const dup = (base[0] + base);
    if (isValidUsername(dup)) res.add(dup);
  }
  if (len >= 5 && len <= 8) {
    const last = base.slice(0, -1);
    const v1 = last + 'k';
    const v2 = last + 'n';
    if (isValidUsername(v1)) res.add(v1);
    if (isValidUsername(v2)) res.add(v2);
  }
  if (len > 8) {
    const cut = base.slice(0, 8);
    if (isValidUsername(cut)) res.add(cut);
    const dupCut = (base[0] + base).slice(0, 8);
    if (isValidUsername(dupCut)) res.add(dupCut);
  }
  return Array.from(res);
}

class WordlistManager {
  constructor() {
    this.candidates = [];
    this.index = 0;
    this.usedSet = new Set();
    this.generation = 0;
    this.custom = null; // array atau null
    this.refresh();
  }

  setCustom(list) {
    this.custom = Array.isArray(list) ? list : null;
    this.index = 0;
    this.usedSet.clear();
    this.refresh();
  }

  refresh() {
    this.generation++;
    const newSet = new Set();

    const source = this.custom || SEED;

    for (const w of source) {
      for (const v of generateVariants(w)) {
        if (isValidUsername(v) && !this.usedSet.has(v)) newSet.add(v);
      }
    }

    this.candidates = shuffle(Array.from(newSet));
    this.index = 0;
    console.log(`[Wordlist] Gen ${this.generation}: ${this.candidates.length} kandidat | Total used: ${this.usedSet.size} | custom=${!!this.custom}`);
  }

  next() {
    if (this.index >= this.candidates.length) this.refresh();
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
