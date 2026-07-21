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

  await sql`
    INSERT INTO presence (user_id, family_code, username, x, y, z, hero, updated_at)
    VALUES (${user.id}, ${code}, ${rows[0].username}, ${num(body?.x)}, ${num(body?.y)}, ${num(body?.z)}, ${hero}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      family_code = EXCLUDED.family_code, x = EXCLUDED.x, y = EXCLUDED.y, z = EXCLUDED.z,
      hero = EXCLUDED.hero, updated_at = NOW()`;

  // hanya yang aktif 15 detik terakhir dianggap sedang online
  const teman = await sql`
    SELECT username, x, y, z, hero FROM presence
    WHERE family_code = ${code} AND user_id <> ${user.id}
      AND updated_at > NOW() - INTERVAL '15 seconds'
    LIMIT 11`;

  return NextResponse.json({
    enabled: true,
    teman: teman.map((t) => ({
      username: t.username, x: Number(t.x), y: Number(t.y), z: Number(t.z), hero: t.hero,
    })),
  });
}
