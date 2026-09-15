// Uji toko, lemari pakaian & pembelian di Solana devnet.
//
// Yang dibuktikan di sini, dari ujung ke ujung dan tanpa jalan pintas:
//   main dungeon → dapat keping → beli skin → tercatat sebagai token di devnet
//   → muncul sebagai milik di lemari → dipakai → warna karakter benar-benar berubah
//
// Tidak ada uang sungguhan yang tersentuh: keping hanya didapat dari bermain,
// dan jaringannya devnet — koin di sana tidak bernilai uang.
//
// Jalankan: node uji-toko-dan-lemari.mjs   (BASE=http://localhost:3000)
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
let lulus = 0, gagal = 0;
function cek(nama, benar, catatan = "") {
  if (benar) { lulus++; console.log(`  LULUS  ${nama}${catatan ? " — " + catatan : ""}`); }
  else { gagal++; console.log(`  GAGAL  ${nama}${catatan ? " — " + catatan : ""}`); }
}
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });

let terdaftar = false;
for (let i = 1; i <= 6 && !terdaftar; i++) {
  const u = "ujitoko" + Math.floor(Math.random() * 1e9);
  const p = "Uji-" + Math.random().toString(36).slice(2) + "-Aa1!";
  const res = await ctx.request.post(`${BASE}/api/auth/register`, {
    data: { username: u, email: `${u}@contoh.test`, password: p, confirm: p, agreed: true },
    timeout: 45000,
  }).catch(() => null);
  if (res && res.ok()) terdaftar = true; else await tunggu(2000 * i);
}
if (!terdaftar) { console.error("tidak bisa mendaftar akun uji"); process.exit(1); }

const json = async (jalur, opsi) => {
  const res = opsi?.method === "POST"
    ? await ctx.request.post(BASE + jalur, { data: opsi.body, timeout: 60000 })
    : await ctx.request.get(BASE + jalur, { timeout: 60000 });
  return { status: res.status(), data: await res.json().catch(() => null) };
};

// --------------------------------------------------------------- katalog toko
console.log("Toko & katalog");
const toko = await json("/api/skin");
cek("toko menjawab", toko.status === 200, `status ${toko.status}`);
cek("katalog berisi beberapa skin", (toko.data?.skins?.length ?? 0) >= 5, `${toko.data?.skins?.length} skin`);
const berharga = (toko.data?.skins ?? []).every((s) => typeof s.price === "number" && s.price > 0);
cek("tiap skin punya harga keping", berharga);
const punyaMint = (toko.data?.skins ?? []).filter((s) => s.mint).length;
cek("skin sudah dicetak sebagai token di devnet", punyaMint >= 5, `${punyaMint} skin punya alamat mint`);
cek("belum ada yang dimiliki akun baru", (toko.data?.owned?.length ?? 0) === 0);

const termurah = [...(toko.data?.skins ?? [])].sort((a, b) => a.price - b.price)[0];
console.log(`  skin termurah: ${termurah.name} — ${termurah.price} keping · mint ${termurah.mint?.slice(0, 12)}…`);

// ------------------------------------------------- kumpulkan keping dari main
console.log("\nMengumpulkan keping dengan bermain (bukan dibeli pakai uang)");
let dompet = (await json("/api/dompet")).data;
cek("mulai tanpa keping", dompet.keping === 0, `${dompet.keping}`);
cek("resin penuh & gratis", dompet.resin === 60, `${dompet.resin}`);

let babak = 0;
while (dompet.keping < termurah.price) {
  const masuk = await json("/api/dompet", { method: "POST", body: { aksi: "masuk-dungeon" } });
  if (masuk.status !== 200) { break; }
  babak++;
  await tunggu(16000); // babak wajib berlangsung minimal 15 detik di sisi server
  const selesai = await json("/api/dompet", {
    method: "POST",
    body: { aksi: "selesai-dungeon", babakId: masuk.data.babakId },
  });
  if (selesai.status === 200) dompet = selesai.data;
  console.log(`  babak ${babak}: keping ${dompet.keping}, resin ${dompet.resin}`);
}
cek(`keping cukup untuk membeli setelah ${babak} babak dungeon`,
  dompet.keping >= termurah.price, `${dompet.keping} keping`);

