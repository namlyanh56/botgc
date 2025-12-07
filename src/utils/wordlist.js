// Wordlist Kurasi v5 – Seimbang EN/ID/Jawa/NFT, kombinasi ringkas & mudah diingat, panjang 5–8 huruf

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

// Prefix/suffix pendek (dipilih agar hasil tetap wajar)
const PREFIXES = [
  'go','my','hi','ok','up','in','ex','re','de','pro','neo','max','new','best','quick','fast'
];

const SUFFIXES = [
  'id','co','io','me','us','go','up','on','to','ly',
  'hub','lab','net','dev','app','box','now','pro','max','dao','nft'
];

// Short words untuk kombinasi
const SHORTS = [
  'go','up','in','on','to','do','me','we','ai',
  'pro','max','neo','web','app','dev','bot','dao','nft',
  'fast','cool','soft','code','data','byte','link','node','sync',
  'meta','core','labs','swap','mint','drop','pool','grid','wave',
  'moon','star','sky','sun','wind','fire'
];

// Seed kurasi (jumlah relatif seimbang)
const SEEDS_EN = [
  'alpha','prime','elite','nexus','apex','crown','realm','guard','ranger','scout',
  'swift','rapid','spark','pulse','storm','blaze','flare','logic','pixel','quant',
  'chain','block','hash','miner','ledger','wallet','vault','fusion','oracle','zeta'
];

const SEEDS_ID = [
  'keren','mantap','hebat','juara','unggul','sakti','cepat','sigap','lancar','terang',
  'cerah','kilau','cahya','bintang','remix','serasi','amanah','mulia','utama','agung',
  'pintar','ahli','tajir','cuan','gacor','viral','trendi','gaul','asik','seru'
];

const SEEDS_JAWA = [
  'apik','becik','pinter','sregep','wicak','prawi','santosa','luhur','mulya','linuwih',
  'sekti','wijaya','gilang','rembu','lintang','kartika','teja','cahya','ratu','raja',
  'adipati','senopati','panglima','mataram','majapahit','brawija','jayeng'
];

const SEEDS_NFT = [
  'crypto','bitcoin','ether','solana','matic','avax','defi','dapp','stake','yield',
  'token','wallet','ledger','chain','block','hash','whale','degen','alpha','airdrop',
  'mint','burn','bridge','swap','punk','ape','pepe','doge','shib',
  'meta','verse','world','realm','dao','nft','pfp','floor','sweep'
];

// Helper
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

class WordlistManager {
  constructor() {
    this.buckets = { EN: SEEDS_EN, ID: SEEDS_ID, JW: SEEDS_JAWA, NFT: SEEDS_NFT };
    this.candidates = [];
    this.index = 0;
    this.usedSet = new Set();
    this.generation = 0;
    this.refresh();
  }

  refresh() {
    this.generation++;
    const newSet = new Set();
    const buckets = ['EN','ID','JW','NFT'];

    // 1) Direct seeds (seimbang per bucket)
    for (const b of buckets) {
      for (const seed of this.buckets[b]) {
        const w = seed.toLowerCase();
        if (isValidUsername(w) && !this.usedSet.has(w)) newSet.add(w);
      }
    }

    // 2) Alphabet prefix/suffix (dibatasi a–j agar wajar)
    const alphaLimited = ALPHABET.slice(0, 10);
    for (const b of buckets) {
      for (const seed of this.buckets[b]) {
        for (const letter of alphaLimited) {
          const front = (letter + seed).toLowerCase();
          const back = (seed + letter).toLowerCase();
          if (isValidUsername(front) && !this.usedSet.has(front)) newSet.add(front);
          if (isValidUsername(back) && !this.usedSet.has(back)) newSet.add(back);
        }
      }
    }

    // 3) Prefix/suffix kata pendek
    for (const b of buckets) {
      for (const seed of this.buckets[b]) {
        for (const pre of PREFIXES) {
          const combined = (pre + seed).toLowerCase();
          if (isValidUsername(combined) && !this.usedSet.has(combined)) newSet.add(combined);
        }
        for (const suf of SUFFIXES) {
          const combined = (seed + suf).toLowerCase();
          if (isValidUsername(combined) && !this.usedSet.has(combined)) newSet.add(combined);
        }
      }
    }

    // 4) Kombinasi short+short (dibatasi, setelah shuffle)
    const shorts = shuffle(SHORTS).slice(0, 40);
    for (const w1 of shorts) {
      for (const w2 of shorts) {
        if (w1 === w2) continue;
        const combined = (w1 + w2).toLowerCase();
        if (isValidUsername(combined) && !this.usedSet.has(combined)) newSet.add(combined);
      }
    }

    this.candidates = shuffle(Array.from(newSet));
    this.index = 0;
    console.log(`[Wordlist] Gen ${this.generation}: ${this.candidates.length} kandidat | Total used: ${this.usedSet.size}`);
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
    // estimasi sederhana
    return this.candidates.length + this.usedSet.size;
  }

  reset() {
    this.usedSet.clear();
    this.generation = 0;
    this.refresh();
  }
}

module.exports = { WordlistManager, isValidUsername };
