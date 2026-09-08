"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Milik {
  id: string;
  nama: string;
  emoji: string;
  shirt: number;
  pants: number;
  akun: string;
  mint: string;
  akunExplorer: string;
  mintExplorer: string;
}

const warna = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

// Halaman untuk orang tua, bukan untuk anak. Isinya menjawab satu pertanyaan
// dengan jujur: barang apa yang sebenarnya dimiliki anak saya, dan bagaimana
// saya memeriksanya sendiri tanpa harus percaya pada situs ini.
export default function BuktiPage() {
  const router = useRouter();
  const [data, setData] = useState<{ username: string; siap: boolean; milik: Milik[] } | null>(null);
  const [gagal, setGagal] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/bukti", { cache: "no-store" }).catch(() => null);
      if (!res) { setGagal(true); return; }
      if (res.status === 401) { router.replace("/masuk"); return; }
      if (!res.ok) { setGagal(true); return; }
      setData(await res.json());
    })();
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/profil" className="text-sm text-slate-400 hover:text-cyan-300">&larr; Kembali ke profil</Link>
        <h1 className="mt-4 text-3xl font-black">Bukti kepemilikan skin</h1>
        <p className="mt-2 text-slate-400">
          Skin di Kubantara adalah barang hias — tidak memengaruhi permainan, tidak
          dibeli dengan uang, dan tidak bisa dijual. Kepemilikannya dicatat di
          jaringan uji Solana (devnet), yang koinnya <strong>tidak bernilai uang</strong>.
        </p>

        {gagal && (
          <p role="alert" className="mt-8 rounded-xl bg-rose-500/15 px-4 py-3 text-rose-300">
            Tidak bisa membaca data dari jaringan sekarang. Coba muat ulang sebentar lagi.
          </p>
        )}

        {!data && !gagal && <p className="mt-8 text-slate-400">Membaca dari jaringan Solana…</p>}

        {data && !data.siap && (
          <p className="mt-8 rounded-xl bg-amber-500/10 px-4 py-3 text-amber-200">
            Toko skin belum diaktifkan di server ini, jadi belum ada yang bisa ditampilkan.
          </p>
        )}

        {data?.siap && data.milik.length === 0 && (
          <div className="mt-8 rounded-2xl bg-slate-900 p-6">
            <p className="font-bold text-slate-200">{data.username} belum punya skin.</p>
            <p className="mt-2 text-sm text-slate-400">
              Skin didapat dengan menyelesaikan dungeon untuk mengumpulkan keping
              kristal. Tidak ada jalan lain — tidak ada pembelian dengan uang.
            </p>
          </div>
        )}

        {data?.siap && data.milik.length > 0 && (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-slate-400">
              {data.username} memiliki {data.milik.length} skin. Tiap baris bisa Anda
              buka sendiri di Solana Explorer untuk melihat catatan aslinya.
            </p>
            {data.milik.map((m) => (
              <div key={m.id} className="rounded-2xl bg-slate-900 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 flex-col overflow-hidden rounded-lg">
                    <span className="flex flex-1 items-center justify-center text-lg" style={{ background: warna(m.shirt) }}>
                      {m.emoji}
                    </span>
                    <span className="h-3.5 w-full" style={{ background: warna(m.pants) }} />
                  </span>
                  <p className="font-black text-slate-100">{m.nama}</p>
                </div>
                <dl className="mt-3 space-y-2 text-xs">
                  <div>
                    <dt className="text-slate-500">Jenis barang (mint)</dt>
                    <dd className="break-all font-mono text-slate-300">
                      {m.mint}{" "}
                      <a href={m.mintExplorer} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                        buka ↗
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Tempat penyimpanan milik anak</dt>
                    <dd className="break-all font-mono text-slate-300">
                      {m.akun}{" "}
                      <a href={m.akunExplorer} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                        buka ↗
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-slate-800 p-5 text-sm text-slate-400">
          <p className="font-bold text-slate-300">Yang perlu orang tua tahu</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Anak tidak pernah memegang dompet kripto, kunci, atau frasa pemulihan.</li>
            <li>Tempat penyimpanannya dikuasai server, jadi skin tidak bisa dipindahkan atau dijual anak.</li>
            <li>Ini jaringan uji. Tidak ada uang sungguhan yang masuk maupun keluar.</li>
            <li>Menghapus akun di halaman profil akan menghapus seluruh data anak dari basis data kami.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
