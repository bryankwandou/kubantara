import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";
import { SKINS } from "@/lib/skins";
import { bayarKeping, kembalikanKeping, bacaDompet } from "@/lib/dompet";
import { buySkin, ownedSkins, hasMints, skinMint, explorerAddr } from "@/lib/toko";

// Katalog skin + skin yang sudah dimiliki anak (dibaca dari saldo token devnet).
export async function GET() {
  const user = await currentUser();
  const catalog = SKINS.map((s) => ({
    ...s,
    mint: hasMints() ? (() => { try { return skinMint(s.id).toBase58(); } catch { return null; } })() : null,
    mintExplorer: hasMints() ? (() => { try { return explorerAddr(skinMint(s.id).toBase58()); } catch { return null; } })() : null,
  }));
  let owned: string[] = [];
  if (user?.u) {
    try { owned = await ownedSkins(user.u); } catch { owned = []; }
  }
  return NextResponse.json({ skins: catalog, owned });
}

// Beli skin: potong keping dari saldo SERVER, lalu mint 1 token skin ke akun
// anak di devnet. Server yang menandatangani atas nama guardian — anak tak
// pernah pegang dompet. Harga dibaca dari katalog di server, bukan dari badan
// permintaan, supaya "harga: 0" yang dikirim tangan tidak ada artinya.
export async function POST(req: Request) {
  await ensureSchema();
  const user = await currentUser();
  if (!user?.u) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const skinId = String(body?.skinId ?? "");
  const skin = SKINS.find((s) => s.id === skinId);
  if (!skin) return NextResponse.json({ error: "Skin tidak dikenali" }, { status: 400 });
  if (!hasMints()) return NextResponse.json({ error: "Toko belum siap (mint devnet belum dibuat)" }, { status: 503 });

  const already = await ownedSkins(user.u).catch(() => [] as string[]);
  if (already.includes(skinId)) return NextResponse.json({ error: "Skin ini sudah dimiliki" }, { status: 409 });

  const bayar = await bayarKeping(user.id, skin.price);
  if (!bayar.ok)
    return NextResponse.json(
      { error: `Keping belum cukup (butuh ${skin.price} 💎). Selesaikan dungeon untuk mengumpulkannya.` },
      { status: 409 }
    );

  try {
    const { sig, explorer, account } = await buySkin(user.u, skinId);
    return NextResponse.json({ ok: true, skinId, sig, explorer, account, ...(await bacaDompet(user.id)) });
  } catch (e) {
    // Solana sedang tak bisa dihubungi bukan salah anak — kepingnya dikembalikan.
    await kembalikanKeping(user.id, skin.price);
    return NextResponse.json(
      { error: "Gagal membeli on-chain, keping dikembalikan: " + ((e as Error).message ?? "tak diketahui") },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
