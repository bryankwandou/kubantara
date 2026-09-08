// Uji anak nakal: seorang anak membuka konsol peramban dan mencoba mencurangi
// dompetnya sendiri — mengaku punya sejuta keping, mengklaim hadiah dungeon
// tanpa main, mengklaim dua kali, menebak nomor babak orang lain. Semua harus
// ditolak server. Ditutup dengan uji hapus akun (janji di kebijakan privasi).
//
// Jalankan: node uji-dompet-dan-akun.mjs   (BASE=http://localhost:3000)
const BASE = process.env.BASE ?? "http://localhost:3000";

let lulus = 0;
let gagal = 0;
function cek(nama, benar, catatan = "") {
  if (benar) {
    lulus++;
    console.log(`  LULUS  ${nama}`);
  } else {
    gagal++;
    console.log(`  GAGAL  ${nama}${catatan ? " — " + catatan : ""}`);
  }
}

// Sesi disimpan di cookie httpOnly, jadi uji ini menyimpannya sendiri seperti
// peramban: satu toples cookie per "anak".
function toples() {
  const isi = new Map();
  return {
    simpan(res) {
      for (const baris of res.headers.getSetCookie?.() ?? []) {
        const [pasangan] = baris.split(";");
        const i = pasangan.indexOf("=");
        isi.set(pasangan.slice(0, i).trim(), pasangan.slice(i + 1).trim());
      }
    },
    kepala() {
      return [...isi].map(([k, v]) => `${k}=${v}`).join("; ");
    },
  };
}

async function panggil(jar, jalur, opsi = {}) {
  const res = await fetch(BASE + jalur, {
    ...opsi,
    headers: {
      "content-type": "application/json",
      ...(jar.kepala() ? { cookie: jar.kepala() } : {}),
      ...(opsi.headers ?? {}),
    },
  });
  jar.simpan(res);
  const teks = await res.text();
  let data = null;
  try {
    data = JSON.parse(teks);
  } catch {
    data = { mentah: teks.slice(0, 120) };
  }
  return { status: res.status, data };
}

const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));

console.log(`Menguji ${BASE}\n`);

// ---------- daftar satu akun uji ----------
const jar = toples();
const nama = "uji_dompet_" + Math.random().toString(36).slice(2, 8);
const sandi = "rahasia-kuat-123";

const daftar = await panggil(jar, "/api/auth/register", {
  method: "POST",
  body: JSON.stringify({
    username: nama,
    email: `${nama}@contoh.test`,
    password: sandi,
    confirm: sandi,
    agreed: true,
  }),
});
if (daftar.status !== 200) {
  console.error("tidak bisa mendaftar akun uji:", daftar.status, daftar.data);
  process.exit(1);
}
console.log(`akun uji: ${nama}\n`);

// ---------- dompet awal ----------
console.log("Dompet awal");
const awal = await panggil(jar, "/api/dompet");
cek("resin mulai penuh (60)", awal.data.resin === 60, `dapat ${awal.data.resin}`);
cek("keping mulai kosong", awal.data.keping === 0, `dapat ${awal.data.keping}`);
cek("resinMax dilaporkan", awal.data.resinMax === 60);

// ---------- curang: beli skin tanpa keping ----------
console.log("\nMencurangi toko");
const beliMiskin = await panggil(jar, "/api/skin", {
  method: "POST",
  body: JSON.stringify({ skinId: "kesatria-emas" }),
});
cek(
  "beli skin tanpa keping ditolak",
  beliMiskin.status === 409 || beliMiskin.status === 400 || beliMiskin.status === 503,
  `status ${beliMiskin.status}`
);

const beliPalsu = await panggil(jar, "/api/skin", {
  method: "POST",
  body: JSON.stringify({ skinId: "kesatria-emas", keping: 999999, harga: 0 }),
});
const setelahPalsu = await panggil(jar, "/api/dompet");
cek("kirim keping palsu di body diabaikan", setelahPalsu.data.keping === 0, `keping jadi ${setelahPalsu.data.keping}`);
cek("pembelian palsu tetap gagal", beliPalsu.status !== 200, `status ${beliPalsu.status}`);

// ---------- curang: klaim hadiah tanpa babak ----------
console.log("\nMencurangi dungeon");
const klaimHampa = await panggil(jar, "/api/dompet", {
  method: "POST",
  body: JSON.stringify({ aksi: "selesai-dungeon", babakId: "999999999" }),
});
cek("klaim babak yang tak pernah ada ditolak", klaimHampa.status === 409, `status ${klaimHampa.status}`);

