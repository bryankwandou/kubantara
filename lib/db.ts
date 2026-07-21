// Koneksi Neon Postgres (serverless) + inisialisasi skema.
import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);

let ready: Promise<void> | null = null;

// Dipanggil sekali per proses; aman dipanggil berulang.
export function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        accepted_terms BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS progress (
        user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        level INT NOT NULL DEFAULT 1,
        xp INT NOT NULL DEFAULT 0,
        stars INT NOT NULL DEFAULT 0,
        blocks JSONB NOT NULL DEFAULT '[]',
        stats JSONB NOT NULL DEFAULT '{}',
        achievements JSONB NOT NULL DEFAULT '[]',
        skills JSONB NOT NULL DEFAULT '[]',
        heroes JSONB NOT NULL DEFAULT '[]',
        gear JSONB NOT NULL DEFAULT '[]',
        active_hero TEXT NOT NULL DEFAULT 'penjelajah',
        quests JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`ALTER TABLE progress ADD COLUMN IF NOT EXISTS quests JSONB NOT NULL DEFAULT '[]'`;
      // peran akun: 'anak' (bawaan) atau 'ortu' yang boleh melihat panel pengawasan
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'anak'`;
      // total waktu bermain, dipakai panel orang tua
      await sql`ALTER TABLE progress ADD COLUMN IF NOT EXISTS play_seconds INT NOT NULL DEFAULT 0`;
      // batas main harian (menit); 0 = tanpa batas. Diatur orang tua.
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_limit_minutes INT NOT NULL DEFAULT 0`;
      // penghitung harian yang di-reset saat tanggalnya berganti
      await sql`ALTER TABLE progress ADD COLUMN IF NOT EXISTS play_today_seconds INT NOT NULL DEFAULT 0`;
      await sql`ALTER TABLE progress ADD COLUMN IF NOT EXISTS play_date DATE`;
      // kode keluarga: hanya anak dengan kode sama yang bisa saling melihat.
      // Diisi orang tua, tidak pernah diketik anak.
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS family_code TEXT`;
      // kehadiran pemain untuk main bersama (posisi saja, tanpa obrolan)
      await sql`CREATE TABLE IF NOT EXISTS presence (
        user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        family_code TEXT NOT NULL,
        username TEXT NOT NULL,
        x REAL NOT NULL DEFAULT 0,
        y REAL NOT NULL DEFAULT 0,
        z REAL NOT NULL DEFAULT 0,
        hero TEXT NOT NULL DEFAULT 'penjelajah',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS presence_family ON presence (family_code, updated_at)`;
      // emote terakhir; hanya lambang dari daftar tetap, bukan teks bebas
      await sql`ALTER TABLE presence ADD COLUMN IF NOT EXISTS emote TEXT`;
      await sql`ALTER TABLE presence ADD COLUMN IF NOT EXISTS emote_at TIMESTAMPTZ`;
      // balok yang dibangun bersama, agar terlihat oleh saudara sekode
      await sql`CREATE TABLE IF NOT EXISTS family_blocks (
        id BIGSERIAL PRIMARY KEY,
        family_code TEXT NOT NULL,
        by_user BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        x INT NOT NULL, y INT NOT NULL, z INT NOT NULL,
        c INT NOT NULL,
        s TEXT NOT NULL DEFAULT 'kubus',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS family_blocks_feed ON family_blocks (family_code, id)`;
    })();
  }
  return ready;
}
