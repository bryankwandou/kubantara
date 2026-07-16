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
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
    })();
  }
  return ready;
}
