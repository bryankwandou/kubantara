import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { currentUser } from "@/lib/auth";

// Main bersama keluarga: kirim posisiku, terima posisi saudara sekode.
// Sengaja hanya posisi & nama — tidak ada obrolan teks bebas sama sekali.
export async function POST(req: Request) {
  await ensureSchema();
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  const rows = await sql`SELECT username, family_code FROM users WHERE id = ${user.id}`;
  const code = rows[0]?.family_code as string | null;
  // tanpa kode keluarga, fitur ini mati total
  if (!code) return NextResponse.json({ enabled: false, teman: [] });

  const body = await req.json().catch(() => null);
  const num = (v: unknown, max = 200) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(-max, Math.min(max, n)) : 0;
  };
  const hero = String(body?.hero ?? "penjelajah").slice(0, 40);
  // hanya lambang dari daftar tetap yang diterima — tidak ada teks bebas
  const EMOTES = ["👋", "❤️", "😀", "🎉", "⭐", "👍"];
  const emote = typeof body?.emote === "string" && EMOTES.includes(body.emote) ? body.emote : null;

  await sql`
    INSERT INTO presence (user_id, family_code, username, x, y, z, hero, emote, emote_at, updated_at)
    VALUES (${user.id}, ${code}, ${rows[0].username}, ${num(body?.x)}, ${num(body?.y)}, ${num(body?.z)}, ${hero},
            ${emote}, ${emote ? new Date().toISOString() : null}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      family_code = EXCLUDED.family_code, x = EXCLUDED.x, y = EXCLUDED.y, z = EXCLUDED.z,
      hero = EXCLUDED.hero, updated_at = NOW(),
      -- emote lama dipertahankan kalau kiriman kali ini tidak membawa emote
      emote = COALESCE(EXCLUDED.emote, presence.emote),
      emote_at = COALESCE(EXCLUDED.emote_at, presence.emote_at)`;

  // hanya yang aktif 15 detik terakhir dianggap sedang online
  const teman = await sql`
    SELECT username, x, y, z, hero,
           -- emote hanya ikut terkirim kalau baru dilambaikan 5 detik terakhir
           CASE WHEN emote_at > NOW() - INTERVAL '5 seconds' THEN emote END AS emote
    FROM presence
    WHERE family_code = ${code} AND user_id <> ${user.id}
      AND updated_at > NOW() - INTERVAL '15 seconds'
    LIMIT 11`;

  // ----- balok bersama -----
  const SHAPES = new Set(["kubus", "kaca", "lampu", "setengah"]);
  const baru = Array.isArray(body?.blokBaru) ? body.blokBaru.slice(0, 40) : [];
  for (const b of baru) {
    const x = Math.round(num(b?.x, 60)), y = Math.round(num(b?.y, 60)), z = Math.round(num(b?.z, 60));
    const c = Math.max(0, Math.min(0xffffff, Math.floor(Number(b?.c) || 0)));
    const s = typeof b?.s === "string" && SHAPES.has(b.s) ? b.s : "kubus";
    await sql`
      INSERT INTO family_blocks (family_code, by_user, x, y, z, c, s)
      VALUES (${code}, ${user.id}, ${x}, ${y}, ${z}, ${c}, ${s})`;
  }

  // ambil balok saudara yang lebih baru dari penanda terakhir klien
  const sejak = Math.max(0, Math.floor(Number(body?.sejak) || 0));
  const blok = await sql`
    SELECT id, x, y, z, c, s FROM family_blocks
    WHERE family_code = ${code} AND by_user <> ${user.id} AND id > ${sejak}
    ORDER BY id ASC LIMIT 200`;

  // penanda tertinggi yang pernah terlihat, termasuk milik sendiri, supaya
  // klien tidak menarik ulang balok lama tanpa henti
  const puncak = await sql`
    SELECT COALESCE(MAX(id), 0) AS max_id FROM family_blocks WHERE family_code = ${code}`;

  return NextResponse.json({
    enabled: true,
    teman: teman.map((t) => ({
      username: t.username, x: Number(t.x), y: Number(t.y), z: Number(t.z),
      hero: t.hero, emote: t.emote ?? undefined,
    })),
    blok: blok.map((b) => ({ x: Number(b.x), y: Number(b.y), z: Number(b.z), c: Number(b.c), s: b.s })),
    sampai: Number(puncak[0]?.max_id ?? sejak),
  });
}
