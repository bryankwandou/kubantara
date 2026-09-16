// Uji minimap.
// Yang dibuktikan:
//   • minimap benar-benar tergambar, bukan kotak kosong
//   • isinya peta dunia sungguhan (banyak warna berbeda: rumput, pasir, air…)
//   • gambarnya ikut berubah saat pemain berpindah tempat
//   • tombol "Peta besar" benar-benar memperbesar
//   • tombol jarak pandang benar-benar mengganti tingkat perbesaran
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
let lulus = 0, gagal = 0;
const cek = (nama, ok, ket = "") => {
  if (ok) { lulus++; console.log("  LULUS ", nama, ket ? "— " + ket : ""); }
  else { gagal++; console.log("  GAGAL ", nama, ket ? "— " + ket : ""); }
};
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 700 } });
const u = "peta" + Math.floor(Math.random() * 1e9), pw = "Uji-" + Math.random().toString(36).slice(2) + "-Aa1!";
// Pendaftaran kadang lambat sekali saat basis datanya baru bangun, jadi
// dicoba beberapa kali dengan jeda yang makin panjang — bukan langsung menyerah.
let terdaftar = false;
for (let i = 1; i <= 6 && !terdaftar; i++) {
  const res = await ctx.request.post(BASE + "/api/auth/register", {
    data: { username: u, email: u + "@contoh.test", password: pw, confirm: pw, agreed: true },
    timeout: 120000,
  }).catch(() => null);
  if (res && res.ok()) terdaftar = true; else await tunggu(2000 * i);
}
if (!terdaftar) { console.error("tidak bisa mendaftar akun uji"); process.exit(1); }
const page = await ctx.newPage();
const galat = [];
page.on("pageerror", (e) => galat.push(String(e)));

// Klik lewat DOM: pemeriksaan "stabil" Playwright menunggu requestAnimationFrame,
// dan loop render game membuatnya kelaparan di perender perangkat lunak.
const tekan = (sel) => page.evaluate((s) => document.querySelector(s)?.click(), sel);
const tekanTeks = (t) => page.evaluate((x) => {
  [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === x)?.click();
}, t);

// Ringkasan isi kanvas minimap: berapa banyak warna berbeda, dan sidik jarinya.
const bacaKanvas = () => page.evaluate(() => {
  const c = document.querySelector('[data-uji="minimap-kanvas"]');
  const x = c.getContext("2d");
  const d = x.getImageData(0, 0, c.width, c.height).data;
  const warna = new Set();
  let jml = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    warna.add((d[i] >> 4) + "," + (d[i + 1] >> 4) + "," + (d[i + 2] >> 4));
    jml += d[i] * 3 + d[i + 1] * 5 + d[i + 2] * 7;
  }
  return { warna: warna.size, sidik: jml, sisi: c.width };
});

await page.goto(BASE + "/play", { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForFunction(() => !!window.__kubantara, { timeout: 180000 });
const selubung = page.locator('[class*="inset-0"][class*="z-40"]');
await selubung.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
for (let i = 0; i < 12 && (await selubung.count()); i++) { await tekanTeks("Lewati"); await tunggu(1200); }
await tunggu(5000);

console.log("Minimap tampil dan berisi peta sungguhan");
{
  cek("kanvas minimap ada di layar",
    (await page.locator('[data-uji="minimap-kanvas"]').count()) === 1);
  const a = await bacaKanvas();
  cek("minimap tidak kosong", a.sidik > 0, `sidik=${a.sidik}`);
  cek("berisi banyak warna berbeda, bukan satu blok polos", a.warna >= 6, `${a.warna} warna`);
}

console.log("");
console.log("Peta ikut bergerak bersama pemain");
{
  const sebelum = await bacaKanvas();
  await page.evaluate(() => window.__kubantara.taruhDiUdara(-70, -70, 2));
  // Ditunggu berdasarkan keadaan, bukan jeda tetap. Peta digambar ulang 6x per
  // detik, tapi di perender perangkat lunak yang sedang sibuk satu detak bisa
  // tertunda jauh lebih lama — jeda tetap membuat uji ini gagal padahal petanya
  // sebetulnya bergerak.
  let sesudah = sebelum;
  for (let i = 0; i < 60 && sesudah.sidik === sebelum.sidik; i++) {
    await tunggu(500);
    sesudah = await bacaKanvas();
  }
  cek("gambar peta berubah setelah pemain pindah jauh",
    sesudah.sidik !== sebelum.sidik, `${sebelum.sidik} → ${sesudah.sidik}`);
}

console.log("");
console.log("Peta bisa diperbesar");
{
  const kecil = (await bacaKanvas()).sisi;
  await tekan('[data-uji="minimap-perbesar"]');
  await tunggu(1500);
  const besar = (await bacaKanvas()).sisi;
  cek("tombol Peta besar benar-benar memperbesar petanya", besar > kecil, `${kecil}px → ${besar}px`);
  const isi = await bacaKanvas();
  cek("peta besar juga tergambar, bukan kosong", isi.sidik > 0 && isi.warna >= 6, `${isi.warna} warna`);
  await tekan('[data-uji="minimap-perbesar"]');
  await tunggu(1200);
  cek("bisa ditutup kembali ke ukuran kecil", (await bacaKanvas()).sisi === kecil);
}

console.log("");
console.log("Jarak pandang peta bisa diganti");
{
  const label = () => page.locator('[data-uji="minimap-zoom"]').innerText();
  const awal = await label();
  const gambarAwal = (await bacaKanvas()).sidik;
  await tekan('[data-uji="minimap-zoom"]');
  await tunggu(1500);
  cek("label jarak pandang berganti", (await label()) !== awal, `${awal} → ${await label()}`);
  cek("gambar petanya ikut berganti skala", (await bacaKanvas()).sidik !== gambarAwal);
}

cek("tanpa galat JavaScript", galat.length === 0, galat[0] ?? "");
await browser.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
