// Uji halaman depan: dua bahasa, dan isinya jujur tentang game yang ada.
//
// Halaman depan lama menjanjikan "nol tombol beli" dan "tanpa kekalahan"
// padahal toko pakaian dan mode Petualangan sudah ada. Uji ini memastikan
// janji palsu itu tidak kembali, dan bahwa pilihan bahasa benar-benar bekerja.
//
// Jalankan: node uji-halaman-depan.mjs   (BASE=http://localhost:3000)
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
let lulus = 0, gagal = 0;
function cek(nama, benar, catatan = "") {
  if (benar) { lulus++; console.log(`  LULUS  ${nama}${catatan ? " — " + catatan : ""}`); }
  else { gagal++; console.log(`  GAGAL  ${nama}${catatan ? " — " + catatan : ""}`); }
}

const browser = await chromium.launch();
const galat = [];

async function buka(locale, lebar = 1280, tinggi = 800) {
  const ctx = await browser.newContext({ locale, viewport: { width: lebar, height: tinggi } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => galat.push(String(e)));
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 180000 });
  return { ctx, page };
}
const teks = (page) => page.evaluate(() => document.body.innerText);

console.log("Peramban berbahasa Indonesia");
{
  const { ctx, page } = await buka("id-ID");
  const isi = await teks(page);
  cek("tampil dalam bahasa Indonesia", isi.includes("Mulai Menjelajah"));
  cek("atribut lang halaman = id", (await page.evaluate(() => document.documentElement.lang)) === "id");
  cek("janji palsu 'nol tombol beli' sudah tidak ada", !/nol tombol beli/i.test(isi));
  cek("janji palsu 'tidak bisa gagal' sudah tidak ada", !/tidak bisa gagal/i.test(isi));
  cek("toko pakaian disebut terus terang", /toko pakaian/i.test(isi) && /Solana devnet/.test(isi));
  cek("mode Petualangan dan nyawanya disebut", /Petualangan/.test(isi) && /nyawa/i.test(isi));
  cek("tautan ke halaman bukti kepemilikan ada", await page.locator('a[href="/bukti"]').count() > 0);

  await page.locator('[data-uji="ganti-bahasa"]').click();
  await page.waitForTimeout(400);
  const en = await teks(page);
  cek("tombol bahasa mengganti ke English", en.includes("Start exploring") && !en.includes("Mulai Menjelajah"));
  cek("atribut lang ikut berganti ke en", (await page.evaluate(() => document.documentElement.lang)) === "en");

  await page.reload({ waitUntil: "networkidle" });
  const ingat = await teks(page);
  cek("pilihan bahasa diingat setelah dimuat ulang", ingat.includes("Start exploring"));
  await ctx.close();
}

console.log("\nPeramban berbahasa Inggris");
{
  const { ctx, page } = await buka("en-US");
  const isi = await teks(page);
  cek("otomatis tampil dalam English", isi.includes("Start exploring"));
  cek("versi English juga jujur soal toko", /clothing shop/i.test(isi) && /no cash value/i.test(isi));
  await ctx.close();
}

console.log("\nPonsel tegak");
{
  const { ctx, page } = await buka("id-ID", 390, 844);
  const lebarHalaman = await page.evaluate(() => document.documentElement.scrollWidth);
  cek("tidak ada gulir ke samping di layar ponsel", lebarHalaman <= 391, `${lebarHalaman}px`);
  cek("tombol bahasa terlihat di ponsel", await page.locator('[data-uji="ganti-bahasa"]').isVisible());
  await ctx.close();
}

cek("tanpa galat JavaScript", galat.length === 0, galat[0] ?? "");
await browser.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
