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
- [x] Efek nyata untuk kedelapan keahlian via sistem perk: lari cepat, lompat
      tinggi, jangkauan bangun, sihir ganda, mata elang (jarak kamera),
      kaki air (melaju di perairan dangkal), cahaya malam (lentera saat gelap).
- [ ] Pohon keahlian dengan poin yang bisa dipilih anak sendiri.
- [ ] Peralatan memengaruhi gameplay (palu batu bongkar lebih cepat, dsb.).

## Fase 5 (Hari 41–50) — Kreasi & Bangunan Lanjutan — SEBAGIAN
- [x] Cetakan bangunan sekali tekan: rumah, menara, tangga, pagar.
- [x] Balok bentuk baru: kaca (tembus pandang), lampu (menyala saat gelap),
      setengah balok. Masing-masing punya InstancedMesh sendiri.
- [ ] Balok tangga (bentuk miring).
- [ ] Galeri kreasi: simpan beberapa dunia per akun.

## Fase 6 (Hari 51–60) — Satwa & Peliharaan Lanjutan — SEBAGIAN
- [x] Jinakkan satwa liar: dekati lalu tekan "Jinakkan"; satwa jinak bertanda
      hati dan mengikuti pemain. Ada 2 pencapaian + 1 misi cerita.
- [x] Satwa jinak bertahan setelah muat ulang (dipulihkan dari statistik `tamed`).
- [ ] Kandang, memberi makan, kostum peliharaan.
- [ ] Tunggangan baru: terbang rendah, berenang.

## Fase 7 (Hari 61–70) — Musik & Suasana — SEBAGIAN
- [x] Musik latar prosedural (pentatonik, Web Audio, tanpa berkas audio),
      bisa dinyalakan/dimatikan dari HUD.
- [x] Cuaca: cerah → hujan → pelangi, lengkap dengan peredupan cahaya matahari.
- [ ] Musik berubah mengikuti waktu dan biome.
- [ ] Salju turun di biome salju.
- [ ] Efek suara langkah per jenis permukaan.

## Fase 8 (Hari 71–80) — Multiplayer Keluarga (aman) — SEBAGIAN
Dikerjakan **tanpa server WebSocket berbayar**: posisi disimpan di Neon Postgres
yang sudah ada, klien polling tiap 2 detik. Saudara terlihat bergerak dengan
jeda ~2 detik — cukup untuk main bangun bareng, tidak cukup untuk kejar-kejaran.
- [x] Kode keluarga diatur orang tua di /ortu; anak tidak bisa mengetiknya sendiri.
- [x] Avatar saudara muncul di dunia, bergerak halus (interpolasi).
- [x] Tanpa obrolan teks sama sekali — hanya posisi dan nama yang dikirim.
- [x] Polling mati sendiri kalau akun tidak punya kode, supaya hemat kuota database.
- [ ] Sinkronisasi balok antar-pemain (baru posisi pemain yang tersinkron).
- [ ] Emote dan stiker aman.
- [ ] **Risiko biaya:** 12 anak online serentak ≈ 6 permintaan/detik ke database.
      Perlu dipantau di dasbor Neon; kalau kuota gratis tekor, naikkan jeda
      polling ke 4-5 detik.

## Fase 9 (Hari 81–90) — Panel Orang Tua — SEBAGIAN
- [x] Dasbor /ortu: level, bintang, pencapaian, misi, dan waktu main tiap anak.
- [x] Pencatatan waktu main (dibatasi 600 detik per simpanan agar tidak dipalsukan).
- [x] Peran akun 'anak'/'ortu'; panel menolak akun anak dengan kode 403.
- [x] Batas waktu main harian yang benar-benar menghentikan permainan
      (dicek tiap simpanan; layar "Waktunya istirahat" muncul, progres aman).
- [x] Pengaturan batas per anak: tanpa batas / 30 / 45 / 60 / 90 / 120 menit.
- [ ] Login Google diaktifkan.

## Fase 10 (Hari 91–100) — Poles & Rilis Besar
- Optimasi performa (chunking dunia, LOD).
- Uji di perangkat kelas bawah.
- Perbaikan semua bug tercatat, audit keamanan.
- Rilis versi 1.0.

## Aturan kerja
- Setiap fitur: rancang → bangun → uji di HP & laptop → deploy → catat di CHECKLIST.md.
- Tidak ada fitur yang mengorbankan keamanan anak.
- Setiap deploy harus lolos build tanpa error TypeScript.
