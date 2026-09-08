"use client";

import Link from "next/link";
import { useEffect } from "react";

// Kalau ada yang rusak, anak melihat pesan ramah — bukan tumpukan galat.
export default function Galat({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-5 bg-amber-50 p-8 text-center">
      <p className="text-7xl" aria-hidden>
        🛠️
      </p>
      <h1 className="text-2xl font-bold text-slate-800">Ada yang tersandung</h1>
      <p className="max-w-md text-slate-600">
        Bukan salahmu. Coba muat ulang — biasanya langsung beres.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-2xl bg-emerald-500 px-6 py-3 text-lg font-bold text-white shadow transition hover:bg-emerald-600"
        >
          Coba lagi
        </button>
        <Link
          href="/"
          className="rounded-2xl bg-white px-6 py-3 text-lg font-bold text-slate-700 shadow transition hover:bg-slate-50"
        >
          Ke beranda
        </Link>
      </div>
    </main>
  );
}
