// Uji kendali: laporan penguji menyebut stik terbalik, tombol saling membajak,
// dan tak ada tata letak untuk HP yang dimiringkan. Uji ini memeriksa arah gerak
// yang sebenarnya (bukan sekadar "ada piksel berubah"), lalu memeriksa tata
// letaknya di tiga bentuk layar: laptop, HP tegak, HP dimiringkan.
//
// Jalankan: node uji-kendali.mjs   (BASE=http://localhost:3000)
import { chromium, devices } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";

let lulus = 0, gagal = 0;
function cek(nama, benar, catatan = "") {
  if (benar) { lulus++; console.log(`  LULUS  ${nama}`); }
  else { gagal++; console.log(`  GAGAL  ${nama}${catatan ? " — " + catatan : ""}`); }
}
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));

// Seberapa jauh pemain bergerak searah pandangan kamera. Positif = maju.
async function majuSejauh(page, aksi) {
  const sebelum = await page.evaluate(() => window.__kubantara.posisi());
  await aksi();
  const sesudah = await page.evaluate(() => window.__kubantara.posisi());
  const dx = sesudah.x - sebelum.x, dz = sesudah.z - sebelum.z;
  return {
    maju: dx * sebelum.majuX + dz * sebelum.majuZ,
    // kanan layar = (-cos camYaw, sin camYaw)
    kanan: dx * -sebelum.majuZ + dz * sebelum.majuX,
    jarak: Math.hypot(dx, dz),
  };
}

// /play menolak tamu, jadi tiap konteks mendaftarkan akun sekali pakai lebih
// dulu. Cookie sesinya menempel di konteks itu.
async function daftarkan(ctx) {
  // Database-nya jauh (Neon) dan sambungannya dari mesin ini kadang timeout.
  // Itu soal jaringan, bukan soal yang sedang diuji — jadi coba beberapa kali.
  let akhir = "";
  for (let coba = 1; coba <= 6; coba++) {
    const u = "ujikendali" + Math.floor(Math.random() * 1e9);
    const p = "Uji-" + Math.random().toString(36).slice(2) + "-Aa1!";
    const res = await ctx.request.post(`${BASE}/api/auth/register`, {
      data: { username: u, email: `${u}@contoh.test`, password: p, confirm: p, agreed: true },
      timeout: 45000,
    }).catch((e) => ({ ok: () => false, status: () => 0, text: async () => String(e) }));
    if (res.ok()) return;
    akhir = `${res.status()} ${await res.text()}`;
    await tunggu(2000 * coba);
  }
  throw new Error(`gagal daftar setelah 6 percobaan: ${akhir}`);
}

async function siapkanHalaman(page) {
  await page.goto(BASE + "/play", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => !!window.__kubantara, { timeout: 40000 });
  // Lewati sambutan kalau muncul. Overlay-nya menutupi SELURUH layar (z-40),
  // jadi selama masih tampil tak satu pun kendali bisa disentuh.
  const lewati = page.getByRole("button", { name: "Lewati" });
  if (await lewati.isVisible().catch(() => false)) await lewati.click();
  await page.waitForSelector("text=Selamat datang di Kubantara!", { state: "hidden", timeout: 10000 }).catch(() => {});
  await tunggu(800); // biar beberapa frame sudah tergambar
}

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });

// ---------------------------------------------------------------- papan ketik
{
  console.log("\nPapan ketik (laptop)");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await daftarkan(ctx);
  const page = await ctx.newPage();
  const galat = [];
  page.on("pageerror", (e) => galat.push(String(e)));
  await siapkanHalaman(page);

  const w = await majuSejauh(page, async () => {
    await page.keyboard.down("KeyW"); await tunggu(2500); await page.keyboard.up("KeyW");
  });
  cek("W benar-benar maju ke arah pandang kamera", w.maju > 0.15, `maju=${w.maju.toFixed(2)}`);
  cek("W tidak menyerong ke samping", Math.abs(w.kanan) < w.maju * 0.5, `kanan=${w.kanan.toFixed(2)}`);

  const s = await majuSejauh(page, async () => {
    await page.keyboard.down("KeyS"); await tunggu(2500); await page.keyboard.up("KeyS");
  });
  cek("S mundur", s.maju < -0.15, `maju=${s.maju.toFixed(2)}`);

  const d = await majuSejauh(page, async () => {
    await page.keyboard.down("KeyD"); await tunggu(2500); await page.keyboard.up("KeyD");
  });
  cek("D bergeser ke kanan layar", d.kanan > 0.15, `kanan=${d.kanan.toFixed(2)}`);

  const a = await majuSejauh(page, async () => {
    await page.keyboard.down("KeyA"); await tunggu(2500); await page.keyboard.up("KeyA");
  });
  cek("A bergeser ke kiri layar", a.kanan < -0.15, `kanan=${a.kanan.toFixed(2)}`);

  // pintasan aksi
  const balokAwal = await page.evaluate(() => window.__kubantara.getStats().blocksPlaced);
  await page.keyboard.press("KeyF");
  await tunggu(250);
  const balokSetelahF = await page.evaluate(() => window.__kubantara.getStats().blocksPlaced);
  cek("pintasan F memasang balok", balokSetelahF > balokAwal, `${balokAwal} → ${balokSetelahF}`);

  await page.keyboard.press("KeyR");
  await tunggu(250);
  const bongkar = await page.evaluate(() => window.__kubantara.getStats().blocksRemoved);
  cek("pintasan R membongkar balok", bongkar > 0, `blocksRemoved=${bongkar}`);

  await page.keyboard.press("KeyB");
  await tunggu(250);
  cek("pintasan B membuka laci cetakan",
    await page.getByText("Bangun jadi sekali tekan").isVisible().catch(() => false));
  await page.keyboard.press("KeyB");
  await tunggu(200);

  cek("petunjuk pintasan terlihat di laptop",
    await page.getByText(/F<\/b> bangun|bangun/).first().isVisible().catch(() => false));
  cek("tanpa galat JavaScript di laptop", galat.length === 0, galat[0] ?? "");
  await ctx.close();
}

