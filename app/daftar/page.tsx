"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DaftarPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [agreed, setAgreed] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, agreed }),
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
        <h1 className="mt-4 text-3xl font-black">Buat akun Kubantara</h1>
        <p className="mt-2 text-slate-400">
          Progres bintang, bangunan, pahlawan, dan pencapaian anak tersimpan aman di akunnya sendiri.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <input className={input} placeholder="Nama pengguna" value={form.username} onChange={set("username")} autoComplete="username" />
          <input className={input} type="email" placeholder="Email" value={form.email} onChange={set("email")} autoComplete="email" />
          <input className={input} type="password" placeholder="Kata sandi (minimal 8 karakter)" value={form.password} onChange={set("password")} autoComplete="new-password" />
          <input className={input} type="password" placeholder="Ulangi kata sandi" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />
          <label className="flex items-start gap-3 text-sm text-slate-300">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-4 w-4 accent-cyan-400" />
            <span>
              Saya menyetujui <Link href="/ketentuan" className="text-cyan-300 underline">syarat &amp; ketentuan</Link> serta{" "}
              <Link href="/privasi" className="text-cyan-300 underline">kebijakan privasi</Link> Kubantara.
            </span>
          </label>
          {err && <p className="rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-300">{err}</p>}
          <button
            disabled={busy}
            className="w-full rounded-xl bg-amber-400 py-3.5 text-lg font-black text-slate-900 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {busy ? "Sebentar..." : "Daftar dan main"}
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
          Sudah punya akun? <Link href="/masuk" className="text-cyan-300 underline">Masuk di sini</Link>
        </p>
      </div>
    </main>
  );
}
