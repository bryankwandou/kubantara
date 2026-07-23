import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql, ensureSchema } from "@/lib/db";
import { setSession } from "@/lib/auth";

export async function POST(req: Request) {
  await ensureSchema();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Permintaan tidak sah" }, { status: 400 });

  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  if (!username || !password)
    return NextResponse.json({ error: "Isi nama pengguna dan kata sandi" }, { status: 400 });

  const rows = await sql`
    SELECT id, username, password_hash, failed_attempts, lock_until FROM users
    WHERE username = ${username} OR email = ${username.toLowerCase()} LIMIT 1`;
  const user = rows[0];

  // Akun terkunci sementara karena terlalu banyak salah — tolak lebih dulu.
  if (user && user.lock_until && new Date(user.lock_until) > new Date()) {
    const detik = Math.ceil((new Date(user.lock_until).getTime() - Date.now()) / 1000);
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${detik} detik.` },
      { status: 429 }
    );
  }

  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) {
    // Hitung kegagalan. Setelah 5 kali salah, kunci 60 detik lalu reset.
    if (user) {
      const next = Number(user.failed_attempts ?? 0) + 1;
      if (next >= 5) {
        await sql`UPDATE users SET failed_attempts = 0,
          lock_until = NOW() + INTERVAL '60 seconds' WHERE id = ${user.id}`;
      } else {
        await sql`UPDATE users SET failed_attempts = ${next} WHERE id = ${user.id}`;
      }
    }
    return NextResponse.json({ error: "Nama pengguna atau kata sandi salah" }, { status: 401 });
  }

  // berhasil: nolkan penghitung kegagalan & buka kunci
  await sql`UPDATE users SET failed_attempts = 0, lock_until = NULL WHERE id = ${user.id}`;
  await setSession(Number(user.id), user.username);
  return NextResponse.json({ ok: true, username: user.username });
}