// ------------------------------------------------------------------ HP tegak
{
  console.log("\nHP tegak (stik sentuh)");
  const ctx = await browser.newContext({ ...devices["Pixel 5"] });
  await daftarkan(ctx);
  const page = await ctx.newPage();
  const galat = [];
  page.on("pageerror", (e) => galat.push(String(e)));
  await siapkanHalaman(page);

  const stik = page.locator('[data-uji="stik"]');
  cek("stik terlihat di HP", await stik.isVisible());
  const kotak = await stik.boundingBox();
  const cx = kotak.x + kotak.width / 2, cy = kotak.y + kotak.height / 2;

  // dorong stik ke ATAS — anak mengharapkan pemainnya maju
  const atas = await majuSejauh(page, async () => {
    await page.touchscreen.tap(cx, cy); // memastikan halaman siap menerima sentuh
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 60, { steps: 4 });
    await tunggu(2500);
    await page.mouse.up();
  });
  cek("stik didorong ke ATAS = maju", atas.maju > 0.15, `maju=${atas.maju.toFixed(2)}`);

  const kanan = await majuSejauh(page, async () => {
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 60, cy, { steps: 4 });
    await tunggu(2500);
    await page.mouse.up();
  });
  cek("stik didorong ke KANAN = ke kanan layar", kanan.kanan > 0.15, `kanan=${kanan.kanan.toFixed(2)}`);

  // knop harus ikut bergerak, bukan diam di tengah
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 60, cy, { steps: 4 });
  const geserKnop = await page.locator('[data-uji="knop"]').evaluate((el) => el.style.transform);
  cek("knop stik ikut bergerak mengikuti jari", /\+\s*\d/.test(geserKnop), geserKnop);
  await page.mouse.up();
  const knopPulang = await page.locator('[data-uji="knop"]').evaluate((el) => el.style.transform);
  cek("knop kembali ke tengah saat dilepas", /\+\s*0px/.test(knopPulang), knopPulang);

  // dilepas = benar-benar berhenti
  await tunggu(300);
  const diam = await majuSejauh(page, () => tunggu(600));
  cek("pemain berhenti setelah stik dilepas", diam.jarak < 0.1, `jarak=${diam.jarak.toFixed(3)}`);

  // stik tidak boleh dibajak jari kedua yang menekan LOMPAT
  const lompatKotak = await page.locator('[data-uji="lompat"]').boundingBox();
  const dibajak = await majuSejauh(page, async () => {
    await page.touchscreen.tap(cx, cy - 50); // jari 1 memegang stik (lewat sentuh)
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 60, { steps: 3 });
    await tunggu(300);
    // jari 2 menekan LOMPAT sementara stik masih dipegang
    await page.touchscreen.tap(lompatKotak.x + lompatKotak.width / 2, lompatKotak.y + lompatKotak.height / 2);
    await tunggu(500);
    await page.mouse.up();
  });
  cek("menekan LOMPAT tidak membajak arah stik", dibajak.maju > 0.15, `maju=${dibajak.maju.toFixed(2)}`);

  const lompatSebelum = await page.evaluate(() => window.__kubantara.getStats().jumps);
  await page.locator('[data-uji="lompat"]').tap();
  await tunggu(2000);
  const lompatSesudah = await page.evaluate(() => window.__kubantara.getStats().jumps);
  cek("tombol LOMPAT benar-benar melompat", lompatSesudah > lompatSebelum, `${lompatSebelum} → ${lompatSesudah}`);

  cek("tanpa galat JavaScript di HP tegak", galat.length === 0, galat[0] ?? "");
  await ctx.close();
}

