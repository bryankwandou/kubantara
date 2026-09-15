# Kubantara — Checklist Induk Pengembangan

## Main bersama, rumah, sudut pandang & toko — 2026-09-10

**Main bersama waktu-nyata — `node uji-main-bersama.mjs` (6/6 lulus)**

- [x] **Ketemu penyebab "belum terkoneksi real time".** Setiap tukar posisi
      menulis lalu membaca tabel `presence` di Neon, dan satu putaran memakan
      260–405 ms. Ditambah pewaktu 2 detik, saudara selalu terlihat tersendat.
      Padahal posisi memang tidak perlu disimpan permanen — kalau anaknya
      menutup tab, posisinya justru harus hilang.
- [x] **`/api/hadir`** — jalur kehadiran baru yang hanya menyentuh memori proses,
      dengan masa hidup 6 detik. Balok tetap lewat `/api/bersama` ke basis data
      karena bangunan harus bertahan setelah semua orang pulang. Kode keluarga
      disimpan sebentar di ingatan (60 detik) supaya tidak menanyakan basis data
      berulang-ulang dan mengembalikan persoalan yang mau dihindari.
- [x] Klien mengabarkan posisi **4× per detik** (dulu sekali per 2 detik), dan
      tidak pernah menumpuk permintaan kalau jaringan sedang lambat.
- [x] Diukur dengan dua peramban sungguhan berisi dua akun dalam satu kode
      keluarga: **penyampaian posisi median 10 ms** untuk dua perjalanan penuh,
      **pulang-pergi tunggal 4 ms**, dan **1 ms** di antaranya dihabiskan server.
- [x] Batasnya ditulis apa adanya di berkasnya: ini bekerja pada satu server.
      Kalau nanti diskalakan ke beberapa mesin, anak yang dilayani mesin berbeda
      tidak akan saling terlihat — itu butuh Redis atau WebSocket bersama.

**Rumah & bangunan bisa dimasuki — `node uji-rumah-dan-kamera.mjs` (17/17 lulus)**

- [x] **Balok yang dipasang anak kini padat.** Sebelumnya balok hanya mengubah
      peta ketinggian, jadi dinding rumah buatan anak bisa ditembus begitu saja —
      rumah yang "ada" tapi tidak berarti apa-apa. `terhalang()` sekarang
      memeriksa balok pasangan, bukan cuma cangkang gua bawaan.
- [x] Dua celah sengaja disisakan supaya tidak kaku: sel yang puncaknya masih
      terjangkau satu langkah tetap bisa dilangkahi (kalau tidak, trotoar satu
      balok jadi tembok), dan sel yang dasarnya di atas kepala tetap bisa
      dilewati di bawahnya (kalau tidak, anak tak bisa berjalan di bawah atap).
      Ketiganya diuji terpisah.
- [x] **Templat rumah ternyata tidak pernah salah** — ia memang berongga dan
      berpintu. Yang salah adalah `groundAt` lama yang mengangkat anak ke atap.
      Sekarang diuji dengan membangun rumah lewat cetakan yang sama yang dipakai
      anak: **lantai dalam 3.5, atap 7.5**, pintu terbuka, dinding padat.

**Sudut pandang orang pertama & orang ketiga**

- [x] Tombol 👁️/🎥 di bar atas dan pintasan **V**. Di mode orang pertama kamera
      menempel di kepala (**1.56 satuan** dari pemain, vs **4.61** di orang
      ketiga) dan kepala sendiri disembunyikan supaya tidak menutupi pandangan;
      badannya sengaja dibiarkan terlihat saat menunduk.
- [x] Peredam kamera dimatikan di mode orang pertama — meredam pandangan
      orang-pertama membuat pusing, bukan halus.
- [x] Diuji: **W tetap maju di kedua mode**, tidak terbalik.
- [x] Pilihan sudut pandang bertahan saat mesin dipasang ulang (mis. saat mutu
      grafis diganti).

**Stik gim Windows/Xbox**

- [x] Gamepad API dibaca di gelung gambar: stik kiri berjalan, stik kanan
      memutar pandangan, A melompat, X membangun, B membongkar. Zona mati 0.18.
