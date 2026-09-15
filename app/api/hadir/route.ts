import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { currentUser } from "@/lib/auth";

// Kehadiran waktu-nyata: posisi & lambaian anak-anak yang main bersama.
//
// Kenapa terpisah dari /api/bersama: di sana setiap tukar posisi menulis lalu
// membaca tabel `presence` di Neon. Satu putaran memakan ratusan milidetik,
// jadi posisi saudaranya selalu tertinggal dan permainan tidak pernah terasa
// bersamaan. Padahal posisi sama sekali tidak perlu disimpan permanen — kalau
// anaknya menutup tab, posisinya memang harus hilang.
//
// Jadi posisi disimpan di memori proses saja. Balok tetap lewat /api/bersama
// karena balok memang harus bertahan setelah semua orang pulang.
//
// Batasnya jujur: di satu server, semua anak berbagi memori yang sama dan ini
// bekerja sempurna. Kalau nanti dipasang di beberapa mesin (mis. serverless
// yang menskala otomatis), anak yang kebetulan dilayani mesin berbeda tidak
// akan saling terlihat. Untuk 12 anak satu keluarga di satu server, ini cukup;
// untuk skala lebih besar butuh Redis atau WebSocket bersama.

export const dynamic = "force-dynamic";

interface Hadir {
  username: string;
  x: number; y: number; z: number;
  hero: string;
  emote: string | null;
  emoteAt: number;
  updatedAt: number;
}

// Satu peta per kode keluarga. Disimpan di globalThis supaya hot-reload di
// mode pengembangan tidak mengosongkannya setiap berkas ini disimpan.
const g = globalThis as unknown as {
  __hadir?: Map<string, Map<number, Hadir>>;
  __kodeKeluarga?: Map<number, { kode: string | null; nama: string; sampai: number }>;
};
const HADIR = (g.__hadir ??= new Map());
const KODE = (g.__kodeKeluarga ??= new Map());

const HIDUP_MS = 6000;   // lebih lama dari ini dianggap sudah pergi
const EMOTE_MS = 5000;   // lambaian hanya terlihat sebentar
const KODE_MS = 60000;   // seberapa lama kode keluarga boleh dipakai dari ingatan

// Kode keluarga jarang berubah, jadi tidak perlu ditanyakan ke database setiap
// beberapa ratus milidetik — itu akan mengembalikan persoalan yang mau dihindari.
async function kodeKeluarga(userId: number) {
  const simpan = KODE.get(userId);
  if (simpan && simpan.sampai > Date.now()) return simpan;
  const rows = await sql`SELECT username, family_code FROM users WHERE id = ${userId}`;
  const isi = {
    kode: (rows[0]?.family_code as string | null) ?? null,
    nama: (rows[0]?.username as string) ?? "anak",
    sampai: Date.now() + KODE_MS,
  };
  KODE.set(userId, isi);
  return isi;
}

const EMOTES = ["👋", "❤️", "😀", "🎉", "⭐", "👍"];

export async function POST(req: Request) {
  const t0 = Date.now();
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  const { kode, nama } = await kodeKeluarga(user.id);
  if (!kode) return NextResponse.json({ enabled: false, teman: [] });

  const body = await req.json().catch(() => null);
  const num = (v: unknown, max = 200) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(-max, Math.min(max, n)) : 0;
  };

  let ruang = HADIR.get(kode);
  if (!ruang) { ruang = new Map(); HADIR.set(kode, ruang); }

  const sebelum = ruang.get(user.id);
  const emote = typeof body?.emote === "string" && EMOTES.includes(body.emote) ? body.emote : null;
  ruang.set(user.id, {
    username: nama,
    x: num(body?.x), y: num(body?.y), z: num(body?.z),
    hero: String(body?.hero ?? "penjelajah").slice(0, 40),
    // lambaian yang tidak dikirim ulang tidak menghapus lambaian sebelumnya
    emote: emote ?? sebelum?.emote ?? null,
    emoteAt: emote ? Date.now() : (sebelum?.emoteAt ?? 0),
    updatedAt: Date.now(),
  });

  const sekarang = Date.now();
  const teman: unknown[] = [];
  for (const [id, h] of ruang) {
    if (sekarang - h.updatedAt > HIDUP_MS) { ruang.delete(id); continue; }
    if (id === user.id) continue;
    teman.push({
      username: h.username, x: h.x, y: h.y, z: h.z, hero: h.hero,
      emote: sekarang - h.emoteAt < EMOTE_MS ? h.emote : null,
    });
    if (teman.length >= 11) break;
  }

  return NextResponse.json({
    enabled: true,
    teman,
    // waktu yang benar-benar dihabiskan server. Klien memakainya untuk
    // memisahkan "server lambat" dari "jaringan lambat".
    msServer: Date.now() - t0,
  });
}
