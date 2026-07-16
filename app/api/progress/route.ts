import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { ACHIEVEMENTS, SKILLS, HEROES, GEAR, levelFromXp } from "@/lib/content";

export async function GET() {
  await ensureSchema();
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });
  const rows = await sql`SELECT * FROM progress WHERE user_id = ${user.id}`;
  if (!rows.length) {
    await sql`INSERT INTO progress (user_id) VALUES (${user.id}) ON CONFLICT DO NOTHING`;
    return NextResponse.json({ progress: null });
  }
  const p = rows[0];
  return NextResponse.json({
    progress: {
      level: p.level, xp: p.xp, stars: p.stars,
      blocks: p.blocks, stats: p.stats,
      achievements: p.achievements, skills: p.skills,
      heroes: p.heroes, gear: p.gear, activeHero: p.active_hero,
    },
  });
}

export async function PUT(req: Request) {
  await ensureSchema();
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Permintaan tidak sah" }, { status: 400 });

  const stats: Record<string, number> = {};
  for (const [k, v] of Object.entries(body.stats ?? {}))
    if (typeof v === "number" && isFinite(v)) stats[k] = Math.max(0, Math.floor(v));
  const stars = Math.min(24, Math.max(0, Math.floor(Number(body.stars) || 0)));
  stats.stars = Math.max(stats.stars ?? 0, stars);

  const blocks = Array.isArray(body.blocks)
    ? body.blocks.slice(0, 4000).filter(
        (b: unknown): b is { x: number; y: number; z: number; c: number } => {
          const o = b as Record<string, unknown>;
          return (
            typeof o?.x === "number" && typeof o?.y === "number" &&
            typeof o?.z === "number" && typeof o?.c === "number"
          );
        }
      )
    : [];

  // progres tidak pernah mundur: gabungkan dengan yang tersimpan
  const prevRows = await sql`SELECT * FROM progress WHERE user_id = ${user.id}`;
  const prev = prevRows[0];
  const prevStats: Record<string, number> = (prev?.stats as Record<string, number>) ?? {};
  for (const [k, v] of Object.entries(prevStats))
    stats[k] = Math.max(stats[k] ?? 0, v);

  // hitung pencapaian & xp di sisi server
  const unlocked = ACHIEVEMENTS.filter((a) => (stats[a.stat] ?? 0) >= a.need).map((a) => a.id);
  const prevAch: string[] = (prev?.achievements as string[]) ?? [];
  const achievements = Array.from(new Set([...prevAch, ...unlocked]));
  const xp = Math.max(
    Number(prev?.xp ?? 0),
    ACHIEVEMENTS.filter((a) => achievements.includes(a.id)).reduce((s, a) => s + a.xp, 0)
  );
  const level = Math.max(Number(prev?.level ?? 1), levelFromXp(xp));
  const skills = SKILLS.filter((s) => s.levelNeed <= level).map((s) => s.id);
  const heroes = HEROES.filter((h) => h.levelNeed <= level).map((h) => h.id);
  const gear = GEAR.filter((g) => g.levelNeed <= level).map((g) => g.id);
  const prevHeroes: string[] = (prev?.heroes as string[]) ?? [];
  const allHeroes = Array.from(new Set([...prevHeroes, ...heroes]));
  const activeHero = allHeroes.includes(String(body.activeHero))
    ? String(body.activeHero)
    : (prev?.active_hero ?? "penjelajah");

  await sql`
    INSERT INTO progress (user_id, level, xp, stars, blocks, stats, achievements, skills, heroes, gear, active_hero, updated_at)
    VALUES (${user.id}, ${level}, ${xp}, ${stats.stars}, ${JSON.stringify(blocks)}, ${JSON.stringify(stats)},
            ${JSON.stringify(achievements)}, ${JSON.stringify(Array.from(new Set([...(prev?.skills as string[] ?? []), ...skills])))},
            ${JSON.stringify(allHeroes)}, ${JSON.stringify(Array.from(new Set([...(prev?.gear as string[] ?? []), ...gear])))},
            ${activeHero}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      level = EXCLUDED.level, xp = EXCLUDED.xp, stars = EXCLUDED.stars,
      blocks = EXCLUDED.blocks, stats = EXCLUDED.stats,
      achievements = EXCLUDED.achievements, skills = EXCLUDED.skills,
      heroes = EXCLUDED.heroes, gear = EXCLUDED.gear,
      active_hero = EXCLUDED.active_hero, updated_at = NOW()`;

  return NextResponse.json({ ok: true, level, xp, achievements });
}
