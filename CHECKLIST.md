# Kubantara — Checklist Induk Pengembangan

## Sisa pekerjaan, urut dampak ke anak (per 2026-07-21)

**Menghalangi anak main hari ini**
1. Akun 12 anak belum dibuat — jalankan `node scripts/buat-akun-anak.mjs`.
2. Belum pernah dimainkan manusia di HP sungguhan.

**Terasa cepat kalau kurang**
3. Peralatan (8 item) masih hiasan — belum mengubah gameplay sama sekali.
4. Tidak ada pengaturan volume; musik hanya bisa nyala/mati.
5. Mouse look masih perlu menahan seret; belum ada kunci-pointer gaya FPS.

**Membuat dunia terasa lebih hidup**
6. Gua & terowongan (butuh tabrakan volumetrik — perombakan mesin fisika).
7. Danau besar, hutan lebat, teleport antar-titik.
8. Musik berubah mengikuti waktu & biome; suara langkah per permukaan.
9. Kandang, memberi makan, kostum peliharaan; tunggangan terbang/berenang.

**Kenyamanan jangka panjang**
10. Login Google (butuh Client ID & Secret dari Google Cloud milik user).
11. Reset kata sandi lewat email; hapus akun sendiri.
12. Rate limiting di endpoint daftar/masuk.
13. Beberapa slot dunia per akun; ekspor/impor dunia.
14. Ringkasan mingguan & notifikasi untuk orang tua.


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