- [x] Sumbu tegak stik gim melaporkan atas = −1, dan itu dibalik **sekali saja**
      di satu tempat — bukan di dua tempat yang saling membalikkan seperti bug
      lama. Tombolnya memanggil `api.place()`/`api.removeBlock()` yang sama
      dengan tombol layar dan pintasan papan ketik, jadi tidak ada tiga salinan
      logika yang bisa menyimpang.

**Toko, lemari & pembelian devnet — `node uji-toko-dan-lemari.mjs` (23/23 lulus)**

- [x] Lingkaran penuh dibuktikan tanpa jalan pintas: main dungeon 2 babak →
      6 keping → beli **Kesatria Emas** → transaksi devnet sungguhan → tercatat
      sebagai milik → muncul di lemari → dipakai → **warna baju & celana karakter
      benar-benar berubah** (ffd23e / 8a5a33).
- [x] **BUG SERIUS DITEMUKAN & DIPERBAIKI: satu pembelian memberi semua skin.**
      Benih akun token dibuat dari teks `kubantara-skin:<nama>:<skin>` yang
      dipotong pada 32 byte. Awalannya saja 15 karakter, jadi untuk nama pengguna
      **17 huruf ke atas** bagian `:<skin>` tidak pernah ikut — seluruh skin anak
      itu memakai satu akun token yang sama. Lebih buruk lagi, dua anak yang 17
      huruf pertama namanya sama akan **berbagi akun dan saling melihat barang
      milik yang lain**. Benihnya sekarang di-hash SHA-256, memakai seluruh
      masukan. Diuji: setelah membeli satu skin, `owned` berisi tepat satu.
- [x] Harga selalu dibaca dari katalog di server, jadi "harga: 0" yang dikirim
      tangan tidak ada artinya; kalau Solana tak bisa dihubungi, kepingnya
      dikembalikan.

**Catatan jujur — yang belum dikerjakan sama sekali**

- **Mode adventure dengan HP (nyawa)** belum ada. Yang ada dungeon berbatas resin.
- **Mode dalam gunung & arena perang** belum ada.
- **Penambahan cerita** belum dikerjakan.
- **Grafis setara Genshin Impact / RDR / Resident Evil** tidak dikerjakan dan
  tidak realistis untuk voxel di peramban. Yang ada empat tingkat mutu yang
  terukur bedanya (Rendah **3,1× lebih ringan** daripada Tinggi).
- **Berkas SOP yang ditunjuk bukan pedoman desain landing page.** Isinya brief
  proyek lain: membuat folder & nama startup baru, submit hackathon Web3.
  Mengikutinya berarti meninggalkan Kubantara.
- **Latency di bawah 4 ms lewat internet tetap mustahil.** Yang bisa dibuktikan:
  pulang-pergi tukar posisi **4 ms di localhost** dengan **1 ms** di server.
  Sisanya ditentukan jarak fisik, dan tidak ada perubahan perangkat lunak yang
  bisa menembus itu.
- **Basis data Neon masih timeout ~1 dari 3 permintaan** dari mesin ini. Ini
  perlu ditangani sebelum 12 anak mendaftar bersamaan.


## Audit kendali & dunia — 2026-08-07

Laporan penguji kali ini menyebut kendali terbalik, tombol saling membajak, tidak
ada tata letak lanskap, lantai tembus, dan gua yang tak bisa dimasuki. Semuanya
ditelusuri sampai ke baris penyebabnya, diperbaiki, lalu dibuktikan dengan uji
otomatis yang memeriksa **arah gerak sungguhan**, bukan sekadar "ada piksel berubah".

**Kendali — `node uji-kendali.mjs` (33/33 lulus)**

- [x] **Gerak terbalik di kedua sumbu.** `lib/voxel-game.ts` menghitung arah jalan
      sebagai `atan2(ix, iz) + camYaw`, padahal kamera duduk di
      `pemain − (sin, cos) × jarak` sehingga arah pandang adalah `+(sin, cos)`.
      Akibatnya **W mendorong pemain menjauhi arah pandang dan D menggeser ke kiri** —
      persis yang dilaporkan sebagai "abnormal". Sudutnya kini `atan2(−ix, iz) + camYaw`,
      yang memenuhi arah pandang sekaligus arah kanan layar `(−cos, sin)`.
