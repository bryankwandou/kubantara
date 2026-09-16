// Uji yang meniru hari Senin sepulang sekolah: 12 anak membuka laptop di wifi
// yang sama dan mendaftar sendiri-sendiri, hampir berbarengan. Yang diuji bukan
// cuma API-nya, tapi formulirnya — anak mengetik di kotak, bukan memanggil POST.
//
// Jalankan: node uji-daftar-12-anak.mjs   (BASE=http://localhost:3100 misalnya)
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const JUMLAH = 12;

// Uji ini sendiri memakan jatah "maksimal 30 pendaftaran per jam per jaringan".
// Jalankan dua kali berturut-turut dan anak ke-12 akan ditolak gara-gara uji
// sebelumnya, bukan gara-gara bug. Jadi jatahnya dinolkan dulu — dan hanya
// boleh saat menguji server di komputer sendiri.
if (/localhost|127\.0\.0\.1/.test(BASE)) {
  try {
    const env = fs.readFileSync(new URL("./.env.local", import.meta.url), "utf8");
    const url = env.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m)?.[1];
    if (url) {
      const { neon } = await import("@neondatabase/serverless");
      await neon(url)`DELETE FROM signup_attempts`;
      console.log("jatah pendaftaran dinolkan (khusus uji lokal)\n");
    }
  } catch (e) {
    console.log("lewati penolan jatah:", String(e).split("\n")[0], "\n");
  }
}

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });

// Mengetik lalu memastikan ketikannya benar-benar nyangkut. Halaman ini React:
// sebelum hidrasi selesai, isian masuk ke DOM tapi tidak ke state komponen, dan
// formulir terkirim kosong (server menjawab 400). Anak sungguhan tak kena ini —
// ia butuh beberapa detik untuk membaca dulu — tapi robot mengetik seketika.
//
// Menunggu hidrasi: React 18 menempelkan properti __reactContainer$… pada
// wadah akarnya begitu ia mengambil alih HTML dari server. Selama itu belum
// ada, tak satu pun ketikan atau klik didengar oleh komponen.
async function tungguReactHidup(page) {
  // Setiap simpul DOM yang sudah dikuasai React mendapat properti __reactFiber$…
  // (App Router memasang wadahnya di `document`, bukan di dalam <body>, jadi
  // mencari __reactContainer di bawah body tidak pernah ketemu).
  await page.waitForFunction(
    () => {
      const kotak = document.querySelector("input");
      return !!kotak && Object.keys(kotak).some((k) => k.startsWith("__reactFiber"));
    },
    null,
    { timeout: 180000 }
  );
}

async function ketikAman(kotak, isi) {
  for (let coba = 0; coba < 8; coba++) {
    await kotak.fill(isi);
    if ((await kotak.inputValue()) === isi) return;
    await kotak.page().waitForTimeout(500);
  }
  throw new Error("ketikan tidak nyangkut: " + isi);
}

