/**
 * Wordlist Generator v3 - Ultimate Edition
 * 
 * Fitur:
 * 1. 500+ seed words (EN/ID/Jawa)
 * 2. Prefix A-Z di depan kata
 * 3.  Suffix A-Z di belakang kata
 * 4. NFT/Crypto/Web3 high-value words
 * 5. Kombinasi 2 kata pendek
 * 6. Triple combo (prefix + seed + suffix)
 * 7. On-demand generation (hemat memori)
 * 
 * Estimasi: 100,000+ kandidat unik
 */

// ============================================================
// ALPHABET untuk prefix/suffix
// ============================================================
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'. split('');

// ============================================================
// NFT / CRYPTO / WEB3 HIGH-VALUE WORDS
// ============================================================
const SEEDS_NFT = [
  // Crypto & Blockchain
  'crypto', 'bitcoin', 'btc', 'eth', 'ether', 'solana', 'sol', 'bnb', 'matic', 'avax',
  'defi', 'dao', 'dapp', 'swap', 'stake', 'yield', 'farm', 'pool', 'liquidity', 'token',
  'coin', 'wallet', 'ledger', 'chain', 'block', 'hash', 'mining', 'miner', 'node', 'validator',
  'gas', 'gwei', 'wei', 'satoshi', 'sats', 'hodl', 'moon', 'pump', 'dump', 'whale',
  'bull', 'bear', 'ape', 'degen', 'fomo', 'fud', 'rekt', 'wagmi', 'ngmi', 'gm',
  'ser', 'fren', 'anon', 'alpha', 'beta', 'airdrop', 'drop', 'mint', 'burn', 'bridge',
  
  // NFT Specific
  'nft', 'nfts', 'pfp', 'jpeg', 'art', 'artist', 'creator', 'collect', 'collector', 'rare',
  'epic', 'legendary', 'mythic', 'common', 'uncommon', 'genesis', 'og', 'original', 'first', 'early',
  'punk', 'punks', 'ape', 'apes', 'bored', 'bayc', 'mayc', 'azuki', 'doodle', 'clone',
  'pixel', 'voxel', 'meta', 'verse', 'world', 'land', 'plot', 'estate', 'realm', 'kingdom',
  'avatar', 'skin', 'wearable', 'trait', 'attribute', 'rarity', 'floor', 'ceiling', 'sweep', 'snipe',
  
  // Web3 & Metaverse
  'web', 'decentralized', 'trustless', 'permissionless', 'open', 'protocol', 'layer', 'rollup', 'zk', 'zkp',
  'metaverse', 'virtual', 'reality', 'vr', 'ar', 'xr', 'immersive', 'spatial', 'hologram', 'holo',
  'sandbox', 'decentraland', 'otherside', 'sandbox', 'roblox', 'fortnite', 'gaming', 'game', 'play', 'earn',
  'guild', 'clan', 'tribe', 'squad', 'crew', 'gang', 'mob', 'mafia', 'cartel', 'syndicate',
  
  // DeFi Terms
  'swap', 'uniswap', 'sushi', 'curve', 'aave', 'compound', 'maker', 'lido', 'rocket', 'eigen',
  'lend', 'borrow', 'collateral', 'leverage', 'margin', 'long', 'short', 'perp', 'futures', 'options',
  'vault', 'treasury', 'reserve', 'bond', 'stable', 'peg', 'anchor', 'basis', 'rebase', 'elastic',
  
  // Trending & Meme
  'pepe', 'doge', 'shib', 'floki', 'wojak', 'chad', 'virgin', 'based', 'cringe', 'kek',
  'lol', 'lmao', 'bruh', 'sheesh', 'bussin', 'fire', 'goat', 'goated', 'sigma', 'grind',
  'rizz', 'ohio', 'skibidi', 'gyatt', 'slay', 'yeet', 'vibe', 'aesthetic', 'core', 'maxx',
  
  // Valuable Single Words
  'gold', 'silver', 'diamond', 'platinum', 'titanium', 'carbon', 'graphene', 'quantum', 'fusion', 'plasma',
  'infinity', 'eternal', 'immortal', 'divine', 'sacred', 'holy', 'blessed', 'cursed', 'haunted', 'phantom',
  'ghost', 'spirit', 'soul', 'demon', 'angel', 'god', 'goddess', 'titan', 'giant', 'colossus',
  'empire', 'dynasty', 'legacy', 'heritage', 'throne', 'crown', 'royal', 'imperial', 'sovereign', 'supreme',
  
  // Tech Giants Style
  'apple', 'google', 'amazon', 'meta', 'microsoft', 'tesla', 'nvidia', 'intel', 'amd', 'oracle',
  'adobe', 'cisco', 'ibm', 'dell', 'hp', 'sony', 'samsung', 'huawei', 'xiaomi', 'oppo',
  'uber', 'lyft', 'airbnb', 'spotify', 'netflix', 'discord', 'slack', 'zoom', 'stripe', 'square',
  
  // Startup Vibes
  'labs', 'studio', 'works', 'forge', 'foundry', 'factory', 'workshop', 'garage', 'shed', 'bunker',
  'hq', 'base', 'camp', 'nest', 'hive', 'den', 'lair', 'vault', 'haven', 'sanctuary',
  'ventures', 'capital', 'fund', 'invest', 'growth', 'scale', 'launch', 'rocket', 'boost', 'accelerate'
];

