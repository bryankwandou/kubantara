// Menghapus akun yang dibuat oleh uji otomatis. Semua akun uji memakai domain
// @contoh.test yang tidak mungkin dipakai anak sungguhan, jadi itulah patokannya
// — bukan pola nama pengguna, yang bisa saja bentrok dengan nama anak.
// Jalankan: node scripts/bersihkan-akun-uji.mjs
import fs from "node:fs";
import { neon } from "@neondatabase/serverless";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const url = env.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m)?.[1];
if (!url) {
  console.error("DATABASE_URL tidak ditemukan di .env.local");
  process.exit(1);
}
const sql = neon(url);

const hapus = await sql`DELETE FROM users WHERE email LIKE '%@contoh.test' RETURNING username`;
await sql`DELETE FROM signup_attempts`;
const sisa = await sql`SELECT COUNT(*)::int AS n FROM users`;

console.log(`akun uji dihapus: ${hapus.length}`);
console.log(`akun tersisa di basis data: ${sisa[0].n}`);
