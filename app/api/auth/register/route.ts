import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createHmac } from "crypto";
import { sql, ensureSchema } from "@/lib/db";
import { setSession } from "@/lib/auth";

// Batas pendaftaran per jaringan per jam. Sengaja longgar: satu kelas berisi
// 12 anak yang mendaftar berbarengan lewat wifi yang sama tampak seperti satu
// alamat IP. Kalau batasnya ketat, anak ke-6 akan ditolak tanpa sebab yang bisa
// ia mengerti. 30 masih jauh di bawah kecepatan robot pendaftar massal.
const BATAS_PER_JAM = 30;

// Alamat IP anak tidak pernah disimpan mentah — hanya sidiknya.
function sidikJaringan(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "tak-diketahui";
  return createHmac("sha256", process.env.AUTH_SECRET ?? "kubantara")
    .update(ip)
    .digest("base64url");
}

export async function POST(req: Request) {
  await ensureSchema();

  const sidik = sidikJaringan(req);
  const baru = await sql`
    SELECT COUNT(*)::int AS n FROM signup_attempts
    WHERE ip_hash = ${sidik} AND created_at > NOW() - INTERVAL '1 hour'`;
  if (Number(baru[0].n) >= BATAS_PER_JAM)
    return NextResponse.json(
      { error: "Terlalu banyak pendaftaran dari jaringan ini. Coba lagi satu jam lagi." },
      { status: 429 }
    );

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
  // Yang dihitung hanya akun yang benar-benar jadi. Salah ketik email atau
  // konfirmasi sandi tidak boleh menghabiskan jatah anak — mereka pasti salah
  // ketik beberapa kali sebelum berhasil.
  await sql`INSERT INTO signup_attempts (ip_hash) VALUES (${sidik})`;
  await sql`DELETE FROM signup_attempts WHERE created_at < NOW() - INTERVAL '2 hours'`;
  await setSession(Number(user.id), user.username);
  return NextResponse.json({ ok: true, username: user.username });
}
