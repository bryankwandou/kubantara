import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { currentUser, clearSession } from "@/lib/auth";
import { sql, ensureSchema } from "@/lib/db";

// Menghapus akun beserta seluruh jejak anak. Kebijakan privasi menjanjikan ini
// dan UU PDP mewajibkannya — jadi ia harus benar-benar menghapus baris, bukan
// menandainya "nonaktif" lalu menyimpannya diam-diam.
//
// Progres, kehadiran, dan balok bersama ikut terhapus lewat ON DELETE CASCADE
// pada foreign key-nya; babak dungeon juga. Yang tersisa hanya baris
// signup_attempts yang isinya sidik jaringan tanpa identitas.
export async function DELETE(req: Request) {
  await ensureSchema();
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  // Kata sandi diminta lagi supaya laptop yang ditinggal terbuka di meja tidak
  // bisa dipakai siapa pun untuk menghapus hasil kerja anak berbulan-bulan.
  const body = await req.json().catch(() => null);
  const sandi = String(body?.password ?? "");
  if (!sandi) return NextResponse.json({ error: "Masukkan kata sandi untuk memastikan" }, { status: 400 });

  const baris = await sql`SELECT password_hash FROM users WHERE id = ${user.id}`;
  if (!baris.length) return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
  if (!(await bcrypt.compare(sandi, baris[0].password_hash)))
    return NextResponse.json({ error: "Kata sandi salah" }, { status: 401 });

  await sql`DELETE FROM users WHERE id = ${user.id}`;
  await clearSession();
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
