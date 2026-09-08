// Titik ukur latency yang bersih: tidak menyentuh database, tidak membaca sesi,
// tidak menulis apa pun. Hanya menjawab.
//
// Ini penting untuk pengukuran yang jujur. Dulu latency diukur ke /api/auth/me,
// yang setiap kali menanyakan sesi ke database Neon di benua lain — sehingga
// angkanya bercerita tentang jarak ke database, bukan tentang jaringan si anak.
// Dua hal itu perlu dipisah supaya jelas mana yang sebenarnya lambat.
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(JSON.stringify({ t: Date.now() }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
