// Uji pengatur kecerahan & kontras.
// Yang dibuktikan:
//   • slider di panel Pengaturan benar-benar sampai ke mesin render
//   • nilainya dijepit ke rentang yang masih terbaca (tidak bisa gelap total)
//   • gambar yang keluar BETUL-BETUL berubah, bukan cuma angkanya
//   • pilihannya diingat setelah halaman dimuat ulang
import { chromium } from "playwright";
import { PNG } from "pngjs";

const BASE = process.env.BASE ?? "http://localhost:3000";
let lulus = 0, gagal = 0;
const cek = (nama, ok, ket = "") => {
  if (ok) { lulus++; console.log("  LULUS ", nama, ket ? "— " + ket : ""); }
  else { gagal++; console.log("  GAGAL ", nama, ket ? "— " + ket : ""); }
};
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));

// Rata-rata terang satu tangkapan layar, 0..255.
function terangRata(buf) {
  const png = PNG.sync.read(buf);
  let jml = 0, n = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    jml += (png.data[i] + png.data[i + 1] + png.data[i + 2]) / 3;
    n++;
  }
  return jml / n;
}

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 700 } });
const u = "tampil" + Math.floor(Math.random() * 1e9), pw = "Uji-" + Math.random().toString(36).slice(2) + "-Aa1!";
await ctx.request.post(BASE + "/api/auth/register", {
  data: { username: u, email: u + "@contoh.test", password: pw, confirm: pw, agreed: true }, timeout: 45000,
});
const page = await ctx.newPage();
const galat = [];
page.on("pageerror", (e) => galat.push(String(e)));

// Klik lewat DOM: pemeriksaan "stabil" milik Playwright menunggu
// requestAnimationFrame, dan loop render game membuat rAF kelaparan di
// perender perangkat lunak sehingga klik mouse biasa selalu time-out.
const tekanTeks = (t) => page.evaluate((x) => {
  [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === x)?.click();
}, t);
const geser = (sel, v) => page.evaluate(([s, val]) => {
  const el = document.querySelector(s);
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  set.call(el, String(val));
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}, [sel, v]);

await page.goto(BASE + "/play", { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForFunction(() => !!window.__kubantara, { timeout: 180000 });
const selubung = page.locator('[class*="inset-0"][class*="z-40"]');
await selubung.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
for (let i = 0; i < 12 && (await selubung.count()); i++) { await tekanTeks("Lewati"); await tunggu(1200); }
await tunggu(4000);

console.log("Nilai bawaan");
{
  const t = await page.evaluate(() => window.__kubantara.getTampilan());
  cek("mulai dari kecerahan & kontras normal", t.kecerahan === 1 && t.kontras === 1, `${t.kecerahan}/${t.kontras}`);
}

console.log("");
console.log("Nilai dijepit supaya layar tidak bisa dibuat tak terbaca");
{
  const t = await page.evaluate(() => {
    window.__kubantara.setTampilan({ kecerahan: 99, kontras: 99 });
    const atas = window.__kubantara.getTampilan();
    window.__kubantara.setTampilan({ kecerahan: -5, kontras: -5 });
    const bawah = window.__kubantara.getTampilan();
    window.__kubantara.setTampilan({ kecerahan: 1, kontras: 1 });
    return { atas, bawah };
  });
  cek("kecerahan tidak bisa melewati batas atas", t.atas.kecerahan === 1.6, String(t.atas.kecerahan));
  cek("kontras tidak bisa melewati batas atas", t.atas.kontras === 1.5, String(t.atas.kontras));
  cek("kecerahan tidak bisa dibuat gelap total", t.bawah.kecerahan === 0.6, String(t.bawah.kecerahan));
  cek("kontras tidak bisa dibuat rata tanpa bentuk", t.bawah.kontras === 0.7, String(t.bawah.kontras));
}

console.log("");
console.log("Gambar yang keluar benar-benar berubah");
{
  await page.evaluate(() => window.__kubantara.setTampilan({ kecerahan: 0.6, kontras: 1 }));
  await tunggu(3500);
  const gelap = terangRata(await page.screenshot({ timeout: 180000 }));
  await page.evaluate(() => window.__kubantara.setTampilan({ kecerahan: 1.6, kontras: 1 }));
  await tunggu(3500);
  const terang = terangRata(await page.screenshot({ timeout: 180000 }));
  cek("kecerahan tinggi menghasilkan gambar yang betul-betul lebih terang",
    terang > gelap + 8, `${gelap.toFixed(1)} → ${terang.toFixed(1)}`);

  await page.evaluate(() => window.__kubantara.setTampilan({ kecerahan: 1, kontras: 1.5 }));
  await tunggu(2500);
  const filter = await page.evaluate(() => document.querySelector("canvas").style.filter);
  cek("kontras terpasang di kanvas", /contrast\(1\.5\)/.test(filter), filter || "(kosong)");
  await page.evaluate(() => window.__kubantara.setTampilan({ kecerahan: 1, kontras: 1 }));
}

console.log("");
console.log("Slider di panel Pengaturan");
{
  await tekanTeks("⚙️");
  await tunggu(1500);
  const adaK = await page.locator('[data-uji="kecerahan"]').count();
  cek("slider kecerahan ada di panel Pengaturan", adaK === 1, String(adaK));
  cek("slider kontras ada di panel Pengaturan",
    (await page.locator('[data-uji="kontras"]').count()) === 1);

  await geser('[data-uji="kecerahan"]', 1.4);
  await geser('[data-uji="kontras"]', 1.3);
  await tunggu(1500);
  const t = await page.evaluate(() => window.__kubantara.getTampilan());
  cek("menggeser slider sampai ke mesin render",
    Math.abs(t.kecerahan - 1.4) < 0.01 && Math.abs(t.kontras - 1.3) < 0.01,
    `${t.kecerahan}/${t.kontras}`);
}

console.log("");
console.log("Pilihan diingat setelah dimuat ulang");
{
  await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForFunction(() => !!window.__kubantara, { timeout: 180000 });
  await tunggu(3000);
  const t = await page.evaluate(() => window.__kubantara.getTampilan());
  cek("kecerahan & kontras kembali seperti yang dipilih",
    Math.abs(t.kecerahan - 1.4) < 0.01 && Math.abs(t.kontras - 1.3) < 0.01,
    `${t.kecerahan}/${t.kontras}`);
}

cek("tanpa galat JavaScript", galat.length === 0, galat[0] ?? "");
await browser.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
