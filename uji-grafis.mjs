// Uji mandiri: pastikan dunia benar-benar tergambar (bukan layar polos),
// termasuk setelah React StrictMode memasang-ulang permainan.
// Jalankan: node uji-grafis.mjs   (server dev/prod harus sudah hidup di :3000)
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const out = new URL("./uji-hasil/", import.meta.url);
fs.mkdirSync(out, { recursive: true });

// Hitung berapa banyak warna berbeda yang benar-benar tampil. Langit polos punya
// segelintir warna; dunia yang tergambar punya rumput, air, pohon, bayangan → ratusan.
//
// Catatan: canvas WebGL TIDAK bisa dibaca lewat drawImage — buffer gambarnya sudah
// dikosongkan setelah dikomposit (preserveDrawingBuffer mati demi kinerja). Jadi kita
// potret layarnya, lalu hitung warna dari potret itu.
async function ragamWarna(page, namaBerkas) {
  const ada = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    return c ? { lebar: c.width, tinggi: c.height } : null;
  });
  if (!ada) return { error: "tak ada canvas" };
  const jpg = await page.screenshot({ type: "jpeg", quality: 85, path: `uji-hasil/${namaBerkas}` });
  const warna = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = "data:image/jpeg;base64," + b64;
    await img.decode();
    const s = document.createElement("canvas");
    s.width = 160; s.height = 100;
    const g = s.getContext("2d");
    g.drawImage(img, 0, 0, s.width, s.height);
    const d = g.getImageData(0, 0, s.width, s.height).data;
    const set = new Set();
    for (let i = 0; i < d.length; i += 4) set.add((d[i] >> 3 << 10) | (d[i + 1] >> 3 << 5) | (d[i + 2] >> 3));
    return set.size;
  }, jpg.toString("base64"));
  return { warna, ...ada };
}

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

// /play butuh akun; daftar akun uji sekali pakai lewat API (cookie masuk ke browser)
const U = "ujigrafis" + Math.floor(Math.random() * 1e9);
const P = "Uji-" + Math.random().toString(36).slice(2) + "-Aa1!";
const daftar = await page.request.post(`${BASE}/api/auth/register`, {
  data: { username: U, email: `${U}@contoh.test`, password: P, confirm: P, agreed: true },
});
if (!daftar.ok()) { console.error("gagal daftar:", daftar.status(), await daftar.text()); process.exit(1); }
await page.goto(`${BASE}/play`, { waitUntil: "domcontentloaded" });

await page.waitForSelector("canvas", { timeout: 20000 });
await page.waitForTimeout(6000); // biarkan dunia dibangun & beberapa frame tergambar

const hasil = await ragamWarna(page, "grafis-awal.jpg");

// Uji pasang-ulang: keluar dari halaman main lalu kembali. Dulu ini membuat
// canvas jadi kosong karena konteks WebGL lama dipakai ulang.
await page.goto(`${BASE}/profil`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
await page.goto(`${BASE}/play`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas", { timeout: 20000 });
await page.waitForTimeout(6000);
const hasil2 = await ragamWarna(page, "grafis-pasang-ulang.jpg");
console.log("canvas setelah pasang-ulang:", hasil2);

// Cek HUD penting ikut tampil
const hud = await page.evaluate(() => {
  const t = document.body.innerText;
  return { resin: /\d+\s*\/\s*60/.test(t) || t.includes("⚡"), bintang: t.includes("⭐") || /bintang/i.test(t) };
});

console.log("canvas   :", hasil);
console.log("HUD      :", hud);
console.log("error js :", errors.length ? errors.slice(0, 5) : "tidak ada");

const lulus = !hasil.error && hasil.warna >= 60 && !hasil2.error && hasil2.warna >= 60 && errors.length === 0;
console.log(lulus ? "\nLULUS — dunia tergambar penuh, tanpa error." : "\nGAGAL — periksa hasil di atas.");
await browser.close();
process.exit(lulus ? 0 : 1);
