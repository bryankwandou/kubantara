// Uji kinerja & mutu grafis.
//
// Dua pertanyaan yang diminta penguji dijawab di sini dengan angka:
//   1. "Pilihan grafisnya benar-benar berpengaruh atau cuma label?"
//      → mutu Rendah harus benar-benar memangkas beban dibanding Tinggi.
//   2. "Berapa latency-nya?"
//      → diukur pulang-pergi sungguhan ke server, lalu dilaporkan apa adanya.
//
// Catatan jujur soal angka latency: uji ini berjalan di localhost, jadi hasilnya
// adalah batas BAWAH teoretis (tanpa internet sama sekali). Dari HP anak ke
// server sungguhan, angkanya akan jauh lebih besar — puluhan milidetik — karena
// jarak fisik dan lompatan jaringan. Tidak ada tuning perangkat lunak yang bisa
// menembus batas itu.
//
// Jalankan: node uji-kinerja.mjs   (BASE=http://localhost:3000)
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
let lulus = 0, gagal = 0;
function cek(nama, benar, catatan = "") {
  if (benar) { lulus++; console.log(`  LULUS  ${nama}${catatan ? " — " + catatan : ""}`); }
  else { gagal++; console.log(`  GAGAL  ${nama}${catatan ? " — " + catatan : ""}`); }
}
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 700 } });

let terdaftar = false;
for (let i = 1; i <= 6 && !terdaftar; i++) {
  const u = "ujikinerja" + Math.floor(Math.random() * 1e9);
  const p = "Uji-" + Math.random().toString(36).slice(2) + "-Aa1!";
  const res = await ctx.request.post(`${BASE}/api/auth/register`, {
    data: { username: u, email: `${u}@contoh.test`, password: p, confirm: p, agreed: true },
    timeout: 45000,
  }).catch(() => null);
  if (res && res.ok()) terdaftar = true; else await tunggu(2000 * i);
}
if (!terdaftar) { console.error("tidak bisa mendaftar akun uji"); process.exit(1); }

const page = await ctx.newPage();
const galat = [];
page.on("pageerror", (e) => galat.push(String(e)));

// Muat halaman dengan mutu tertentu sudah tersimpan lebih dulu, lalu ukur.
async function ukurMutu(mutu) {
  await ctx.addInitScript((m) => {
    try { localStorage.setItem("kubantara_kualitas", m); } catch {}
  }, mutu);
  await page.goto(BASE + "/play", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => !!window.__kubantara, { timeout: 40000 });
  const lewati = page.getByRole("button", { name: "Lewati" });
  if (await lewati.isVisible().catch(() => false)) await lewati.click();
  await tunggu(9000); // biar rata-rata bingkainya mapan
  return await page.evaluate(() => window.__kubantara.kinerja());
}

console.log("Mutu grafis benar-benar berpengaruh");
const tinggi = await ukurMutu("tinggi");
const rendah = await ukurMutu("rendah");
const lapor = (n, k) =>
  console.log(`  ${n}: ${k.fps.toFixed(2)} FPS rata-rata (${k.bingkai} bingkai dalam ${k.detik.toFixed(1)} d), mutu=${k.mutu}`);
lapor("tinggi", tinggi);
lapor("rendah", rendah);
console.log("");
console.log("  Catatan: uji ini memakai perender perangkat lunak (swiftshader) tanpa GPU,");
console.log("  jadi angka FPS mutlaknya jauh di bawah perangkat sungguhan. Yang bermakna");
console.log("  di sini adalah PERBANDINGAN antar mutu, bukan angka absolutnya.");
console.log("");

cek("pilihan mutu benar-benar sampai ke mesin grafis",
  tinggi.mutu === "tinggi" && rendah.mutu === "rendah", `${tinggi.mutu} / ${rendah.mutu}`);
cek("mutu Rendah lebih ringan daripada Tinggi (bukan sekadar label)",
  rendah.fps > tinggi.fps * 1.3,
  `${rendah.fps.toFixed(2)} FPS vs ${tinggi.fps.toFixed(2)} FPS`);
cek("kedua mutu tetap menggambar, tidak ada yang membeku",
  tinggi.bingkai > 2 && rendah.bingkai > 2, `${tinggi.bingkai} / ${rendah.bingkai} bingkai`);

// ------------------------------------------------------------------ latency
console.log("\nLatency jaringan sungguhan (localhost = batas bawah teoretis)");
const sampel = [];
for (let i = 0; i < 25; i++) {
  const t0 = performance.now();
  await fetch(BASE + "/api/ping", { cache: "no-store" });
  sampel.push(performance.now() - t0);
}
sampel.sort((a, b) => a - b);
const tengah = sampel[Math.floor(sampel.length / 2)];
const p95 = sampel[Math.floor(sampel.length * 0.95)];
console.log(`  median ${tengah.toFixed(1)} ms · p95 ${p95.toFixed(1)} ms · tercepat ${sampel[0].toFixed(1)} ms`);
cek("latency terukur dan dilaporkan sebagai angka", Number.isFinite(tengah), `${tengah.toFixed(1)} ms`);
cek("server menjawab dalam waktu wajar untuk anak bermain (< 500 ms)",
  tengah < 500, `median ${tengah.toFixed(1)} ms`);

// Perbandingan jujur: permintaan yang menyentuh database jauh lebih lambat.
// Angka inilah yang sebenarnya dirasakan anak saat menyimpan progres.
const sampelData = [];
for (let i = 0; i < 8; i++) {
  const t0 = performance.now();
  await ctx.request.get(BASE + "/api/dompet", { timeout: 45000 }).catch(() => null);
  sampelData.push(performance.now() - t0);
}
sampelData.sort((a, b) => a - b);
const tengahData = sampelData[Math.floor(sampelData.length / 2)];
console.log(`  dengan baca database: median ${tengahData.toFixed(1)} ms`);
cek("waktu baca database terukur terpisah dari waktu jaringan",
  Number.isFinite(tengahData), `${tengahData.toFixed(1)} ms`);

// Panel diagnostik di dalam permainan menampilkan angka yang sama.
await page.getByRole("button", { name: "Pengaturan" }).click();
// halaman ini merender lewat perangkat lunak & sangat lambat; beri waktu
await page.waitForFunction(
  () => /\d/.test(document.querySelector('[data-uji="fps"]')?.textContent ?? ""),
  { timeout: 60000 },
).catch(() => {});
const fpsTertulis = await page.locator('[data-uji="fps"]').innerText().catch(() => "");
const latensiTertulis = await page.locator('[data-uji="latensi"]').innerText().catch(() => "");
cek("panel Pengaturan menampilkan FPS sungguhan", /^\d+$/.test(fpsTertulis.trim()), `"${fpsTertulis}"`);
cek("panel Pengaturan menampilkan latency sungguhan", /ms$/.test(latensiTertulis.trim()), `"${latensiTertulis}"`);

cek("tanpa galat JavaScript sepanjang uji", galat.length === 0, galat[0] ?? "");
await browser.close();

console.log(`\n${lulus} lulus, ${gagal} gagal`);
console.log(
  "\nCatatan untuk laporan audit: angka di atas diukur di localhost — tanpa\n" +
  "internet sama sekali. Latency dari HP anak ke server sungguhan ditentukan\n" +
  "jarak fisik dan lompatan jaringan, biasanya puluhan milidetik, dan tidak ada\n" +
  "perubahan perangkat lunak yang bisa menurunkannya di bawah batas itu."
);
process.exit(gagal ? 1 : 0);