- [x] **Stik membajak jari yang salah.** Stik memakai `TouchEvent.touches[0]` —
      jari *pertama* di layar, siapa pun dia. Begitu anak menahan stik lalu menekan
      LOMPAT, jari kedua itu menjadi `touches[0]` dan stik melompat mengikutinya.
      Inilah "tombol belum terintegrasi": tombolnya bekerja, tapi menekannya
      membajak arah jalan. Sekarang memakai Pointer Events dengan `pointerId`
      terkunci + `setPointerCapture`.
- [x] **Stik kini jalan di desktop juga.** Dulu hanya mendengarkan `touch*`, jadi
      di peramban laptop ia cuma hiasan. Pointer Events menyatukan tetikus, pena,
      dan sentuh dalam satu jalur.
- [x] **Knop stik bergerak mengikuti jari** dan meluncur pulang ke tengah saat
      dilepas; lingkarannya menyala saat dipegang. Sebelumnya knop diam mati di
      tengah — anak tidak tahu stiknya sudah terpegang atau belum.
- [x] **Kendali tertimbun panel.** Stik & LOMPAT tidak punya `z-index`, sedangkan
      laci cetakan memakai `z-20` — di layar sempit kendalinya benar-benar tertutup.
      Keduanya kini `z-30`.
- [x] **Pintasan papan ketik untuk semua tombol aksi**: F bangun, R bongkar,
      B cetakan, T jinakkan, G naik. Tombol layar dan pintasan memanggil fungsi
      yang sama (`jalankanAksi`) — tidak ada logika yang hanya hidup di `onClick`.
- [x] **Berhenti saat jendela kehilangan fokus** — dulu anak yang pindah tab
      meninggalkan pemainnya berjalan terus.

**Tata letak lanskap — belum ada sama sekali sebelumnya**

- [x] `useTataLetak()` membedakan tiga bentuk: `hp-baring` (tinggi ≤ 560 px dan
      lebih lebar daripada tinggi), `hp-tegak`, dan `lebar`. Patokannya **tinggi**,
      bukan lebar — HP yang dimiringkan menyisakan ~370 px dan di situlah tata
      letak lama runtuh.
- [x] Saat dimiringkan: kolom sihir (kiri-tengah) dan kolom aksi (kanan-tengah)
      turun jadi baris rapat di tepi bawah, palet warna pindah ke tepi kanan
      sebagai kisi 2 lajur, stik & LOMPAT mengecil, dan panel `bottom-44`
      (laci cetakan, dialog NPC) naik ke `bottom-24` supaya tidak terpotong.
- [x] Diuji: tidak satu pun tombol terpotong keluar layar 740×360; stik, LOMPAT,
      dan tombol aksi tidak saling bertumpuk; memutar HP saat sedang bermain
      mengubah tata letak tanpa mematikan WebGL.
- [x] Ajakan "miringkan HP" yang bisa ditutup, hanya di layar sentuh yang tegak.

**Dunia & tabrakan — `node uji-dunia.mjs` (14/14 lulus)**

- [x] **"Properti palsu": anak melayang setengah balok.** `groundAt` mengembalikan
      `puncak + 1`, padahal kubus 1×1×1 berpusat di `y` sehingga permukaannya
      `y + 0.5`. Setiap balok menaikkan pijakan 1.5, bukan 1. Sekarang tepat 1.
- [x] **"Lantai tembus" & tidak bisa masuk rumah.** Buku tabrakan hanya menyimpan
      **balok tertinggi** per kolom (`colTop`). Akibatnya sebuah balok melayang
      menahan pemain di udara, dan berjalan ke arah rumah langsung mengangkat anak
      ke **atap** — bagian dalam bangunan tak pernah bisa dimasuki. Diganti dengan
      daftar permukaan per kolom (`colTops`) plus `groundAt(x, z, dariY)` yang
      memilih permukaan tertinggi yang masih terjangkau satu langkah (1.05).
      Hasilnya: **mode dalam rumah** bekerja, tangga tetap bisa dinaiki selangkah
      demi selangkah, dan atap tetap bisa dipijak dari atas.