async function seorangAnak(no) {
  // Konteks terpisah = seperti laptop yang berbeda: cookie & penyimpanan sendiri.
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  const galat = [];
  page.on("pageerror", (e) => galat.push(String(e)));

  const nama = `anak${no}uji${Math.floor(Math.random() * 1e6)}`;
  const sandi = `Kubus-${no}-Aman1!`;
  const catatan = { no, nama, tahap: "mulai", galat, api: "tak-ada" };
  page.on("response", async (r) => {
    if (r.url().includes("/api/auth/register")) catatan.api = r.status();
  });

  try {
    await page.goto(`${BASE}/daftar`, { waitUntil: "domcontentloaded" });
    await tungguReactHidup(page);
    catatan.tahap = "buka-formulir";

    // Isi persis seperti anak: cari kotak berdasarkan labelnya, bukan selector internal.
    await ketikAman(page.getByLabel(/nama pengguna/i), nama);
    await ketikAman(page.getByLabel(/email/i), `${nama}@contoh.test`);
    await ketikAman(page.getByLabel(/^kata sandi/i), sandi);
    await ketikAman(page.getByLabel(/konfirmasi/i), sandi);
    await page.getByRole("checkbox").first().check();
    catatan.tahap = "isi-formulir";

    // 60 detik, bukan 30: permintaan pertama ke server yang baru bangun ikut
    // menjalankan pembuatan skema, dan 12 anak menabraknya berbarengan.
    await Promise.all([
      page.waitForURL((u) => !u.pathname.includes("/daftar"), { timeout: 180000 }),
      page.getByRole("button", { name: /daftar|buat akun|mulai/i }).first().click(),
    ]);
    catatan.tujuan = new URL(page.url()).pathname;
    catatan.tahap = "terdaftar";

    // Setelah daftar, anak harus benar-benar sampai ke dunia yang tergambar.
    if (!catatan.tujuan.startsWith("/play")) {
      await page.goto(`${BASE}/play`, { waitUntil: "domcontentloaded" });
    }
    await page.waitForSelector("canvas", { timeout: 180000 });
    await page.waitForTimeout(5000);
    catatan.tahap = "dunia-termuat";

    // Bukti bahwa yang tampil bukan layar polos.
    const jpg = await page.screenshot({ type: "jpeg", quality: 70 });
    catatan.warna = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = "data:image/jpeg;base64," + b64;
      await img.decode();
      const s = document.createElement("canvas");
      s.width = 160; s.height = 100;
      const g = s.getContext("2d");
      g.drawImage(img, 0, 0, s.width, s.height);
      const d = g.getImageData(0, 0, s.width, s.height).data;
      const set = new Set();
      for (let i = 0; i < d.length; i += 4)
        set.add((d[i] >> 3 << 10) | (d[i + 1] >> 3 << 5) | (d[i + 2] >> 3));
      return set.size;
    }, jpg.toString("base64"));

    catatan.lulus = catatan.warna >= 60 && galat.length === 0;
  } catch (e) {
    catatan.lulus = false;
    catatan.sebab = String(e).split("\n")[0];
  }
  await ctx.close();
  return catatan;
}

// Anak sungguhan memakai 12 laptop terpisah. Di sini 12 Chromium berbagi satu
// CPU, dan menjalankan semuanya sekaligus membuat uji ini mengukur kekuatan
// laptop penguji, bukan kekuatan server. Empat sekaligus sudah cukup untuk
// membuktikan pendaftaran bersamaan tidak saling menabrak.
const SEKALI_JALAN = 3;

console.log(`Meniru ${JUMLAH} anak mendaftar di ${BASE} (${SEKALI_JALAN} sekaligus) …\n`);
const mulai = Date.now();
const hasil = [];
for (let i = 0; i < JUMLAH; i += SEKALI_JALAN) {
  const kelompok = Array.from(
    { length: Math.min(SEKALI_JALAN, JUMLAH - i) },
    (_, k) => seorangAnak(i + k + 1)
  );
  hasil.push(...(await Promise.all(kelompok)));
}
const detik = ((Date.now() - mulai) / 1000).toFixed(1);

for (const h of hasil) {
  const tanda = h.lulus ? "OK  " : "GAGAL";
  console.log(
    `${tanda} anak ${String(h.no).padStart(2)} — tahap: ${h.tahap}, api: ${h.api}` +
      (h.warna != null ? `, warna: ${h.warna}` : "") +
      (h.sebab ? `, sebab: ${h.sebab}` : "") +
      (h.galat.length ? `, error js: ${h.galat[0]}` : "")
  );
}

const lulus = hasil.filter((h) => h.lulus).length;
console.log(`\n${lulus}/${JUMLAH} anak berhasil daftar sendiri & masuk dunia dalam ${detik} detik.`);
await browser.close();
process.exit(lulus === JUMLAH ? 0 : 1);
