// Membuat akun untuk anak-anak sekaligus, dengan kata sandi acak yang mudah dibaca.
//
// Cara pakai:
//   1. Buat berkas `nama-anak.txt` di akar proyek, satu nama per baris. Contoh:
//        bintang
//        kirana
//        samudra
//   2. Jalankan: node scripts/buat-akun-anak.mjs
//   3. Kata sandi tercetak ke layar DAN tersimpan di `akun-anak.txt`.
//
// Kedua berkas itu sudah masuk .gitignore — tidak akan pernah ikut ter-push.
// Tambahkan KODE_KELUARGA=... untuk langsung menyalakan main bersama.
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { readFileSync, writeFileSync } from "fs";
import { randomInt } from "crypto";

// muat .env.local sederhana
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i > 0 && !process.env[line.slice(0, i)]) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
  }
} catch {}

const sql = neon(process.env.DATABASE_URL);
const KODE = (process.env.KODE_KELUARGA ?? "").trim().toUpperCase() || null;

let nama;
try {
  nama = readFileSync(new URL("../nama-anak.txt", import.meta.url), "utf8")
    .split("\n").map((s) => s.trim()).filter(Boolean);
} catch {
  console.error("Buat dulu berkas 'nama-anak.txt' di akar proyek, satu nama anak per baris.");
  process.exit(1);
}
if (!nama.length) { console.error("'nama-anak.txt' kosong."); process.exit(1); }

// Kata sandi ramah anak: dua kata + angka. Mudah diketik, tetap sulit ditebak
// karena dipilih acak-aman dari 40x40x900 kemungkinan.
const KATA1 = ["bintang","langit","pelangi","gunung","sungai","hutan","ombak","embun","fajar","senja",
  "awan","kilat","bulan","angin","batu","daun","bunga","madu","salju","pasir"];
const KATA2 = ["ceria","berani","cerdas","hebat","kuat","riang","gesit","tangguh","lincah","baik",
  "manis","rajin","jujur","sabar","hangat","cerah","damai","gembira","tenang","setia"];
const sandiBaru = () =>
  `${KATA1[randomInt(KATA1.length)]}-${KATA2[randomInt(KATA2.length)]}-${randomInt(100, 1000)}`;

await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'anak'`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS family_code TEXT`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_limit_minutes INT NOT NULL DEFAULT 0`;

const hasil = [];
for (const n of nama) {
  const username = n.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24);
  if (username.length < 3) { console.log(`- '${n}' dilewati (nama terlalu pendek setelah dibersihkan)`); continue; }

  const ada = await sql`SELECT id FROM users WHERE username = ${username}`;
  if (ada.length) {
    // akun sudah ada: jangan timpa sandinya, cukup pastikan peran & kode keluarga
    await sql`UPDATE users SET role = 'anak', family_code = COALESCE(${KODE}, family_code) WHERE id = ${ada[0].id}`;
    console.log(`- ${username}: sudah ada, sandi TIDAK diubah`);
    hasil.push({ username, sandi: "(tidak diubah — akun sudah ada)" });
    continue;
  }

  const sandi = sandiBaru();
  const hash = await bcrypt.hash(sandi, 10);
  const rows = await sql`
    INSERT INTO users (username, email, password_hash, accepted_terms, role, family_code)
    VALUES (${username}, ${username.toLowerCase() + "@kubantara.lokal"}, ${hash}, TRUE, 'anak', ${KODE})
    RETURNING id`;
  await sql`INSERT INTO progress (user_id) VALUES (${rows[0].id}) ON CONFLICT DO NOTHING`;
  console.log(`- ${username}: dibuat`);
  hasil.push({ username, sandi });
}

const lebar = Math.max(...hasil.map((h) => h.username.length), 8);
const teks = [
  "KARTU MASUK KUBANTARA — SIMPAN BAIK-BAIK, JANGAN DIBAGIKAN",
  `Dibuat: ${new Date().toLocaleString("id-ID")}`,
  `Alamat: https://kubantara.vercel.app/masuk`,
  KODE ? `Kode keluarga: ${KODE} (mereka bisa saling melihat saat main)` : "Main bersama: belum aktif",
  "",
  ...hasil.map((h) => `${h.username.padEnd(lebar)}  ${h.sandi}`),
  "",
  "Ganti kode keluarga atau batas waktu main di https://kubantara.vercel.app/ortu",
].join("\n");

writeFileSync(new URL("../akun-anak.txt", import.meta.url), teks + "\n", "utf8");
console.log("\n" + teks);
console.log("\nTersimpan di 'akun-anak.txt' (sudah masuk .gitignore).");