// ============================================================
// SEED WORDS - Tech, Nature, Power (EN/ID/Jawa)
// ============================================================

const SEEDS_EN = [
  // Tech & Digital
  'tech', 'code', 'data', 'byte', 'bits', 'chip', 'node', 'link', 'sync', 'cloud',
  'cyber', 'pixel', 'logic', 'smart', 'intel', 'micro', 'macro', 'nano', 'meta', 'giga',
  'tera', 'beta', 'alpha', 'gamma', 'delta', 'omega', 'sigma', 'theta', 'zeta', 'kappa',
  'api', 'app', 'web', 'net', 'hub', 'lab', 'dev', 'ops', 'sys', 'bot',
  
  // Power & Speed
  'fast', 'quick', 'swift', 'rapid', 'speed', 'flash', 'rush', 'dash', 'zoom', 'bolt',
  'turbo', 'hyper', 'ultra', 'super', 'mega', 'power', 'force', 'energy', 'spark', 'blast',
  'burst', 'surge', 'pulse', 'wave', 'shock', 'storm', 'blaze', 'flame', 'fire', 'burn',
  
  // Nature
  'sun', 'moon', 'star', 'sky', 'air', 'wind', 'rain', 'snow', 'ice', 'mist',
  'fog', 'dew', 'leaf', 'tree', 'wood', 'rock', 'sand', 'dust', 'lake', 'pond',
  'pool', 'bay', 'cove', 'reef', 'tide', 'surf', 'foam', 'peak', 'hill', 'vale',
  'glen', 'cave', 'isle', 'cape', 'gulf', 'rose', 'lily', 'iris', 'fern', 'moss',
  'vine', 'palm', 'pine', 'oak', 'elm', 'ash', 'birch', 'cedar', 'maple', 'willow',
  
  // Animals
  'wolf', 'bear', 'lion', 'tiger', 'hawk', 'eagle', 'falcon', 'raven', 'crow', 'owl',
  'fox', 'deer', 'elk', 'moose', 'hare', 'lynx', 'puma', 'jaguar', 'cobra', 'viper',
  'shark', 'whale', 'seal', 'orca', 'ray', 'eel', 'crab', 'squid', 'dragon', 'phoenix',
  'griffin', 'titan', 'giant', 'golem', 'hydra', 'kraken', 'wyrm', 'drake', 'serpent', 'beast',
  
  // Status & Quality  
  'prime', 'elite', 'royal', 'noble', 'grand', 'great', 'epic', 'legend', 'myth', 'hero',
  'ace', 'pro', 'top', 'max', 'best', 'gold', 'silver', 'bronze', 'ruby', 'jade',
  'king', 'queen', 'prince', 'duke', 'lord', 'chief', 'boss', 'master', 'wizard', 'sage',
  'knight', 'warrior', 'hunter', 'ranger', 'scout', 'guard', 'shield', 'sword', 'blade', 'arrow',
  
  // Abstract
  'mind', 'soul', 'heart', 'spirit', 'dream', 'hope', 'faith', 'trust', 'truth', 'wisdom',
  'logic', 'reason', 'sense', 'idea', 'plan', 'goal', 'aim', 'quest', 'path', 'way',
  'life', 'time', 'space', 'void', 'null', 'zero', 'one', 'duo', 'trio', 'quad',
  'nexus', 'apex', 'zenith', 'summit', 'crest', 'crown', 'throne', 'realm', 'domain', 'sphere',
  
  // Action
  'go', 'run', 'fly', 'jump', 'leap', 'dash', 'rush', 'push', 'pull', 'grab',
  'hit', 'cut', 'rip', 'break', 'crush', 'smash', 'blast', 'burn', 'freeze', 'spin',
  'roll', 'flip', 'twist', 'turn', 'bend', 'fold', 'wrap', 'bind', 'link', 'find',
  'seek', 'hunt', 'track', 'chase', 'catch', 'hold', 'keep', 'save', 'build', 'create',
  
  // Modern/Trendy
  'vibe', 'mood', 'flex', 'hype', 'buzz', 'trend', 'viral', 'lit', 'cool', 'chill',
  'zen', 'calm', 'peace', 'easy', 'simple', 'clean', 'fresh', 'new', 'next', 'now',
  'here', 'this', 'real', 'true', 'pure', 'raw', 'wild', 'free', 'open', 'bold'
];

