// Wordlist Indonesia fokus, panjang 5–8 huruf, kombinasi ringan.
// Tidak ada kata Inggris seperti "pro" atau "giga".

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

// Kata dasar (pilihan 5–8 huruf; tambahkan sesuka Anda, tetap 5–8 huruf)
const SEED_ID = [
  // Umum/objek/tempat
  'rumah','jalan','makan','tempat','orang','tidur','langit','tanah','gunung','pohon','hutan','sepeda',
  'masjid','gereja','pasar','pabrik','kantor','taman','halaman','aliran','sungai','udara','bulan','matahari',
  'rambu','pintu','jendela','sampah','ladang','sekolah','kuliah','petani','nelayan','pekerja','tukang',
  'dokter','perawat','apotek','penjual','pembeli','barang','kertas','meja','kursi','tas','bunga','pantai','ombak',
  // Sifat/positif
  'bagus','hebat','keren','mantap','juara','unggul','sakti','pintar','cerdas','bijak','tangguh','kokoh','teguh','solid',
  'sigap','lancar','nyaman','santai','tenang','indah','asri','segar','bersih','rapi','harum','cerah','terang','cahya','kilau',
  'mulia','agung','utama','prima','patuh','taat','pasti','tepat','sadar',
  // Modern/tech
  'jaringan','komputer','aplikasi','server','browser','sistem','software','hardware','gadget','cloud','database','virus',
  'malware','protokol','firewall','keamanan','backup','upload','download','akses','update','plugin','cache','login','logout',
  'error','crash','sensor','monitor','virtual','hosting','binary','token','data','kode','debug',
  // Kesehatan
  'anatomi','patologi','terapi','vaksin','infeksi','pasien','klinik','medis','darah','jantung','ginjal','kanker',
  'sakit','demam','batuk','imun','radang','diagnosa','tubuh','polusi','operasi','cedera','nyeri',
  // Ekonomi
  'pasar','modal','harga','kredit','utang','saldo','biaya','profit','resesi','inflasi','bursa','saham',
  'pajak','pedagang','iklan','produksi','konsumsi','pinjam','bunga','ekonomi','devisa','ekspor','impor',
  // Hukum
  'hukum','kontrak','undang','pidana','aturan','saksi','hakim','sidang','bukti','pasal','kasus','vonis',
  'dakwaan','tahanan','eksekusi','jaksa','jaminan','gugat','putusan','advokat','pelaku',
  // Pendidikan
  'siswa','dosen','ujian','evaluasi','pelajaran','akademik','kelas','materi','akademi','kursus','diploma','ijazah',
  'rapor','belajar','latihan','studi','topik','soal','nilai','pengajar','program',
  // Lingkungan
  'ekologi','polusi','sampah','limbah','energi','karbon','iklim','cuaca','plastik','terumbu','gempa','badai',
  'banjir','selam','organik','pengair','aliran',
  // Seni & desain
  'desain','grafis','lukisan','warna','sketsa','karya','animasi','gambar','kreatif','digital','ruang','elemen',
  'visual','proyek','motif','media','konsep','estetika',
  // Olahraga
  'atlet','olahraga','latihan','pelatih','sepak','tenis','basket','futsal','pemain','wasit','lapangan','renang','lompat','gulat',
  'senam','taktik','strategi','fitness',
  // Industri & manufaktur
  'produksi','mesin','pabrik','bahan','kualitas','material','logistik','kontrol','komponen','operasi'
];

// Short kata Indonesia (tanpa bahasa Inggris)
const SHORT_ID = [
  'baru','aman','asik','seru','cepat','santai','hepi','hemat','murah','kaya','cuan','untung',
  'sukses','juara','unggul','lancar','amanah','rapi','bersih','sehat'
];

// Prefix/suffix ringan (Indonesia) – mega/super dihapus
const PREFIX_ID = ['di','ke','se','ber','ter'];
const SUFFIX_ID = ['ku','mu','id','indo','kita'];

// Kombinasi dibatasi agar tetap wajar
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

    // 4) short + seed dan seed + short
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
