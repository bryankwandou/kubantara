// Uji model Kenney: karakter & satwa benar-benar termuat dan beranimasi,
// bukan hanya kotak cadangan. Menyimpan potret untuk dilihat mata.
// Jalankan: node uji-model.mjs   (BASE=http://localhost:3000)
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
fs.mkdirSync("uji-hasil", { recursive: true });
let lulus = 0, gagal = 0;
function cek(nama, benar, catatan = "") {
  if (benar) { lulus++; console.log(`  LULUS  ${nama}${catatan ? " — " + catatan : ""}`); }
  else { gagal++; console.log(`  GAGAL  ${nama}${catatan ? " — " + catatan : ""}`); }
}

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(180000);
const galat = [];
const gagalUnduh = [];
page.on("pageerror", (e) => galat.push(e.message));
page.on("response", (r) => { if (r.url().includes("/model/") && r.status() >= 400) gagalUnduh.push(r.status() + " " + r.url()); });

// Potret hanya untuk dilihat mata; perender perangkat lunak kadang terlalu
// lambat, jadi potret yang gagal tidak menggagalkan uji.
async function potret(nama) {
  await page.screenshot({ path: `uji-hasil/${nama}`, timeout: 120000 }).catch((e) => console.log("  (potret dilewati:", nama, e.message.split("
")[0] + ")"));
}

await page.goto(BASE + "/play", { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForFunction(() => !!window.__kubantara, { timeout: 120000 });
const lewati = page.getByRole("button", { name: /Lewati|Ayo main/ });
for (let i = 0; i < 6; i++) {
  if (await lewati.first().isVisible().catch(() => false)) await lewati.first().click().catch(() => {});
  await page.waitForTimeout(300);
}

// tunggu sampai semua model terunduh (atau batas waktu)
await page.waitForFunction(() => {
  const m = window.__kubantara.modelTerpasang();
  return m.terpasang === m.total;
}, { timeout: 90000 }).catch(() => {});
const m = await page.evaluate(() => window.__kubantara.modelTerpasang());
console.log("model:", JSON.stringify(m));
cek("model pemain terpasang", m.pemainBerModel);
cek("semua model terpasang", m.terpasang === m.total && m.total >= 10, `${m.terpasang}/${m.total}`);
cek("tidak ada file model yang gagal diunduh", gagalUnduh.length === 0, gagalUnduh.slice(0, 3).join(", "));
cek("pemain diam memakai animasi idle", m.animasiPemain === "idle", m.animasiPemain);
await potret("model-diam.png");

await page.mouse.click(640, 400);
await page.keyboard.down("KeyW");
await page.waitForTimeout(900);
const jalan = await page.evaluate(() => window.__kubantara.modelTerpasang().animasiPemain);
await potret("model-jalan.png");
await page.keyboard.up("KeyW");
cek("pemain berjalan memakai animasi jalan", jalan === "walk" || jalan === "sprint", jalan);

// orang-pertama tidak boleh menampilkan model di depan kamera
const op = await page.evaluate(() => { const g = window.__kubantara; g.setSudutPandang("orang-pertama"); return g.getSudutPandang(); });
await page.waitForTimeout(800);
await potret("model-orang-pertama.png");
await page.evaluate(() => window.__kubantara.setSudutPandang("orang-ketiga"));
cek("sudut pandang bisa berganti", op === "orang-pertama");

cek("tidak ada galat halaman", galat.length === 0, galat.slice(0, 3).join(" | "));
await browser.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
