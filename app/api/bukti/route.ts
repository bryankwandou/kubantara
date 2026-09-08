import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { SKINS } from "@/lib/skins";
import { ownedSkins, hasMints, skinMint, skinAccountKeypair, explorerAddr } from "@/lib/toko";

// Bukti kepemilikan skin, dibaca langsung dari rantai. Orang tua sering bertanya
// "jadi anak saya benar-benar punya apa?" — halaman /bukti memakai ini supaya
// jawabannya bisa diperiksa sendiri, bukan cuma dipercaya.
export async function GET() {
  const user = await currentUser();
  if (!user?.u) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });
  if (!hasMints()) return NextResponse.json({ username: user.u, siap: false, milik: [] });

  const owned = await ownedSkins(user.u).catch(() => [] as string[]);
  const milik = SKINS.filter((s) => owned.includes(s.id)).map((s) => {
    const akun = skinAccountKeypair(user.u, s.id).publicKey.toBase58();
    const mint = skinMint(s.id).toBase58();
    return {
      id: s.id,
      nama: s.name,
      emoji: s.emoji,
      shirt: s.shirt,
      pants: s.pants,
      akun,
      mint,
      akunExplorer: explorerAddr(akun),
      mintExplorer: explorerAddr(mint),
    };
  });
  return NextResponse.json({ username: user.u, siap: true, milik });
}

export const dynamic = "force-dynamic";
