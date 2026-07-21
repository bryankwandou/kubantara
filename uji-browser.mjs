// Uji Kubantara di Chromium sungguhan pada ukuran layar laptop.
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "https://kubantara.vercel.app";
const OUT = process.env.OUT ?? ".";
const galat = [];
const konsol = [];

const browser = await chromium.launch({
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => galat.push("PAGEERROR: " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") konsol.push("CONSOLE: " + m.text().slice(0, 200));
});

console.log("== 1. Buka beranda ==");
await page.goto(BASE, { waitUntil: "networkidle" });
console.log("   judul:", await page.title());

console.log("== 2. Daftar akun uji ==");
const U = "ujibrowser" + Math.floor(Math.random() * 1e9);
const P = "Uji-" + Math.random().toString(36).slice(2) + "-Aa1!";
await page.goto(BASE + "/daftar", { waitUntil: "networkidle" });
const isian = await page.locator("input").all();
console.log("   jumlah kolom isian:", isian.length);
await page.locator('input[placeholder*="engguna" i], input[autocomplete="username"]').first().fill(U);
await page.locator('input[type="email"], input[placeholder*="mail" i]').first().fill(U + "@contoh.test");
const sandi = await page.locator('input[type="password"]').all();
await sandi[0].fill(P);
if (sandi[1]) await sandi[1].fill(P);
for (const cb of await page.locator('input[type="checkbox"]').all()) await cb.check();
await page.locator("button", { hasText: /daftar|buat/i }).first().click();
await page.waitForURL(/play|profil/, { timeout: 30000 }).catch(() => {});
console.log("   url setelah daftar:", page.url());

console.log("== 3. Halaman main: tunggu kanvas & mesin 3D ==");
if (!page.url().includes("/play")) await page.goto(BASE + "/play", { waitUntil: "networkidle" });
await page.waitForSelector("canvas", { timeout: 30000 });
await page.waitForTimeout(6000); // beri waktu three.js membangun dunia

const kanvas = await page.evaluate(() => {
  const c = document.querySelector("canvas");
  if (!c) return null;
  const gl = c.getContext("webgl2") || c.getContext("webgl");
  return { w: c.clientWidth, h: c.clientHeight, webgl: !!gl };
});
console.log("   kanvas:", JSON.stringify(kanvas));

// Apakah dunia benar-benar tergambar? Periksa piksel bukan hitam/kosong.
const terisi = await page.evaluate(() => {
  const c = document.querySelector("canvas");
  const t = document.createElement("canvas");
  t.width = 60; t.height = 40;
  const g = t.getContext("2d");
  g.drawImage(c, 0, 0, 60, 40);
  const d = g.getImageData(0, 0, 60, 40).data;
  const warna = new Set();
  for (let i = 0; i < d.length; i += 4) warna.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`);
  return warna.size;
});
console.log("   ragam warna di layar:", terisi, terisi > 3 ? "(dunia tergambar)" : "(LAYAR KOSONG!)");

console.log("== 4. Sambutan pemain baru ==");
const adaTutor = await page.locator("text=Selamat datang di Kubantara").isVisible().catch(() => false);
console.log("   sambutan muncul:", adaTutor);
await page.screenshot({ path: `${OUT}/1-sambutan.png` });
if (adaTutor) {
  for (let i = 0; i < 4; i++) {
    const lanjut = page.locator("button", { hasText: /Lanjut|Ayo main/ }).first();
    if (await lanjut.isVisible().catch(() => false)) { await lanjut.click(); await page.waitForTimeout(400); }
  }
}
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/2-hud.png` });

console.log("== 5. Tumpang tindih tombol HUD ==");
const tabrakan = await page.evaluate(() => {
  const el = [...document.querySelectorAll("button, a")].filter((e) => e.offsetParent !== null);
  const r = el.map((e) => ({ t: (e.innerText || e.title || "?").trim().slice(0, 18), b: e.getBoundingClientRect() }))
              .filter((o) => o.b.width > 0 && o.b.height > 0);
  const out = [];
  for (let i = 0; i < r.length; i++)
    for (let j = i + 1; j < r.length; j++) {
      const a = r[i].b, b = r[j].b;
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 4 && oy > 4) out.push(`${r[i].t} <-> ${r[j].t}`);
    }
  return { jumlahTombol: r.length, tabrakan: out };
});
console.log("   tombol terlihat:", tabrakan.jumlahTombol);
console.log("   tumpang tindih :", tabrakan.tabrakan.length ? tabrakan.tabrakan : "tidak ada");

console.log("== 6. Joystick tertutup sesuatu? ==");
const joy = await page.evaluate(() => {
  // joystick = bulatan besar di kiri bawah
  const d = [...document.querySelectorAll("div")].find((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 100 && r.width < 160 && Math.abs(r.width - r.height) < 6 && r.left < 200 && r.bottom > innerHeight - 200;
  });
  if (!d) return "joystick tidak ditemukan";
  const r = d.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const atas = document.elementFromPoint(cx, cy);
  return { kotak: [Math.round(r.left), Math.round(r.top), Math.round(r.width)], elemenTeratas: atas?.tagName + "." + (atas?.className || "").toString().slice(0, 60) };
});
console.log("   ", JSON.stringify(joy));

console.log("== 7. Kontrol keyboard (anak main di laptop) ==");
await page.locator("canvas").click({ position: { x: 400, y: 300 } });
const sebelum = await page.evaluate(() => document.body.innerText.match(/Lv \d+/)?.[0] ?? "");
for (const k of ["KeyW", "KeyA", "KeyS", "KeyD"]) {
  await page.keyboard.down(k); await page.waitForTimeout(700); await page.keyboard.up(k);
}
await page.keyboard.press("Space");
await page.waitForTimeout(300);
await page.keyboard.down("KeyQ"); await page.waitForTimeout(500); await page.keyboard.up("KeyQ");
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/3-setelah-jalan.png` });
console.log("   keyboard dijalankan tanpa galat");

console.log("== 8. Tombol aksi utama ==");
for (const nama of ["Bangun", "Bongkar", "Cetakan", "Jinakkan"]) {
  const b = page.locator("button", { hasText: new RegExp("^" + nama) }).first();
  const ada = await b.isVisible().catch(() => false);
  if (ada) { await b.click(); await page.waitForTimeout(600); }
  console.log(`   ${nama}: ${ada ? "diklik" : "TIDAK DITEMUKAN"}`);
}
await page.screenshot({ path: `${OUT}/4-setelah-bangun.png` });

console.log("== 9. Sihir ==");
for (const s of ["Jembatan", "Bunga", "Kembang api", "Tumbuh pohon"]) {
  const b = page.locator("button", { hasText: s }).first();
  if (await b.isVisible().catch(() => false)) { await b.click(); await page.waitForTimeout(500); }
}
await page.screenshot({ path: `${OUT}/5-sihir.png` });

console.log("== 10. Panel misi & profil ==");
const misi = page.locator("button").filter({ hasText: /📜/ }).first();
if (await misi.isVisible().catch(() => false)) {
  await misi.click(); await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/6-misi.png` });
  console.log("   panel misi terbuka");
}
await page.goto(BASE + "/profil", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/7-profil.png`, fullPage: true });
console.log("   /profil dimuat, judul:", await page.title());

console.log("\n===== GALAT =====");
console.log(galat.length ? galat.join("\n") : "tidak ada galat JavaScript");
console.log("--- console.error ---");
console.log(konsol.length ? [...new Set(konsol)].slice(0, 10).join("\n") : "tidak ada");
console.log("\nakun uji:", U);
await browser.close();
