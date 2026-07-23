# Kubantara

**Dunia 3D kubus terbuka yang aman untuk anak — dimainkan langsung dari peramban.**

Kubantara adalah sebuah pulau prosedural dari balok warna-warni tempat anak
membangun, merapal sihir, merawat peliharaan, menjelajah gua dan danau, lalu
mengumpulkan bintang saat langit berganti dari pagi ke malam. Tidak ada musuh,
tidak ada kekalahan, tidak ada iklan, tidak ada pembelian, dan tidak ada
obrolan dengan orang asing.

> **Pernyataan kami:** Anak berhak punya dunia digital yang membangun, bukan
> menakuti. Kubantara dirancang keras pada keamanan dan lembut pada anak —
> sebuah alternatif sehat dari game dewasa, yang bisa dibuka anak sekarang juga.

🎮 **Main sekarang:** [kubantara.vercel.app](https://kubantara.vercel.app)

---

## Mengapa aman untuk anak (4–12 tahun)

| Janji | Wujudnya |
| --- | --- |
| 🛡️ Tanpa kekerasan | Tidak ada senjata, darah, musuh, atau kondisi kalah. Anak tidak bisa gagal. |
| 💬 Tanpa obrolan orang asing | Nol kolom chat teks. Antar saudara hanya berbagi posisi + emote lambang tetap. |
| 🚫 Tanpa iklan & pembelian | Nol iklan, nol pop-up, nol tombol beli. |
| 🔒 Data anak dijaga | Tak butuh email anak, tak ada pelacak pihak ketiga, tak ada data dijual. |

---

## Yang bisa dilakukan anak

- **Bangun & bongkar** — 8 warna × 4 bentuk balok (kubus, kaca, lampu, setengah),
  plus cetakan sekali-tekan (rumah, menara, tangga, pagar).
- **Empat sihir warna** — tumbuhkan pohon, tebar bunga pelangi, bentang jembatan,
  luncurkan kembang api.
- **Peliharaan & tunggangan** — beri makan, pakaikan topi kostum, jinakkan satwa
  liar, dan naiki tunggangan untuk melaju cepat.
- **Jelajah dunia hidup** — gua batu berkristal, danau beriak, hutan lebat,
  puncak salju; siklus pagi–siang–malam; cuaca cerah/hujan/pelangi/salju.
- **Teleport** — jalan pintas ke titik awal, desa, hutan, danau, gua, puncak salju.
- **Kumpulkan 24 bintang** — sebagian tersembunyi di dalam gua untuk memancing
  eksplorasi.
- **Main bersama saudara** — kode keluarga yang sama membuat kakak-adik saling
  terlihat dan membangun bersama.

## Untuk orang tua

Panel orang tua bawaan (`/ortu`, khusus akun berperan `ortu`):

- **Batas waktu harian** per anak — saat habis, muncul layar "Waktunya istirahat".
- **Dasbor kemajuan** — level, bintang, pencapaian, dan total waktu main.
- **Kode keluarga** — hanya diatur orang tua; menentukan siapa boleh bermain bersama.
- **Reset sandi** — pulihkan sandi anak yang lupa dalam sekali klik, tanpa email;
  sekaligus membuka kunci akun.
- **Anti tebak-paksa** — akun terkunci 60 detik setelah 5 kali salah sandi.

---

## Menjalankan di komputer sendiri

```bash
npm install
npm run dev       # buka http://localhost:3000
```

Butuh satu variabel lingkungan di `.env.local`:

```
DATABASE_URL=postgres://...   # Neon Postgres (serverless)
```

Skema dibuat otomatis saat permintaan pertama (`lib/db.ts`).

### Build & deploy

```bash
npm run build
npx vercel --prod --yes       # deploy manual ke Vercel
```

## Kontrol

- **Laptop:** W A S D berjalan · Spasi lompat · seret mouse melihat sekeliling ·
  scroll zoom · tombol 🖱️ untuk kunci-pointer mode lihat-bebas · Q/E memutar kamera.
- **Ponsel/tablet:** joystick kiri berjalan · tombol besar kanan melompat.

## Arsitektur

- **Next.js 16** (App Router, Turbopack) + **Tailwind CSS** + **Framer Motion**.
- **Three.js** untuk dunia voxel — `InstancedMesh` per jenis/bentuk balok, terrain
  dari value noise, air & awan beranimasi, tone mapping ACES, bayangan lembut.
- **Web Audio** untuk seluruh suara & musik (prosedural, tanpa berkas audio) —
  langkah kaki, sihir, dan musik yang berganti suasana siang/malam.
- **Neon Postgres** (serverless) + **bcryptjs** untuk akun, dengan sesi cookie
  httpOnly bertanda tangan HMAC-SHA256.
- **Multiplayer keluarga** lewat polling posisi (tanpa WebSocket, tanpa obrolan).

Seluruh kode asli. Tidak ada aset pihak ketiga: setiap grafik, suara, dan not
musik dibangkitkan langsung di peramban.

## Peta kode singkat

| Berkas | Isi |
| --- | --- |
| `lib/voxel-game.ts` | Mesin dunia 3D: terrain, gua, air, hewan, sihir, kamera. |
| `lib/sound.ts` · `lib/music.ts` | Efek suara & musik prosedural (Web Audio). |
| `app/play/page.tsx` | HUD permainan & sinkronisasi progres. |
| `app/page.tsx` | Halaman muka. |
| `app/ortu/` · `app/api/ortu/` | Panel & API orang tua. |
| `lib/db.ts` · `lib/auth.ts` | Skema database & sesi login. |

## Lisensi

Kode sumber terbuka dan bebas dipakai ulang.
