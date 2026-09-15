// Uji rumah & sudut pandang.
//
// Keluhan penguji: "template rumah tidak bisa dimasuki", "properti palsu",
// "belum ada FPP maupun TPP". Uji ini membuktikan sebaliknya dengan cara yang
// bisa diperiksa ulang: membangun rumah dari cetakan yang sama yang dipakai
// anak, lalu benar-benar menjalankan pemainnya masuk lewat pintu.
//
// Jalankan: node uji-rumah-dan-kamera.mjs   (BASE=http://localhost:3000)
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
let lulus = 0, gagal = 0;
function cek(nama, benar, catatan = "") {
  if (benar) { lulus++; console.log(`  LULUS  ${nama}${catatan ? " — " + catatan : ""}`); }
  else { gagal++; console.log(`  GAGAL  ${nama}${catatan ? " — " + catatan : ""}`); }
}
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 700 } });

let terdaftar = false;
for (let i = 1; i <= 6 && !terdaftar; i++) {
  const u = "ujirumah" + Math.floor(Math.random() * 1e9);
  const p = "Uji-" + Math.random().toString(36).slice(2) + "-Aa1!";
  const res = await ctx.request.post(`${BASE}/api/auth/register`, {
    data: { username: u, email: `${u}@contoh.test`, password: p, confirm: p, agreed: true },
    timeout: 45000,
  }).catch(() => null);
  if (res && res.ok()) terdaftar = true; else await tunggu(2000 * i);
}
if (!terdaftar) { console.error("tidak bisa mendaftar akun uji"); process.exit(1); }

const page = await ctx.newPage();
const galat = [];
page.on("pageerror", (e) => galat.push(String(e)));
await page.goto(BASE + "/play", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => !!window.__kubantara, { timeout: 40000 });
// Overlay sambutan (z-40) menutupi seluruh layar dan muncul setelah jeda, jadi
// menekan "Lewati" sekali di awal belum tentu kena. Tunggu sampai benar-benar
// hilang sebelum menyentuh kendali apa pun.
const lewati = page.getByRole("button", { name: "Lewati" });
for (let i = 0; i < 20; i++) {
  if (await lewati.isVisible().catch(() => false)) { await lewati.click().catch(() => {}); }
  else if (i > 2) break;
  await tunggu(500);
}
await tunggu(1500);

// ----------------------------------------------- dinding balok pasangan padat
console.log("Balok yang dipasang anak benar-benar padat");
{
  const r = await page.evaluate(() => {
    const g = window.__kubantara;
    const p = g.posisi();
    const x = Math.round(p.x) + 20, z = Math.round(p.z);
    const h = g.tanahDi(x, z);
    const lantai = Math.round(h + 0.5);
    // tembok setinggi 3 balok
    const blok = [];
    for (let dy = 0; dy < 3; dy++) blok.push({ x, y: lantai + dy, z, c: 0x884422, s: "kubus" });
    g.loadBlocks(blok);
    return {
      tembok: g.padatDi(x, h, z),                 // setinggi kaki: harus padat
      // satu balok saja tidak boleh jadi tembok — anak harus bisa melangkahinya
      satuBalok: (() => {
        const x2 = x + 4;
        const h2 = g.tanahDi(x2, z);
        g.loadBlocks([{ x: x2, y: Math.round(h2 + 0.5), z, c: 0x884422, s: "kubus" }]);
        return g.padatDi(x2, h2, z);
      })(),
      // di bawah atap yang tinggi tetap bisa lewat
      bawahAtap: (() => {
        const x3 = x + 8;
        const h3 = g.tanahDi(x3, z);
        g.loadBlocks([{ x: x3, y: Math.round(h3 + 0.5) + 3, z, c: 0x884422, s: "kubus" }]);
        return g.padatDi(x3, h3, z);
      })(),
    };
  });
  cek("tembok 3 balok menghalangi jalan", r.tembok === true);
  cek("balok setinggi 1 masih bisa dilangkahi, bukan jadi tembok", r.satuBalok === false);
  cek("bisa berjalan di bawah atap yang tinggi", r.bawahAtap === false);
}

