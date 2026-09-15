// Uji gua: teleport ke mulut gua, masuk, buktikan gelap + kristal bercahaya.
import { chromium } from "playwright";
const OUT = "uji-hasil";
const errors = [];
const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
page.setDefaultTimeout(90000);
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

// Jangan menunggu "networkidle": sejak main bersama real-time, halaman ini
// menanyakan posisi saudara 4x per detik, jadi jaringannya tidak pernah diam.
await page.goto("http://localhost:3000/play", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => !!window.__kubantara, { timeout: 120000 });
const lewati = page.getByRole("button", { name: /Lewati|Ayo main/ });
if (await lewati.count()) { try { await lewati.first().click(); } catch {} }
await page.waitForTimeout(3000);

// buka panel, teleport ke mulut gua
await page.getByRole("button", { name: "🐾" }).click();
await page.waitForTimeout(400);
const gua = page.getByRole("button", { name: /Mulut Gua/ });
if (!(await gua.count())) { console.log("TOMBOL GUA TIDAK ADA"); }
await gua.click();
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/gua-1-mulut.png` });

// jalan maju (W) masuk ke dalam gua beberapa detik
await page.mouse.click(683, 400); // fokus kanvas
// mulut gua menghadap selatan; pemain di selatan, jadi jalan ke utara (KeyS = +z)
for (let s = 0; s < 10; s++) {
  await page.keyboard.down("KeyS");
  await page.waitForTimeout(220);
  await page.keyboard.up("KeyS");
  await page.waitForTimeout(60);
}
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/gua-2-dalam.png` });

await browser.close();
console.log("GALAT KONSOL:", errors.length);
for (const e of errors) console.log(" -", e);
console.log("selesai");