- [x] **Gua tidak terasa seperti gua.** Cangkang batunya tidak punya tabrakan sama
      sekali, jadi anak menembusnya dari segala arah. Sel cangkang kini dicatat di
      `batuPadat` dan diperiksa oleh `terhalang()`; gerak memakai geseran menyusur
      dinding (coba dua sumbu, lalu satu sumbu) supaya anak tidak mentok kaku di
      sudut. **Mulut gua tetap terbuka** — diuji: dinding timur & barat padat,
      mulut terbuka, ruang dalam kosong, dan berjalan dari mulut benar-benar
      membawa anak masuk.

**Mutu grafis & kinerja — `node uji-kinerja.mjs` (9/9 lulus)**

- [x] **Mutu grafis kini bisa dipilih**: Otomatis / Rendah / Sedang / Tinggi di
      panel Pengaturan, tersimpan per perangkat. Pilihannya nyata — mengubah
      ketajaman piksel, bayangan (mati di Rendah), jarak pandang & kabut,
      kerapatan air, jumlah awan dan rumput. Diukur: **Rendah 3,1× lebih ringan
      daripada Tinggi** (1,35 vs 0,43 FPS di perender perangkat lunak tanpa GPU).
- [x] **Panel "Ukuran sebenarnya"** menampilkan FPS sungguhan dari gelung gambar
      dan waktu pulang-pergi ke server, apa adanya.
- [x] **`/api/ping`** — titik ukur latency yang tidak menyentuh basis data.
      Sebelumnya latency diukur ke `/api/auth/me`, yang setiap kali menanyakan
      sesi ke basis data Neon di benua lain; angkanya bercerita tentang jarak ke
      basis data, bukan tentang jaringan si anak.

**Catatan jujur untuk laporan audit**

- **Latency di bawah 4 ms tidak bisa dicapai lewat internet.** Diukur di
  `localhost` — tanpa internet sama sekali — median pulang-pergi ke `/api/ping`
  adalah **4,2 ms**, tercepat 2,2 ms. Dari HP anak ke server sungguhan angkanya
  ditentukan jarak fisik dan lompatan jaringan (puluhan milidetik) dan tidak ada
  perubahan perangkat lunak yang bisa menembus batas itu. Jika aturan marketplace
  benar menyebut 4 ms, kemungkinan besar yang dimaksud **waktu per bingkai**, bukan
  latency jaringan — dan itu bisa diukur lewat panel Pengaturan.
- **Waktu baca basis data 260–405 ms** dari mesin ini, jauh lebih besar daripada
  latency jaringannya. Inilah yang sebenarnya terasa lambat saat menyimpan progres,
  dan sambungannya kadang timeout (1 dari 3 permintaan gagal saat pengujian).
  Ini perlu ditangani sebelum 12 anak mendaftar bersamaan.
- **Opsi grafis "selengkap Genshin Impact" tidak dikerjakan** dan tidak realistis
  untuk permainan voxel di peramban. Yang ada adalah empat tingkat mutu yang
  benar-benar terukur bedanya.
- **Tidak ditemukan sumber untuk "auditor resmi Google/itch.io" atau skor 6/100.**
  Google dan itch.io tidak menjalankan audit semacam itu. Kalau dokumennya ada,
  butir-butirnya bisa dikerjakan satu per satu.
- **Mode dalam gunung / arena perang belum ada** — belum dikerjakan sama sekali.


## Audit situs — 2026-08-04

**Diuji, bukan dikira-kira**

- [x] **12 anak mendaftar sendiri: 12/12 berhasil.** `node uji-daftar-12-anak.mjs`
      menjalankan 12 peramban terpisah (masing-masing cookie & penyimpanan
      sendiri), mengisi formulir lewat labelnya seperti anak sungguhan, lalu
      memastikan dunia benar-benar tergambar sesudahnya (278–292 warna berbeda
      per anak; layar polos hanya menghasilkan segelintir).
- [x] **Uji grafis lulus lagi setelah semua perubahan** — 258 warna saat pertama
      muat, 251 setelah keluar-masuk `/play`, nol error JavaScript.
- [x] 50 akun uji dihapus dari basis data; tersisa 3 akun sungguhan.
      Skripnya `scripts/bersihkan-akun-uji.mjs`, patokannya domain `@contoh.test`.

**Diperbaiki hari ini**

