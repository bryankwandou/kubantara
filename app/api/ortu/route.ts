import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { levelFromXp } from "@/lib/content";

// Ringkasan progres seluruh anak. Hanya boleh diakses akun berperan 'ortu'.
export async function GET() {
  await ensureSchema();
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  const me = await sql`SELECT role FROM users WHERE id = ${user.id}`;
  if (me[0]?.role !== "ortu")
    return NextResponse.json({ error: "Halaman ini hanya untuk orang tua" }, { status: 403 });

  const rows = await sql`
    SELECT u.id, u.username, u.created_at,
           p.level, p.xp, p.stars, p.stats, p.achievements, p.quests,
           p.play_seconds, p.updated_at
    FROM users u
    LEFT JOIN progress p ON p.user_id = u.id
    WHERE u.role = 'anak'
    ORDER BY u.username ASC`;

  return NextResponse.json({
    anak: rows.map((r) => ({
      id: Number(r.id),
      username: r.username,
      level: Math.max(Number(r.level ?? 1), levelFromXp(Number(r.xp ?? 0))),
      xp: Number(r.xp ?? 0),
      stars: Number(r.stars ?? 0),
      achievements: ((r.achievements as string[]) ?? []).length,
      quests: ((r.quests as string[]) ?? []).length,
      playMinutes: Math.round(Number(r.play_seconds ?? 0) / 60),
      lastPlayed: r.updated_at,
      stats: (r.stats as Record<string, number>) ?? {},
    })),
  });
}
