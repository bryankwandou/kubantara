"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ACHIEVEMENTS,
  QUESTS,
  SKILLS,
  HEROES,
  GEAR,
  levelFromXp,
  xpForLevel,
} from "@/lib/content";

interface ProgressData {
  level: number;
  xp: number;
  stars: number;
  stats: Record<string, number>;
  achievements: string[];
  skills: string[];
  heroes: string[];
  gear: string[];
  activeHero: string;
  quests: string[];
}

export default function ProfilPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [p, setP] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json()).catch(() => null);
      if (!me?.user) { router.replace("/masuk"); return; }
      setUsername(me.user.username);
      const data = await fetch("/api/progress").then((r) => r.json()).catch(() => null);
      const prog = data?.progress;
      setP({
        level: prog?.level ?? 1,
        xp: prog?.xp ?? 0,
        stars: prog?.stars ?? 0,
        stats: prog?.stats ?? {},
        achievements: prog?.achievements ?? [],
        skills: prog?.skills ?? [],
        heroes: prog?.heroes ?? ["penjelajah"],
        gear: prog?.gear ?? [],
        activeHero: prog?.activeHero ?? "penjelajah",
        quests: prog?.quests ?? [],
      });
      setLoading(false);
    })();
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/");
  }

  if (loading || !p) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <p className="animate-pulse">Memuat petualanganmu…</p>
      </main>
    );
  }

  const level = Math.max(p.level, levelFromXp(p.xp));
  const activeHero = HEROES.find((h) => h.id === p.activeHero);
  // XP terpakai untuk mencapai level saat ini, sisanya untuk bar level berjalan
  let spent = 0;
  for (let l = 1; l < level; l++) spent += xpForLevel(l);
  const intoLevel = p.xp - spent;
  const need = xpForLevel(level);
  const pct = Math.min(100, Math.round((intoLevel / need) * 100));

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/play" className="text-sm text-slate-400 hover:text-cyan-300">
            &larr; Kembali bermain
          </Link>
          <button
            onClick={logout}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-rose-300 transition-colors hover:border-rose-400 hover:bg-rose-500/10"
          >
            Keluar akun
          </button>
        </div>

        {/* Kartu identitas */}
        <div className="mt-6 flex items-center gap-4 rounded-3xl bg-gradient-to-br from-violet-600/30 to-sky-600/20 p-6">
          <span
            className="h-16 w-16 shrink-0 rounded-2xl shadow-lg"
            style={{
              backgroundColor: activeHero
                ? `#${activeHero.shirt.toString(16).padStart(6, "0")}`
                : "#e2554d",
            }}
          />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black">{username}</h1>
            <p className="text-sm text-slate-300">
              {activeHero?.name ?? "Penjelajah"} · Level {level}
            </p>
          </div>
        </div>

        {/* Bar XP */}
        <div className="mt-4 rounded-2xl bg-slate-900 p-4">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Level {level}</span>
            <span>{intoLevel}/{need} XP</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">Total {p.xp} XP terkumpul</p>
        </div>

        {/* Ringkasan angka */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Bintang" value={`${p.stars}/24`} tone="text-amber-300" />
          <Stat label="Pencapaian" value={`${p.achievements.length}/${ACHIEVEMENTS.length}`} tone="text-emerald-300" />
          <Stat label="Misi" value={`${p.quests.length}/${QUESTS.length}`} tone="text-cyan-300" />
          <Stat label="Keahlian" value={`${p.skills.length}/${SKILLS.length}`} tone="text-violet-300" />
        </div>

        {/* Statistik detail */}
        <Section title="Catatan petualangan">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Mini label="Balok dipasang" value={p.stats.blocksPlaced ?? 0} />
            <Mini label="Balok dibongkar" value={p.stats.blocksRemoved ?? 0} />
            <Mini label="Sihir dirapal" value={p.stats.spellsCast ?? 0} />
            <Mini label="Tunggangan" value={p.stats.rides ?? 0} />
            <Mini label="Lompatan" value={p.stats.jumps ?? 0} />
            <Mini label="Langkah" value={Math.floor(p.stats.distance ?? 0)} />
            <Mini label="Malam dilalui" value={p.stats.nights ?? 0} />
            <Mini label="Sahabat ditemui" value={p.stats.npcMet ?? 0} />
          </div>
        </Section>

        {/* Galeri pencapaian */}
        <Section title="Pencapaian">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ACHIEVEMENTS.map((a) => {
              const got = p.achievements.includes(a.id);
              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                    got ? "bg-emerald-500/10" : "bg-slate-900 opacity-60"
                  }`}
                >
                  <span className="text-xl">{got ? "🏆" : "🔒"}</span>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold ${got ? "text-emerald-200" : "text-slate-400"}`}>{a.name}</p>
                    <p className="truncate text-xs text-slate-500">{a.desc}</p>
                  </div>
                  <span className="ml-auto text-xs font-bold text-amber-400">+{a.xp}</span>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Cerita / misi */}
        <Section title="Cerita Kubantara">
          <div className="space-y-2">
            {QUESTS.map((q) => {
              const done = p.quests.includes(q.id);
              return (
                <div key={q.id} className={`rounded-xl px-3 py-2 ${done ? "bg-emerald-500/10" : "bg-slate-900"}`}>
                  <p className={`text-sm font-bold ${done ? "text-emerald-200" : "text-slate-300"}`}>
                    {done ? "✅ " : "⭐ "}{q.name}
                    <span className="ml-2 text-xs font-normal text-amber-400">+{q.xp} XP</span>
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-slate-500">{q.story}</p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Pahlawan */}
        <Section title="Pahlawan">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {HEROES.map((h) => {
              const owned = p.heroes.includes(h.id);
              return (
                <div
                  key={h.id}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
                    p.activeHero === h.id ? "bg-violet-500/20 ring-1 ring-violet-400" : owned ? "bg-slate-900" : "bg-slate-900 opacity-50"
                  }`}
                >
                  <span
                    className="h-6 w-6 shrink-0 rounded"
                    style={{ backgroundColor: `#${h.shirt.toString(16).padStart(6, "0")}` }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-200">{h.name}</p>
                    <p className="text-[11px] text-slate-500">{owned ? "Terbuka" : `Lv ${h.levelNeed}`}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Perlengkapan */}
        <Section title="Perlengkapan">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {GEAR.map((g) => {
              const owned = p.gear.includes(g.id);
              return (
                <div key={g.id} className={`rounded-xl px-3 py-2 ${owned ? "bg-slate-900" : "bg-slate-900 opacity-50"}`}>
                  <p className="text-xs font-bold text-slate-200">{owned ? "🛠️ " : "🔒 "}{g.name}</p>
                  <p className="text-[11px] text-slate-500">{owned ? g.desc : `Lv ${g.levelNeed}`}</p>
                </div>
              );
            })}
          </div>
        </Section>

        <div className="mt-8 text-center">
          <Link
            href="/play"
            className="inline-block rounded-2xl bg-emerald-500 px-8 py-4 text-lg font-black text-slate-950 transition-transform hover:scale-105 active:scale-95"
          >
            Lanjut bermain
          </Link>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl bg-slate-900 p-4 text-center">
      <p className={`text-2xl font-black ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-900 px-3 py-2">
      <p className="text-lg font-black text-slate-100">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-lg font-black text-slate-200">{title}</h2>
      {children}
    </section>
  );
}
