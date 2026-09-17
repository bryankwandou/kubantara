// Uji kamera saat memanjat.
// Laporan QA: "kamera masih patah-patah saat memanjat".
// Naik satu balok memindahkan pemain ~1 satuan dalam SATU bingkai. Yang
// dibuktikan di sini: kamera tidak ikut tersentak sebesar itu, tetapi tetap
// menyusul pemain sampai ke atas.
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
const u = "panjat" + Math.floor(Math.random() * 1e9), pw = "Uji-" + Math.random().toString(36).slice(2) + "-Aa1!";
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
page.setDefaultTimeout(180000);
// Sambutan pemain baru dianggap sudah dilihat, supaya tidak menutupi layar.
await page.addInitScript(() => { try { localStorage.setItem("kubantara_tutor_v1", "1"); } catch {} });
await page.goto(BASE + "/play", { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForFunction(() => !!window.__kubantara?.kamera, null, { timeout: 180000 });
await tunggu(3000);

// Cari lereng sungguhan: lima petak berurutan yang masing-masing naik 1 balok.
const jalur = await page.evaluate(() => {
  const g = window.__kubantara;
  const p = g.petaDunia(1);
  for (let j = 10; j < p.n - 10; j++) {
    for (let i = 10; i < p.n - 10; i++) {
      let ok = true;
      for (let k = 0; k < 5 && ok; k++) {
        const naik = p.tinggi[(i + k + 1) * p.n + j] - p.tinggi[(i + k) * p.n + j];
        if (naik < 0.9 || naik > 1.1) ok = false;
      }
      if (ok) return Array.from({ length: 6 }, (_, k) => ({ x: (i + k) * p.langkah - p.half + 0.5, z: j * p.langkah - p.half + 0.5 }));
    }
  }
  return null;
});
cek("ada lereng bertangga untuk dipanjat", !!jalur);
if (!jalur) { await browser.close(); process.exit(1); }

await page.evaluate(({ x, z }) => window.__kubantara.pindah(x, z), jalur[0]);
await tunggu(2500); // biarkan kamera menetap dulu

// Rekam kamera tiap bingkai sambil pemain naik satu balok tiap 400 ms.
// Perender perangkat lunak di mesin uji hanya sanggup 2–3 bingkai per detik;
// pada jeda sepanjang itu peredam apa pun sudah tuntas sebelum bingkai
// berikutnya, jadi ujinya tidak bisa membedakan kamera halus dari kamera yang
// tersentak. Karena itu waktu halaman dikendalikan: tepat 60 bingkai per detik.
await page.clock.install();
const rekam = [];
const catat = () => page.evaluate(() => window.__kubantara.kamera());
for (let f = 0; f < 30; f++) { await page.clock.runFor(16); }
for (const t of jalur.slice(1)) {
  await page.evaluate(({ x, z }) => window.__kubantara.pindah(x, z), t);
  for (let f = 0; f < 24; f++) { await page.clock.runFor(16); rekam.push(await catat()); }
}
for (let f = 0; f < 120; f++) { await page.clock.runFor(16); rekam.push(await catat()); }

let lonjakPemain = 0, lonjakKamera = 0, lonjakTunduk = 0;
for (let i = 1; i < rekam.length; i++) {
  lonjakPemain = Math.max(lonjakPemain, Math.abs(rekam[i].pemainY - rekam[i - 1].pemainY));
  lonjakKamera = Math.max(lonjakKamera, Math.abs(rekam[i].y - rekam[i - 1].y));
  lonjakTunduk = Math.max(lonjakTunduk, Math.abs(rekam[i].tunduk - rekam[i - 1].tunduk));
}
const awal = rekam[0], akhir = rekam[rekam.length - 1];
console.log(`  (${rekam.length} bingkai terekam)`);
cek("pemain benar-benar naik balok demi balok", lonjakPemain >= 0.9, `lonjakan pemain ${lonjakPemain.toFixed(2)}`);
cek("kamera tidak ikut tersentak setinggi satu balok", lonjakKamera < lonjakPemain * 0.5,
  `lonjakan kamera terbesar ${lonjakKamera.toFixed(3)} per bingkai`);
cek("arah pandang tidak mengangguk tiba-tiba", lonjakTunduk < 0.05,
  `perubahan sudut terbesar ${(lonjakTunduk * 57.3).toFixed(2)}° per bingkai`);
cek("kamera tetap menyusul sampai ke atas",
  Math.abs((akhir.y - awal.y) - (akhir.pemainY - awal.pemainY)) < 0.5,
  `pemain naik ${(akhir.pemainY - awal.pemainY).toFixed(2)}, kamera naik ${(akhir.y - awal.y).toFixed(2)}`);

await browser.close();
console.log(`${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
