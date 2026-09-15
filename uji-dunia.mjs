// Uji dunia: membuktikan tiga keluhan penguji benar-benar sudah diperbaiki —
//   "lantai tembus"     → balok melayang tidak lagi menahan pemain di udara
//   "properti palsu"    → pemain berdiri PERSIS di atas balok, bukan melayang
//   "tidak bisa masuk"  → bagian dalam rumah & gua benar-benar bisa dimasuki
//
// Diperiksa lewat aturan tabrakannya langsung (window.__kubantara), jadi hasilnya
// angka yang bisa dibaca, bukan kesan "kelihatannya sudah benar".
//
// Jalankan: node uji-dunia.mjs   (BASE=http://localhost:3000)
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
let lulus = 0, gagal = 0;
function cek(nama, benar, catatan = "") {
  if (benar) { lulus++; console.log(`  LULUS  ${nama}`); }
  else { gagal++; console.log(`  GAGAL  ${nama}${catatan ? " — " + catatan : ""}`); }
}
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));
const dekat = (a, b, toleransi = 0.001) => Math.abs(a - b) < toleransi;

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });

// database jauh & kadang timeout; coba beberapa kali
let terdaftar = false;
for (let i = 1; i <= 6 && !terdaftar; i++) {
  const u = "ujidunia" + Math.floor(Math.random() * 1e9);
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
await page.waitForFunction(() => !!window.__kubantara, { timeout: 40000 });
// Overlay sambutan (z-40) menutupi seluruh layar dan muncul setelah jeda, jadi
// menekan "Lewati" sekali di awal belum tentu kena. Tunggu sampai benar-benar
// hilang sebelum menyentuh kendali apa pun.
const lewati = page.getByRole("button", { name: "Lewati" });
for (let i = 0; i < 20; i++) {
  if (await lewati.isVisible().catch(() => false)) { await lewati.click().catch(() => {}); }
  else if (i > 2) break;
  await tunggu(500);
}
await tunggu(1500);

// Petak datar yang jauh dari bangunan bawaan, supaya hasilnya bersih.
const PETAK = await page.evaluate(() => {
  const g = window.__kubantara;
  for (let x = -40; x < 40; x += 3)
    for (let z = -40; z < 40; z += 3) {
      const h = g.tanahDi(x, z);
      if (h < 1.5) continue;
      let rata = true;
      for (let dx = -1; dx <= 1 && rata; dx++)
        for (let dz = -1; dz <= 1; dz++) if (g.tanahDi(x + dx, z + dz) !== h) { rata = false; break; }
      if (rata) return { x, z, h };
    }
  return null;
});
if (!PETAK) { console.error("tidak menemukan petak datar untuk diuji"); process.exit(1); }
console.log(`petak uji: (${PETAK.x}, ${PETAK.z}) tinggi tanah ${PETAK.h}\n`);

// ---------------------------------------------------------- properti palsu
console.log("Berdiri di atas balok (dulu: melayang setengah balok)");
{
  const r = await page.evaluate(({ x, z, h }) => {
    const g = window.__kubantara;
    // satu kubus tepat di atas tanah: pusatnya di h+0.5, puncaknya h+1
    g.loadBlocks([{ x, y: Math.round(h + 0.5), z, c: 0xffffff, s: "kubus" }]);
    return { atas: g.tanahDi(x, z, h + 3) };
  }, PETAK);
  cek("permukaan naik PERSIS 1 balok, bukan 1.5",
    dekat(r.atas, PETAK.h + 1), `dapat ${r.atas}, seharusnya ${PETAK.h + 1}`);
}

// ------------------------------------------------------------- lantai tembus
console.log("\nBalok melayang tidak menahan pemain di udara");
{
  const x = PETAK.x + 6, z = PETAK.z;
  const r = await page.evaluate(({ x, z }) => {
    const g = window.__kubantara;
    const h = g.tanahDi(x, z);
    // balok melayang 6 satuan di atas kepala — tidak menyentuh apa pun
    g.loadBlocks([{ x, y: Math.round(h + 6), z, c: 0xffffff, s: "kubus" }]);
    return { tanah: h, berdiri: g.tanahDi(x, z, h), diAtas: g.tanahDi(x, z, h + 6) };
  }, { x, z });
  cek("anak di tanah tetap di tanah, tidak tersedot ke balok melayang",
    dekat(r.berdiri, r.tanah), `dapat ${r.berdiri}, tanah ${r.tanah}`);
  cek("balok melayang tetap bisa dipijak kalau anak melompat setinggi itu",
    r.diAtas > r.tanah + 5, `dapat ${r.diAtas}`);
}

// --------------------------------------------------------- masuk ke dalam rumah
console.log("\nMasuk ke dalam rumah (dulu: terlempar ke atap)");
{
  const x = PETAK.x + 12, z = PETAK.z;
  const r = await page.evaluate(({ x, z }) => {
    const g = window.__kubantara;
    const h = g.tanahDi(x, z);
    const lantai = Math.round(h + 0.5);
    const blok = [];
    // ruangan 3x3 berdinding 2 balok dengan atap penuh
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        blok.push({ x: x + dx, y: lantai + 3, z: z + dz, c: 0x884422, s: "kubus" }); // atap
        if (dx === 0 && dz === 0) continue;
        for (let dy = 0; dy <= 2; dy++) blok.push({ x: x + dx, y: lantai + dy, z: z + dz, c: 0xcc9966, s: "kubus" });
      }
    g.loadBlocks(blok);
    return {
      tanah: h,
      diDalam: g.tanahDi(x, z, h),           // anak berdiri di lantai rumah
      diAtap: g.tanahDi(x, z, h + 4),        // anak yang memang sedang di atap
    };
  }, { x, z });
  cek("berdiri di lantai rumah, bukan dilempar ke atap",
    dekat(r.diDalam, r.tanah), `dapat ${r.diDalam}, lantai ${r.tanah}`);
  cek("atap tetap bisa dipijak dari atas",
    r.diAtap > r.tanah + 3, `dapat ${r.diAtap}`);
}

