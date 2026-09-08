import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";
import { bacaDompet, mulaiDungeon, selesaiDungeon, BIAYA_DUNGEON } from "@/lib/dompet";

// Resin & keping kristal. Klien hanya boleh bertanya dan meminta aksi —
// ia tidak pernah mengirim angka saldo. Semua penambahan dan pemotongan
// diputuskan di sini.
export async function GET() {
  await ensureSchema();
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });
  return NextResponse.json(await bacaDompet(user.id));
}

export async function POST(req: Request) {
  await ensureSchema();
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const aksi = String(body?.aksi ?? "");

  if (aksi === "masuk-dungeon") {
    const h = await mulaiDungeon(user.id);
    if (!h.ok)
      return NextResponse.json(
        { error: `Resin belum cukup (butuh ${BIAYA_DUNGEON}⚡). Tunggu isi ulang gratisnya.` },
        { status: 409 }
      );
    return NextResponse.json({ ok: true, babakId: h.babakId, ...h.dompet });
  }

  if (aksi === "selesai-dungeon") {
    const h = await selesaiDungeon(user.id, String(body?.babakId ?? ""));
    if (!h.ok)
      return NextResponse.json({ error: "Babak dungeon ini tidak berlaku" }, { status: 409 });
    return NextResponse.json({ ok: true, hadiah: h.hadiah, ...h.dompet });
  }

  return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
}

export const dynamic = "force-dynamic";