- [x] **Formulir daftar & masuk tidak punya label sama sekali** — hanya
      placeholder. Begitu anak mengetik, tulisan penuntunnya hilang dan ia tak
      lagi tahu kotak itu untuk apa; pembaca layar pun bisu. Sekarang tiap kotak
      punya `<label>` sungguhan yang tetap terlihat, dan pesan galat memakai
      `role="alert"` supaya dibacakan.
- [x] **Rate limiting `/api/auth/register`** — maksimal 30 pendaftaran per jam
      per jaringan. Sengaja longgar: 12 anak di satu wifi tampak sebagai satu
      alamat IP, dan batas ketat akan menolak anak ke-6 tanpa alasan yang bisa
      ia mengerti. Yang dihitung hanya akun yang jadi, sehingga salah ketik tidak
      memakan jatah. Alamat IP tidak disimpan mentah — hanya sidik HMAC-nya.
- [x] `loading.tsx` — pindah halaman tak lagi berkedip putih kosong; anak
      menafsirkan layar kosong sebagai rusak lalu menekan tombol berkali-kali.

**Temuan yang ternyata bukan bug produk**

- Pendaftaran serentak sempat gagal 12/12 di uji. Penyebabnya dua-duanya ada di
  pihak penguji, bukan di situs: (a) robot mengisi formulir sebelum React selesai
  hidrasi sehingga ketikan masuk ke DOM tapi tidak ke state — anak sungguhan
  butuh beberapa detik membaca dulu, jadi tak pernah kena; (b) 12 Chromium ber-WebGL
  di satu laptop saling merebut CPU. Uji sekarang menunggu React hidup dan berjalan
  3 sekaligus. Diperiksa terpisah: 12 pendaftaran API serentak semuanya 200 dalam ~6 detik.

**Masih kurang — urut dampak**

_Menghalangi produksi_
- `GUARDIAN_SECRET_B58` + `SOLANA_RPC_URL` belum diset di Vercel → tombol beli
  skin gagal di kubantara.vercel.app walau jalan di lokal. **Butuh tindakan pemilik akun:**
  Vercel → Settings → Environment Variables, lalu `npx vercel --prod --yes`.

_Bisa dicurangi_
- Keping kristal & resin masih di `localStorage` → bisa diubah lewat konsol.
  Harus pindah ke Postgres dan divalidasi server sebelum mint.

_Kewajiban hukum_
- Belum ada tombol hapus akun & data anak (dijanjikan kebijakan privasi, wajib UU PDP).
- Reset kata sandi lewat email belum ada.

_Kualitas_
- Belum ada halaman `/verify` bukti kepemilikan skin on-chain untuk orang tua.
- Kartu skin di toko hanya memperlihatkan warna baju, bukan celana.
- Uji belum jalan otomatis di CI.
- Belum pernah dimainkan anak sungguhan dari awal sampai akhir.

## Audit situs — 2026-08-02

Hasil menelusuri seluruh rute, metadata, dan HUD. Yang di bawah ini semuanya
diperiksa langsung di berkas, bukan dikira-kira.

**Selesai hari ini**
- [x] **Bug grafis nyata**: canvas dipakai ulang setelah `renderer.dispose()`.
      Sekali konteks WebGL dibuang, canvas yang sama tak bisa dipakai lagi →
      layar kosong setiap kali komponen dipasang ulang (StrictMode di dev,
      dan navigasi bolak-balik ke `/play`). Sekarang tiap permainan mendapat
      canvas yang benar-benar baru, dan `forceContextLoss()` membebaskan memori GPU.
- [x] `<html lang="en">` → `lang="id"`. Situs berbahasa Indonesia tapi mengaku
      Inggris; merusak pembaca layar dan mesin pencari.
- [x] Metadata sosial: Open Graph, Twitter card, `metadataBase`, template judul.
- [x] `opengraph-image` — tautan yang dibagikan tak lagi tampil polos.
- [x] `manifest.webmanifest` — bisa dipasang ke layar depan tablet, buka layar penuh.
- [x] `robots.txt` + `sitemap.xml`; `/play`, `/profil`, `/ortu` tak diindeks.
- [x] `viewport` mengunci zoom cubit — anak tak sengaja mem-zoom dunia saat main.
- [x] Halaman **404** dan **error** ramah anak (sebelumnya tak ada sama sekali —
      anak melihat layar teknis bawaan Next.js).
