// Wordlist Indonesia saja, panjang 5–7 huruf. Tanpa angka/spasi.
// Menambah varian otomatis: duplikasi huruf depan, ganti huruf akhir ke k/n, potong 7 jika terlalu panjang.

function isValidUsername(str) {
  return /^[a-z]{5,7}$/.test(str);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Kata dasar Indonesia 5–7 huruf (umum, teknis, nama). Tambahkan lagi bila perlu.
const SEED_ID = [
  // Umum/objek/tempat
  'rumah','jalan','makan','minum','tidur','bangun','pohon','hutan','gunung','langit','tanah','lautku','pantai','ombak',
  'pasar','taman','ladang','kebun','sawah','bukit','danau','sungai','kolam','jembat','jendela','pintu','pagar','atap','dapur',
  'kamar','meja','kursi','lemari','jaket','bunga','batang','akar','rimba','padang','gudang','kiosku','butik','lapang','arena',
  'sekol','kuliah','kelas','siswa','murid','pelajar','kampus','tasmu','haluan','lengan','telaga','perahu','pasing','lapang',
  // Sifat/positif
  'bagus','hebat','keren','mantap','juara','unggul','sakti','pintar','cerdas','bijak','tangguh','kokoh','teguh','solid','sigap',
  'lancar','nyaman','santai','tenang','indah','asri','segar','bersih','rapi','harum','cerah','terang','cahya','kilau','mulia',
  'agung','utama','prima','patuh','taat','pasti','tepat','sadar','adil','sopan','ramah','ceria','riang','ikhlas','jujur',
  // Modern/tech
  'server','browser','sistem','gadget','cloud','virus','malware','backup','upload','akses','update','plugin','cache','login',
  'logout','error','crash','sensor','monitor','virtual','hosting','binary','token','debug','router','switch','kernel','paket',
  'protok','stream','socket','cipher','kripto','hashes','dataid','dataku','kodeku','skrip','botnet','antisp','spamku',
  // Data/AI/IT
  'dataset','aibot','aiindo','aiaman','aipros','aicerah','aipint',
  // Kesehatan
  'anatomi','terapi','vaksin','infeksi','pasien','klinik','medis','darah','jantung','ginjal','kanker',
  'sakit','demam','batuk','radang','tubuh','polusi','operasi','cedera','nyeri','sembuh','imunit','giziku','nutrisi',
  // Ekonomi & bisnis
  'modal','harga','kredit','utang','saldo','biaya','profit','resesi','inflasi','bursa','saham','pajak','pedaga','iklan','pinjam',
  'bunga','devisa','ekspor','impor','laba','rugi','kasbon','invoice','pembay','bayara','diskon','grosir','ritel','kulakan','tabung',
  // Hukum
  'hukum','kontrak','undang','pidana','aturan','saksi','hakim','sidang','bukti','pasal','kasus','vonis','jaksa','gugat','jaminan',
  'advoka','pelaku','tahana','putusan','perdata','pidsus','praper','eksek','tuntut',
  // Pendidikan
  'siswa','dosen','ujian','pelajar','materi','akademi','kursus','diplom','ijazah','rapor','belaja','latihn','studi','topik','nilai',
  'program','skrips','tesis','riset','kuliah',
  // Lingkungan & alam
  'ekolog','polusi','sampah','limbah','energi','karbon','iklim','cuaca','plastik','terumb','gempa','badai','banjir','organik','hijau',
  'rawat','lestari','rehab','konser','aliran','angina','ombang',
  // Seni & desain
  'desain','grafis','lukisa','warna','sketsa','karya','animasi','gambar','digital','ruang','elemen','visual','proyek','motif','konsep',
  'studio','artisi','galeri','patung','ilustr','layout',
  // Olahraga
  'atlet','latihn','pelati','sepak','tenis','basket','futsal','pemain','wasit','renang','lompat','gulat','senam','taktik','fitness',
  // Industri & manufaktur
  'mesin','pabrik','bahan','materi','kontrol','operas','gudang','teknik','logist','rakitan','otomasi','perakit','bandar','kualitas',
  // Nama (5–7 huruf)
  'andri','ridho','ridwan','surya','adnan','irfan','akbar','fahri','hafiz','hanif','hasan','arkan','naufal','farhan','rehan','devin',
  'denis','yusuf','yahya','fajar','galih','faizal','kamal','karim','malik','marwan','anwar','syamil','syihab','farid','fajri','zulfik',
  'bagusn','fikri','rahmat','rizky','saprol','darian','aulia','safira','syifa','syahra','zahra','zainab','rahma','rania','putri',
  'putera','adinda','amanda','amalia','anisa','annisa','fitri','fitria','salma','salwa','intan','indah','nabila','nayla','nelia','nurul',
  'luthfi','latifa',
  // Tambahan umum (blok besar, 5–7 huruf)
  'beliau','berita','berkat','berkas','bising','bintang','biologi','bisnis','budaya','cerita','cerdas','cermat','cermin','daging',
  'dahulu','damkar','daring','datang','desaku','desain','dingin','diskus','doakan','empati','fantas','fauzan','fokus','formal','forens',
  'gagasan','gambar','garasi','gengsi','giring','hadiah','handal','hangat','hapus','harian','harkat','hewan','hijrah','hikmah','hormat',
  'ibadah','ilham','imajin','impian','indeks','infusi','inovasi','insani','istana','istime','jabari','jadwal','jargon','jasmani','jatuh',
  'jelita','jemari','jemput','jenaka','jernih','jodoh','jujur','junior','jurnal','kaleng','kalori','kampus','kandang','kapten','karbon',
  'karcis','kardus','karier','kreatif','kredit','kucing','kudung','kulkas','kumpul','kuncup','kuras','kurban','kursus','lahari','lahir',
  'lancar','langit','langka','lastar','lembut','lenyap','lereng','limbah','lingga','lintas','logika','lokasi','loncat','lorong','lubang',
  'madani','mahir','majlis','makmur','malang','mandor','mantra','manusi','mapala','markas','martir','masker','mawar','mekani','melaju',
  'melati','melaut','memori','menari','mendung','meraih','merasa','merger','meriah','merint','metrik','miopia','mobil','modest','mopoli',
  'mortal','motorn','muatan','murabi','murah','murung','muslim','mutasi','nabati','nafkah','naluri','narasi','nasgor','nasion','naurah',
  'negeri','neraca','netral','nikmat','nindya','nirmal','noktah','nomade','nostal','notula','nuklir','nyaman','nyasar','nyoman','obatin',
  'obral','obrol','ocehan','oksida','olimpi','omelan','omset','oposis','optima','orisin','otonom','pabrik','padamu','pagoda','pajaki',
  'palapa','palari','palopo','pamong','panama','pandai','pandit','pangan','panter','pantun','papaya','parade','parfum','parigi','parity',
  'partai','parung','pasang','pastel','patron','payung','pegawai','pelari','pelaut','pelita','pemand','pemilu','pemuda','penari','pencak',
  'pendek','peniti','penjor','penjul','pepaya','perahu','perdai','perdana','permai','pernik','perugi','perupa','perwis','pesona','petaka',
  'petani','petapa','petren','phaser','pinang','pindah','pinter','piring','pisang','pistol','plakat','plasma','plastik','polisi','ponako',
  'pondok','ponsel','posisi','potong','praja','prayer','predik','prisma','prodeo','prolog','proses','proyek','psikhi','publik','puitis',
  'pulang','pulpen','puncak','punjul','purnak','pusaka','puteru','putih','putren','puyeng',
  // Tambahan ekstra (teknis/umum, 5–7 huruf)
  'presid','preside','ppresid','lambung','lambunk','presidn','preside','lambun','lambuk','lamban','lambat','lambar',
  'kamera','kameraa','kamere','kamern','kamera','kamrak','kamban','kambin','kambir','kampas','kampak',
  'bupatik','bupatin','bupatn','waliko','walikk','walkot','walkotn','walikn',
  'menter','menteri','menter','mnteri','mantri','mantrn','mantry','mantra','mantri','mantri',
  'gubern','gubernr','ggubern','guberna','guberk',
  'direkt','direksi','dirjen','dirjenn','ddirjen','sekret','sekretk','sekretn',
  'musyaw','musyawn','musyawk','musyawt','musyawi','musyara','musyarh','musyarn','musyarq',
  'ekstra','ekstrak','ekstran','ekstraf','ekstral','ekstrar'
];

// Buat varian ringan:
// - Jika panjang 5–7: simpan asli; duplikasi huruf depan jika masih muat (len<=6); ganti huruf terakhir ke k/n.
// - Jika panjang >7: potong jadi 7; juga duplikasi huruf depan lalu potong jadi 7.
function generateVariants(word) {
  const res = new Set();
  const base = word.toLowerCase().replace(/[^a-z]/g, '');
  const len = base.length;
  if (len >= 5 && len <= 7) res.add(base);

  if (len >= 5 && len <= 6) {
    const dup = (base[0] + base);
    if (isValidUsername(dup)) res.add(dup);
  }
  if (len >= 5 && len <= 7) {
    const last = base.slice(0, -1);
    const v1 = last + 'k';
    const v2 = last + 'n';
    if (isValidUsername(v1)) res.add(v1);
    if (isValidUsername(v2)) res.add(v2);
  }
  if (len > 7) {
    const cut = base.slice(0, 7);
    if (isValidUsername(cut)) res.add(cut);
    const dupCut = (base[0] + base).slice(0, 7);
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
    this.refresh();
  }

  refresh() {
    this.generation++;
    const newSet = new Set();

    for (const w of SEED_ID) {
      for (const v of generateVariants(w)) {
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
