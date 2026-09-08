// Dulu pindah halaman memperlihatkan putih kosong sesaat. Anak menafsirkan
// layar kosong sebagai "rusak" dan menekan tombol berkali-kali. Kubus berputar
// ini memberi tahu bahwa sesuatu memang sedang berjalan.
export default function Memuat() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 bg-sky-100 p-8">
      <div className="h-12 w-12 animate-spin rounded-lg bg-emerald-500 shadow-lg" aria-hidden />
      <p className="text-lg font-semibold text-slate-700" role="status">
        Sebentar ya…
      </p>
    </main>
  );
}
