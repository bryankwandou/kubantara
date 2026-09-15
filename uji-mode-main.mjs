// Uji dua cara main: Santai dan Petualangan (dengan nyawa).
//
// Yang dibuktikan:
//   • mode Santai benar-benar tanpa bahaya — jatuh setinggi apa pun tidak sakit
//   • mode Petualangan mengurangi nyawa saat jatuh tinggi, tapi tidak saat
//     jatuh pendek atau melompat biasa
//   • nyawa habis TIDAK menghapus apa pun; anaknya cuma pindah ke tempat aman
//   • nyawa pulih sendiri tanpa harus mencari ramuan
//   • bar nyawa hanya tampil di mode Petualangan
//
// Jalankan: node uji-mode-main.mjs   (BASE=http://localhost:3000)
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
  const u = "ujimode" + Math.floor(Math.random() * 1e9);
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
await page.goto(BASE + "/play", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => !!window.__kubantara, { timeout: 120000 });
const lewati = page.getByRole("button", { name: "Lewati" });
for (let i = 0; i < 20; i++) {
  if (await lewati.isVisible().catch(() => false)) await lewati.click().catch(() => {});
  else if (i > 2) break;
  await tunggu(500);
}
await tunggu(1500);

// Menjatuhkan pemain dari ketinggian tertentu, lalu menunggu sampai mendarat.
// Perender perangkat lunak sangat lambat, jadi mendaratnya ditunggu berdasarkan
// keadaan — bukan berdasarkan jeda tetap yang bisa meleset.
async function jatuhkanDari(tinggi) {
  await page.evaluate((t) => {
    const g = window.__kubantara;
    const p = g.posisi();
    g.taruhDiUdara(p.x, p.z, t);
  }, tinggi);
  for (let i = 0; i < 200; i++) {
    const mendarat = await page.evaluate(() => window.__kubantara.diTanah());
    if (mendarat) return true;
    await tunggu(100);
  }
  return false;
}

console.log("Mode Santai: membangun tanpa bahaya apa pun");
await page.evaluate(() => window.__kubantara.setMode("santai"));
{
  const m = await page.evaluate(() => window.__kubantara.getNyawa());
  cek("mode santai aktif", m.mode === "santai", m.mode);
  const mendarat = await jatuhkanDari(30);
  cek("pemain benar-benar mendarat setelah dijatuhkan", mendarat);
  const sesudah = await page.evaluate(() => window.__kubantara.getNyawa());
  cek("jatuh 30 satuan tidak mengurangi nyawa sama sekali di mode santai",
    sesudah.nyawa === sesudah.maks, `${sesudah.nyawa}/${sesudah.maks}`);
  cek("bar nyawa tidak ditampilkan di mode santai",
    !(await page.locator('[data-uji="nyawa"]').isVisible().catch(() => false)));
}

console.log("");
console.log("Mode Petualangan: jatuh tinggi mengurangi nyawa");
await page.evaluate(() => window.__kubantara.setMode("petualangan"));
{
  const m = await page.evaluate(() => window.__kubantara.getNyawa());
  cek("mode petualangan aktif dengan nyawa penuh",
    m.mode === "petualangan" && m.nyawa === m.maks, `${m.nyawa}/${m.maks}`);

  // jatuh pendek: tidak boleh sakit, kalau tidak melompat biasa jadi menyiksa
  await jatuhkanDari(3);
  const pendek = await page.evaluate(() => window.__kubantara.getNyawa());
  cek("jatuh pendek (3 satuan) tidak mengurangi nyawa",
    pendek.nyawa === pendek.maks, `${pendek.nyawa}/${pendek.maks}`);

  // jatuh tinggi tapi belum mematikan
  await page.evaluate(() => window.__kubantara.setMode("petualangan")); // nyawa penuh lagi
  await jatuhkanDari(12);
  const tinggi = await page.evaluate(() => window.__kubantara.getNyawa());
  cek("jatuh 12 satuan mengurangi nyawa", tinggi.nyawa < tinggi.maks, `${tinggi.nyawa}/${tinggi.maks}`);
  cek("tapi tidak langsung menghabiskan semuanya", tinggi.nyawa > 0, `${tinggi.nyawa}/${tinggi.maks}`);

  cek("bar nyawa tampil di mode petualangan",
    await page.locator('[data-uji="nyawa"]').isVisible().catch(() => false));
}

console.log("");
console.log("Nyawa habis tidak menghapus apa pun");
{
  await page.evaluate(() => window.__kubantara.setMode("petualangan"));
  const blokSebelum = await page.evaluate(() => window.__kubantara.exportBlocks().length);
  const bintangSebelum = await page.evaluate(() => window.__kubantara.getStars());

  await jatuhkanDari(60); // cukup tinggi untuk menghabiskan kelima nyawa
  await tunggu(1500);

  const sesudah = await page.evaluate(() => window.__kubantara.getNyawa());
  const blokSesudah = await page.evaluate(() => window.__kubantara.exportBlocks().length);
  const bintangSesudah = await page.evaluate(() => window.__kubantara.getStars());

  cek("bangun lagi dengan nyawa penuh, bukan tetap nol",
    sesudah.nyawa === sesudah.maks, `${sesudah.nyawa}/${sesudah.maks}`);
  cek("tidak ada balok yang hilang", blokSesudah === blokSebelum, `${blokSebelum} → ${blokSesudah}`);
  cek("tidak ada bintang yang hilang", bintangSesudah === bintangSebelum, `${bintangSebelum} → ${bintangSesudah}`);
}

console.log("");
console.log("Nyawa pulih sendiri tanpa mencari ramuan");
{
  await page.evaluate(() => window.__kubantara.setMode("petualangan"));
  await jatuhkanDari(12);
  const luka = await page.evaluate(() => window.__kubantara.getNyawa());
  if (luka.nyawa < luka.maks) {
    let pulih = luka.nyawa;
    for (let i = 0; i < 40 && pulih <= luka.nyawa; i++) {
      await tunggu(1000);
      pulih = (await page.evaluate(() => window.__kubantara.getNyawa())).nyawa;
    }
    cek("nyawa bertambah sendiri setelah diam sebentar", pulih > luka.nyawa, `${luka.nyawa} → ${pulih}`);
  } else {
    cek("nyawa berkurang lebih dulu supaya pemulihan bisa diuji", false, "tidak terluka");
  }
}

console.log("");
console.log("Pilihan mode di panel Pengaturan");
{
  await page.getByRole("button", { name: "Pengaturan" }).click();
  await tunggu(2000);
  await page.locator('[data-uji="mode-santai"]').click();
  await tunggu(1200);
  const kembali = await page.evaluate(() => window.__kubantara.getNyawa());
  cek("tombol Santai di panel benar-benar mengganti mode", kembali.mode === "santai", kembali.mode);
  await page.locator('[data-uji="mode-petualangan"]').click();
  await tunggu(1200);
  const lagi = await page.evaluate(() => window.__kubantara.getNyawa());
  cek("tombol Petualangan mengganti kembali", lagi.mode === "petualangan", lagi.mode);
}

cek("tanpa galat JavaScript sepanjang uji", galat.length === 0, galat[0] ?? "");
await browser.close();
console.log("");
console.log(`${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