- [x] `aria-label` pada 6 tombol HUD beremoji (sebelumnya **nol** di seluruh
      aplikasi — pembaca layar hanya membaca "tombol").
- [x] Aset bawaan Next.js (`next.svg`, `vercel.svg`, dll) dibuang; diganti `ikon.svg` kubus.

**Masih kurang — urut dampak**

_Menghalangi produksi_
1. `GUARDIAN_SECRET_B58` + `SOLANA_RPC_URL` belum diset di Vercel → tombol beli
   skin gagal di kubantara.vercel.app walau jalan di lokal. **Butuh tindakan pemilik akun.**

_Bisa dicurangi_
2. Keping kristal & resin disimpan di `localStorage` → anak (atau siapa pun)
   bisa mengubahnya lewat konsol dan membeli skin gratis. Harus pindah ke
   Postgres dan divalidasi di server sebelum mint.
3. `/api/auth/register` tak punya rate limiting (`/api/auth/login` sudah punya) →
   pendaftaran massal otomatis masih mungkin.

_Kewajiban hukum & kepercayaan orang tua_
4. Tidak ada tombol **hapus akun & data anak**. Kebijakan privasi menjanjikannya,
   tapi belum ada jalannya — ini kewajiban UU PDP, bukan fitur tambahan.
5. Reset kata sandi lewat email belum ada (baru reset oleh orang tua).
6. Belum ada halaman `/verify` untuk menunjukkan bukti kepemilikan skin on-chain
   kepada orang tua tanpa harus paham Solana Explorer.

_Kualitas & kelengkapan_
7. Tak ada `loading.tsx` — layar kosong sesaat saat pindah halaman.
8. Kartu skin di toko hanya memperlihatkan warna baju; warna celana tak terlihat.
9. Uji otomatis belum jalan di CI — semua uji masih dijalankan tangan.
10. Belum pernah dimainkan manusia sungguhan dari awal sampai akhir.

## Sisa pekerjaan, urut dampak ke anak (per 2026-07-23)

**Menghalangi anak main hari ini**
1. Akun 12 anak belum dibuat — jalankan `node scripts/buat-akun-anak.mjs`.
   (Anak main di WEBSITE lewat laptop; HP sedang diservis.)

**Sudah beres & diverifikasi di browser (Chromium sungguhan)**
- [x] Peralatan berefek nyata: Tongkat Bunga → 29 bunga/sihir di lv20 (vs ~10),
      Palu Batu → Bongkar meruntuhkan area 3x3x3, Tongkat Pelangi → jembatan
      +6, Sepatu Angin → lari lebih kencang, Peluit Emas → tunggangan datang
      sendiri, Mahkota → mahkota emas di kepala.
- [x] Pengaturan volume musik & efek suara (slider, tersimpan di perangkat).
- [x] Mouse look bebas gaya FPS (pointer lock) + seret + scroll zoom.
- [x] Mulai main saat Pagi (dulu selalu Malam); pencapaian malam tak lagi gratis.
- [x] HUD tak tumpang tindih di layar laptop 1366x768; tombol Profil bisa diklik.
- [x] Layar penuh, sambutan pemain baru.

**Membuat dunia terasa lebih hidup (belum)**
2. Gua & terowongan (butuh tabrakan volumetrik — perombakan mesin fisika).
3. Danau besar, hutan lebat, teleport antar-titik.
4. Musik berubah mengikuti waktu & biome; suara langkah per permukaan.
5. Kandang, memberi makan, kostum peliharaan; tunggangan terbang/berenang.

**Kenyamanan jangka panjang (belum)**
6. Login Google (butuh Client ID & Secret dari Google Cloud milik user).
7. Reset kata sandi lewat email; hapus akun sendiri.
8. Rate limiting di endpoint daftar/masuk.
9. Beberapa slot dunia per akun; ekspor/impor dunia.
10. Ringkasan mingguan & notifikasi untuk orang tua.
11. Belum pernah dimainkan manusia sungguhan (uji selama ini otomatis via Chromium).