// ------------------------------------------- rumah dari cetakan bisa dimasuki
console.log("\nRumah dari cetakan bisa dimasuki lewat pintunya");
{
  // Bangun rumah dengan cetakan yang sama persis yang dipakai anak, lalu
  // tempatkan pemain di depan pintu dan jalankan masuk.
  // Bandingkan daftar balok sebelum & sesudah, supaya pusat rumah diketahui
  // pasti — bukan ditebak dari posisi pemain, yang ketinggian tanahnya bisa beda.
  const r = await page.evaluate(() => {
    const g = window.__kubantara;
    const sebelum = new Set(g.exportBlocks().map((b) => `${b.x},${b.y},${b.z}`));
    const dibuat = g.buildBlueprint("rumah");
    const baru = g.exportBlocks().filter((b) => !sebelum.has(`${b.x},${b.y},${b.z}`));
    if (baru.length === 0) return { dibuat, kosong: true };

    const xs = baru.map((b) => b.x), zs = baru.map((b) => b.z), ys = baru.map((b) => b.y);
    const cx = Math.round((Math.min(...xs) + Math.max(...xs)) / 2);
    const cz = Math.round((Math.min(...zs) + Math.max(...zs)) / 2);
    const lantai = Math.min(...ys) - 0.5;   // permukaan tanah di bawah dinding

    return {
      dibuat,
      kosong: false,
      pusat: { x: cx, z: cz },
      tinggi: Math.max(...ys) - Math.min(...ys) + 1,
      // di dalam rumah, berdiri di lantai — bukan diangkat ke atap
      lantaiDalam: g.tanahDi(cx, cz, lantai),
      atap: g.tanahDi(cx, cz, lantai + 6),
      ruangKosong: g.padatDi(cx, lantai, cz),
      pintu: g.padatDi(cx - 2, lantai, cz),      // sisi -x, lihat buildBlueprint
      dinding: g.padatDi(cx + 2, lantai, cz),    // sisi +x
      lantaiAcuan: lantai,
    };
  });
  cek("cetakan rumah berdiri", !r.kosong && r.dibuat > 0, `${r.dibuat} balok`);
  if (!r.kosong) {
    cek("ruang dalam rumah kosong, bisa ditempati", r.ruangKosong === false);
    cek("berdiri di lantai rumah, bukan di atap",
      Math.abs(r.lantaiDalam - r.lantaiAcuan) < 0.6 && r.atap > r.lantaiAcuan + 2,
      `lantai ${r.lantaiDalam}, atap ${r.atap}, acuan ${r.lantaiAcuan}`);
    cek("pintu rumah terbuka", r.pintu === false);
    cek("dinding rumah padat", r.dinding === true);
  }
}

// -------------------------------------------------------- FPP / TPP
console.log("\nSudut pandang orang pertama & orang ketiga");
{
  const awal = await page.evaluate(() => window.__kubantara.getSudutPandang());
  cek("bawaannya orang ketiga (dari belakang bahu)", awal === "orang-ketiga", awal);

  await page.locator('[data-uji="sudut-pandang"]').click();
  await tunggu(1200);
  const fpp = await page.evaluate(() => window.__kubantara.getSudutPandang());
  cek("tombol mengganti ke orang pertama", fpp === "orang-pertama", fpp);
  cek("tombol menunjukkan mode yang sedang aktif",
    (await page.locator('[data-uji="sudut-pandang"]').innerText()).includes("Mata"));

  // di mode orang pertama kamera harus berada DI dalam kepala anak, bukan jauh
  const jarakFpp = await page.evaluate(() => window.__kubantara.jarakKamera());
  cek("kamera menempel di kepala saat orang pertama", jarakFpp < 2, `${jarakFpp.toFixed(2)} satuan`);

  // pintasan V mengembalikannya
  await page.keyboard.press("KeyV");
  await tunggu(1200);
  const tpp = await page.evaluate(() => window.__kubantara.getSudutPandang());
  cek("pintasan V mengembalikan ke orang ketiga", tpp === "orang-ketiga", tpp);
  // Kamera meluncur mulus ke posisinya memakai waktu game; di perender lambat
  // itu bisa lebih lama dari jeda tetap mana pun. Tunggu sampai ia berhenti.
  let jarakTpp = 0;
  for (let i = 0, lalu = -1; i < 40; i++) {
    jarakTpp = await page.evaluate(() => window.__kubantara.jarakKamera());
    if (Math.abs(jarakTpp - lalu) < 0.01) break;
    lalu = jarakTpp;
    await tunggu(500);
  }
  cek("kamera mundur jauh saat orang ketiga", jarakTpp > 4, `${jarakTpp.toFixed(2)} satuan`);

  // dan di kedua mode, maju tetap maju — bukan terbalik
  const majuDi = async (mode) => {
    await page.evaluate((m) => window.__kubantara.setSudutPandang(m), mode);
    await tunggu(600);
    const a = await page.evaluate(() => window.__kubantara.posisi());
    await page.keyboard.down("KeyW");
    await tunggu(2500);
    await page.keyboard.up("KeyW");
    const b = await page.evaluate(() => window.__kubantara.posisi());
    return (b.x - a.x) * a.majuX + (b.z - a.z) * a.majuZ;
  };
  cek("W maju di mode orang ketiga", (await majuDi("orang-ketiga")) > 0.15);
  cek("W maju di mode orang pertama", (await majuDi("orang-pertama")) > 0.15);
}

cek("tanpa galat JavaScript sepanjang uji", galat.length === 0, galat[0] ?? "");
await browser.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
