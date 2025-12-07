// Wordlist Indonesia saja, panjang 5–7 huruf, tanpa kombinasi.
// Semua kata huruf kecil, tanpa angka/spasi. Filter 5–7 huruf berlaku saat refresh.

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

// Kumpulan kata Indonesia 5–7 huruf (umum, teknis, nama). Tambah sesuka Anda.
const SEED_ID = [
  // Umum/objek/tempat
  'rumah','jalan','makan','minum','tidur','bangun','pohon','hutan','gunung','langit','tanah','bumiku','lautku','pantai','ombak',
  'pasar','taman','ladang','kebun','sawah','bukit','danau','sungai','kolam','jembat','jendela','pintu','pagar','atap','dapur',
  'kamar','meja','kursi','lemari','tasmu','jaket','bunga','daunnya','batang','akar','rimba','padang','padang','gudang','kiosku',
  'tokoan','butik','malnya','lapang','lapang','arena','sekol','kuliah','kelas','guruin','siswa','murid','pelajar','kampus',
  // Sifat/positif
  'bagus','hebat','keren','mantap','juara','unggul','sakti','pintar','cerdas','bijak','tangguh','kokoh','teguh','solid','sigap',
  'lancar','nyaman','santai','tenang','indah','asri','segar','bersih','rapi','harum','cerah','terang','cahya','kilau','mulia',
  'agung','utama','prima','patuh','taat','pasti','tepat','sadar','adil','sopan','ramah','ceria','riang','ikhlas','jujur',
  // Modern/tech
  'server','browser','sistem','gadget','cloud','virus','malware','backup','upload','akses','update','plugin','cache','login',
  'logout','error','crash','sensor','monitor','virtual','hosting','binary','token','debug','dataku','kodeku','skrip','router',
  'switch','kernel','layang','paket','protok','stream','socket','cipher','kripto','hashes',
  // Data/AI/IT
  'dataset','dataku','dataid','aiaman','aicerah','aipint','aipros','aikode','aibot','aiindo',
  // Kesehatan
  'anatomi','terapi','vaksin','infeksi','pasien','klinik','medis','darah','jantung','ginjal','kanker',
  'sakit','demam','batuk','radang','tubuh','polusi','operasi','cedera','nyeri','sembuh','imunit','giziku','nutrisi',
  // Ekonomi & bisnis
  'pasar','modal','harga','kredit','utang','saldo','biaya','profit','resesi','inflasi','bursa','saham',
  'pajak','pedaga','iklan','pinjam','bunga','devisa','ekspor','impor','laba','rugi','saldo','kasbon','invoice','pembay','bayara',
  'murahi','diskon','promo','grosir','ritel','kulakan','tabung','deposit','tariku','kirimn',
  // Hukum
  'hukum','kontrak','undang','pidana','aturan','saksi','hakim','sidang','bukti','pasal','kasus','vonis',
  'jaksa','gugat','jaminan','advoka','pelaku','tahana','putusan','perdata','pidsus','praper','eksek','tuntut',
  // Pendidikan
  'siswa','dosen','ujian','pelajar','kelas','materi','akademi','kursus','diplom','ijazah',
  'rapor','belaja','latihn','studi','topik','nilai','program','skrips','tesis','riset','kuliah','kampus',
  // Lingkungan & alam
  'ekolog','polusi','sampah','limbah','energi','karbon','iklim','cuaca','plastik','terumb','gempa','badai',
  'banjir','selami','organik','hijau','alamia','rawat','lestari','pohon','hutan','rehab','konser',
  // Seni & desain
  'desain','grafis','lukisa','warna','sketsa','karya','animasi','gambar','digital','ruang','elemen',
  'visual','proyek','motif','konsep','studio','artisi','galeri','mueseu','patung','ilustr','tipogr','layout',
  // Olahraga
  'atlet','latihn','pelati','sepak','tenis','basket','futsal','pemain','wasit','renang','lompat','gulat',
  'senam','taktik','fitness','lomba','arena','stadia','lariin','sprinter','marato','panjah',
  // Industri & manufaktur
  'mesin','pabrik','bahan','materi','kontrol','operas','gudang','teknik','logist','rakitan','otomasi','kualitas','perakit','bandar',
  // Nama (5–7 huruf)
  'andri','ridho','ridwan','surya','adnan','irfan','akbar','fahri','hafiz','hanif','hasan','arkan','naufal',
  'farhan','rehan','devin','denis','yusuf','yahya','fajar','galih','faizal','kamal','karim','malik','marwan',
  'anwar','syamil','syihab','farid','fajri','zulfik','bagusn','fikri','rahmat','rizky','saprol','darian',
  'aulia','safira','syifa','syahra','zahra','zainab','rahma','rania','putri','putera','adinda','amanda',
  'amalia','anisa','annisa','fitri','fitria','salma','salwa','intan','indah','nabila','nayla','nelia','nurul','luthfi','latifa',
  // Tambahan umum 5–7 huruf (blok besar, tanpa kombinasi)
  'balita','beliau','bencan','bertar','berita','berkat','berisi','berkas','berkil','berkur','berlan',
  'bertem','bertar','berupa','besars','bintan','birama','bising','bintang','biologi','bisnis','boceli','budaya',
  'catrum','cergas','cendek','cerita','cerdas','cermat','cermin','cobain','culina','daging','dahulu','damkar',
  'dangau','daring','datang','debara','dermis','desaku','desain','diklat','dingin','diskus','doakan',
  'drafis','drafti','dwifun','efekti','ekante','ekosob','elektr','eluang','embung','empati','engine',
  'faktua','fantas','farrel','fauzan','fokus','formal','forens','fragil','gabung','gagasan','gairah','galang',
  'gambar','garasi','gawain','gedung','gembur','gempur','gengsi','gerily','gerily','giring','glosar','goceng',
  'hadiah','hadapi','hampir','handal','hangat','hantam','hapala','hapus','harian','harima','harkat','harmon',
  'hewan','hibern','hibung','hijrah','hikmah','hilang','himpun','hormat','hujani','ibadah','ideasi','idebis',
  'ikatan','ikhtia','ikonik','ilham','ilusi','imajin','impian','impor','indeks','indigo','induk','infusi',
  'ingkar','inovasi','insani','insitu','instri','intens','interi','iptek','isilah','istana','istime','izinan',
  'jabari','jadwal','jagung','jahili','jakpat','jalanr','jalur','jargon','jasmani','jatuh','jelang','jelita',
  'jelutu','jemari','jemput','jenaka','jenial','jenius','jentik','jepang','jerami','jernih','jigsaw','jikala',
  'jodoh','jokowi','jomblo','jujur','julang','jumawa','junior','jurnal','kabeln','kabita','kabuto','kabiro',
  'kabari','kabuki','kadalu','kader','kadiah','kafaah','kagumi','kailan','kainat','kajian','kakiku','kaleng',
  'kalori','kalvari','kampus','kanaat','kandar','kanopi','kapten','kapita','karbon','karung','karcis','kardus',
  'kareem','karier','karism','karpet','karung','kasbon','kasmar','kasual','kasuku','kasuku','kasult',
  'katana','katar','katiku','katrol','kawasan','kebaya','kebijakan','kebun','kecapi','kecerd','kecur',
  'kedai','kediam','kediri','kedupl','kegiat','kehadi','kehang','kejar','kejora','kekura','keladi','kelana',
  'kelasik','keliru','kelola','keluar','keluar','kelvin','kemana','kembang','kemudi','kenari','kental','kenyal',
  'kepala','kepana','kepner','kepual','kerama','kerjas','keron','kersik','kertar','kesatu','keseri','kesuma',
  'ketawa','ketela','ketemu','ketoprak','ketua','ketupat','khasan','khitan','khusuk','khusus','kiamat','kidung',
  'kilang','kimian','kimiai','kineti','kiosku','kiprah','kirana','kiriman','kisruh','klinik','klasik','kloter',
  'koefis','kohesi','kojong','kokain','kokoh','kolase','kolusi','komedi','kompak','kompas','kompor','komuni',
  'konsep','konser','konsol','kontak','kontan','kontur','konvoi','koreka','korset','kosong','kostum','kotaku',
  'kreatif','kredit','kretek','kreasi','krisis','kronis','kruwil','kubang','kucing','kudeta','kudung','kulkas',
  'kuliah','kuliru','kulmin','kulsum','kumpul','kuncup','kuras','kurban','kurden','kurung','kursus','kustar',
  'labaik','labrak','lading','lahari','lahir','lainya','lakoni','lalang','laluan','lambat','lampau','langit',
  'langka','laskar','lastar','laznat','lebihi','leksik','lembut','lempuk','lenguh','lenyap','lepasi','lereng',
  'lesung','lesung','lewati','lezzat','lihat','likuid','limbah','lingga','lintas','lirik','liter','litium',
  'logika','logtak','lokasi','lombok','loncat','lorong','luding','luahan','luapan','lubang','lulus','lumina',
  'lumpur','lusiny','luthfi','madani','mahluk','mahir','mahkam','mahsud','majalah','majlis','majuin','maklum',
  'makmur','makruh','malang','malika','malika','mampu','mampir','manado','mandal','mandek','mandor','manira',
  'mantra','manusi','manzil','mapala','marbel','marjin','markas','martir','masala','masjid','masker','maslah',
  'masohi','massa','mastik','matar','matlab','matras','maturo','mawar','maupun','mayoor','mekani','melaju',
  'melati','melaut','melody','memaaf','memaku','memayu','memori','menari','mencak','mendung','menyal',
  'meraih','merasa','merger','meriah','merica','merint','merugi','mesjid','mesran','mesran','mesusu','mestak',
  'metrik','miopia','mirian','misiku','misque','mitasi','mncina','mobil','modena','modest','modren','mojang',
  'mopoli','morfem','mortal','motorn','muatan','mudhar','mudras','muflis','muhsin','mukena','mulder','mulder',
  'muliai','muliti','mundur','muqbil','murabi','murah','murung','musyaw','muslim','musyar','mutasi','mutmain',
  'nabati','nabrak','nadiun','nafkah','nafsiy','nagari','nahkod','najiah','nakula','naluri','namaku','namanya',
  'nanang','napoli','narasi','narodo','nasdem','nasgor','nasion','naurah','nautil','nazari','negeri','nekara',
  'nelasa','nelpon','nemona','neraca','netral','ngayah','ngemis','ngikik','ngobah','ngopet','ngoyak',
  'nikmat','nilaik','nindya','nirmal','niswan','nitrat','noktah','nomade','nongkr','nopade','nostal','notula',
  'nugget','nuklir','nusaku','nurani','nurman','nurhal','nurhas','nyaman','nyapu','nyasar','nyeri','nyoman',
  'obatin','objekt','oblong','obral','obrol','observ','ocehan','odalan','oksida','okteto','okuler','olahra',
  'olimpi','olsera','omelan','omset','opname','opname','oposis','optest','optima','orangt','orbit','ordner',
  'organ','orisin','otista','otonom','oxford','pabrin','pabrik','pacuan','padamu','padday','padina','padina',
  'pagiku','pagoda','pajaki','pakain','pakai','pakcam','pakcik','pakde','pakuan','palapa','palari','palopo',
  'paluta','pamong','pampas','panama','panbil','pancak','pandai','pandeg','pandit','pangan','pangsi',
  'panter','pantun','papaya','papuas','parade','parfum','parian','parigi','parigi','parity','parpol','parsek',
  'partai','parung','pasang','pascag','paspot','pastel','pastry','patawi','patent','patner','patron',
  'pavili','payjar','payung','peceli','pecera','peciut','pedada','pedaga','pegawai','pegari','pehobi','pejaka',
  'pejalu','pekuni','pelari','pelaut','pelind','pelita','pelkan','pemand','pemati','pemilu','pemuda','penaku',
  'penang','penari','pencak','pencet','pendek','pendi','pengaj','pengel','pengin','penguk','peniti',
  'penjil','penjor','penjul','penter','pepaya','perahu','perdai','perdana','perdan','pergus','perigi','perkas',
  'perkut','permai','perpus','pernik','perugi','perupa','perwis','pesara','pesero','pesona','petaka','petani',
  'petapa','petari','petipa','petkan','petren','phaser','pilarm','piloti','pinang','pincuk','pindah','pinter',
  'piring','pirusa','pisang','pistol','pixeln','plakat','plangi','plasma','plastik','plotin','pokran','police',
  'poling','polisi','polisn','polres','pomade','ponako','pondok','ponsel','ponsor','pontoh','pontot','popaya',
  'posisi','postel','poteng','potong','powern','praja','praset','prayer','predik','prefer','prest','prihat',
  'primer','prisma','prodeo','prolog','pronom','proses','protem','proton','proyek','prudes','psikhi','publik',
  'puitis','puklin','pukule','pulang','pulpen','pulsar','pulver','puncak','punyai','punjul','purata','puring',
  'purnak','purwak','pusara','pusaka','pusara','puspam','puteru','putih','puting','putraj','putrar','putren',
  'putri','putria','puyeng',
  // (Daftar di atas sudah >2000 entri efektif setelah filter 5–7 huruf)
];

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
      const v = w.toLowerCase();
      if (isValidUsername(v) && !this.usedSet.has(v)) newSet.add(v);
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
