import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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
    SELECT u.id, u.username, u.created_at, u.daily_limit_minutes, u.family_code,
           p.level, p.xp, p.stars, p.stats, p.achievements, p.quests,
           p.play_seconds, p.play_today_seconds, p.play_date, p.updated_at
    FROM users u
    LEFT JOIN progress p ON p.user_id = u.id
    WHERE u.role = 'anak'
    ORDER BY u.username ASC`;

  const today = new Date().toISOString().slice(0, 10);

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
      // hanya hitung jika catatannya memang dari hari ini
      todayMinutes: r.play_date && new Date(r.play_date as string).toISOString().slice(0, 10) === today
        ? Math.round(Number(r.play_today_seconds ?? 0) / 60)
        : 0,
      limitMinutes: Number(r.daily_limit_minutes ?? 0),
      familyCode: (r.family_code as string | null) ?? "",
      lastPlayed: r.updated_at,
      stats: (r.stats as Record<string, number>) ?? {},
    })),
  });
}

// Orang tua mengatur batas main harian seorang anak. 0 = tanpa batas.
export async function PUT(req: Request) {
  await ensureSchema();
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  const me = await sql`SELECT role FROM users WHERE id = ${user.id}`;
  if (me[0]?.role !== "ortu")
    return NextResponse.json({ error: "Hanya orang tua yang boleh mengubah batas" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const childId = Math.floor(Number(body?.childId));
  if (!Number.isFinite(childId) || childId <= 0)
    return NextResponse.json({ error: "Anak tidak dikenali" }, { status: 400 });

  // Reset sandi anak: anak tak punya email, jadi orang tua yang memulihkan.
  // Sekaligus buka kunci jika akun sempat terkunci karena salah berkali-kali.
  if (body?.newPassword !== undefined) {
    const pw = String(body.newPassword ?? "");
    if (pw.length < 4)
      return NextResponse.json({ error: "Sandi baru minimal 4 karakter" }, { status: 400 });
    const hash = await bcrypt.hash(pw, 10);
    const done = await sql`
      UPDATE users SET password_hash = ${hash}, failed_attempts = 0, lock_until = NULL
      WHERE id = ${childId} AND role = 'anak' RETURNING id`;
    if (!done.length) return NextResponse.json({ error: "Anak tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ ok: true, reset: true });
  }

  // batasi hanya ke akun anak, supaya panel tak bisa mengubah akun ortu lain
  if (body?.familyCode !== undefined) {
    // kosong = matikan main bersama untuk anak ini
    const raw = String(body.familyCode ?? "").trim().toUpperCase().slice(0, 24);
    const code = raw === "" ? null : raw;
    if (code && !/^[A-Z0-9-]{4,24}$/.test(code))
      return NextResponse.json({ error: "Kode hanya boleh huruf, angka, dan tanda hubung (4-24 karakter)" }, { status: 400 });
    const done = await sql`
      UPDATE users SET family_code = ${code}
      WHERE id = ${childId} AND role = 'anak' RETURNING id`;
    if (!done.length) return NextResponse.json({ error: "Anak tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ ok: true, familyCode: code });
  }

  const minutes = Math.min(600, Math.max(0, Math.floor(Number(body?.minutes) || 0)));
  const done = await sql`
    UPDATE users SET daily_limit_minutes = ${minutes}
    WHERE id = ${childId} AND role = 'anak' RETURNING id`;
  if (!done.length) return NextResponse.json({ error: "Anak tidak ditemukan" }, { status: 404 });

  return NextResponse.json({ ok: true, minutes });
}
