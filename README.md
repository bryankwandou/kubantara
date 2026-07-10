# Kubantara

Dunia kubus terbuka untuk anak, dimainkan langsung dari peramban. Sebuah pulau
prosedural berisi bukit, pantai, danau, dan pepohonan yang seluruhnya tersusun
dari balok warna-warni. Tugas pemain sederhana: berjalan, melompat, dan
menemukan dua puluh bintang emas yang tersebar di seluruh pulau. Tidak ada
musuh, tidak ada kekalahan, tidak ada iklan maupun pembelian apa pun.

## Cara menjalankan di komputer sendiri

```bash
npm install
npm run dev
```

Lalu buka http://localhost:3000. Halaman utama berisi pengantar, tombol kuning
membawa ke arena main di `/play`.

## Kontrol

- Laptop: W A S D untuk berjalan, spasi untuk melompat, Q dan E memutar kamera.
- Ponsel dan tablet: lingkaran kiri untuk berjalan, tombol besar kanan untuk melompat.

## Teknologi

- Next.js dengan App Router dan Tailwind CSS
- Three.js untuk dunia voxel (InstancedMesh per jenis balok, terrain dari value noise)
- Framer Motion untuk animasi halaman muka

Seluruh kode asli dan bebas dipakai ulang. Tidak ada aset pihak ketiga.