const SEEDS_ID = [
  // Sifat positif
  'bagus', 'hebat', 'keren', 'mantap', 'sukses', 'jaya', 'maju', 'unggul', 'prima', 'sakti',
  'pintar', 'cerdas', 'bijak', 'arif', 'pandai', 'lihai', 'mahir', 'ahli', 'pakar', 'juara',
  'berani', 'gagah', 'tangguh', 'kuat', 'kokoh', 'teguh', 'solid', 'gesit', 'lincah', 'sigap',
  'cepat', 'kilat', 'petir', 'tangkas', 'pesat', 'deras', 'lancar', 'mulus', 'aman', 'sentosa',
  
  // Alam
  'langit', 'bumi', 'laut', 'gunung', 'sungai', 'danau', 'hutan', 'rimba', 'padang', 'sawah',
  'bulan', 'bintang', 'awan', 'hujan', 'angin', 'badai', 'topan', 'petir', 'guntur', 'gempa',
  'api', 'air', 'tanah', 'udara', 'cahaya', 'sinar', 'terang', 'cerah', 'gemilang', 'gilang',
  'merah', 'biru', 'hijau', 'kuning', 'putih', 'hitam', 'emas', 'perak', 'perunggu', 'mutiara',
  
  // Status
  'raja', 'ratu', 'sultan', 'pangeran', 'putri', 'satria', 'ksatria', 'pahlawan', 'pejuang', 'jawara',
  'mulia', 'agung', 'megah', 'luhur', 'tinggi', 'utama', 'perdana', 'pertama', 'satu', 'tunggal',
  'abadi', 'kekal', 'langgeng', 'sejati', 'asli', 'murni', 'suci', 'kudus', 'berkah', 'rahmat',
  
  // Modern
  'digital', 'tekno', 'cyber', 'online', 'viral', 'trending', 'hits', 'populer', 'booming', 'kekinian',
  'gaul', 'asik', 'seru', 'gokil', 'mantul', 'gacor', 'cuan', 'tajir', 'sultan', 'crazy'
];

