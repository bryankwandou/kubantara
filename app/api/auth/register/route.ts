import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql, ensureSchema } from "@/lib/db";
import { setSession } from "@/lib/auth";

export async function POST(req: Request) {
  await ensureSchema();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Permintaan tidak sah" }, { status: 400 });

  const username = String(body.username ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const confirm = String(body.confirm ?? "");
  const agreed = Boolean(body.agreed);

  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username))
    return NextResponse.json({ error: "Nama pengguna 3-24 huruf, angka, atau garis bawah" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "Alamat email tidak valid" }, { status: 400 });
  if (password.length < 8)
    return NextResponse.json({ error: "Kata sandi minimal 8 karakter" }, { status: 400 });
  if (password !== confirm)
    return NextResponse.json({ error: "Konfirmasi kata sandi tidak sama" }, { status: 400 });
  if (!agreed)
    return NextResponse.json({ error: "Centang persetujuan syarat & ketentuan dan kebijakan privasi dulu" }, { status: 400 });

  const dupe = await sql`SELECT id FROM users WHERE username = ${username} OR email = ${email} LIMIT 1`;
  if (dupe.length)
    return NextResponse.json({ error: "Nama pengguna atau email sudah terdaftar" }, { status: 409 });

  const hash = await bcrypt.hash(password, 10);
  const rows = await sql`
    INSERT INTO users (username, email, password_hash, accepted_terms)
    VALUES (${username}, ${email}, ${hash}, TRUE)
    RETURNING id, username`;
  const user = rows[0];
  await sql`INSERT INTO progress (user_id) VALUES (${user.id})`;
  await setSession(Number(user.id), user.username);
  return NextResponse.json({ ok: true, username: user.username });
}