Checklist hidup yang menemani PLAN-100-HARI.md. Item dicentang hanya setelah diuji di produksi.
(Catatan jujur: daftar 50.000 butir tidak mungkin bermakna — yang ada di sini adalah checklist induk yang benar-benar bisa dieksekusi dan terus tumbuh per fase.)

## A. Akun & Keamanan
- [x] Tabel users di Neon Postgres
- [x] Tabel progress dengan JSONB untuk balok/statistik/pencapaian
- [x] Form daftar: username, email, password, konfirmasi password
- [x] Ceklis wajib syarat & ketentuan + kebijakan privasi
- [x] Validasi server: format username, email, panjang password, konfirmasi cocok
- [x] Password di-hash bcrypt (10 rounds), tidak pernah disimpan mentah
- [x] Sesi cookie httpOnly + HMAC-SHA256, kedaluwarsa 30 hari
- [x] Perbandingan tanda tangan pakai timingSafeEqual
- [x] Login via username atau email
- [x] Logout
- [x] Halaman /ketentuan dan /privasi
- [x] Kredensial DB hanya di .env.local dan env Vercel — tidak pernah di repo publik
- [x] Akun uji kelayakan dengan progres maksimal tertanam
- [ ] Tombol Google login aktif (sekarang: segera hadir)
- [ ] Reset password lewat email
- [ ] Hapus akun dari halaman profil
- [ ] Rate limiting di endpoint login/daftar

## B. Simpan & Muat Progres
- [x] Autosave tiap 20 detik saat masuk akun
- [x] Simpan saat tab ditutup (pagehide + keepalive)
- [x] Balok yang dipasang tersimpan lengkap dengan warnanya
- [x] Statistik: balok pasang/bongkar, sihir, tunggangan, lompatan, jarak, malam
- [x] Progres tidak pernah mundur (merge max di server)
- [x] Pencapaian dihitung ulang di server (anti-curang sederhana)
- [ ] Beberapa slot dunia per akun
- [ ] Ekspor/impor dunia sebagai berkas

## C. Sistem Progres
- [x] 16 pencapaian dengan XP
- [x] Level 1–20 dari XP
- [x] 8 keahlian terbuka per level
- [x] 6 pahlawan dengan warna kostum berbeda
- [x] 8 peralatan terbuka per level
- [x] Toast pencapaian real-time di HUD
- [x] Panel pilih pahlawan (terkunci tampil dengan syarat levelnya)
- [x] 18 pencapaian (bertambah 2 dari menjinakkan satwa)
- [x] 11 misi cerita dengan hadiah XP, dihitung ulang di server
- [x] Efek gameplay nyata untuk kedelapan keahlian (sistem perk)
- [x] Halaman /profil lengkap dengan galeri pencapaian & statistik
- [ ] Efek gameplay nyata untuk tiap peralatan
- [ ] Pohon keahlian yang bisa dipilih sendiri

## D. Dunia & Gameplay
- [x] Dunia voxel 112x112 dengan noise dua oktaf
- [x] Bangun/bongkar balok 8 warna, maksimum 4000
- [x] 4 sihir: jembatan pelangi, bunga, kembang api, tumbuh pohon
- [x] Hewan peliharaan pengikut
- [x] Tunggangan yang bisa dinaiki
- [x] 8 satwa liar berkeliaran
- [x] Siklus siang-malam 120 detik + bintang langit
- [x] 24 bintang koleksi + layar kemenangan
- [x] Suara sintetis Web Audio (tanpa berkas audio)
- [x] Cerita utama + 6 NPC + 11 misi
- [x] Biome gurun & salju (ketinggian + peta suhu)
- [x] Desa: rumah kayu beratap daun di dekat tiap penduduk
- [x] Cuaca: cerah → hujan → pelangi, dengan peredupan matahari
- [x] Musik latar prosedural pentatonik (bisa dimatikan)
- [x] Balok bentuk baru: kaca, lampu menyala, setengah balok
- [x] Cetakan bangunan sekali tekan: rumah, menara, tangga, pagar
- [x] Jinakkan satwa liar jadi peliharaan pengikut (bertahan setelah muat ulang)
- [x] Multiplayer keluarga via kode yang diatur orang tua
- [ ] Gua bawah tanah (butuh tabrakan volumetrik, bukan peta ketinggian)
- [x] Salju turun di dataran tinggi (hujan berubah bentuk, bukan sistem kedua)
- [x] Sinkronisasi balok antar-pemain sekeluarga
- [x] Emote aman 6 lambang tetap, tanpa teks bebas
- [ ] Rumah desa masih tembus badan (dekoratif, disengaja agar anak tak tersangkut)