const SEEDS_JAWA = [
  // Sifat
  'apik', 'becik', 'pinter', 'sregep', 'gemi', 'nastiti', 'wicaksana', 'prawira', 'santosa', 'sentosa',
  'luhur', 'mulya', 'utama', 'linuwih', 'sekti', 'digdaya', 'mandraguna', 'wijaya', 'jaya', 'menang',
  'lancar', 'gampang', 'entheng', 'resik', 'suci', 'murni', 'sejati', 'asli', 'tulen', 'original',
  'kendel', 'wani', 'gagah', 'kukuh', 'bakuh', 'mantep', 'yakin', 'setya', 'tuhu', 'bekti',
  
  // Alam
  'langit', 'bumi', 'banyu', 'geni', 'angin', 'mega', 'udan', 'panas', 'adem', 'sejuk',
  'gunung', 'segara', 'kali', 'tlaga', 'alas', 'wana', 'tegal', 'sawah', 'kebon', 'lurung',
  'srengenge', 'rembulan', 'lintang', 'kartika', 'teja', 'cahya', 'sunar', 'sorot', 'gumilang', 'gumebyar',
  
  // Status
  'ratu', 'raja', 'adipati', 'bupati', 'tumenggung', 'pangeran', 'gusti', 'kanjeng', 'sinuwun', 'sunan',
  'satria', 'prajurit', 'senopati', 'panglima', 'prawira', 'wiratama', 'jayabaya', 'brawijaya', 'majapahit', 'mataram'
];

// ============================================================
// PREFIXES & SUFFIXES
// ============================================================

const PREFIXES = [
  // 2 huruf
  'go', 'my', 'hi', 'ok', 'up', 'on', 'in', 'ex', 'de', 're',
  'un', 'be', 'co', 'no', 'so', 'to', 'do', 'we', 'me', 'he',
  // 3 huruf  
  'the', 'pro', 'top', 'max', 'new', 'neo', 'hot', 'big', 'get', 'set',
  'run', 'try', 'use', 'ask', 'say', 'see', 'let', 'put', 'out', 'all',
  'one', 'two', 'six', 'ten', 'air', 'sky', 'sun', 'ice', 'red', 'zen',
  'eco', 'bio', 'geo', 'pre', 'sub', 'mid', 'low', 'high', 'mega', 'giga'
];

const SUFFIXES = [
  // 2 huruf
  'id', 'co', 'io', 'me', 'us', 'ly', 'fy', 'go', 'up', 'in',
  'on', 'at', 'to', 'do', 'be', 'we', 'ok', 'hq', 'tv', 'fm',
  // 3 huruf
  'hub', 'lab', 'net', 'dev', 'app', 'box', 'now', 'one', 'pro', 'top',
  'max', 'ace', 'ify', 'ize', 'ing', 'ers', 'dom', 'ism', 'ist', 'ful',
  'zone', 'land', 'city', 'town', 'base', 'core', 'tech', 'soft', 'link', 'web',
  'nft', 'dao', 'eth', 'btc', 'sol', 'ape', 'punks', 'mint', 'drop', 'swap'
];

