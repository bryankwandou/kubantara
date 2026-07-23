"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createGame, PALETTE, SHAPES, EMOTES, type Spell, type GameStats, type Perks, type Blueprint, type Shape } from "@/lib/voxel-game";
import { ACHIEVEMENTS, QUESTS, HEROES, SKILLS, levelFromXp } from "@/lib/content";
import { music } from "@/lib/music";
import { sfx } from "@/lib/sound";

// Perk aktif berdasarkan level akun — keahlian benar-benar terasa di gameplay.
// Peralatan (gear) terbuka pada level yang sama seperti di lib/content.ts,
// jadi efeknya dipetakan di sini pula agar janji tiap alat benar-benar nyata.
function perksForLevel(level: number): Partial<Perks> {
  const p: Partial<Perks> = {};
  // — keahlian —
  if (level >= 1) p.speedMul = 1.1;
  if (level >= 2) p.jumpMul = 1.2;
  if (level >= 3) p.reach = 2.6;
  if (level >= 5) p.spellScale = 1.6;
  if (level >= 6) { p.camExtra = 3; p.speedMul = 1.265; }
  if (level >= 7) p.waterWalk = true;
  if (level >= 8) p.nightGlow = true;
  // — peralatan —
  if (level >= 2) p.bungaBonus = 0.8;   // Tongkat Bunga: lingkaran bunga lebih lebar
  if (level >= 3) p.removeRange = 1;    // Palu Batu: Bongkar meruntuhkan area 3x3x3
  if (level >= 5) p.bridgeBonus = 6;    // Tongkat Pelangi: jembatan lebih panjang
  if (level >= 6) p.speedMul = 1.35;    // Sepatu Angin: lari lebih kencang lagi
  if (level >= 8) p.callMount = true;   // Peluit Emas: tunggangan datang sendiri
  if (level >= 15) p.crown = true;      // Mahkota Kubantara: mahkota di kepala
  return p;
}

const BLUEPRINTS: { id: Blueprint; label: string }[] = [
  { id: "rumah", label: "🏠 Rumah" },
  { id: "menara", label: "🗼 Menara" },
  { id: "tangga", label: "🪜 Tangga" },
  { id: "pagar", label: "🚧 Pagar" },
];

