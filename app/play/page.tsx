"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createGame, PALETTE, type Spell, type GameStats, type Perks, type Blueprint } from "@/lib/voxel-game";
import { ACHIEVEMENTS, QUESTS, HEROES, SKILLS, levelFromXp } from "@/lib/content";
import { music } from "@/lib/music";

// Perk aktif berdasarkan level akun — keahlian benar-benar terasa di gameplay.
function perksForLevel(level: number): Partial<Perks> {
  const p: Partial<Perks> = {};
  if (level >= 1) p.speedMul = 1.1;
  if (level >= 2) p.jumpMul = 1.2;
  if (level >= 3) p.reach = 2.6;
  if (level >= 5) p.spellScale = 1.6;
  if (level >= 6) { p.camExtra = 3; p.speedMul = 1.265; }
  if (level >= 7) p.waterWalk = true;
  if (level >= 8) p.nightGlow = true;
  return p;
}

const BLUEPRINTS: { id: Blueprint; label: string }[] = [
  { id: "rumah", label: "🏠 Rumah" },
  { id: "menara", label: "🗼 Menara" },
  { id: "tangga", label: "🪜 Tangga" },
  { id: "pagar", label: "🚧 Pagar" },
];

const SPELLS: { id: Spell; label: string }[] = [
  { id: "jembatan", label: "Jembatan" },
  { id: "bunga", label: "Bunga" },
  { id: "kembang-api", label: "Kembang api" },
  { id: "pohon", label: "Tumbuh pohon" },
];

interface Profile {
  username: string;
  level: number;
  xp: number;
  achievements: string[];
  heroes: string[];
  activeHero: string;
}

