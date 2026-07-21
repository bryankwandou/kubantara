"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ACHIEVEMENTS, QUESTS } from "@/lib/content";

interface Anak {
  id: number;
  username: string;
  level: number;
  xp: number;
  stars: number;
  achievements: number;
  quests: number;
  playMinutes: number;
  todayMinutes: number;
  limitMinutes: number;
  lastPlayed: string | null;
  stats: Record<string, number>;
}

const PILIHAN_BATAS = [0, 30, 45, 60, 90, 120];

export default function OrtuPage() {
  const [anak, setAnak] = useState<Anak[] | null>(null);
  const [err, setErr] = useState("");
  const [simpan, setSimpan] = useState<number | null>(null);

  async function ubahBatas(childId: number, minutes: number) {
    setSimpan(childId);
    const res = await fetch("/api/ortu", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, minutes }),
    });
    setSimpan(null);
    if (!res.ok) { setErr("Gagal menyimpan batas waktu"); return; }
    setAnak((prev) => prev?.map((a) => (a.id === childId ? { ...a, limitMinutes: minutes } : a)) ?? prev);
  }

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/ortu");
      const data = await res.json().catch(() => null);
      if (!res.ok) { setErr(data?.error ?? "Tidak bisa memuat data"); return; }
      setAnak(data.anak);
    })();
  }, []);

  if (err) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-slate-100">
        <p className="text-xl font-black">{err}</p>
        <Link href="/" className="rounded-xl bg-emerald-500 px-6 py-3 font-bold text-slate-950">
          Kembali ke beranda
        </Link>
      </main>
    );
  }

  if (!anak) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <p className="animate-pulse">Memuat data anak…</p>
      </main>
    );
  }

  const totalMenit = anak.reduce((s, a) => s + a.playMinutes, 0);

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm text-slate-400 hover:text-cyan-300">&larr; Beranda</Link>
        <h1 className="mt-4 text-3xl font-black">Panel Orang Tua</h1>
        <p className="mt-2 text-slate-400">
          Ringkasan {anak.length} akun anak. Data ini hanya terlihat oleh akun orang tua.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kartu label="Jumlah anak" nilai={String(anak.length)} />
          <Kartu label="Total waktu main" nilai={`${Math.floor(totalMenit / 60)}j ${totalMenit % 60}m`} />
          <Kartu label="Rata-rata level" nilai={anak.length ? String(Math.round(anak.reduce((s, a) => s + a.level, 0) / anak.length)) : "0"} />
          <Kartu label="Main hari ini" nilai={String(anak.filter((a) => a.lastPlayed && Date.now() - new Date(a.lastPlayed).getTime() < 864e5).length)} />
        </div>

        {anak.length === 0 ? (
          <p className="mt-8 rounded-2xl bg-slate-900 p-6 text-center text-slate-400">
            Belum ada akun anak yang terdaftar.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl bg-slate-900">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Anak</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Bintang</th>
                  <th className="px-4 py-3">Pencapaian</th>
                  <th className="px-4 py-3">Misi</th>
                  <th className="px-4 py-3">Hari ini</th>
                  <th className="px-4 py-3">Total main</th>
                  <th className="px-4 py-3">Batas harian</th>
                  <th className="px-4 py-3">Terakhir main</th>
                </tr>
              </thead>
              <tbody>
                {anak.map((a) => (
                  <tr key={a.id} className="border-t border-slate-800">
                    <td className="px-4 py-3 font-bold text-slate-100">{a.username}</td>
                    <td className="px-4 py-3 text-violet-300">Lv {a.level}</td>
                    <td className="px-4 py-3 text-amber-300">{a.stars}/24</td>
                    <td className="px-4 py-3 text-emerald-300">{a.achievements}/{ACHIEVEMENTS.length}</td>
                    <td className="px-4 py-3 text-cyan-300">{a.quests}/{QUESTS.length}</td>
                    <td className={`px-4 py-3 ${a.limitMinutes > 0 && a.todayMinutes >= a.limitMinutes ? "font-bold text-rose-400" : "text-slate-300"}`}>
                      {a.todayMinutes}m
                      {a.limitMinutes > 0 && <span className="text-slate-500"> / {a.limitMinutes}m</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {Math.floor(a.playMinutes / 60)}j {a.playMinutes % 60}m
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={a.limitMinutes}
                        disabled={simpan === a.id}
                        onChange={(e) => ubahBatas(a.id, Number(e.target.value))}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100 disabled:opacity-50"
                      >
                        {PILIHAN_BATAS.map((m) => (
                          <option key={m} value={m}>{m === 0 ? "Tanpa batas" : `${m} menit`}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {a.lastPlayed ? new Date(a.lastPlayed).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "Belum pernah"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
          <p className="font-bold text-slate-300">Cara kerja batas waktu</p>
          <p className="mt-1 leading-relaxed">
            Batas dicek setiap kali permainan menyimpan progres (tiap 20 detik), jadi anak
            bisa lewat paling lama sekitar 20 detik dari batas. Saat batas tercapai, layar
            &ldquo;Waktunya istirahat&rdquo; muncul dan progres tersimpan aman. Penghitung
            kembali nol tiap ganti hari. Pilih &ldquo;Tanpa batas&rdquo; untuk mematikannya.
          </p>
        </div>
      </div>
    </main>
  );
}

function Kartu({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="rounded-2xl bg-slate-900 p-4 text-center">
      <p className="text-2xl font-black text-slate-100">{nilai}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}