// ------------------------------------------------------------------ tangga
console.log("\nTangga masih bisa dinaiki selangkah demi selangkah");
{
  const x = PETAK.x - 8, z = PETAK.z;
  const r = await page.evaluate(({ x, z }) => {
    const g = window.__kubantara;
    const h = g.tanahDi(x, z);
    const blok = [];
    for (let i = 0; i < 4; i++)
      for (let dy = 0; dy <= i; dy++) blok.push({ x: x + i, y: Math.round(h + 0.5) + dy, z, c: 0x999999, s: "kubus" });
    g.loadBlocks(blok);
    const anak = [];
    let y = h;
    for (let i = 0; i < 4; i++) { y = g.tanahDi(x + i, z, y); anak.push(y); }
    return { tanah: h, anak };
  }, { x, z });
  cek("naik satu anak tangga per langkah",
    r.anak.every((y, i) => dekat(y, r.tanah + i + 1)), JSON.stringify(r.anak));
}

// -------------------------------------------------------------------- gua
console.log("\nDinding gua padat, mulutnya terbuka");
{
  const r = await page.evaluate(() => {
    const g = window.__kubantara;
    const gua = g.pusatGua()[0];
    const y = gua.y + 0.5;
    return {
      gua,
      dindingTimur: g.padatDi(gua.x + gua.r, y, gua.z),
      dindingBarat: g.padatDi(gua.x - gua.r, y, gua.z),
      // mulut gua menghadap -z, tepat di tengah: harus terbuka
      mulut: g.padatDi(gua.x, y, gua.z - gua.r),
      dalamKosong: g.padatDi(gua.x, y, gua.z),
      lantaiDalam: g.tanahDi(gua.x, gua.z, gua.y),
    };
  });
  cek("dinding gua sisi timur padat (tak bisa ditembus)", r.dindingTimur === true);
  cek("dinding gua sisi barat padat (tak bisa ditembus)", r.dindingBarat === true);
  cek("mulut gua terbuka — ada jalan masuk", r.mulut === false);
  cek("ruang dalam gua kosong, bukan batu penuh", r.dalamKosong === false);
  cek("lantai gua setinggi tanah, bukan di puncak bukit",
    dekat(r.lantaiDalam, r.gua.y + 0.5, 0.6), `lantai ${r.lantaiDalam}, tanah gua ${r.gua.y}`);
}

// ----------------------------------------------- benar-benar berjalan masuk gua
console.log("\nBerjalan sungguhan dari mulut gua ke dalam");
{
  await page.evaluate(() => window.__kubantara.teleport("gua"));
  await tunggu(800);
  const awal = await page.evaluate(() => ({ p: window.__kubantara.posisi(), gua: window.__kubantara.pusatGua()[0] }));
  await page.keyboard.down("KeyW");
  await tunggu(8000);
  await page.keyboard.up("KeyW");
  await tunggu(500);
  const akhir = await page.evaluate(() => window.__kubantara.posisi());
  const jarakAwal = Math.hypot(awal.p.x - awal.gua.x, awal.p.z - awal.gua.z);
  const jarakAkhir = Math.hypot(akhir.x - awal.gua.x, akhir.z - awal.gua.z);
  cek("berjalan dari mulut gua membawa anak mendekat ke dalam gua",
    jarakAkhir < jarakAwal, `${jarakAwal.toFixed(1)} → ${jarakAkhir.toFixed(1)}`);
  cek("anak tidak tembus keluar ke sisi seberang gua",
    jarakAkhir < awal.gua.r + 2, `jarak ${jarakAkhir.toFixed(1)}, jari-jari ${awal.gua.r}`);
}

cek("tanpa galat JavaScript sepanjang uji", galat.length === 0, galat[0] ?? "");
await browser.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
