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
    SELECT id, username, password_hash FROM users
    WHERE username = ${username} OR email = ${username.toLowerCase()} LIMIT 1`;
  const user = rows[0];
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok)
    return NextResponse.json({ error: "Nama pengguna atau kata sandi salah" }, { status: 401 });

  await setSession(Number(user.id), user.username);
  return NextResponse.json({ ok: true, username: user.username });
}
