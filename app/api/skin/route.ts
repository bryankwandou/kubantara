import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { SKINS } from "@/lib/skins";
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

// Beli skin: mint 1 token skin ke akun anak di devnet. Server yang menandatangani
// atas nama guardian — anak tak pernah pegang dompet. Keping (mata uang dalam game)
// dikelola di sisi klien; ini demo devnet kosmetik, taruhannya kecil.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user?.u) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const skinId = String(body?.skinId ?? "");
  const skin = SKINS.find((s) => s.id === skinId);
  if (!skin) return NextResponse.json({ error: "Skin tidak dikenali" }, { status: 400 });
  if (!hasMints()) return NextResponse.json({ error: "Toko belum siap (mint devnet belum dibuat)" }, { status: 503 });

  try {
    const already = await ownedSkins(user.u);
    if (already.includes(skinId)) return NextResponse.json({ error: "Skin ini sudah dimiliki" }, { status: 409 });
    const { sig, explorer, account } = await buySkin(user.u, skinId);
    return NextResponse.json({ ok: true, skinId, sig, explorer, account });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal membeli on-chain: " + ((e as Error).message ?? "tak diketahui") },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
