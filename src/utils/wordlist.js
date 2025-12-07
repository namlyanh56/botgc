// Wordlist Kurasi v6 – Seimbang EN/ID/Jawa/NFT, tanpa campur lintas bahasa,
// kombinasi hanya dalam bucket, panjang 5–8 huruf, hemat memori.

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

// Bucket: seed, short, prefix, suffix per bahasa/kategori
const BUCKETS = {
  EN: {
    seed: [
      // core tech/brand-ish
      'alpha','prime','elite','nexus','apex','crown','realm','guard','ranger','scout',
      'swift','rapid','spark','pulse','storm','blaze','flare','logic','pixel','quant',
      'chain','block','hash','miner','ledger','wallet','vault','fusion','oracle','vector',
      'cipher','matrix','signal','stream','gamma','delta','omega','sigma','theta','kappa',
      'crypto','cyber','neural','cluster','server','client','router','switch','cloud','render',
      // short but clear
      'smart','hyper','vivid','solid','smooth','bright','shiny','glossy','grain','lumen',
      'rocket','boost','launch','pilot','flyer','drone','hover','glider','flare','ember'
    ],
    short: [
      'pro','max','neo','core','meta','grid','node','sync','data','code','byte','link',
      'flow','flux','aero','nano','micro','mega','ultra','hyper','quick','rapid'
    ],
    prefix: ['pro','neo','meta','ultra','hyper','astro','cyber','quant','smart'],
    suffix: ['lab','labs','tech','soft','dev','app','core','net','hub','io','ai']
  },
  ID: {
    seed: [
      'keren','mantap','hebat','juara','unggul','sakti','cepat','sigap','lancar','terang',
      'cerah','kilau','cahya','bintang','remix','serasi','amanah','mulia','utama','agung',
      'pintar','ahli','tajir','cuan','gacor','viral','trendi','gaul','asik','seru',
      'santuy','ramah','pasti','tepat','aman','damai','maju','tumbuh','subur','segar'
    ],
    short: [
      'pro','maks','baru','cepat','aman','asik','seru','gaul','cuan','tajir','gacor',
      'hepi','kaya','sabar','solid','tekno','digital','viral','trendi'
    ],
    prefix: ['pro','mega','super','pasti','tepat','hepi','aman','ceria'],
    suffix: ['bang','indo','id','kita','ceria','asik','aman']
  },
  JW: {
    seed: [
      'apik','becik','pinter','sregep','wicak','prawi','santosa','luhur','mulya','linuwih',
      'sekti','wijaya','gilang','lintang','kartika','teja','cahya','ratu','raja',
      'adipati','senopati','panglima','mataram','majapahit','brawija','jayeng','wira','utama'
    ],
    short: [
      'apik','becik','pinter','sugih','podo','rukun','tulus','adi','wira','jaya'
    ],
    prefix: ['pra','adi','utama','sura','wira'],
    suffix: ['jati','maya','jaya','raya','wani','adi','tama']
  },
  NFT: {
    seed: [
      'crypto','bitcoin','ether','solana','matic','avax','defi','dapp','stake','yield',
      'token','wallet','ledger','chain','block','satoshi','whale','degen','alpha',
      'airdrop','mint','burn','bridge','swap','punk','ape','pepe','doge','shib',
      'meta','verse','world','realm','dao','nft','pfp','floor','sweep','vault','ledger'
    ],
    short: [
      'meta','core','labs','swap','mint','drop','pool','grid','dao','nft',
      'defi','air','orb','zk','roll','loop','node','hash','coin','stake'
    ],
    prefix: ['meta','neo','ultra','super','cyber','astro','degen','whale','ape'],
    suffix: ['dao','nft','dex','defi','swap','pad','hub','lab','labs','fi','x']
  }
};

class WordlistManager {
  constructor() {
    this.buckets = BUCKETS;
    this.candidates = [];
    this.index = 0;
    this.usedSet = new Set();
    this.generation = 0;
    this.refresh();
  }

  refresh() {
    this.generation++;
    const newSet = new Set();

    for (const [bucketName, cfg] of Object.entries(this.buckets)) {
      const seeds = cfg.seed || [];
      const shorts = cfg.short || [];
      const prefixes = cfg.prefix || [];
      const suffixes = cfg.suffix || [];

      // 1) Direct seeds
      for (const seed of seeds) {
        const w = seed.toLowerCase();
        if (isValidUsername(w) && !this.usedSet.has(w)) newSet.add(w);
      }

      // 2) prefix + seed
      for (const pre of prefixes) {
        for (const seed of seeds) {
          const w = (pre + seed).toLowerCase();
          if (isValidUsername(w) && !this.usedSet.has(w)) newSet.add(w);
        }
      }

      // 3) seed + suffix
      for (const seed of seeds) {
        for (const suf of suffixes) {
          const w = (seed + suf).toLowerCase();
          if (isValidUsername(w) && !this.usedSet.has(w)) newSet.add(w);
        }
      }

      // 4) short + seed dan seed + short (dalam bucket yang sama)
      for (const seed of seeds) {
        for (const s of shorts) {
          const w1 = (s + seed).toLowerCase();
          const w2 = (seed + s).toLowerCase();
          if (isValidUsername(w1) && !this.usedSet.has(w1)) newSet.add(w1);
          if (isValidUsername(w2) && !this.usedSet.has(w2)) newSet.add(w2);
        }
      }

      // 5) Kombinasi short + short dalam bucket yang sama (acak & dibatasi)
      const shuffledShort = shuffle(shorts).slice(0, 20); // batasi supaya wajar
      for (const a of shuffledShort) {
        for (const b of shuffledShort) {
          if (a === b) continue;
          const w = (a + b).toLowerCase();
          if (isValidUsername(w) && !this.usedSet.has(w)) newSet.add(w);
        }
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
    return this.candidates.length + this.usedSet.size;
  }

  reset() {
    this.usedSet.clear();
    this.generation = 0;
    this.refresh();
  }
}

module.exports = { WordlistManager, isValidUsername };