// Sambutan singkat untuk pemain baru. Sengaja hanya 4 langkah — anak ingin
// cepat main, bukan membaca panduan.
const TUTOR = [
  {
    emoji: "🌏",
    judul: "Selamat datang di Kubantara!",
    isi: "Bintang-bintang di langit pulau ini padam. Kamu yang akan mengembalikan cahayanya. Tidak ada musuh di sini, dan kamu tidak bisa kalah — main santai saja.",
  },
  {
    emoji: "🕹️",
    judul: "Cara berjalan",
    isi: "Di laptop: tombol W A S D untuk jalan, spasi untuk lompat, dan seret mouse untuk melihat sekeliling (scroll untuk memperbesar). Di HP: geser bulatan di kiri bawah, tekan LOMPAT di kanan bawah.",
  },
  {
    emoji: "🧱",
    judul: "Bangun apa pun",
    isi: "Pilih warna di atas, lalu tekan Bangun untuk menaruh balok di depanmu. Tekan Cetakan kalau ingin rumah atau menara berdiri sekali tekan. Salah taruh? Tekan Bongkar.",
  },
  {
    emoji: "⭐",
    judul: "Kumpulkan 24 bintang",
    isi: "Jelajahi pulau dan temukan bintangnya. Sapa penduduk yang kamu temui — mereka punya cerita. Semua hasil mainmu tersimpan sendiri, jadi tidak perlu takut hilang.",
  },
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
  const [weather, setWeather] = useState<"Cerah" | "Hujan" | "Pelangi" | "Salju">("Cerah");
  const [musicOn, setMusicOn] = useState(false);
  const [statsView, setStatsView] = useState<GameStats | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const [shape, setShape] = useState<Shape>("kubus");
  const [teman, setTeman] = useState(0);
  const [showBuild, setShowBuild] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [tutorStep, setTutorStep] = useState(0);

  // tampilkan sambutan hanya sekali per perangkat
  useEffect(() => {
    try {
      if (!localStorage.getItem("kubantara_tutor_v1")) setShowTutor(true);
    } catch {
      // penyimpanan lokal diblokir; lewati saja sambutannya
    }
  }, []);

  const selesaiTutor = useCallback(() => {
    setShowTutor(false);
    try { localStorage.setItem("kubantara_tutor_v1", "1"); } catch {}
  }, []);

  const [showSettings, setShowSettings] = useState(false);
  const [musicVol, setMusicVol] = useState(0.5);
  const [sfxVol, setSfxVol] = useState(1);

  // muat preferensi volume tersimpan
  useEffect(() => {
    try {
      const mv = Number(localStorage.getItem("kubantara_music_vol"));
      const sv = Number(localStorage.getItem("kubantara_sfx_vol"));
      if (isFinite(mv) && localStorage.getItem("kubantara_music_vol") !== null) { setMusicVol(mv); music.setVolume(mv); }
      if (isFinite(sv) && localStorage.getItem("kubantara_sfx_vol") !== null) { setSfxVol(sv); sfx.setVolume(sv); }
    } catch {}
  }, []);

  const [freeLook, setFreeLook] = useState(false);
  // sinkronkan indikator tombol saat pemain menekan Esc untuk melepas kunci
  useEffect(() => {
    const on = () => setFreeLook(!!document.pointerLockElement);
    document.addEventListener("pointerlockchange", on);
    return () => document.removeEventListener("pointerlockchange", on);
  }, []);

  const [isFull, setIsFull] = useState(false);
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }, []);
  useEffect(() => {
    const on = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const questsDoneRef = useRef<Set<string>>(new Set());
  const lastSaveRef = useRef<number>(Date.now());
  const sejakRef = useRef<number>(0); // penanda balok saudara terakhir yang diterima
  const emoteRef = useRef<string | null>(null); // emote menunggu dikirim
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
      const res = await fetch("/api/progress", {
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
      const data = await res.json().catch(() => null);
      if (data?.limitReached) setTimeUp(true);
      else if (typeof data?.minutesLeft === "number" && data.minutesLeft <= 5)
        showToast(`Sisa waktu main hari ini: ${data.minutesLeft} menit`);
    } catch {
      // koneksi putus; coba lagi di siklus berikutnya
    }
  }, [showToast]);

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

    // main bersama: kirim posisi & terima posisi saudara tiap 2 detik.
    // Server mematikan sendiri kalau akun belum diberi kode keluarga.
    let bersamaAktif = true;
    const ivBersama = setInterval(async () => {
      if (!bersamaAktif || !profileRef.current) return;
      const pos = game.getPosition();
      const blokBaru = game.takeOutbox();
      try {
        const res = await fetch("/api/bersama", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...pos,
            hero: profileRef.current.activeHero,
            blokBaru,
            sejak: sejakRef.current,
            emote: emoteRef.current ?? undefined,
          }),
        });
        emoteRef.current = null; // sudah terkirim, jangan diulang tiap siklus
        const data = await res.json();
        if (!data.enabled) { bersamaAktif = false; return; } // hemat kuota database
        game.setFriends(data.teman ?? []);
        setTeman((data.teman ?? []).length);
        if (Array.isArray(data.blok) && data.blok.length) {
          const n = game.applyRemoteBlocks(data.blok);
          if (n > 0) showToast(`Saudaramu membangun ${n} balok baru`);
        }
        if (typeof data.sampai === "number") sejakRef.current = data.sampai;
      } catch {
        // koneksi putus; balok yang gagal terkirim dikembalikan ke antrean
        game.requeueOutbox(blokBaru);
      }
    }, 2000);
    const onHide = () => save();
    window.addEventListener("pagehide", onHide);
    return () => {
      clearInterval(iv);
      clearInterval(ivBersama);
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
      <div className="pointer-events-none absolute left-2 top-2 flex max-w-[62vw] flex-wrap items-center gap-1.5 lg:max-w-none">
        <Link href="/" className="pointer-events-auto rounded-xl bg-white/85 px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow sm:px-3 sm:py-2 sm:text-sm">
          Keluar
        </Link>
        <div className="rounded-xl bg-white/85 px-2.5 py-1.5 text-xs font-bold text-amber-600 shadow sm:px-3 sm:py-2 sm:text-sm">
          ⭐ {stars.got}/{stars.total}
        </div>
        <div className="rounded-xl bg-white/85 px-2.5 py-1.5 text-xs font-bold text-sky-700 shadow sm:px-3 sm:py-2 sm:text-sm">
          {time}
        </div>
        <div className="rounded-xl bg-white/85 px-2.5 py-1.5 text-xs font-bold text-cyan-700 shadow sm:px-3 sm:py-2 sm:text-sm">
          {weather === "Cerah" ? "☀️" : weather === "Hujan" ? "🌧️" : weather === "Salju" ? "❄️" : "🌈"}
          <span className="hidden sm:inline"> {weather}</span>
        </div>
        <button
          onClick={() => setShowQuests((v) => !v)}
          className="pointer-events-auto rounded-xl bg-amber-500/90 px-2.5 py-1.5 text-xs font-bold text-white shadow sm:px-3 sm:py-2 sm:text-sm"
        >
          📜 {questsDoneRef.current.size}/{QUESTS.length}
        </button>
        {teman > 0 && (
          <>
            <div className="rounded-xl bg-cyan-500/90 px-3 py-2 text-sm font-bold text-white shadow">
              👨‍👩‍👧 {teman} saudara ikut main
            </div>
            {/* Emote: hanya lambang tetap, anak tidak bisa mengetik apa pun */}
            <div className="pointer-events-auto flex gap-1 rounded-xl bg-white/85 px-2 py-1.5 shadow">
              {EMOTES.map((e) => (
                <button
                  key={e}
                  onClick={() => { emoteRef.current = e; showToast(`Kamu melambaikan ${e}`); }}
                  className="rounded-lg px-1.5 py-0.5 text-lg transition-transform hover:scale-125 active:scale-95"
                >
                  {e}
                </button>
              ))}
            </div>
          </>
        )}
        <button
          onClick={toggleMusic}
          className="pointer-events-auto rounded-xl bg-white/85 px-2.5 py-1.5 text-xs font-bold text-violet-700 shadow sm:px-3 sm:py-2 sm:text-sm"
        >
          {musicOn ? "🎵" : "🔇"}
        </button>
        <button
          onClick={toggleFullscreen}
          title="Layar penuh"
          className="pointer-events-auto rounded-xl bg-white/85 px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow sm:px-3 sm:py-2 sm:text-sm"
        >
          {isFull ? "🗗" : "⛶"}
        </button>
        <button
          onClick={() => setFreeLook(gameRef.current?.toggleFreeLook() ?? false)}
          title="Lihat bebas dengan mouse"
          className={`pointer-events-auto rounded-xl px-2.5 py-1.5 text-xs font-bold shadow sm:px-3 sm:py-2 sm:text-sm ${
            freeLook ? "bg-emerald-500 text-white" : "bg-white/85 text-slate-700"
          }`}
        >
          🖱️
        </button>
        <button
          onClick={() => setShowSettings((v) => !v)}
          title="Pengaturan"
          className="pointer-events-auto rounded-xl bg-white/85 px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow sm:px-3 sm:py-2 sm:text-sm"
        >
          ⚙️
        </button>
        {profile ? (
          <>
            <button
              onClick={() => setShowHeroes((v) => !v)}
              className="pointer-events-auto flex max-w-[9rem] items-center gap-1 overflow-hidden rounded-xl bg-violet-500/90 px-2.5 py-1.5 text-xs font-bold text-white shadow sm:px-3 sm:py-2 sm:text-sm"
            >
              {/* nama dipotong supaya baris chip tidak melebar menabrak palet warna */}
              <span className="hidden truncate xl:inline">{profile.username}</span>
              <span className="shrink-0">Lv {level}</span>
            </button>
            <Link
              href="/profil"
              className="pointer-events-auto rounded-xl bg-white/85 px-2.5 py-1.5 text-xs font-bold text-violet-700 shadow sm:px-3 sm:py-2 sm:text-sm"
            >
              👤
            </Link>
          </>
        ) : (
          <Link
            href="/masuk"
            className="pointer-events-auto rounded-xl bg-white/85 px-2.5 py-1.5 text-xs font-bold text-emerald-700 shadow sm:px-3 sm:py-2 sm:text-sm"
          >
            Masuk untuk simpan
          </Link>
        )}
      </div>

      <div className="pointer-events-none absolute right-3 top-3 hidden max-w-[220px] rounded-xl bg-white/70 px-3 py-2 text-xs leading-relaxed text-slate-700 shadow md:block">
        WASD jalan · Spasi lompat · seret mouse untuk melihat sekeliling · scroll untuk zoom. Pilih warna lalu tekan Bangun untuk menaruh balok di depanmu.
      </div>

      {/* Panel pilih pahlawan */}
      {showHeroes && profile && (
        <div className="absolute left-3 top-16 z-20 max-h-[70vh] w-64 overflow-y-auto rounded-2xl bg-white/95 p-3 shadow-xl">
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
        <div className="pointer-events-none absolute bottom-44 left-1/2 z-20 w-[min(90vw,28rem)] -translate-x-1/2 rounded-2xl bg-slate-900/90 p-4 text-white shadow-xl">
          <p className="text-sm font-black text-amber-300">{npc.name}</p>
          <p className="mt-1 text-sm leading-relaxed">{npc.line}</p>
        </div>
      )}

      {/* Palet warna balok — turun ke bawah bar atas di layar sempit
          supaya tidak bertabrakan dengan chip status. */}
      <div className="absolute left-1/2 top-14 flex -translate-x-1/2 gap-1 rounded-2xl bg-white/80 p-1.5 shadow sm:gap-1.5">
        {PALETTE.map((p, i) => (
          <button
            key={p.name}
            onClick={() => pickColor(i)}
            title={p.name}
            className={`h-7 w-7 rounded-lg border-2 transition-transform hover:scale-110 sm:h-8 sm:w-8 ${
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

      {/* Laci cetakan bangunan — ditutup secara bawaan supaya tidak menutupi
          joystick di layar HP yang sempit. */}
      {showBuild && (
        <div className="absolute bottom-44 left-1/2 z-20 w-[min(92vw,22rem)] -translate-x-1/2 rounded-2xl bg-white/95 p-3 shadow-xl">
          <p className="mb-2 text-xs font-black text-slate-800">Bangun jadi sekali tekan</p>
          <div className="grid grid-cols-2 gap-1.5">
            {BLUEPRINTS.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  const made = gameRef.current?.buildBlueprint(b.id) ?? 0;
                  showToast(made > 0 ? `${b.label} berdiri! (${made} balok)` : "Tempatnya penuh, coba geser sedikit");
                  setShowBuild(false);
                }}
                className="rounded-xl bg-sky-500/90 px-2.5 py-2.5 text-xs font-bold text-white shadow active:scale-95"
              >
                {b.label}
              </button>
            ))}
          </div>
          <p className="mb-1.5 mt-3 text-xs font-black text-slate-800">Bentuk balok</p>
          <div className="grid grid-cols-4 gap-1.5">
            {SHAPES.map((s) => (
              <button
                key={s.id}
                onClick={() => { setShape(s.id); gameRef.current?.setShape(s.id); }}
                className={`rounded-lg px-1 py-2 text-xs font-bold transition-colors ${
                  shape === s.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Aksi bangun / bongkar / tunggang (kanan) */}
      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-2">
        <button
          onClick={() => gameRef.current?.place()}
          className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          Bangun
        </button>
        <button
          onClick={() => setShowBuild((v) => !v)}
          className={`rounded-xl px-4 py-3 text-sm font-black text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${
            showBuild ? "bg-sky-700" : "bg-sky-500"
          }`}
        >
          {showBuild ? "Tutup" : "Cetakan"}
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
        <div key={toast} className="anim-pop pointer-events-none absolute bottom-64 left-1/2 max-w-[86vw] -translate-x-1/2 rounded-2xl bg-slate-900/90 px-5 py-3 text-center text-sm font-bold text-amber-300 shadow-xl">
          {toast}
        </div>
      )}

      {/* Panel pengaturan: volume musik & efek suara */}
      {showSettings && (
        <div className="absolute right-3 top-16 z-30 w-64 rounded-2xl bg-white/95 p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-black text-slate-800">Pengaturan suara</p>
            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-700">✕</button>
          </div>
          <label className="block text-xs font-bold text-slate-600">
            🎵 Musik: {Math.round(musicVol * 100)}%
            <input
              type="range" min={0} max={1} step={0.05} value={musicVol}
              onChange={(e) => {
                const v = Number(e.target.value);
                setMusicVol(v); music.setVolume(v);
                try { localStorage.setItem("kubantara_music_vol", String(v)); } catch {}
              }}
              className="mt-1 w-full accent-violet-500"
            />
          </label>
          <label className="mt-3 block text-xs font-bold text-slate-600">
            🔔 Efek suara: {Math.round(sfxVol * 100)}%
            <input
              type="range" min={0} max={1} step={0.05} value={sfxVol}
              onChange={(e) => {
                const v = Number(e.target.value);
                setSfxVol(v); sfx.setVolume(v); sfx.jump();
                try { localStorage.setItem("kubantara_sfx_vol", String(v)); } catch {}
              }}
              className="mt-1 w-full accent-emerald-500"
            />
          </label>
        </div>
      )}

      {/* Sambutan pemain baru — muncul sekali, tersimpan di perangkat ini */}
      {showTutor && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-5">
          <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 text-center shadow-2xl">
            <p className="text-4xl">{TUTOR[tutorStep].emoji}</p>
            <p className="mt-3 text-xl font-black text-slate-800">{TUTOR[tutorStep].judul}</p>
            <p className="mt-2 leading-relaxed text-slate-600">{TUTOR[tutorStep].isi}</p>
            <div className="mt-4 flex justify-center gap-1.5">
              {TUTOR.map((_, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full ${i === tutorStep ? "bg-emerald-500" : "bg-slate-300"}`}
                />
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={selesaiTutor}
                className="flex-1 rounded-xl border border-slate-300 py-3 font-bold text-slate-500"
              >
                Lewati
              </button>
              <button
                onClick={() => {
                  if (tutorStep < TUTOR.length - 1) setTutorStep(tutorStep + 1);
                  else selesaiTutor();
                }}
                className="flex-[2] rounded-xl bg-emerald-500 py-3 text-lg font-black text-white"
              >
                {tutorStep < TUTOR.length - 1 ? "Lanjut" : "Ayo main!"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batas waktu main harian tercapai */}
      {timeUp && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/85 px-6">
          <div className="max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
            <p className="text-5xl">🌙</p>
            <p className="mt-3 text-2xl font-black text-slate-800">Waktunya istirahat</p>
            <p className="mt-2 leading-relaxed text-slate-600">
              Waktu bermain hari ini sudah habis. Semua hasil petualanganmu sudah
              tersimpan dengan aman — besok bisa dilanjutkan lagi dari sini.
            </p>
            <Link
              href="/profil"
              className="mt-5 inline-block rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white"
            >
              Lihat hasil petualanganku
            </Link>
          </div>
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
