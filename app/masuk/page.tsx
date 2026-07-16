"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MasukPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.error ?? "Terjadi kesalahan"); return; }
    router.push("/play");
  }

  const input =
    "w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition-colors focus:border-cyan-400";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-slate-400 hover:text-cyan-300">&larr; Kembali</Link>
        <h1 className="mt-4 text-3xl font-black">Masuk ke Kubantara</h1>
        <p className="mt-2 text-slate-400">Lanjutkan petualangan dari tempat terakhir kamu berhenti.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <input className={input} placeholder="Nama pengguna atau email" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          <input className={input} type="password" placeholder="Kata sandi" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          {err && <p className="rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-300">{err}</p>}
          <button
            disabled={busy}
            className="w-full rounded-xl bg-emerald-500 py-3.5 text-lg font-black text-slate-950 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {busy ? "Sebentar..." : "Masuk"}
          </button>
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-xl border border-slate-700 py-3.5 font-semibold text-slate-500"
          >
            Masuk dengan Google — segera hadir
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">
          Belum punya akun? <Link href="/daftar" className="text-cyan-300 underline">Daftar dulu</Link>
        </p>
      </div>
    </main>
  );
}
