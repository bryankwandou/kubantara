// Uji fitur baru di browser sungguhan (GPU): grafik air/awan/hutan, teleport,
// panel peliharaan. Menangkap galat konsol agar bisa dibuktikan bebas bug.
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

await page.goto("http://localhost:3000/play", { waitUntil: "networkidle" });
// lewati sambutan bila muncul
const lewati = page.getByRole("button", { name: /Lewati|Ayo main/ });
if (await lewati.count()) { try { await lewati.first().click(); } catch {} }
await page.waitForTimeout(3500); // biarkan dunia render + siklus jalan

await page.screenshot({ path: `${OUT}/baru-1-dunia.png` });

// buka panel peliharaan & teleport (tombol 🐾)
const paw = page.getByRole("button", { name: "🐾" });
await paw.click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/baru-2-panel-pet.png` });

// beri makan
const feed = page.getByRole("button", { name: /Beri makan/ });
if (await feed.count()) { await feed.click(); await page.waitForTimeout(300); }
// pakai kostum
const kostum = page.getByRole("button", { name: /Topi Emas/ });
if (await kostum.count()) { await kostum.click(); await page.waitForTimeout(300); }
await page.screenshot({ path: `${OUT}/baru-3-pet-makan.png` });

// teleport ke hutan lebat
const hutan = page.getByRole("button", { name: /Hutan Lebat/ });
if (await hutan.count()) { await hutan.click(); await page.waitForTimeout(2500); }
await page.screenshot({ path: `${OUT}/baru-4-hutan.png` });

// teleport ke tepi danau untuk melihat air
await paw.click();
await page.waitForTimeout(300);
const danau = page.getByRole("button", { name: /Tepi Danau/ });
if (await danau.count()) { await danau.click(); await page.waitForTimeout(2500); }
await page.screenshot({ path: `${OUT}/baru-5-danau.png` });

await browser.close();
console.log("GALAT KONSOL:", errors.length);
for (const e of errors) console.log(" -", e);
console.log("selesai");
