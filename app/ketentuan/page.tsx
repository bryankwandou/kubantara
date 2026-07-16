import Link from "next/link";

export const metadata = { title: "Syarat & Ketentuan — Kubantara" };

export default function KetentuanPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-200">
      <div className="mx-auto max-w-2xl">
        <Link href="/daftar" className="text-sm text-slate-400 hover:text-cyan-300">&larr; Kembali ke pendaftaran</Link>
        <h1 className="mt-4 text-3xl font-black text-white">Syarat &amp; Ketentuan</h1>
        <div className="mt-6 space-y-4 leading-relaxed text-slate-300">
          <p>1. Kubantara adalah permainan gratis untuk anak-anak. Akun dibuat oleh orang tua atau wali, dan digunakan di bawah pengawasan mereka.</p>
          <p>2. Tidak ada pembelian di dalam permainan, tidak ada iklan, dan tidak ada obrolan dengan orang asing.</p>
          <p>3. Satu akun untuk satu anak agar progres (bintang, bangunan, pencapaian, pahlawan) tersimpan rapi.</p>
          <p>4. Dilarang membagikan kata sandi kepada orang lain. Orang tua bertanggung jawab menjaga kerahasiaan akun.</p>
          <p>5. Kami dapat memperbarui permainan sewaktu-waktu untuk menambah fitur atau memperbaiki masalah. Progres yang tersimpan akan tetap dijaga sebisa mungkin.</p>
          <p>6. Layanan diberikan apa adanya, tanpa jaminan, dan dapat dihentikan sewaktu-waktu.</p>
        </div>
      </div>
    </main>
  );
}