// ------------------------------------------------------------ HP dimiringkan
{
  console.log("\nHP dimiringkan (lanskap)");
  const ctx = await browser.newContext({
    viewport: { width: 740, height: 360 },
    isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  });
  await daftarkan(ctx);
  const page = await ctx.newPage();
  const galat = [];
  page.on("pageerror", (e) => galat.push(String(e)));
  await siapkanHalaman(page);

  const lebar = 740, tinggi = 360;
  const kotakDari = async (sel) => await page.locator(sel).first().boundingBox();

  const stik = await kotakDari('[data-uji="stik"]');
  const lompat = await kotakDari('[data-uji="lompat"]');
  cek("stik masih di dalam layar saat dimiringkan",
    stik && stik.y >= 0 && stik.y + stik.height <= tinggi + 1, JSON.stringify(stik));
  cek("tombol LOMPAT masih di dalam layar",
    lompat && lompat.y >= 0 && lompat.y + lompat.height <= tinggi + 1, JSON.stringify(lompat));

  // stik & lompat tidak boleh saling menimpa
  const tumpang = (a, b) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  cek("stik dan LOMPAT tidak bertumpuk", !tumpang(stik, lompat));

  // tombol aksi turun ke bawah, tidak lagi menempel di tengah kanan
  const bangun = await kotakDari('button:has-text("Bangun")');
  cek("tombol aksi turun ke tepi bawah saat dimiringkan",
    bangun && bangun.y > tinggi * 0.6, bangun ? `y=${Math.round(bangun.y)}` : "tidak ada");
  cek("tombol aksi tidak menimpa stik", bangun && !tumpang(bangun, stik));
  cek("tombol aksi tidak menimpa LOMPAT", bangun && !tumpang(bangun, lompat));

  // semua tombol aksi & sihir harus muat di dalam layar
  const semua = await page.locator("button:visible").all();
  let keluar = 0, contoh = "";
  for (const b of semua) {
    const k = await b.boundingBox();
    if (!k) continue;
    if (k.x < -1 || k.y < -1 || k.x + k.width > lebar + 1 || k.y + k.height > tinggi + 1) {
      keluar++;
      if (!contoh) contoh = `${(await b.innerText()).slice(0, 20)} @ ${Math.round(k.x)},${Math.round(k.y)}`;
    }
  }
  cek("tidak ada tombol yang terpotong keluar layar", keluar === 0, `${keluar} tombol, mis. ${contoh}`);

  // dan kendalinya tetap benar arahnya
  const c = { x: stik.x + stik.width / 2, y: stik.y + stik.height / 2 };
  const maju = await majuSejauh(page, async () => {
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x, c.y - 50, { steps: 4 });
    await tunggu(2500);
    await page.mouse.up();
  });
  cek("stik tetap maju saat dimiringkan", maju.maju > 0.15, `maju=${maju.maju.toFixed(2)}`);

  cek("tanpa galat JavaScript saat dimiringkan", galat.length === 0, galat[0] ?? "");
  await ctx.close();
}

// ------------------------------------------- berganti orientasi saat bermain
{
  console.log("\nBerputar saat sedang bermain");
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
  await daftarkan(ctx);
  const page = await ctx.newPage();
  const galat = [];
  page.on("pageerror", (e) => galat.push(String(e)));
  await siapkanHalaman(page);

  const sebelum = await page.locator('[data-uji="stik"]').boundingBox();
  await page.setViewportSize({ width: 780, height: 390 });
  await tunggu(500);
  const sesudah = await page.locator('[data-uji="stik"]').boundingBox();
  cek("tata letak ikut berubah saat HP diputar", sesudah.height < sebelum.height,
    `${sebelum.height} → ${sesudah.height}`);
  cek("stik tetap muat setelah diputar", sesudah.y + sesudah.height <= 391);

  const kanvas = await page.locator("canvas").boundingBox();
  cek("kanvas ikut melebar setelah diputar", kanvas.width > 700, `lebar=${Math.round(kanvas.width)}`);

  // dan permainan masih hidup — bukan layar biru WebGL yang mati
  const jpg = await page.screenshot({ type: "jpeg", quality: 85 });
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
  cek("pulau masih tergambar setelah diputar (bukan layar kosong)", warna > 50, `${warna} warna`);
  cek("tanpa galat JavaScript saat berputar", galat.length === 0, galat[0] ?? "");
  await ctx.close();
}

await browser.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