export default function PlayPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<ReturnType<typeof createGame> | null>(null);
  const padRef = useRef<HTMLDivElement>(null);
  const [stars, setStars] = useState({ got: 0, total: 24 });
  const [time, setTime] = useState<string>("Pagi");
  const [riding, setRiding] = useState(false);
  const [colorIdx, setColorIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showHeroes, setShowHeroes] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [npc, setNpc] = useState<{ name: string; line: string } | null>(null);
  const [weather, setWeather] = useState<"Cerah" | "Hujan" | "Pelangi">("Cerah");
  const [musicOn, setMusicOn] = useState(false);
  const [statsView, setStatsView] = useState<GameStats | null>(null);
  const questsDoneRef = useRef<Set<string>>(new Set());
  const lastSaveRef = useRef<number>(Date.now());
  const profileRef = useRef<Profile | null>(null);
  const statsRef = useRef<GameStats | null>(null);
  const starsRef = useRef(0);
  const unlockedRef = useRef<Set<string>>(new Set());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // cek pencapaian di sisi klien untuk umpan balik langsung
  const checkAchievements = useCallback(
    (stats: GameStats, starCount: number) => {
      const merged: Record<string, number> = { ...stats, stars: starCount };
      for (const a of ACHIEVEMENTS) {
        if (!unlockedRef.current.has(a.id) && (merged[a.stat] ?? 0) >= a.need) {
          unlockedRef.current.add(a.id);
          showToast(`Pencapaian terbuka: ${a.name}`);
        }
      }
      for (const q of QUESTS) {
        if (!questsDoneRef.current.has(q.id) && (merged[q.stat] ?? 0) >= q.need) {
          questsDoneRef.current.add(q.id);
          showToast(`Misi selesai: ${q.name}`);
        }
      }
      setStatsView(stats);
    },
    [showToast]
  );

  const save = useCallback(async () => {
    if (!profileRef.current || !gameRef.current) return;
    const g = gameRef.current;
    // waktu bermain sejak simpanan terakhir, untuk panel orang tua
    const now = Date.now();
    const sessionSeconds = Math.round((now - lastSaveRef.current) / 1000);
    lastSaveRef.current = now;
    try {
      await fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          stats: g.getStats(),
          stars: g.getStars(),
          blocks: g.exportBlocks(),
          activeHero: profileRef.current.activeHero,
          sessionSeconds,
        }),
      });
    } catch {
      // koneksi putus; coba lagi di siklus berikutnya
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const game = createGame(canvasRef.current, {
      onStars: (got, total) => {
        setStars({ got, total });
        starsRef.current = got;
        if (statsRef.current) checkAchievements(statsRef.current, got);
        if (got === total) setDone(true);
      },
      onTime: (label) => setTime(label),
      onRide: (r) => setRiding(r),
      onStat: (s) => {
        statsRef.current = s;
        checkAchievements(s, starsRef.current);
      },
      onNpc: (n) => setNpc(n),
      onWeather: (w) => setWeather(w),
    });
    gameRef.current = game;

    // muat profil dan progres tersimpan
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json()).catch(() => null);
      if (!me?.user) return;
      const data = await fetch("/api/progress").then((r) => r.json()).catch(() => null);
      const p = data?.progress;
      const prof: Profile = {
        username: me.user.username,
        level: p?.level ?? 1,
        xp: p?.xp ?? 0,
        achievements: p?.achievements ?? [],
        heroes: p?.heroes ?? ["penjelajah"],
        activeHero: p?.activeHero ?? "penjelajah",
      };
      profileRef.current = prof;
      setProfile(prof);
      unlockedRef.current = new Set(prof.achievements);
      questsDoneRef.current = new Set(Array.isArray(p?.quests) ? p.quests : []);
      if (Array.isArray(p?.blocks) && p.blocks.length) game.loadBlocks(p.blocks);
      if (p?.stats?.tamed) game.setTamedCount(Number(p.stats.tamed));
      const hero = HEROES.find((h) => h.id === prof.activeHero);
      if (hero) game.setHero(hero.shirt, hero.pants);
      // keahlian terbuka bertambah kuat mengikuti level
      game.setPerks(perksForLevel(Math.max(prof.level, levelFromXp(prof.xp))));
    })();

    const iv = setInterval(save, 20000);
    const onHide = () => save();
    window.addEventListener("pagehide", onHide);
    return () => {
      clearInterval(iv);
      window.removeEventListener("pagehide", onHide);
      music.stop();
      game.dispose();
    };
  }, [checkAchievements, save]);

  const toggleMusic = useCallback(() => {
    if (music.playing) { music.stop(); setMusicOn(false); }
    else { music.start(); setMusicOn(true); }
  }, []);

  // joystick sentuh
  useEffect(() => {
    const pad = padRef.current;
    if (!pad) return;
    let active = false;
    const center = { x: 0, y: 0 };
    const set = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || !gameRef.current) return;
      const dx = (t.clientX - center.x) / 45;
      const dy = (t.clientY - center.y) / 45;
      gameRef.current.touch.x = Math.max(-1, Math.min(1, dx));
      gameRef.current.touch.y = Math.max(-1, Math.min(1, dy));
    };
    const start = (e: TouchEvent) => {
      const r = pad.getBoundingClientRect();
      center.x = r.left + r.width / 2;
      center.y = r.top + r.height / 2;
      active = true;
      set(e);
    };
    const end = () => {
      active = false;
      if (gameRef.current) { gameRef.current.touch.x = 0; gameRef.current.touch.y = 0; }
    };
    const move = (e: TouchEvent) => active && set(e);
    pad.addEventListener("touchstart", start);
    pad.addEventListener("touchmove", move);
    pad.addEventListener("touchend", end);
    return () => {
      pad.removeEventListener("touchstart", start);
      pad.removeEventListener("touchmove", move);
      pad.removeEventListener("touchend", end);
    };
  }, []);

  const pickColor = (i: number) => {
    setColorIdx(i);
    gameRef.current?.setColor(PALETTE[i].hex);
  };

  const pickHero = (id: string) => {
    if (!profile || !profile.heroes.includes(id)) return;
    const hero = HEROES.find((h) => h.id === id);
    if (!hero) return;
    const next = { ...profile, activeHero: id };
    setProfile(next);
    profileRef.current = next;
    gameRef.current?.setHero(hero.shirt, hero.pants);
    setShowHeroes(false);
    save();
  };

  const level = profile ? Math.max(profile.level, levelFromXp(profile.xp)) : null;

  return (
    <main className="fixed inset-0 select-none overflow-hidden bg-sky-300">
      <canvas ref={canvasRef} className="h-full w-full touch-none" />

      {/* HUD atas */}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-2">
        <Link href="/" className="pointer-events-auto rounded-xl bg-white/85 px-3 py-2 text-sm font-bold text-slate-800 shadow">
          Keluar
        </Link>
        <div className="rounded-xl bg-white/85 px-3 py-2 text-sm font-bold text-amber-600 shadow">
          Bintang {stars.got}/{stars.total}
        </div>
        <div className="rounded-xl bg-white/85 px-3 py-2 text-sm font-bold text-sky-700 shadow">
          {time}
        </div>
        <div className="rounded-xl bg-white/85 px-3 py-2 text-sm font-bold text-cyan-700 shadow">
          {weather === "Cerah" ? "☀️ Cerah" : weather === "Hujan" ? "🌧️ Hujan" : "🌈 Pelangi"}
        </div>
        <button
          onClick={() => setShowQuests((v) => !v)}
          className="pointer-events-auto rounded-xl bg-amber-500/90 px-3 py-2 text-sm font-bold text-white shadow"
        >
          📜 Misi {questsDoneRef.current.size}/{QUESTS.length}
        </button>
        <button
          onClick={toggleMusic}
          className="pointer-events-auto rounded-xl bg-white/85 px-3 py-2 text-sm font-bold text-violet-700 shadow"
        >
          {musicOn ? "🎵 Musik" : "🔇 Musik"}
        </button>
        {profile ? (
          <>
            <button
              onClick={() => setShowHeroes((v) => !v)}
              className="pointer-events-auto rounded-xl bg-violet-500/90 px-3 py-2 text-sm font-bold text-white shadow"
            >
              {profile.username} · Lv {level}
            </button>
            <Link
              href="/profil"
              className="pointer-events-auto rounded-xl bg-white/85 px-3 py-2 text-sm font-bold text-violet-700 shadow"
            >
              👤 Profil
            </Link>
          </>
        ) : (
          <Link
            href="/masuk"
            className="pointer-events-auto rounded-xl bg-white/85 px-3 py-2 text-sm font-bold text-emerald-700 shadow"
          >
            Masuk untuk simpan
          </Link>
        )}
      </div>

      <div className="pointer-events-none absolute right-3 top-3 hidden max-w-[220px] rounded-xl bg-white/70 px-3 py-2 text-xs leading-relaxed text-slate-700 shadow md:block">
        WASD jalan · Spasi lompat · Q/E putar kamera. Pilih warna lalu tekan Bangun untuk menaruh balok di depanmu.
      </div>

      {/* Panel pilih pahlawan */}
      {showHeroes && profile && (
        <div className="absolute left-3 top-16 z-20 w-64 rounded-2xl bg-white/95 p-3 shadow-xl">
          <p className="mb-2 text-sm font-black text-slate-800">Pilih pahlawan</p>
          <div className="space-y-1.5">
            {HEROES.map((h) => {
              const owned = profile.heroes.includes(h.id);
              return (
                <button
                  key={h.id}
                  onClick={() => pickHero(h.id)}
                  disabled={!owned}
                  className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm ${
                    profile.activeHero === h.id
                      ? "bg-violet-100 font-bold text-violet-800"
                      : owned
                      ? "text-slate-700 hover:bg-slate-100"
                      : "text-slate-400"
                  }`}
                >
                  <span
                    className="h-5 w-5 shrink-0 rounded"
                    style={{ backgroundColor: `#${h.shirt.toString(16).padStart(6, "0")}` }}
                  />
                  <span>
                    {h.name}
                    {!owned && ` (Lv ${h.levelNeed})`}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Pencapaian: {unlockedRef.current.size}/{ACHIEVEMENTS.length}
          </p>
          <p className="text-xs text-slate-500">
            Keahlian: {SKILLS.filter((s) => s.levelNeed <= (level ?? 1)).length}/{SKILLS.length}
          </p>
          {statsView && (
            <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-500">
              <span>Balok: {statsView.blocksPlaced}</span>
              <span>Sihir: {statsView.spellsCast}</span>
              <span>Lompat: {statsView.jumps}</span>
              <span>Tunggang: {statsView.rides}</span>
              <span>Langkah: {Math.floor(statsView.distance)}</span>
              <span>Sahabat: {statsView.npcMet}</span>
            </div>
          )}
        </div>
      )}

      {/* Jurnal misi cerita */}
      {showQuests && (
        <div className="absolute right-3 top-16 z-20 max-h-[70vh] w-72 overflow-y-auto rounded-2xl bg-white/95 p-3 shadow-xl">
          <p className="mb-2 text-sm font-black text-slate-800">Cerita Kubantara</p>
          <div className="space-y-1.5">
            {QUESTS.map((q) => {
              const done = questsDoneRef.current.has(q.id);
              return (
                <div
                  key={q.id}
                  className={`rounded-xl px-2.5 py-1.5 text-xs ${
                    done ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-600"
                  }`}
                >
                  <p className="font-bold">
                    {done ? "✅ " : "⭐ "}
                    {q.name}
                  </p>
                  <p className="mt-0.5 leading-snug text-slate-500">{q.story}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialog NPC */}
      {npc && (
        <div className="pointer-events-none absolute bottom-32 left-1/2 z-20 w-[min(90vw,28rem)] -translate-x-1/2 rounded-2xl bg-slate-900/90 p-4 text-white shadow-xl">
          <p className="text-sm font-black text-amber-300">{npc.name}</p>
          <p className="mt-1 text-sm leading-relaxed">{npc.line}</p>
        </div>
      )}

      {/* Palet warna balok */}
      <div className="absolute left-1/2 top-3 flex -translate-x-1/2 gap-1.5 rounded-2xl bg-white/80 p-1.5 shadow">
        {PALETTE.map((p, i) => (
          <button
            key={p.name}
            onClick={() => pickColor(i)}
            title={p.name}
            className={`h-8 w-8 rounded-lg border-2 transition-transform hover:scale-110 ${
              colorIdx === i ? "border-slate-900 scale-110" : "border-white/60"
            }`}
            style={{ backgroundColor: `#${p.hex.toString(16).padStart(6, "0")}` }}
          />
        ))}
      </div>

      {/* Panel sihir (kiri tengah) */}
      <div className="absolute left-3 top-1/2 flex -translate-y-1/2 flex-col gap-2">
        {SPELLS.map((s) => (
          <button
            key={s.id}
            onClick={() => gameRef.current?.cast(s.id)}
            className="rounded-xl bg-violet-500/90 px-3 py-2 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Cetakan bangunan sekali tekan */}
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-2xl bg-white/80 p-1.5 shadow">
        {BLUEPRINTS.map((b) => (
          <button
            key={b.id}
            onClick={() => {
              const made = gameRef.current?.buildBlueprint(b.id) ?? 0;
              showToast(made > 0 ? `${b.label} berdiri! (${made} balok)` : "Tempatnya penuh, coba geser sedikit");
            }}
            className="rounded-xl bg-sky-500/90 px-2.5 py-2 text-xs font-bold text-white shadow transition-transform hover:scale-105 active:scale-95"
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Aksi bangun / bongkar / tunggang (kanan) */}
      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-2">
        <button
          onClick={() => gameRef.current?.place()}
          className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          Bangun
        </button>
        <button
          onClick={() => gameRef.current?.removeBlock()}
          className="rounded-xl bg-rose-500 px-4 py-3 text-sm font-black text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          Bongkar
        </button>
        <button
          onClick={() => {
            const ok = gameRef.current?.tameNearest();
            showToast(ok ? "Satwa jadi sahabatmu! ❤️" : "Dekati dulu satwanya, lalu coba lagi");
          }}
          className="rounded-xl bg-pink-500 px-4 py-3 text-sm font-black text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          Jinakkan
        </button>
        <button
          onClick={() => gameRef.current?.toggleRide()}
          className={`rounded-xl px-4 py-3 text-sm font-black text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${
            riding ? "bg-amber-600" : "bg-amber-500"
          }`}
        >
          {riding ? "Turun" : "Naik"}
        </button>
      </div>

      {/* Kontrol sentuh gerak */}
      <div
        ref={padRef}
        className="absolute bottom-8 left-6 h-32 w-32 touch-none rounded-full border-4 border-white/60 bg-white/25"
      >
        <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
      </div>
      <button
        className="absolute bottom-10 right-6 h-24 w-24 rounded-full border-4 border-white/60 bg-sky-400/80 text-base font-black text-white shadow-lg"
        onTouchStart={(e) => { e.preventDefault(); if (gameRef.current) gameRef.current.touch.jump = true; }}
      >
        LOMPAT
      </button>

      {/* Toast pencapaian */}
      {toast && (
        <div className="pointer-events-none absolute bottom-40 left-1/2 -translate-x-1/2 rounded-2xl bg-slate-900/90 px-5 py-3 text-sm font-bold text-amber-300 shadow-xl">
          {toast}
        </div>
      )}

      {done && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="rounded-3xl bg-white p-8 text-center shadow-2xl">
            <p className="text-3xl font-black text-amber-500">Hebat sekali!</p>
            <p className="mt-2 text-slate-600">Semua bintang di Kubantara sudah kamu temukan.</p>
            <button
              onClick={() => location.reload()}
              className="mt-5 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white"
            >
              Jelajah lagi
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
