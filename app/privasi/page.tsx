import Link from "next/link";

export const metadata = { title: "Kebijakan Privasi — Kubantara" };

export default function PrivasiPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-200">
      <div className="mx-auto max-w-2xl">
        <Link href="/daftar" className="text-sm text-slate-400 hover:text-cyan-300">&larr; Kembali ke pendaftaran</Link>
        <h1 className="mt-4 text-3xl font-black text-white">Kebijakan Privasi</h1>
        <div className="mt-6 space-y-4 leading-relaxed text-slate-300">
          <p>1. Data yang kami simpan hanya: nama pengguna, alamat email, kata sandi yang sudah diacak (hash), dan progres permainan (bintang, bangunan balok, statistik main, pencapaian).</p>
          <p>2. Kata sandi tidak pernah disimpan dalam bentuk asli dan tidak bisa dibaca oleh siapa pun, termasuk kami.</p>
          <p>3. Kami tidak menjual, membagikan, atau memakai data untuk iklan. Tidak ada pelacak pihak ketiga di dalam permainan.</p>
          <p>4. Data progres dipakai semata-mata agar anak bisa melanjutkan permainannya di perangkat mana pun.</p>
          <p>5. Orang tua dapat meminta penghapusan akun beserta seluruh datanya kapan saja.</p>
          <p>6. Permainan ini tidak meminta lokasi, kontak, kamera, mikrofon, atau data perangkat lainnya.</p>
        </div>
      </div>
    </main>
  );
}
