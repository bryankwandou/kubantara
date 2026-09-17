// Dompet dalam game: resin (gratis, isi ulang sendiri) dan keping kristal
// (hadiah menyelesaikan dungeon, satu-satunya cara membeli skin).
//
// Semuanya dihitung di server. Klien hanya menampilkan angkanya; ia tidak
// pernah mengirim "keping saya sekarang 999". Dulu keduanya di localStorage,
// sehingga siapa pun yang membuka konsol peramban bisa memborong toko.
import { sql } from "./db";

export const RESIN_MAX = 60;
export const RESIN_REGEN_DETIK = 60; // +1 resin tiap menit → penuh dalam 1 jam
export const BIAYA_DUNGEON = 20;
export const HADIAH_DUNGEON = 3;

// Dungeon tercepat pun butuh waktu berjalan ke kristalnya. Kurang dari ini,
// yang terjadi hampir pasti pemanggilan langsung ke API, bukan permainan.
const MINIMAL_DETIK_DUNGEON = 15;

export interface Dompet {
  keping: number;
  resin: number;
  resinMax: number;
  resinBerikutDetik: number; // hitung mundur ke +1 resin; 0 kalau sudah penuh
}

function hitungResin(base: number, sejak: Date) {
  // resin_at dicatat oleh jam Postgres, Date.now() oleh jam server web. Kalau
  // jam database sedikit di depan, selisihnya negatif dan floor(-0,x) = -1:
  // akun baru terbaca 59 resin, bukan 60. Selisih negatif dianggap nol.
  const lewat = Math.max(0, Math.floor((Date.now() - sejak.getTime()) / 1000));
  const dapat = Math.floor(lewat / RESIN_REGEN_DETIK);
  const resin = Math.min(RESIN_MAX, base + dapat);
  const berikut = resin >= RESIN_MAX ? 0 : RESIN_REGEN_DETIK - (lewat % RESIN_REGEN_DETIK);
  return { resin, berikut };
}

export async function bacaDompet(userId: number): Promise<Dompet> {
  const baris = await sql`
    SELECT keping, resin_base, resin_at FROM progress WHERE user_id = ${userId}`;
  if (!baris.length) return { keping: 0, resin: RESIN_MAX, resinMax: RESIN_MAX, resinBerikutDetik: 0 };
  const { resin, berikut } = hitungResin(Number(baris[0].resin_base), new Date(baris[0].resin_at));
  return { keping: Number(baris[0].keping), resin, resinMax: RESIN_MAX, resinBerikutDetik: berikut };
}

// Membuka dungeon: potong resin lalu catat satu babak baru. Pemotongannya
// dilakukan Postgres dalam satu pernyataan dengan syarat "resin masih cukup",
// jadi dua permintaan yang datang bersamaan tidak bisa sama-sama lolos.
export async function mulaiDungeon(userId: number) {
  const potong = await sql`
    UPDATE progress SET
      resin_base = LEAST(${RESIN_MAX}, resin_base + FLOOR(EXTRACT(EPOCH FROM (NOW() - resin_at)) / ${RESIN_REGEN_DETIK}))::int - ${BIAYA_DUNGEON},
      resin_at = NOW()
    WHERE user_id = ${userId}
      AND LEAST(${RESIN_MAX}, resin_base + FLOOR(EXTRACT(EPOCH FROM (NOW() - resin_at)) / ${RESIN_REGEN_DETIK}))::int >= ${BIAYA_DUNGEON}
    RETURNING resin_base`;
  if (!potong.length) return { ok: false as const, alasan: "resin-kurang" };

  const babak = await sql`
    INSERT INTO dungeon_runs (user_id) VALUES (${userId}) RETURNING id`;
  return { ok: true as const, babakId: String(babak[0].id), dompet: await bacaDompet(userId) };
}

// Mengklaim hadiah. Babak yang sudah ditutup tidak bisa ditutup dua kali —
// syarat `finished_at IS NULL` ada di dalam UPDATE-nya, bukan dicek terpisah.
export async function selesaiDungeon(userId: number, babakId: string) {
  const id = Number(babakId);
  if (!Number.isSafeInteger(id)) return { ok: false as const, alasan: "babak-tak-dikenal" };

  const tutup = await sql`
    UPDATE dungeon_runs SET finished_at = NOW()
    WHERE id = ${id} AND user_id = ${userId} AND finished_at IS NULL
      AND started_at < NOW() - ${MINIMAL_DETIK_DUNGEON} * INTERVAL '1 second'
    RETURNING id`;
  if (!tutup.length) return { ok: false as const, alasan: "babak-tak-berlaku" };

  await sql`UPDATE progress SET keping = keping + ${HADIAH_DUNGEON} WHERE user_id = ${userId}`;
  return { ok: true as const, hadiah: HADIAH_DUNGEON, dompet: await bacaDompet(userId) };
}

// Membayar skin. Sama polanya: syarat "keping cukup" ada di dalam UPDATE,
// sehingga dua klik beli yang beruntun tidak bisa membeli dua skin dengan
// keping yang sama.
export async function bayarKeping(userId: number, harga: number) {
  const bayar = await sql`
    UPDATE progress SET keping = keping - ${harga}
    WHERE user_id = ${userId} AND keping >= ${harga}
    RETURNING keping`;
  return bayar.length ? { ok: true as const, sisa: Number(bayar[0].keping) } : { ok: false as const };
}

// Dipakai kalau mint on-chain gagal setelah keping terlanjur dipotong. Anak
// tidak boleh kehilangan hasil kerjanya gara-gara jaringan Solana sedang sibuk.
export async function kembalikanKeping(userId: number, harga: number) {
  await sql`UPDATE progress SET keping = keping + ${harga} WHERE user_id = ${userId}`;
}
