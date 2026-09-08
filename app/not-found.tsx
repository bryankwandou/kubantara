import Link from "next/link";

// Anak yang tersesat tak boleh melihat layar teknis. Bahasanya menenangkan,
// dan hanya ada satu jalan keluar yang jelas.
export default function TidakDitemukan() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-5 bg-sky-100 p-8 text-center">
      <p className="text-7xl" aria-hidden>
        🧭
      </p>
      <h1 className="text-2xl font-bold text-slate-800">Halaman ini tidak ada di peta</h1>
      <p className="max-w-md text-slate-600">
        Mungkin tautannya salah ketik. Tidak apa-apa — kita kembali ke pulau saja.
      </p>
      <Link
        href="/"
        className="rounded-2xl bg-emerald-500 px-6 py-3 text-lg font-bold text-white shadow transition hover:bg-emerald-600"
      >
        Kembali ke beranda
      </Link>
    </main>
  );
}
