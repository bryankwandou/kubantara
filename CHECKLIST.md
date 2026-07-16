# Kubantara — Checklist Induk Pengembangan

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
- [ ] Efek gameplay nyata untuk tiap keahlian
- [ ] Efek gameplay nyata untuk tiap peralatan
- [ ] Halaman profil lengkap dengan galeri pencapaian

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
- [ ] Cerita utama + NPC + misi
- [ ] Biome gurun/salju/hutan lebat
- [ ] Gua bawah tanah
- [ ] Cuaca (hujan, salju, pelangi)
- [ ] Musik latar prosedural
- [ ] Balok bentuk baru (tangga, kaca, lampu)
- [ ] Multiplayer keluarga via kode undangan

## E. Antarmuka
- [x] HUD: bintang, waktu, profil + level, palet warna, sihir, aksi
- [x] Joystick sentuh + tombol lompat untuk HP
- [x] Keyboard WASD + spasi + Q/E untuk laptop
- [x] Landing page dengan CTA main/daftar/masuk
- [x] Halaman daftar/masuk dengan pesan galat berbahasa manusia
- [ ] Tutorial interaktif untuk pemain baru
- [ ] Pengaturan: volume, sensitivitas kamera
- [ ] Mode layar penuh

## F. Kualitas & Operasional
- [x] Build produksi lolos tanpa error TypeScript
- [x] Deploy Vercel produksi + verifikasi HTTP 200
- [x] Repo publik GitHub tanpa satu pun rahasia
- [ ] Uji manual di HP Android sungguhan (perlu tangan manusia)
- [ ] Pengukuran FPS di perangkat kelas bawah
- [ ] Panel orang tua untuk 12 akun anak
- [ ] Batas waktu main harian
