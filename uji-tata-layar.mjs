// Uji tata letak layar permainan: tidak ada tombol yang saling menutupi.
//
// Keluhan QA: tampilan belum jalan sempurna di HP, belum ada mode lanskap.
// Ditemukan sendiri: di HP tegak palet warna menimpa baris ketiga bar status.
// Uji ini mengukur kotak setiap tombol yang terlihat di beberapa ukuran layar
// dan gagal kalau ada dua yang bertumpuk.
//
// Jalankan: node uji-tata-layar.mjs   (BASE=http://localhost:3000)
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
let lulus = 0, gagal = 0;
function cek(nama, benar, catatan = "") {
  if (benar) { lulus++; console.log(`  LULUS  ${nama}${catatan ? " — " + catatan : ""}`); }
  else { gagal++; console.log(`  GAGAL  ${nama}${catatan ? " — " + catatan : ""}`); }
}

const LAYAR = [
  { nama: "HP tegak 390×844", w: 390, h: 844, hp: true },
  { nama: "HP kecil tegak 360×740", w: 360, h: 740, hp: true },
  { nama: "HP mendatar 844×390", w: 844, h: 390, hp: true },
  { nama: "HP kecil mendatar 740×360", w: 740, h: 360, hp: true },
  { nama: "Laptop 1280×720", w: 1280, h: 720, hp: false },
];

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const u = "tata" + Math.floor(Math.random() * 1e9), pw = "Uji-" + Math.random().toString(36).slice(2) + "-Aa1!";
await ctx.request.post(`${BASE}/api/auth/register`, {
  data: { username: u, email: `${u}@contoh.test`, password: pw, confirm: pw, agreed: true }, timeout: 45000,
});
const page = await ctx.newPage();
await page.goto(BASE + "/play", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => !!window.__kubantara, { timeout: 120000 });
const lewati = page.getByRole("button", { name: "Lewati" });
for (let i = 0; i < 10; i++) {
  if (await lewati.isVisible().catch(() => false)) await lewati.click().catch(() => {});
  await page.waitForTimeout(400);
}
// tutup kabar "miringkan HP" supaya yang diukur hanya kendali tetap
await page.evaluate(() => document.querySelectorAll("[role=status],[data-kabar]").forEach((e) => e.remove()));

for (const L of LAYAR) {
  console.log("\n" + L.nama);
  await page.setViewportSize({ width: L.w, height: L.h });
  await page.waitForTimeout(2500);
  const hasil = await page.evaluate(() => {
    const kotak = [...document.querySelectorAll("button, [data-uji=stik]")]
      .filter((e) => {
        const s = getComputedStyle(e);
        const r = e.getBoundingClientRect();
        return s.visibility !== "hidden" && s.display !== "none" && r.width > 4 && r.height > 4 &&
          !e.closest("[role=dialog]") && !e.closest("[data-kabar]");
      })
      .map((e) => ({ r: e.getBoundingClientRect(), t: (e.textContent || e.getAttribute("aria-label") || e.dataset.uji || "?").trim().slice(0, 18), el: e }));
    const tabrak = [];
    for (let i = 0; i < kotak.length; i++) for (let j = i + 1; j < kotak.length; j++) {
      const a = kotak[i], b = kotak[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const lebar = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const tinggi = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (lebar > 3 && tinggi > 3) tabrak.push(`"${a.t}" × "${b.t}"`);
    }
    const keluar = kotak.filter((k) => k.r.right > innerWidth + 1 || k.r.bottom > innerHeight + 1 || k.r.left < -1 || k.r.top < -1).map((k) => k.t);
    return { jumlah: kotak.length, tabrak, keluar, gulir: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  cek("tidak ada tombol yang saling menutupi", hasil.tabrak.length === 0, hasil.tabrak.slice(0, 4).join(", ") || `${hasil.jumlah} tombol`);
  cek("semua tombol di dalam layar", hasil.keluar.length === 0, hasil.keluar.slice(0, 4).join(", "));
  cek("tidak ada gulir ke samping", !hasil.gulir);
  if (L.hp) cek("joystick layar terlihat", await page.locator("[data-uji=stik]").isVisible());
}

await browser.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