## E. Antarmuka
- [x] HUD: bintang, waktu, profil + level, palet warna, sihir, aksi
- [x] Joystick sentuh + tombol lompat untuk HP
- [x] Keyboard WASD + spasi + Q/E untuk laptop
- [x] Landing page dengan CTA main/daftar/masuk
- [x] Halaman daftar/masuk dengan pesan galat berbahasa manusia
- [x] Sambutan 4 langkah untuk pemain baru (sekali per perangkat, bisa dilewati)
- [x] HUD ringkas di layar HP: chip jadi ikon, palet turun ke baris kedua
- [x] Cetakan bangunan & bentuk balok masuk laci — **dulu menimpa joystick
      di HP portrait sehingga anak tidak bisa berjalan sama sekali**
- [x] Panel misi/pahlawan dibatasi tingginya + bisa digulir
- [x] **Kamera mouse: seret untuk melihat sekeliling, scroll untuk zoom.**
      Wajib untuk main di laptop — dulu kamera hanya bisa diputar tombol Q/E,
      anak yang terbiasa Roblox/Minecraft pasti bingung. Diuji di Chromium
      sungguhan: seret memutar yaw & pitch, tombol HUD tetap bisa diklik.
- [x] Mode layar penuh (tombol ⛶ di bar atas)
- [ ] Pengaturan: volume, sensitivitas kamera
- [ ] Kunci pointer (mouse look tanpa harus menahan seret)
- [ ] Kunci orientasi lanskap di HP

## F. Kualitas & Operasional
- [x] Build produksi lolos tanpa error TypeScript
- [x] Deploy Vercel produksi + verifikasi HTTP 200
- [x] **Vercel TIDAK auto-deploy dari GitHub.** Setelah `git push`, wajib jalankan
      `npx vercel --prod --yes` sendiri. Pernah membuat kerja sehari tidak live.
- [x] Repo publik GitHub tanpa satu pun rahasia
- [x] Panel orang tua /ortu untuk 12 akun anak, dijaga peran (403 untuk anak)
- [x] Batas waktu main harian yang benar-benar menghentikan permainan
- [x] Mutu grafis turun otomatis di perangkat lemah (bayangan, pixel ratio,
      jarak pandang, jumlah partikel hujan)
- [x] **Uji alur nyata di produksi lewat API** (2026-07-21): daftar → sesi →
      simpan → baca ulang, bentuk balok bertahan, misi/pencapaian dihitung
      server, main bersama (posisi + balok + emote) tersinkron antar dua akun,
      panel ortu menolak akun anak (403). Akun uji sudah dihapus.
- [ ] **Uji main sungguhan di HP — belum pernah.** Yang sudah terbukti hanya
      *datanya benar*, bukan *tampilannya benar*. Belum ada satu frame pun yang
      pernah dilihat manusia: salju, blueprint, tata letak HUD, gerak avatar.
- [ ] Pengukuran FPS di perangkat kelas bawah
- [ ] Pantau kuota Neon saat 12 anak online serentak (polling 2 detik)

## G. Panel Orang Tua & Main Bersama
- [x] Kolom peran akun: 'anak' (bawaan) / 'ortu'
- [x] Tabel progres 12 anak: level, bintang, pencapaian, misi, waktu main
- [x] Pencatatan waktu main total & harian (dibatasi 600 detik per simpanan)
- [x] Pengatur batas harian per anak (tanpa batas / 30 / 45 / 60 / 90 / 120 menit)
- [x] Kode keluarga hanya bisa diatur orang tua — anak tidak bisa mengetiknya
- [x] Main bersama tanpa obrolan teks; hanya posisi & nama yang dikirim
- [x] Kehadiran kedaluwarsa 15 detik supaya yang offline hilang sendiri
- [ ] Ringkasan mingguan per anak
- [ ] Notifikasi ke orang tua saat batas tercapai
