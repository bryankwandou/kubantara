// Membuat skema dan menanam akun uji dengan progres maksimal.
// Jalankan: SEED_USER=... SEED_PASS=... node scripts/seed.mjs
// Kredensial dibaca dari environment — tidak pernah ditulis di repo.
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";

// muat .env.local sederhana
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i > 0 && !process.env[line.slice(0, i)]) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
  }
} catch {}

const sql = neon(process.env.DATABASE_URL);
const USER = process.env.SEED_USER;
const PASS = process.env.SEED_PASS;
const EMAIL = process.env.SEED_EMAIL || "nayrbryangaming3@gmail.com";
if (!USER || !PASS) {
  console.error("Setel SEED_USER dan SEED_PASS lewat environment.");
  process.exit(1);
}

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

// katalog harus cocok dengan lib/content.ts
const ACH = ["bintang-1","bintang-8","bintang-24","balok-1","balok-50","balok-300","bongkar-20","sihir-1","sihir-30","sihir-100","naik-1","naik-15","lompat-100","jelajah-1000","jelajah-5000","malam-1"];
const SKILLS = ["langkah-cepat","lompat-tinggi","tangan-ajaib","panggil-hewan","sihir-ganda","mata-elang","kaki-air","cahaya-malam"];
const HEROES = ["penjelajah","penyihir","penjaga-hutan","pelaut","penjaga-fajar","bayangan-baik"];
const GEAR = ["palu-kayu","tongkat-bunga","palu-batu","tongkat-pelangi","sepatu-angin","peluit-emas","jubah-bintang","mahkota-kubantara"];
const stats = {
  stars: 24, blocksPlaced: 500, blocksRemoved: 100, spellsCast: 150,
  rides: 30, jumps: 300, distance: 8000, nights: 10,
};

const hash = await bcrypt.hash(PASS, 10);
const rows = await sql`
  INSERT INTO users (username, email, password_hash, accepted_terms)
  VALUES (${USER}, ${EMAIL}, ${hash}, TRUE)
  ON CONFLICT (username) DO UPDATE SET password_hash = ${hash}
  RETURNING id`;
const id = rows[0].id;
await sql`
  INSERT INTO progress (user_id, level, xp, stars, blocks, stats, achievements, skills, heroes, gear, active_hero)
  VALUES (${id}, 20, 99999, 24, '[]', ${JSON.stringify(stats)}, ${JSON.stringify(ACH)},
          ${JSON.stringify(SKILLS)}, ${JSON.stringify(HEROES)}, ${JSON.stringify(GEAR)}, 'penjaga-fajar')
  ON CONFLICT (user_id) DO UPDATE SET
    level = 20, xp = 99999, stars = 24,
    stats = EXCLUDED.stats, achievements = EXCLUDED.achievements,
    skills = EXCLUDED.skills, heroes = EXCLUDED.heroes, gear = EXCLUDED.gear,
    active_hero = 'penjaga-fajar', updated_at = NOW()`;
console.log(`Akun uji '${USER}' siap: level 20, 24 bintang, semua pencapaian/skill/pahlawan/peralatan terbuka.`);