const klaimNgawur = await panggil(jar, "/api/dompet", {
  method: "POST",
  body: JSON.stringify({ aksi: "selesai-dungeon", babakId: "bukan-angka" }),
});
cek("babakId bukan angka ditolak", klaimNgawur.status === 409, `status ${klaimNgawur.status}`);

// ---------- masuk dungeon sungguhan ----------
const masuk = await panggil(jar, "/api/dompet", {
  method: "POST",
  body: JSON.stringify({ aksi: "masuk-dungeon" }),
});
cek("masuk dungeon berhasil", masuk.status === 200, `status ${masuk.status}`);
cek("resin terpotong 20 di server", masuk.data.resin === 40, `dapat ${masuk.data.resin}`);
const babakId = masuk.data.babakId;

const buruBuru = await panggil(jar, "/api/dompet", {
  method: "POST",
  body: JSON.stringify({ aksi: "selesai-dungeon", babakId }),
});
cek("klaim seketika (tanpa main) ditolak", buruBuru.status === 409, `status ${buruBuru.status}`);

console.log("  … menunggu 16 detik supaya babaknya sah");
await tunggu(16000);

const klaim = await panggil(jar, "/api/dompet", {
  method: "POST",
  body: JSON.stringify({ aksi: "selesai-dungeon", babakId }),
});
cek("klaim setelah bermain berhasil", klaim.status === 200, `status ${klaim.status}`);
cek("keping bertambah 3", klaim.data.keping === 3, `dapat ${klaim.data.keping}`);

const klaimUlang = await panggil(jar, "/api/dompet", {
  method: "POST",
  body: JSON.stringify({ aksi: "selesai-dungeon", babakId }),
});
cek("klaim ganda pada babak sama ditolak", klaimUlang.status === 409, `status ${klaimUlang.status}`);
const setelahGanda = await panggil(jar, "/api/dompet");
cek("keping tetap 3 setelah klaim ganda", setelahGanda.data.keping === 3, `dapat ${setelahGanda.data.keping}`);

// ---------- kuras resin ----------
console.log("\nBatas resin");
let masukTerakhir = null;
for (let i = 0; i < 3; i++) {
  masukTerakhir = await panggil(jar, "/api/dompet", {
    method: "POST",
    body: JSON.stringify({ aksi: "masuk-dungeon" }),
  });
}
cek("resin habis menahan masuk dungeon", masukTerakhir.status === 409, `status ${masukTerakhir.status}`);

// ---------- akses tanpa sesi ----------
console.log("\nTanpa sesi");
const asing = toples();
const dompetAsing = await panggil(asing, "/api/dompet");
cek("dompet menolak yang belum masuk", dompetAsing.status === 401, `status ${dompetAsing.status}`);
const buktiAsing = await panggil(asing, "/api/bukti");
cek("bukti menolak yang belum masuk", buktiAsing.status === 401, `status ${buktiAsing.status}`);

// ---------- halaman bukti untuk orang tua ----------
console.log("\nHalaman bukti");
const bukti = await panggil(jar, "/api/bukti");
cek("bukti terbaca oleh pemiliknya", bukti.status === 200, `status ${bukti.status}`);
cek("bukti menyebut nama anak", bukti.data.username === nama, JSON.stringify(bukti.data).slice(0, 80));
cek("bukti berisi daftar milik", Array.isArray(bukti.data.milik));

// ---------- hapus akun ----------
console.log("\nHapus akun");
const hapusKosong = await panggil(jar, "/api/akun", { method: "DELETE", body: JSON.stringify({}) });
cek("hapus tanpa kata sandi ditolak", hapusKosong.status === 400, `status ${hapusKosong.status}`);

const hapusSalah = await panggil(jar, "/api/akun", {
  method: "DELETE",
  body: JSON.stringify({ password: "salah-sekali" }),
});
cek("hapus dengan kata sandi salah ditolak", hapusSalah.status === 401, `status ${hapusSalah.status}`);

const masihAda = await panggil(jar, "/api/dompet");
cek("akun masih hidup setelah percobaan gagal", masihAda.status === 200, `status ${masihAda.status}`);

const hapus = await panggil(jar, "/api/akun", {
  method: "DELETE",
  body: JSON.stringify({ password: sandi }),
});
cek("hapus dengan kata sandi benar berhasil", hapus.status === 200, `status ${hapus.status}`);

const setelahHapus = await panggil(jar, "/api/dompet");
cek("sesi ikut hilang setelah akun dihapus", setelahHapus.status === 401, `status ${setelahHapus.status}`);

const masukLagi = await panggil(toples(), "/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ username: nama, password: sandi }),
});
cek("akun yang dihapus tidak bisa masuk lagi", masukLagi.status === 401, `status ${masukLagi.status}`);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
