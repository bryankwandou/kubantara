# Kubantara — Rencana Pengembangan 100 Hari

Target: dari MVP menjadi game open-world web kelas AAA yang aman untuk anak, dengan cerita, dunia luas, dan sistem progres yang dalam. Setiap fase 10 hari, setiap fase diakhiri deploy produksi.

## Fase 1 (Hari 1–10) — Fondasi Akun & Progres — SELESAI
- Database Neon Postgres, tabel users + progress.
- Daftar (username, email, password, konfirmasi, ceklis S&K + privasi), masuk, keluar.
- Autosave dunia (balok, bintang, statistik) tiap 20 detik dan saat tab ditutup.
- Sistem XP/level, 16 pencapaian, 8 keahlian, 6 pahlawan, 8 peralatan.
- Akun uji kelayakan dengan progres maksimal.
- Login Google: segera hadir.

## Fase 2 (Hari 11–20) — Cerita & Misi — SELESAI
- [x] Alur cerita utama: "Bintang-bintang Kubantara padam, kembalikan cahayanya."
- [x] 6 NPC kubus dengan dialog ramah anak, terdeteksi otomatis saat didekati.
- [x] Sistem misi: 10 misi cerita, progres dihitung di server, hadiah XP.
- [x] Jurnal petualangan di HUD (tombol "Misi") dan di halaman /profil.
- [ ] Sisa 4 NPC agar genap 10 (dipindah ke Fase 3 bersama desa).

## Fase 3 (Hari 21–30) — Dunia Lebih Luas — SEBAGIAN
- [x] Biome gurun & salju (berdasar ketinggian + peta suhu).
- [x] Desa: rumah kayu beratap daun di dekat tiap penduduk.
- [ ] Gua dan terowongan bawah tanah — butuh tabrakan volumetrik, bukan peta
      ketinggian seperti sekarang. Dijadwalkan ulang setelah Fase 5.
- [ ] Danau besar & hutan lebat.
- [ ] Teleport antar-titik yang sudah ditemukan.

## Fase 4 (Hari 31–40) — Sistem Keahlian Aktif — SEBAGIAN
- [x] Efek nyata 5 keahlian via sistem perk: lari cepat, lompat tinggi,
      jangkauan bangun, sihir ganda, mata elang (jarak kamera).
- [ ] Keahlian kaki-air & cahaya-malam.
- [ ] Pohon keahlian dengan poin yang bisa dipilih anak sendiri.
- [ ] Peralatan memengaruhi gameplay (palu batu bongkar lebih cepat, dsb.).

## Fase 5 (Hari 41–50) — Kreasi & Bangunan Lanjutan
- Balok bentuk baru: tangga, setengah balok, kaca, lampu.
- Cetakan bangunan (blueprint) sekali tekan.
- Galeri kreasi: simpan beberapa dunia per akun.

## Fase 6 (Hari 51–60) — Satwa & Peliharaan Lanjutan
- Jinakkan satwa liar jadi peliharaan baru.
- Kandang, memberi makan, kostum peliharaan.
- Tunggangan baru: terbang rendah, berenang.

## Fase 7 (Hari 61–70) — Musik & Suasana — SEBAGIAN
- [x] Musik latar prosedural (pentatonik, Web Audio, tanpa berkas audio),
      bisa dinyalakan/dimatikan dari HUD.
- [x] Cuaca: cerah → hujan → pelangi, lengkap dengan peredupan cahaya matahari.
- [ ] Musik berubah mengikuti waktu dan biome.
- [ ] Salju turun di biome salju.
- [ ] Efek suara langkah per jenis permukaan.

## Fase 8 (Hari 71–80) — Multiplayer Keluarga (aman)
- Main bersama saudara di dunia yang sama (hanya lewat kode undangan keluarga).
- Tanpa obrolan teks bebas — hanya emote dan stiker aman.
- Sinkronisasi posisi dan balok via WebSocket.

## Fase 9 (Hari 81–90) — Panel Orang Tua
- Dasbor orang tua: waktu main, progres tiap anak (12 akun).
- Batas waktu main harian yang bisa diatur.
- Login Google diaktifkan.

## Fase 10 (Hari 91–100) — Poles & Rilis Besar
- Optimasi performa (chunking dunia, LOD).
- Uji di perangkat kelas bawah.
- Perbaikan semua bug tercatat, audit keamanan.
- Rilis versi 1.0.

## Aturan kerja
- Setiap fitur: rancang → bangun → uji di HP & laptop → deploy → catat di CHECKLIST.md.
- Tidak ada fitur yang mengorbankan keamanan anak.
- Setiap deploy harus lolos build tanpa error TypeScript.