// ------------------------------------------------------------------ membeli
console.log("\nMembeli skin");
const kepingSebelum = dompet.keping;
const beli = await json("/api/skin", { method: "POST", body: { skinId: termurah.id } });
cek("pembelian diterima", beli.status === 200, `status ${beli.status} ${JSON.stringify(beli.data).slice(0, 120)}`);
if (beli.status === 200) {
  cek("keping terpotong sesuai harga",
    beli.data.keping === kepingSebelum - termurah.price,
    `${kepingSebelum} → ${beli.data.keping} (harga ${termurah.price})`);
}

const sesudah = await json("/api/skin");
cek("skin tercatat sebagai milik", (sesudah.data?.owned ?? []).includes(termurah.id),
  JSON.stringify(sesudah.data?.owned));

// ------------------------------------------------------- bukti kepemilikan
console.log("\nBukti kepemilikan di Solana devnet (untuk orang tua)");
const bukti = await json("/api/bukti");
cek("halaman bukti terbaca", bukti.status === 200, `status ${bukti.status}`);
const milik = bukti.data?.milik ?? [];
cek("bukti mencantumkan skin yang baru dibeli", milik.some((m) => m.id === termurah.id));
const item = milik.find((m) => m.id === termurah.id);
if (item) {
  cek("ada alamat mint (jenis barang di blockchain)", !!item.mint, item.mint);
  cek("ada alamat akun penyimpanan milik anak", !!item.akun, item.akun);
  cek("ada tautan explorer yang bisa dibuka orang tua",
    typeof item.mintExplorer === "string" && item.mintExplorer.includes("devnet"),
    item.mintExplorer);
  console.log(`  ${item.nama}: mint ${item.mint?.slice(0, 16)}… · akun ${item.akun?.slice(0, 16)}…`);
}

// -------------------------------------------- lemari pakaian di dalam game
console.log("\nLemari pakaian: memakai skin benar-benar mengubah karakter");
const page = await ctx.newPage();
const galat = [];
page.on("pageerror", (e) => galat.push(String(e)));
await page.goto(BASE + "/play", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => !!window.__kubantara, { timeout: 120000 });
const lewati = page.getByRole("button", { name: "Lewati" });
for (let i = 0; i < 20; i++) {
  if (await lewati.isVisible().catch(() => false)) await lewati.click().catch(() => {});
  else if (i > 2) break;
  await tunggu(500);
}
await tunggu(1200);

const warnaAwal = await page.evaluate(() => window.__kubantara.getHero());
await page.locator('button[aria-label="Toko skin"]').click();
await tunggu(2500);

const kartu = page.locator(`[data-uji="skin-${termurah.id}"]`);
cek("skin milik sendiri muncul di lemari", await kartu.isVisible().catch(() => false));
const teksKartu = await kartu.innerText().catch(() => "");
cek("kartu skin menampilkan nama & harga",
  teksKartu.includes(termurah.name) && teksKartu.includes(String(termurah.price)),
  JSON.stringify(teksKartu));
const tombolSkin = page.locator(`[data-uji="skin-tombol-${termurah.id}"]`);
const teksTombol = await tombolSkin.innerText().catch(() => "");
cek("tombolnya jadi 'Pakai' karena skinnya sudah dimiliki", /pakai/i.test(teksTombol), teksTombol);

await tombolSkin.click();
await tunggu(1500);
const warnaBaru = await page.evaluate(() => window.__kubantara.getHero());
cek("warna baju karakter berubah jadi warna skin",
  warnaBaru.shirt === termurah.shirt,
  `${warnaBaru.shirt.toString(16)} vs ${termurah.shirt.toString(16)}`);
cek("warna celana karakter berubah jadi warna skin",
  warnaBaru.pants === termurah.pants,
  `${warnaBaru.pants.toString(16)} vs ${termurah.pants.toString(16)}`);
cek("penampilan benar-benar berganti dari sebelumnya",
  warnaBaru.shirt !== warnaAwal.shirt || warnaBaru.pants !== warnaAwal.pants);

cek("tanpa galat JavaScript sepanjang uji", galat.length === 0, galat[0] ?? "");
await browser.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