// Kata pendek untuk kombinasi (2-4 huruf)
const SHORT_WORDS = [
  // 2 huruf
  'go', 'my', 'hi', 'ok', 'up', 'on', 'in', 'to', 'do', 'we',
  'me', 'be', 'so', 'no', 'or', 'if', 'it', 'is', 'as', 'at',
  'by', 'of', 'an', 'am', 'he', 'id', 'us', 'vs', 'ex', 'ai',
  // 3 huruf
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'get',
  'new', 'now', 'old', 'see', 'way', 'who', 'boy', 'own', 'say', 'too',
  'top', 'pro', 'max', 'ace', 'big', 'red', 'sky', 'sun', 'air', 'ice',
  'hot', 'zen', 'eco', 'bio', 'geo', 'net', 'web', 'app', 'dev', 'nft',
  'eth', 'btc', 'sol', 'ape', 'dao', 'defi', 'meta', 'vr', 'ar', 'xr',
  // 4 huruf
  'tech', 'code', 'data', 'byte', 'node', 'link', 'sync', 'fast', 'cool', 'best',
  'good', 'free', 'open', 'play', 'game', 'club', 'team', 'work', 'home', 'life',
  'love', 'mind', 'soul', 'fire', 'gold', 'star', 'moon', 'wave', 'wind', 'flow',
  'grow', 'rise', 'high', 'deep', 'true', 'pure', 'real', 'next', 'plus', 'more',
  'mega', 'giga', 'uber', 'meta', 'omni', 'poly', 'mono', 'dual', 'quad', 'zero',
  'hero', 'king', 'boss', 'lord', 'duke', 'sage', 'guru', 'mint', 'swap', 'pool',
  'coin', 'token', 'chain', 'block', 'hash', 'stake', 'yield', 'farm', 'vault', 'whale'
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function isValidUsername(str) {
  return /^[a-z]{5,8}$/.test(str);
}

function shuffle(arr) {
  const a = [... arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// GENERATOR CLASS - Ultimate Edition
// ============================================================

class WordlistManager {
  constructor() {
    this. allSeeds = [... SEEDS_EN, ...SEEDS_ID, ...SEEDS_JAWA, ...SEEDS_NFT];
    this.candidates = [];
    this.index = 0;
    this.generation = 0;
    this.usedSet = new Set();
    this.refresh();
  }

  /**
   * Generate batch kandidat baru
   */
  refresh() {
    this.generation++;
    const newCandidates = new Set();

    // Shuffle untuk variasi tiap generasi
    const seeds = shuffle(this.allSeeds);
    const shorts = shuffle(SHORT_WORDS);
    const prefixes = shuffle(PREFIXES);
    const suffixes = shuffle(SUFFIXES);
    const alphabet = shuffle(ALPHABET);

    // ========================================
    // 1. Direct seeds yang valid (5-8 huruf)
    // ========================================
    for (const word of seeds) {
      const w = word.toLowerCase();
      if (isValidUsername(w) && ! this.usedSet.has(w)) {
        newCandidates.add(w);
      }
    }

    // ========================================
    // 2.  ALPHABET PREFIX: a-z + seed
    //    Contoh: abantu, bbantu, ...  zbantu
    // ========================================
    for (const seed of seeds) {
      for (const letter of alphabet) {
        // Letter di depan
        const front = (letter + seed).toLowerCase();
        if (isValidUsername(front) && !this.usedSet. has(front)) {
          newCandidates.add(front);
        }
        
        // Potong seed jika perlu (agar total 5-8)
        if (seed.length >= 5) {
          const cutSeed = seed.slice(0, 7); // max 7 + 1 letter = 8
          const frontCut = (letter + cutSeed).toLowerCase();
          if (isValidUsername(frontCut) && ! this.usedSet.has(frontCut)) {
            newCandidates.add(frontCut);
          }
        }
      }
    }

    // ========================================
    // 3. ALPHABET SUFFIX: seed + a-z
    //    Contoh: bantua, bantub, ... bantuz
    // ========================================
    for (const seed of seeds) {
      for (const letter of alphabet) {
        // Letter di belakang
        const back = (seed + letter).toLowerCase();
        if (isValidUsername(back) && !this.usedSet.has(back)) {
          newCandidates.add(back);
        }
        
        // Potong seed jika perlu
        if (seed. length >= 5) {
          const cutSeed = seed. slice(0, 7);
          const backCut = (cutSeed + letter). toLowerCase();
          if (isValidUsername(backCut) && !this.usedSet.has(backCut)) {
            newCandidates.add(backCut);
          }
        }
      }
    }

    // ========================================
    // 4.  DOUBLE ALPHABET: a + seed + z
    //    Contoh: abantuz, zbantua
    // ========================================
    for (const seed of seeds. slice(0, 200)) {
      for (const l1 of alphabet. slice(0, 10)) {
        for (const l2 of alphabet.slice(0, 10)) {
          // Potong seed agar total 5-8
          const maxSeedLen = 6; // 1 + 6 + 1 = 8
          const cutSeed = seed. slice(0, maxSeedLen);
          const combo = (l1 + cutSeed + l2).toLowerCase();
          if (isValidUsername(combo) && ! this.usedSet.has(combo)) {
            newCandidates.add(combo);
          }
        }
      }
    }

    // ========================================
    // 5.  Prefix + Seed (word prefix)
    // ========================================
    for (const seed of seeds) {
      for (const pre of prefixes) {
        const combined = (pre + seed).toLowerCase();
        if (isValidUsername(combined) && !this. usedSet.has(combined)) {
          newCandidates.add(combined);
        }
        // Potong seed
        const maxLen = 8 - pre.length;
        if (maxLen >= 2 && seed.length > maxLen) {
          const cut = (pre + seed.slice(0, maxLen)). toLowerCase();
          if (isValidUsername(cut) && !this.usedSet. has(cut)) {
            newCandidates.add(cut);
          }
        }
      }
    }

    // ========================================
    // 6. Seed + Suffix (word suffix)
    // ========================================
    for (const seed of seeds) {
      for (const suf of suffixes) {
        const combined = (seed + suf).toLowerCase();
        if (isValidUsername(combined) && !this.usedSet.has(combined)) {
          newCandidates. add(combined);
        }
        // Potong seed
        const maxLen = 8 - suf.length;
        if (maxLen >= 2 && seed.length > maxLen) {
          const cut = (seed.slice(0, maxLen) + suf).toLowerCase();
          if (isValidUsername(cut) && !this.usedSet.has(cut)) {
            newCandidates. add(cut);
          }
        }
      }
    }

    // ========================================
    // 7. Triple combo: prefix + seed + suffix
    // ========================================
    for (const seed of seeds. slice(0, 150)) {
      for (const pre of prefixes. slice(0, 15)) {
        for (const suf of suffixes.slice(0, 15)) {
          const base = seed. slice(0, 4);
          const combined = (pre. slice(0, 2) + base + suf. slice(0, 2)).toLowerCase();
          if (isValidUsername(combined) && !this.usedSet.has(combined)) {
            newCandidates. add(combined);
          }
        }
      }
    }

    // ========================================
    // 8. Kombinasi 2 kata pendek
    // ========================================
    for (const w1 of shorts) {
      for (const w2 of shorts) {
        if (w1 === w2) continue;
        const combined = (w1 + w2).toLowerCase();
        if (isValidUsername(combined) && !this.usedSet.has(combined)) {
          newCandidates.add(combined);
        }
      }
    }

    // ========================================
    // 9. Alphabet + Short word
    // ========================================
    for (const short of shorts) {
      for (const letter of alphabet) {
        const front = (letter + short).toLowerCase();
        const back = (short + letter).toLowerCase();
        if (isValidUsername(front) && !this.usedSet.has(front)) {
          newCandidates. add(front);
        }
        if (isValidUsername(back) && !this.usedSet. has(back)) {
          newCandidates.add(back);
        }
      }
    }

    // ========================================
    // 10. NFT High-value dengan alphabet prefix/suffix
    // ========================================
    for (const nft of SEEDS_NFT) {
      for (const letter of alphabet) {
        const front = (letter + nft). toLowerCase();
        const back = (nft + letter).toLowerCase();
        if (isValidUsername(front) && !this.usedSet.has(front)) {
          newCandidates.add(front);
        }
        if (isValidUsername(back) && ! this.usedSet.has(back)) {
          newCandidates.add(back);
        }
      }
    }

    // ========================================
    // 11. Letter variations (swap vowels)
    // ========================================
    for (const seed of seeds. slice(0, 100)) {
      const variations = this.generateLetterVariations(seed);
      for (const v of variations) {
        if (isValidUsername(v) && !this.usedSet.has(v)) {
          newCandidates.add(v);
        }
      }
    }

    // ========================================
    // 12. Reversed words
    // ========================================
    for (const seed of seeds) {
      const reversed = seed.toLowerCase().split('').reverse().join('');
      if (isValidUsername(reversed) && !this.usedSet.has(reversed)) {
        newCandidates. add(reversed);
      }
    }

    // ========================================
    // 13. Doubled letters
    // ========================================
    for (const short of shorts. slice(0, 80)) {
      const doubled = short + short[short.length - 1];
      if (isValidUsername(doubled. toLowerCase()) && !this.usedSet. has(doubled.toLowerCase())) {
        newCandidates.add(doubled. toLowerCase());
      }
      // Double first letter
      const doubledFirst = short[0] + short;
      if (isValidUsername(doubledFirst.toLowerCase()) && !this.usedSet.has(doubledFirst.toLowerCase())) {
        newCandidates. add(doubledFirst.toLowerCase());
      }
    }

    // ========================================
    // 14. Repeat pattern: abab, abcabc
    // ========================================
    for (const short of shorts. filter(s => s. length <= 4)) {
      const repeat2 = (short + short). toLowerCase();
      if (isValidUsername(repeat2) && !this.usedSet. has(repeat2)) {
        newCandidates.add(repeat2);
      }
    }

    // Convert ke array dan shuffle
    this.candidates = shuffle(Array.from(newCandidates));
    this.index = 0;

    console.log(`[Wordlist] Gen ${this.generation}: ${this.candidates.length} kandidat | Total used: ${this.usedSet.size}`);
  }

  /**
   * Generate variasi huruf
   */
  generateLetterVariations(word) {
    const variations = [];
    const w = word.toLowerCase();
    
    // Swap vowels
    const swaps = { 'a': 'e', 'e': 'a', 'i': 'o', 'o': 'i', 'u': 'a' };
    
    for (let i = 0; i < w.length; i++) {
      if (swaps[w[i]]) {
        const variant = w.slice(0, i) + swaps[w[i]] + w.slice(i + 1);
        variations.push(variant);
      }
    }
    
    // Double vowel
    for (let i = 0; i < w.length; i++) {
      if ('aeiou'.includes(w[i])) {
        const variant = w.slice(0, i) + w[i] + w.slice(i);
        if (variant. length <= 8) variations.push(variant);
      }
    }
    
    return variations. slice(0, 5);
  }

  /**
   * Ambil kandidat berikutnya
   */
  next() {
    if (this.index >= this.candidates.length) {
      this.refresh();
    }
    
    const candidate = this. candidates[this.index++];
    this.usedSet. add(candidate);
    
    return candidate;
  }

  hasMore() {
    return true;
  }

  remaining() {
    return this.candidates.length - this.index;
  }

  totalUsed() {
    return this.usedSet.size;
  }

  reset() {
    this.usedSet.clear();
    this.generation = 0;
    this.refresh();
  }

  /**
   * Estimasi total kandidat
   */
  estimateTotal() {
    const seedCount = this.allSeeds.length;
    const alphabetCombos = seedCount * 26 * 2; // front + back
    const doubleAlphabet = 200 * 10 * 10;
    const prefixCombos = seedCount * PREFIXES.length * 0.3;
    const suffixCombos = seedCount * SUFFIXES.length * 0.3;
    const shortCombos = SHORT_WORDS.length * SHORT_WORDS.length * 0.3;
    
    return Math.floor(alphabetCombos + doubleAlphabet + prefixCombos + suffixCombos + shortCombos);
  }
}

module.exports = { WordlistManager, isValidUsername };
