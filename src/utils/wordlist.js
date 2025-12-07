// Wordlist Indonesia fokus, panjang 5–8 huruf, kombinasi ringan.
// Kombinasi: prefix (di, ke, se, pro, mega), suffix (ku, mu, id, indo), short+kata & kata+short.

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

// Ribuan kata umum Indonesia (cuplikan; tambahkan sesuai kebutuhan).
// Pastikan semua lowercase, tanpa spasi, 3–8 huruf (nanti difilter 5–8).
const SEED_ID = [
  // Sifat/positif
  'bagus','hebat','keren','mantap','juara','unggul','sakti','pintar','cerdas','bijak','arif','pandai','mahir','ahli','pakar',
  'berani','gagah','tangguh','kuat','kokoh','teguh','solid','sigap','cepat','lincah',
  'lancar','mulus','aman','selamat','damai','sejuk','nyaman','santai','tenang',
  'indah','elok','asri','segar','bersih','rapi','wangi','harum','cerah','terang','cahya','kilau',
  'mulia','agung','utama','utama','prima','sakti','sakti','patuh','taat','pasti','tepat','sadar',
  // Alam/unsur
  'langit','bumi','laut','samudra','sungai','danau','hutan','rimba','padang','sawah',
  'awan','hujan','angin','badai','petir','guntur','gelap','terang','senja','fajar',
  'api','air','tanah','udara','cahaya','kilau','bintang','bulan','mentari','matahari',
  'gunung','bukit','lembah','pantai','pesisir','ombak','karang','pohon','daun','bunga',
  // Modern/tech
  'digital','tekno','online','siber','gadget','aplikasi','produk','layanan','transaksi','dompet',
  'bayar','kirim','ambil','tarik','tabung','kredit','debit','nabung','kelas','konten',
  // Ekspresi umum
  'sehat','sejahtera','makmur','rezeki','jualan','dagang','pangan','warung','toko','pasar',
  'insyaallah','berkah','rahmat','syukur','amanah','percaya','harap','doa','ikhtiar','usaha',
  // Keren/trendi
  'trendi','viral','kekinian','gaul','asik','seru','ramah','ceria','humor','lucu',
  'kocak','epik','legendar','mewah','premium','eksklusif','resmi','pasti','valid','aman',
  // Tambahkan lebih banyak kata umum Indonesia di sini
];

// Short kata Indonesia untuk kombinasi
const SHORT_ID = [
  'pro','mega','super','giga','baru','aman','asik','seru','cepat','santai','hepi',
  'hemat','murah','kaya','cuan','untung','sukses','juara','unggul'
];

// Prefix/suffix ringan
const PREFIX_ID = ['di','ke','se','pro','mega','super'];
const SUFFIX_ID = ['ku','mu','id','indo'];

// Untuk menjaga memori: batasi jumlah kombinasi short+short, dll.
class WordlistManager {
  constructor() {
    this.candidates = [];
    this.index = 0;
    this.usedSet = new Set();
    this.generation = 0;
    this.refresh();
  }

  refresh() {
    this.generation++;
    const newSet = new Set();

    // 1) Direct seed (filter 5–8 huruf)
    for (const w of SEED_ID) {
      const v = w.toLowerCase();
      if (isValidUsername(v) && !this.usedSet.has(v)) newSet.add(v);
    }

    // 2) Prefix + seed
    for (const pre of PREFIX_ID) {
      for (const w of SEED_ID) {
        const v = (pre + w).toLowerCase();
        if (isValidUsername(v) && !this.usedSet.has(v)) newSet.add(v);
      }
    }

    // 3) Seed + suffix
    for (const w of SEED_ID) {
      for (const suf of SUFFIX_ID) {
        const v = (w + suf).toLowerCase();
        if (isValidUsername(v) && !this.usedSet.has(v)) newSet.add(v);
      }
    }

    // 4) short + seed dan seed + short (dalam bahasa Indonesia saja)
    for (const w of SEED_ID) {
      for (const s of SHORT_ID) {
        const v1 = (s + w).toLowerCase();
        const v2 = (w + s).toLowerCase();
        if (isValidUsername(v1) && !this.usedSet.has(v1)) newSet.add(v1);
        if (isValidUsername(v2) && !this.usedSet.has(v2)) newSet.add(v2);
      }
    }

    // 5) Kombinasi short+short terbatas (acak 15 saja)
    const shorts = shuffle(SHORT_ID).slice(0, 15);
    for (const a of shorts) {
      for (const b of shorts) {
        if (a === b) continue;
        const v = (a + b).toLowerCase();
        if (isValidUsername(v) && !this.usedSet.has(v)) newSet.add(v);
      }
    }

    this.candidates = shuffle(Array.from(newSet));
    this.index = 0;
    console.log(`[Wordlist ID] Gen ${this.generation}: ${this.candidates.length} kandidat | Total used: ${this.usedSet.size}`);
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
