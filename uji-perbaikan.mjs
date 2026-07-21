// Membuktikan dua bug yang ditemukan lewat browser benar-benar hilang:
//  1. permainan dimulai saat siang, bukan malam
//  2. pencapaian "malam" tidak diberikan gratis di detik nol
//  3. tidak ada tombol yang tumpang tindih di layar laptop
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "uji-hasil";
const galat = [];

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => galat.push("PAGEERROR: " + e.message));

// nama panjang sengaja — inilah yang dulu menabrak palet warna
const U = "anakdengannamapanjang" + Math.floor(Math.random() * 999);
const P = "Uji-" + Math.random().toString(36).slice(2) + "-Aa1!";
await page.goto(BASE + "/daftar", { waitUntil: "networkidle" });
await page.locator('input[autocomplete="username"], input[placeholder*="engguna" i]').first().fill(U);
await page.locator('input[type="email"], input[placeholder*="mail" i]').first().fill(U + "@contoh.test");
const sandi = await page.locator('input[type="password"]').all();
await sandi[0].fill(P); if (sandi[1]) await sandi[1].fill(P);
for (const cb of await page.locator('input[type="checkbox"]').all()) await cb.check();
await page.locator("button", { hasText: /daftar|buat/i }).first().click();
await page.waitForURL(/play/, { timeout: 30000 }).catch(() => {});
await page.waitForSelector("canvas", { timeout: 30000 });
await page.waitForTimeout(4000);

// lewati sambutan
for (let i = 0; i < 5; i++) {
  const b = page.locator("button", { hasText: /Lewati/ }).first();
  if (await b.isVisible().catch(() => false)) { await b.click(); break; }
}
await page.waitForTimeout(1500);

const waktu = await page.evaluate(() => {
  const t = document.body.innerText;
  return ["Pagi", "Siang", "Senja", "Malam"].find((w) => new RegExp("\\b" + w + "\\b").test(t)) ?? "?";
});
console.log("1. Waktu saat anak baru masuk :", waktu, waktu === "Malam" ? "<-- MASIH BUG" : "OK (terang)");

await page.screenshot({ path: `${OUT}/perbaikan-1-awal.png` });

const tabrakan = await page.evaluate(() => {
  const el = [...document.querySelectorAll("button, a")].filter((e) => e.offsetParent !== null);
  const r = el.map((e) => ({ t: (e.innerText || e.title || "?").trim().slice(0, 20), b: e.getBoundingClientRect() }))
              .filter((o) => o.b.width > 0);
  const out = [];
  for (let i = 0; i < r.length; i++)
    for (let j = i + 1; j < r.length; j++) {
      const a = r[i].b, b = r[j].b;
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 4 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 4) out.push(`${r[i].t} <-> ${r[j].t}`);
    }
  return out;
});
console.log("2. Tombol tumpang tindih     :", tabrakan.length ? tabrakan : "tidak ada — OK");

// tombol profil harus benar-benar bisa diklik, bukan tertutup palet
const profilKlikable = await page.evaluate(() => {
  const a = [...document.querySelectorAll("a")].find((e) => e.getAttribute("href") === "/profil");
  if (!a) return "tombol profil tidak ada";
  const r = a.getBoundingClientRect();
  const atas = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return a.contains(atas) || atas === a ? "OK — bisa diklik" : "TERTUTUP oleh " + atas?.className?.toString().slice(0, 50);
});
console.log("3. Tombol Profil             :", profilKlikable);

// jalan agak lama supaya jarak benar-benar tercatat
await page.locator("canvas").click({ position: { x: 500, y: 400 } });
for (let i = 0; i < 6; i++) {
  await page.keyboard.down("KeyW"); await page.waitForTimeout(900); await page.keyboard.up("KeyW");
  await page.keyboard.down("KeyD"); await page.waitForTimeout(900); await page.keyboard.up("KeyD");
}
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/perbaikan-2-jalan.png` });

await page.goto(BASE + "/profil", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const angka = await page.evaluate(() => {
  const ambil = (label) => {
    const el = [...document.querySelectorAll("p")].find((p) => p.textContent.trim() === label);
    return el?.previousElementSibling?.textContent?.trim() ?? "?";
  };
  return { malam: ambil("Malam dilalui"), langkah: ambil("Langkah"), balok: ambil("Balok dipasang") };
});
console.log("4. Setelah ~11 detik berjalan:", JSON.stringify(angka));
console.log("   malam harus 0 (bukan gratis), langkah harus > 0");
await page.screenshot({ path: `${OUT}/perbaikan-3-profil.png`, fullPage: true });

console.log("\nGalat JS:", galat.length ? galat.join("\n") : "tidak ada");
await browser.close();
