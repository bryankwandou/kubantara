// Screenshot landing baru + rekam video demo (landing scroll + gameplay).
import { chromium } from "playwright";
import fs from "node:fs";

const OUT = "uji-hasil";
const VID = "demo";
fs.mkdirSync(VID, { recursive: true });
const errors = [];

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: VID, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
page.setDefaultTimeout(90000);
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

// ---- LANDING ----
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/landing-1-hero.png` });
// gulir perlahan menyusuri seluruh halaman untuk video
const steps = 9;
const total = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);
for (let i = 1; i <= steps; i++) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), (total * i) / steps);
  await page.waitForTimeout(700);
  if (i === 2) await page.screenshot({ path: `${OUT}/landing-2-statement.png` });
  if (i === 3) await page.screenshot({ path: `${OUT}/landing-3-aman.png` });
  if (i === 5) await page.screenshot({ path: `${OUT}/landing-4-fitur.png` });
  if (i === 6) await page.screenshot({ path: `${OUT}/landing-5-ortu.png` });
}
await page.waitForTimeout(600);

// ---- GAMEPLAY ----
await page.goto("http://localhost:3000/play", { waitUntil: "networkidle" });
const lewati = page.getByRole("button", { name: /Lewati|Ayo main/ });
if (await lewati.count()) { try { await lewati.first().click(); } catch {} }
await page.waitForTimeout(3000);
await page.mouse.click(640, 380);

// jalan berkeliling
for (const key of ["KeyW", "KeyD", "KeyS", "KeyA"]) {
  await page.keyboard.down(key);
  await page.waitForTimeout(700);
  await page.keyboard.up(key);
}
// bangun beberapa balok
for (let i = 0; i < 3; i++) {
  await page.getByRole("button", { name: "Bangun" }).click();
  await page.waitForTimeout(250);
  await page.keyboard.down("KeyW"); await page.waitForTimeout(250); await page.keyboard.up("KeyW");
}
// sihir bunga & pohon
await page.getByRole("button", { name: "Bunga" }).click();
await page.waitForTimeout(600);
await page.getByRole("button", { name: "Tumbuh pohon" }).click();
await page.waitForTimeout(600);
await page.getByRole("button", { name: "Kembang api" }).click();
await page.waitForTimeout(800);
// buka panel & teleport ke danau lalu gua
await page.getByRole("button", { name: "🐾" }).click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: /Beri makan/ }).click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: /Tepi Danau/ }).click();
await page.waitForTimeout(2500);
await page.getByRole("button", { name: "🐾" }).click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: /Mulut Gua/ }).click();
await page.waitForTimeout(2500);
for (let s = 0; s < 8; s++) { await page.keyboard.down("KeyS"); await page.waitForTimeout(220); await page.keyboard.up("KeyS"); }
await page.waitForTimeout(1500);

await context.close(); // menutup context menyimpan video
await browser.close();

// rename video ke nama tetap
const files = fs.readdirSync(VID).filter((f) => f.endsWith(".webm"));
if (files.length) {
  const newest = files.map((f) => ({ f, t: fs.statSync(`${VID}/${f}`).mtimeMs })).sort((a, b) => b.t - a.t)[0].f;
  fs.renameSync(`${VID}/${newest}`, `${VID}/kubantara-demo.webm`);
  console.log("VIDEO:", `${VID}/kubantara-demo.webm`, Math.round(fs.statSync(`${VID}/kubantara-demo.webm`).size / 1024) + "KB");
}
console.log("GALAT KONSOL:", errors.length);
for (const e of errors) console.log(" -", e);
console.log("selesai");
