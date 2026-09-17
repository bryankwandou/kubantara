"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Minimap from "./Minimap";
import Link from "next/link";
import { createGame, PALETTE, SHAPES, EMOTES, KUALITAS, type Spell, type GameStats, type Perks, type Blueprint, type Shape, type Kualitas, type SudutPandang, type Mode, NYAWA_MAKS } from "@/lib/voxel-game";
import { ACHIEVEMENTS, QUESTS, HEROES, SKILLS, levelFromXp } from "@/lib/content";
import { music } from "@/lib/music";
import { sfx } from "@/lib/sound";
import { SKINS, type Skin } from "@/lib/skins";

interface SkinCard extends Skin { mint: string | null; mintExplorer: string | null; }

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
    isi: "Bintang-bintang di langit pulau ini padam. Kamu yang akan mengembalikan cahayanya. Tidak ada musuh di sini. Di mode Santai kamu tidak bisa kalah; pilih mode Petualangan di Pengaturan kalau mau tantangan dengan nyawa.",
  },
  {
    emoji: "🕹️",
    judul: "Cara berjalan",
    isi: "Di laptop: W A S D untuk jalan (W maju), spasi untuk lompat, seret mouse untuk melihat sekeliling, scroll untuk memperbesar. Tombol F bangun, R bongkar, B cetakan, T jinakkan, G naik tunggangan. Di HP: geser bulatan di kiri bawah — dorong ke atas untuk maju — dan tekan LOMPAT di kanan bawah. Miringkan HP-mu supaya pulaunya terlihat lebih lebar.",
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

// Resin ala Genshin, tapi ramah anak & SELALU gratis: mengisi ulang sendiri
// seiring waktu, tak pernah bisa dibeli. Hanya jadi gerbang lembut agar anak
// tidak menyerbu semua dungeon sekaligus — habis resin, tinggal tunggu.
const RESIN_MAX = 60;
const RESIN_REGEN_MS = 60_000; // +1 resin tiap menit → penuh dalam 1 jam
const DUNGEON_COST = 20;

// Tombol aksi di layar. Tiap aksi punya satu pintasan papan ketik, dan tombol
// layar maupun pintasan itu memanggil fungsi yang sama persis — dulu tombolnya
// hanya bisa diklik dan pemain laptop tak punya jalan pintas sama sekali.
type Aksi = "bangun" | "cetakan" | "bongkar" | "jinak" | "tunggang";
const AKSI: { id: Aksi; label: string; tombol: string; warna: string; warnaNyala: string }[] = [
  { id: "bangun",   label: "Bangun",   tombol: "f", warna: "bg-emerald-500", warnaNyala: "bg-emerald-700" },
  { id: "cetakan",  label: "Cetakan",  tombol: "b", warna: "bg-sky-500",     warnaNyala: "bg-sky-700" },
  { id: "bongkar",  label: "Bongkar",  tombol: "r", warna: "bg-rose-500",    warnaNyala: "bg-rose-700" },
  { id: "jinak",    label: "Jinakkan", tombol: "t", warna: "bg-pink-500",    warnaNyala: "bg-pink-700" },
  { id: "tunggang", label: "Naik",     tombol: "g", warna: "bg-amber-500",   warnaNyala: "bg-amber-600" },
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

// Bentuk layar yang sedang dipakai anak. Sampai sekarang halaman ini hanya punya
// satu tata letak — dirancang untuk HP tegak — sehingga di HP yang dimiringkan
// kolom sihir (kiri-tengah) dan kolom aksi (kanan-tengah) menabrak stik dan
// menutupi separuh pulau. Tiga bentuk ini yang dibedakan:
//   "hp-baring" — layar pendek & melebar: semua kendali turun ke tepi bawah
//   "hp-tegak"  — layar sempit & tinggi: seperti sebelumnya
//   "lebar"     — laptop/tablet besar: ada papan ketik, kendali layar mengecil
type Bentuk = "hp-baring" | "hp-tegak" | "lebar";

function useTataLetak() {
  // Nilai awal harus sama di server dan di peramban, kalau tidak React protes
  // saat hidrasi. Bentuk sebenarnya diukur pada efek pertama, sebelum cat pertama.
  const [tata, setTata] = useState<{ bentuk: Bentuk; sentuh: boolean }>({ bentuk: "lebar", sentuh: false });
  useEffect(() => {
    const ukur = () => {
      const l = window.innerWidth, t = window.innerHeight;
      const sentuh = window.matchMedia?.("(pointer: coarse)").matches ?? false;
      // Patokannya tinggi, bukan lebar: HP dimiringkan menyisakan ~370px tinggi,
      // dan di situlah tata letak lama runtuh.
      const bentuk: Bentuk = t <= 560 && l > t ? "hp-baring" : l < 700 ? "hp-tegak" : "lebar";
      setTata((lama) => (lama.bentuk === bentuk && lama.sentuh === sentuh ? lama : { bentuk, sentuh }));
    };
    ukur();
    window.addEventListener("resize", ukur);
    window.addEventListener("orientationchange", ukur);
    return () => {
      window.removeEventListener("resize", ukur);
      window.removeEventListener("orientationchange", ukur);
    };
  }, []);
  return {
    ...tata,
    baring: tata.bentuk === "hp-baring",
    hp: tata.bentuk !== "lebar",
  };
}

export default function PlayPage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<ReturnType<typeof createGame> | null>(null);
  const padRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const tata = useTataLetak();
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
  const [showPet, setShowPet] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [tutorStep, setTutorStep] = useState(0);
  const [miringDitutup, setMiringDitutup] = useState(false);
  const [stikDipegang, setStikDipegang] = useState(false);
  const [sudutPandang, setSudutPandang] = useState<SudutPandang>("orang-ketiga");
  // Mode main & nyawa. Disimpan per perangkat: adik boleh santai sementara
  // kakak bermain petualangan di laptopnya sendiri.
  const [mode, setMode] = useState<Mode>("santai");
  const modeRef = useRef<Mode>("santai");
  const [nyawa, setNyawa] = useState(NYAWA_MAKS);
  useEffect(() => {
    try {
      const m = localStorage.getItem("kubantara_mode");
      if (m === "petualangan" || m === "santai") { setMode(m); modeRef.current = m; }
    } catch { /* penyimpanan diblokir; pakai santai saja */ }
  }, []);
  const gantiMode = useCallback((m: Mode) => {
    setMode(m);
    modeRef.current = m;
    setNyawa(NYAWA_MAKS);
    try { localStorage.setItem("kubantara_mode", m); } catch {}
    gameRef.current?.setMode(m);
  }, []);
  // Dibaca saat mesin dipasang ulang (mis. saat mutu grafis diganti) supaya
  // pilihan sudut pandang tidak diam-diam kembali ke bawaan.
  const sudutPandangRef = useRef<SudutPandang>("orang-ketiga");
  const gantiSudutPandang = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    const baru = g.getSudutPandang() === "orang-ketiga" ? "orang-pertama" : "orang-ketiga";
    g.setSudutPandang(baru);
    sudutPandangRef.current = baru;
    setSudutPandang(baru);
  }, []);
  // Mutu grafis pilihan pemain. Dibaca dari perangkat ini, bukan dari server —
  // laptop kakak dan HP adik boleh beda tanpa saling mengganggu.
  const [kualitas, setKualitas] = useState<Kualitas>("auto");
  const [diagnosa, setDiagnosa] = useState<
    { fps: number; ms: number; jaringan: number | null; basis: number | null } | null
  >(null);
  useEffect(() => {
    try {
      const k = localStorage.getItem("kubantara_kualitas") as Kualitas | null;
      if (k && KUALITAS.some((x) => x.id === k)) setKualitas(k);
    } catch { /* penyimpanan diblokir; pakai otomatis saja */ }
  }, []);
  const pilihKualitas = useCallback((k: Kualitas) => {
    setKualitas(k);
    try { localStorage.setItem("kubantara_kualitas", k); } catch {}
  }, []);

  // — resin (gratis, isi ulang otomatis) & dungeon gua —
  // Angkanya milik server; di sini hanya cerminannya. Dulu tersimpan di
  // localStorage, sehingga siapa pun yang membuka konsol peramban bisa
  // memberi dirinya seribu keping dan memborong toko.
  const [resin, setResin] = useState(RESIN_MAX);
  const [keping, setKeping] = useState(0);  // keping kristal: hadiah dungeon, mata uang toko skin
  const babakRef = useRef<string | null>(null); // babak dungeon yang sedang berjalan
  const showToastRef = useRef<((m: string) => void) | null>(null);
  const [dungeon, setDungeon] = useState<{
    near: number | null; inside: number | null; unlocked: boolean; collected: number; total: number;
  } | null>(null);

  // Menerima gambaran dompet terbaru dari server.
  const pasangDompet = useCallback((d: { resin?: number; keping?: number } | null) => {
    if (!d) return;
    if (typeof d.resin === "number") setResin(d.resin);
    if (typeof d.keping === "number") setKeping(d.keping);
  }, []);

  // Tanya dompet ke server saat masuk, lalu sesekali supaya isi ulang resin yang
  // gratis itu terlihat bertambah. Jedanya semenit — persis satu resin — jadi
  // tidak ada permintaan yang mubazir.
  useEffect(() => {
    let hidup = true;
    const muat = async () => {
      try {
        const d = await fetch("/api/dompet", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null));
        if (hidup) pasangDompet(d);
      } catch { /* jaringan sedang buruk; angka lama tetap ditampilkan */ }
    };
    muat();
    const iv = setInterval(muat, RESIN_REGEN_MS);
    return () => { hidup = false; clearInterval(iv); };
  }, [pasangDompet]);

  // — toko skin on-chain —
  const [showShop, setShowShop] = useState(false);
  const [skinData, setSkinData] = useState<{ skins: SkinCard[]; owned: string[] } | null>(null);
  const [buyingSkin, setBuyingSkin] = useState<string | null>(null);

  const muatSkin = useCallback(async () => {
    try {
      const res = await fetch("/api/skin", { cache: "no-store" });
      const d = await res.json();
      if (res.ok) setSkinData({ skins: d.skins ?? SKINS.map((s) => ({ ...s, mint: null, mintExplorer: null })), owned: d.owned ?? [] });
    } catch { /* biarkan; toko tampil tanpa status kepemilikan */ }
  }, []);

  const pakaiSkin = useCallback((s: Skin) => {
    gameRef.current?.setHero(s.shirt, s.pants);
    try { localStorage.setItem("kubantara_skin_aktif", s.id); } catch {}
    showToastRef.current?.(`Skin ${s.name} dipakai ${s.emoji}`);
  }, []);

  const beliSkin = useCallback(async (s: SkinCard) => {
    if (skinData?.owned.includes(s.id)) { pakaiSkin(s); return; }
    if (keping < s.price) { showToastRef.current?.(`Keping kurang (butuh ${s.price} 💎). Main dungeon untuk dapat keping.`); return; }
    setBuyingSkin(s.id);
    try {
      const res = await fetch("/api/skin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skinId: s.id }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) { showToastRef.current?.(d?.error ?? "Gagal membeli"); return; }
      pasangDompet(d); // saldo sesudah bayar datang dari server, bukan dikurangi sendiri
      setSkinData((prev) => prev ? { ...prev, owned: [...prev.owned, s.id] } : prev);
      pakaiSkin(s);
      showToastRef.current?.(`Berhasil! ${s.name} tercatat di Solana devnet ✅`);
    } finally { setBuyingSkin(null); }
  }, [keping, skinData, pakaiSkin, pasangDompet]);

  // Server yang memotong resin dan membuka babak. Pintu dungeon baru dibuka
  // setelah server mengiyakan, supaya anak tak pernah melihat dungeon terbuka
  // padahal resinnya ternyata tidak cukup.
  const masukDungeon = useCallback(async () => {
    const g = gameRef.current;
    if (!g || !dungeon || dungeon.near === null || dungeon.unlocked) return;
    try {
      const res = await fetch("/api/dompet", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aksi: "masuk-dungeon" }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) { showToastRef.current?.(d?.error ?? "Belum bisa masuk dungeon"); return; }
      babakRef.current = d.babakId;
      pasangDompet(d);
      g.unlockDungeon(dungeon.near);
      showToastRef.current?.("Dungeon terbuka! Kumpulkan semua kristalnya ✨");
    } catch {
      showToastRef.current?.("Jaringan sedang bermasalah. Coba sebentar lagi.");
    }
  }, [dungeon, pasangDompet]);

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
  const [kecerahan, setKecerahan] = useState(1);
  const [temanPeta, setTemanPeta] = useState<{ x: number; z: number }[]>([]);
  const [kontras, setKontras] = useState(1);

  // muat preferensi volume tersimpan
  useEffect(() => {
    try {
      const mv = Number(localStorage.getItem("kubantara_music_vol"));
      const sv = Number(localStorage.getItem("kubantara_sfx_vol"));
      if (isFinite(mv) && localStorage.getItem("kubantara_music_vol") !== null) { setMusicVol(mv); music.setVolume(mv); }
      if (isFinite(sv) && localStorage.getItem("kubantara_sfx_vol") !== null) { setSfxVol(sv); sfx.setVolume(sv); }
      const kc = Number(localStorage.getItem("kubantara_kecerahan"));
      const kt = Number(localStorage.getItem("kubantara_kontras"));
      if (isFinite(kc) && kc > 0) setKecerahan(kc);
      if (isFinite(kt) && kt > 0) setKontras(kt);
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
  showToastRef.current = showToast;

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
    const host = hostRef.current;
    if (!host) return;
    const canvas = document.createElement("canvas");
    canvas.className = "h-full w-full touch-none block";
    host.appendChild(canvas);
    const game = createGame(canvas, {
      onStars: (got, total) => {
        setStars({ got, total });
        starsRef.current = got;
        if (statsRef.current) checkAchievements(statsRef.current, got);
        if (got === total) setDone(true);
      },
      onTime: (label) => {
        setTime(label);
        // musik ikut suasana: malam & senja jadi tenang, siang & pagi riang
        music.setMood(label === "Malam" || label === "Senja" ? "night" : "day");
      },
      onRide: (r) => setRiding(r),
      onStat: (s) => {
        statsRef.current = s;
        checkAchievements(s, starsRef.current);
      },
      onNpc: (n) => setNpc(n),
      onWeather: (w) => setWeather(w),
      onNyawa: (n) => {
        setNyawa(n.nyawa);
        // mode bisa berubah dari mesin (pintasan, uji), jadi bar ikut mesin, bukan panel
        setMode(n.mode); modeRef.current = n.mode;
        if (n.pingsan) showToastRef.current?.("Aduh, jatuhnya tinggi! Kamu bangun lagi di tempat aman 💙");
      },
      onDungeon: (d) => {
        setDungeon(d);
        if (d.justCleared) {
          // Hadiahnya diberikan server, dengan menunjuk babak yang tadi dibuka.
          const babak = babakRef.current;
          babakRef.current = null;
          if (!babak) return;
          fetch("/api/dompet", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aksi: "selesai-dungeon", babakId: babak }),
          })
            .then((r) => r.json())
            .then((h) => {
              if (!h?.ok) return;
              setKeping(h.keping);
              setResin(h.resin);
              showToastRef.current?.(`Dungeon selesai! +${h.hadiah} keping kristal ✨`);
            })
            .catch(() => {});
        }
      },
    }, { kualitas, sudutPandang: sudutPandangRef.current, mode: modeRef.current });
    gameRef.current = game;
    // Kembalikan kecerahan/kontras pilihan pemain. Dipasang di sini, bukan di
    // efek pemuatan preferensi, karena efek itu berjalan sebelum mesin dunia ada.
    try {
      const kc = Number(localStorage.getItem("kubantara_kecerahan"));
      const kt = Number(localStorage.getItem("kubantara_kontras"));
      const t: { kecerahan?: number; kontras?: number } = {};
      if (isFinite(kc) && kc > 0) t.kecerahan = kc;
      if (isFinite(kt) && kt > 0) t.kontras = kt;
      if (t.kecerahan || t.kontras) game.setTampilan(t);
    } catch {}
    // Pegangan untuk uji otomatis (uji-kendali.mjs). Tidak ada rahasia di sini —
    // seluruh isinya sudah berjalan di peramban anak.
    (window as unknown as { __kubantara?: unknown }).__kubantara = game;

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
      // skin kosmetik yang terakhir dipakai menimpa warna hero
      try {
        const savedSkin = localStorage.getItem("kubantara_skin_aktif");
        const sk = savedSkin ? SKINS.find((s) => s.id === savedSkin) : null;
        if (sk) game.setHero(sk.shirt, sk.pants);
      } catch {}
      // keahlian terbuka bertambah kuat mengikuti level
      game.setPerks(perksForLevel(Math.max(prof.level, levelFromXp(prof.xp))));
    })();

    const iv = setInterval(save, 20000);

    // Kehadiran waktu-nyata: posisi & lambaian, empat kali per detik.
    //
    // Ini dipisah dari pengiriman balok dengan sengaja. Posisi lewat /api/hadir
    // yang hanya menyentuh memori server, jadi bisa sesering ini tanpa
    // membebani database; balok tetap lewat /api/bersama tiap 2 detik karena
    // balok harus tersimpan permanen. Dulu keduanya jalan bersama tiap 2 detik
    // lewat database, dan itulah sebabnya saudara selalu terlihat tersendat.
    let hadirAktif = true;
    let hadirSibuk = false;   // jangan menumpuk permintaan kalau jaringan lambat
    const ivHadir = setInterval(async () => {
      if (!hadirAktif || hadirSibuk || !profileRef.current) return;
      hadirSibuk = true;
      const pos = game.getPosition();
      try {
        const res = await fetch("/api/hadir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...pos,
            hero: profileRef.current.activeHero,
            emote: emoteRef.current ?? undefined,
          }),
        });
        emoteRef.current = null;
        const data = await res.json();
        if (!data.enabled) { hadirAktif = false; return; }
        game.setFriends(data.teman ?? []);
        setTeman((data.teman ?? []).length);
        // dipakai minimap untuk menandai di mana saudara sedang berada
        setTemanPeta((data.teman ?? []).map((t: { x: number; z: number }) => ({ x: t.x, z: t.z })));
      } catch {
        // sekejap putus bukan alasan berhenti; siklus berikutnya mencoba lagi
      } finally {
        hadirSibuk = false;
      }
    }, 250);

    // Balok bersama: tetap lewat database supaya bangunan tidak hilang.
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
          }),
        });
        const data = await res.json();
        if (!data.enabled) { bersamaAktif = false; return; } // hemat kuota database
        // posisi teman datang dari /api/hadir, bukan dari sini
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
      clearInterval(ivHadir);
      clearInterval(ivBersama);
      window.removeEventListener("pagehide", onHide);
      music.stop();
      game.dispose();
      canvas.remove();
    };
    // `kualitas` ikut jadi kebergantungan: mengganti mutu memasang ulang mesin
    // dengan kanvas baru, sehingga pilihan yang butuh dibangun ulang (anti-alias,
    // kerapatan air, jumlah awan) benar-benar berlaku — bukan cuma label.
  }, [checkAchievements, save, kualitas]);

  // Diagnostik jujur: FPS sungguhan dari gelung gambar, dan waktu pulang-pergi
  // sungguhan ke server. Dipakai untuk menjawab pertanyaan "berapa latency-nya"
  // dengan angka, bukan klaim.
  useEffect(() => {
    if (!showSettings) return;
    let hidup = true;
    const ukur = async () => {
      const k = gameRef.current?.kinerja();
      // Dua ukuran berbeda, sengaja dipisah: /api/ping tidak menyentuh database
      // sama sekali (murni jaringan + server), sedangkan /api/dompet menanyakan
      // database. Kalau yang kedua jauh lebih besar, yang lambat adalah database
      // — bukan koneksi si anak.
      let jaringan: number | null = null;
      let basis: number | null = null;
      try {
        const t0 = performance.now();
        await fetch("/api/ping", { cache: "no-store" });
        jaringan = performance.now() - t0;
      } catch { /* jaringan putus; tampilkan tanda hubung */ }
      try {
        const t1 = performance.now();
        await fetch("/api/dompet", { cache: "no-store" });
        basis = performance.now() - t1;
      } catch { /* biarkan kosong */ }
      if (hidup && k) setDiagnosa({ fps: k.fps, ms: k.msPerBingkai, jaringan, basis });
    };
    ukur();
    const iv = setInterval(ukur, 2000);
    return () => { hidup = false; clearInterval(iv); };
  }, [showSettings]);

  const toggleMusic = useCallback(() => {
    if (music.playing) { music.stop(); setMusicOn(false); }
    else { music.start(); setMusicOn(true); }
  }, []);

  // Satu pintu untuk semua aksi: tombol layar, pintasan papan ketik, dan nanti
  // stik gim kalau ada. Tidak ada logika yang hanya hidup di dalam onClick.
  const jalankanAksi = useCallback((a: Aksi) => {
    const g = gameRef.current;
    if (!g) return;
    if (a === "bangun") { g.place(); return; }
    if (a === "bongkar") { g.removeBlock(); return; }
    if (a === "cetakan") { setShowBuild((v) => !v); return; }
    if (a === "tunggang") { g.toggleRide(); return; }
    const ok = g.tameNearest();
    showToastRef.current?.(ok ? "Satwa jadi sahabatmu! ❤️" : "Dekati dulu satwanya, lalu coba lagi");
  }, []);

  const lompat = useCallback(() => {
    if (gameRef.current) gameRef.current.touch.jump = true;
  }, []);

  // Pintasan papan ketik untuk tiap tombol aksi.
  useEffect(() => {
    const tekan = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key.toLowerCase() === "v") { e.preventDefault(); gantiSudutPandang(); return; }
      const a = AKSI.find((x) => x.tombol === e.key.toLowerCase());
      if (a) { e.preventDefault(); jalankanAksi(a.id); }
    };
    window.addEventListener("keydown", tekan);
    return () => window.removeEventListener("keydown", tekan);
  }, [jalankanAksi, gantiSudutPandang]);

  // Stik analog.
  //
  // Versi lama memakai TouchEvent.touches[0] — jari *pertama* di layar, siapa pun
  // dia. Begitu anak menahan stik lalu menekan LOMPAT, jari kedua itu jadi
  // touches[0] pada peristiwa berikutnya dan stik melompat mengikuti ibu jari
  // kanan. Itu sebabnya penguji melaporkan tombol "tidak terintegrasi": tombol
  // bekerja, tapi menekannya membajak arah jalan.
  //
  // Sekarang memakai Pointer Events dan mengunci satu pointerId. Sekalian
  // menyatukan tetikus, pena, dan sentuh — di desktop stik ini bisa diseret
  // dengan mouse, bukan hanya jadi hiasan.
  useEffect(() => {
    const pad = padRef.current;
    if (!pad) return;

    const JARI = 52;      // jarak (px) dari pusat sampai simpangan penuh
    const MATI = 0.14;    // zona mati: jari diam tak boleh membuat pemain merayap
    let idJari: number | null = null;
    const pusat = { x: 0, y: 0 };

    const gambarKnop = (kx: number, ky: number) => {
      const knop = knobRef.current;
      if (knop) knop.style.transform = `translate(calc(-50% + ${kx * JARI}px), calc(-50% + ${ky * JARI}px))`;
    };

    const arahkan = (e: PointerEvent) => {
      const g = gameRef.current;
      if (!g) return;
      let dx = (e.clientX - pusat.x) / JARI;
      let dy = (e.clientY - pusat.y) / JARI;
      const jauh = Math.hypot(dx, dy);
      if (jauh > 1) { dx /= jauh; dy /= jauh; }        // tahan di lingkaran, bukan kotak
      if (jauh < MATI) { dx = 0; dy = 0; }
      gambarKnop(dx, dy);
      g.touch.x = dx;
      // Layar menghitung y ke bawah; permainan menghitung "maju" ke atas.
      // Membalik di sini sekali, supaya mesin permainan tak perlu tahu soal layar.
      g.touch.y = -dy;
    };

    const mulai = (e: PointerEvent) => {
      if (idJari !== null) return;                     // satu jari saja yang memegang stik
      idJari = e.pointerId;
      setStikDipegang(true);
      pad.setPointerCapture(e.pointerId);              // jari boleh keluar dari lingkaran
      const r = pad.getBoundingClientRect();
      pusat.x = r.left + r.width / 2;
      pusat.y = r.top + r.height / 2;
      e.preventDefault();
      arahkan(e);
    };
    const geser = (e: PointerEvent) => { if (e.pointerId === idJari) { e.preventDefault(); arahkan(e); } };
    const berhenti = () => {
      idJari = null;
      setStikDipegang(false);
      gambarKnop(0, 0);
      if (gameRef.current) { gameRef.current.touch.x = 0; gameRef.current.touch.y = 0; }
    };
    const lepas = (e: PointerEvent) => {
      if (e.pointerId !== idJari) return;
      if (pad.hasPointerCapture(e.pointerId)) pad.releasePointerCapture(e.pointerId);
      berhenti();
    };

    pad.addEventListener("pointerdown", mulai);
    pad.addEventListener("pointermove", geser);
    pad.addEventListener("pointerup", lepas);
    pad.addEventListener("pointercancel", lepas);
    // Jika jendela kehilangan fokus (anak pindah tab) pemain harus berhenti,
    // bukan berjalan terus menembus pulau.
    window.addEventListener("blur", berhenti);
    return () => {
      pad.removeEventListener("pointerdown", mulai);
      pad.removeEventListener("pointermove", geser);
      pad.removeEventListener("pointerup", lepas);
      pad.removeEventListener("pointercancel", lepas);
      window.removeEventListener("blur", berhenti);
      if (gameRef.current) { gameRef.current.touch.x = 0; gameRef.current.touch.y = 0; }
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
      {/* Canvas dibuat oleh efek di bawah, bukan oleh React. Sekali sebuah canvas
          dipakai WebGL lalu renderer-nya dibuang, konteksnya tak bisa dipakai lagi —
          jadi tiap kali permainan dimulai ulang kita pasang canvas yang benar-benar baru. */}
      <div ref={hostRef} className="h-full w-full touch-none" />

      {/* Ajakan / progres dungeon gua */}
      {dungeon && (dungeon.near !== null || dungeon.inside !== null) && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-4 sm:top-24">
          <div className="pointer-events-auto rounded-2xl bg-slate-900/85 px-4 py-2.5 text-center text-white shadow-lg backdrop-blur">
            {dungeon.inside !== null && dungeon.unlocked ? (
              <p className="text-sm font-bold">
                🔮 Kristal {dungeon.collected}/{dungeon.total}
                {dungeon.collected >= dungeon.total
                  ? " — dungeon selesai! ✨"
                  : " — dekati kristalnya untuk mengambil"}
              </p>
            ) : dungeon.unlocked ? (
              <p className="text-sm font-bold">Dungeon terbuka — masuk ke gua & kumpulkan kristalnya</p>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold">🕳️ Dungeon Gua Kristal</span>
                <button
                  onClick={masukDungeon}
                  disabled={resin < DUNGEON_COST}
                  className="rounded-xl bg-violet-500 px-3 py-1.5 text-sm font-black shadow transition enabled:hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Masuk −{DUNGEON_COST}⚡
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HUD atas */}
      <div className="pointer-events-none absolute left-2 top-2 flex max-w-[62vw] flex-wrap items-center gap-1.5 lg:max-w-none">
        <Link href="/" className="pointer-events-auto rounded-xl bg-white/85 px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow sm:px-3 sm:py-2 sm:text-sm">
          Keluar
        </Link>
        <div className="rounded-xl bg-white/85 px-2.5 py-1.5 text-xs font-bold text-amber-600 shadow sm:px-3 sm:py-2 sm:text-sm">
          ⭐ {stars.got}/{stars.total}
        </div>
        <div
          title="Resin mengisi ulang sendiri, gratis. Dipakai untuk masuk dungeon gua."
          className="rounded-xl bg-white/85 px-2.5 py-1.5 text-xs font-bold text-violet-600 shadow sm:px-3 sm:py-2 sm:text-sm"
        >
          ⚡ {resin}/{RESIN_MAX}
        </div>
        {keping > 0 && (
          <div className="rounded-xl bg-white/85 px-2.5 py-1.5 text-xs font-bold text-cyan-600 shadow sm:px-3 sm:py-2 sm:text-sm">
            💎 {keping}
          </div>
        )}
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
          aria-label={musicOn ? "Matikan musik" : "Nyalakan musik"}
          aria-pressed={musicOn}
          className="pointer-events-auto rounded-xl bg-white/85 px-2.5 py-1.5 text-xs font-bold text-violet-700 shadow sm:px-3 sm:py-2 sm:text-sm"
        >
          {musicOn ? "🎵" : "🔇"}
        </button>
        <button
          onClick={toggleFullscreen}
          title="Layar penuh"
          aria-label="Layar penuh"
          aria-pressed={isFull}
          className="pointer-events-auto rounded-xl bg-white/85 px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow sm:px-3 sm:py-2 sm:text-sm"
        >
          {isFull ? "🗗" : "⛶"}
        </button>
        <button
          onClick={() => setFreeLook(gameRef.current?.toggleFreeLook() ?? false)}
          title="Lihat bebas dengan mouse"
          aria-label="Lihat bebas dengan mouse"
          aria-pressed={freeLook}
          className={`pointer-events-auto rounded-xl px-2.5 py-1.5 text-xs font-bold shadow sm:px-3 sm:py-2 sm:text-sm ${
            freeLook ? "bg-emerald-500 text-white" : "bg-white/85 text-slate-700"
          }`}
        >
          🖱️
        </button>
        <button
          onClick={gantiSudutPandang}
          data-uji="sudut-pandang"
          title="Ganti sudut pandang (tombol V)"
          aria-label="Ganti sudut pandang"
          className={`pointer-events-auto rounded-xl px-2.5 py-1.5 text-xs font-bold shadow sm:px-3 sm:py-2 sm:text-sm ${
            sudutPandang === "orang-pertama" ? "bg-emerald-500 text-white" : "bg-white/85 text-slate-700"
          }`}
        >
          {sudutPandang === "orang-pertama" ? "👁️ Mata" : "🎥 Bahu"}
        </button>
        <button
          onClick={() => setShowPet((v) => !v)}
          title="Peliharaan & jalan pintas"
          aria-label="Peliharaan dan jalan pintas"
          aria-expanded={showPet}
          className="pointer-events-auto rounded-xl bg-white/85 px-2.5 py-1.5 text-xs font-bold text-pink-600 shadow sm:px-3 sm:py-2 sm:text-sm"
        >
          🐾
        </button>
        <button
          onClick={() => { setShowShop((v) => !v); if (!skinData) muatSkin(); }}
          title="Toko skin (bukti di Solana devnet)"
          aria-label="Toko skin"
          aria-expanded={showShop}
          className="pointer-events-auto rounded-xl bg-white/85 px-2.5 py-1.5 text-xs font-bold text-violet-600 shadow sm:px-3 sm:py-2 sm:text-sm"
        >
          🛍️
        </button>
        <button
          onClick={() => setShowSettings((v) => !v)}
          title="Pengaturan"
          aria-label="Pengaturan"
          aria-expanded={showSettings}
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

      {!tata.hp && (
        <div className="pointer-events-none absolute right-[140px] top-16 hidden max-w-[230px] rounded-xl bg-white/70 px-3 py-2 text-xs leading-relaxed text-slate-700 shadow md:block">
          <b>WASD</b> jalan · <b>Spasi</b> lompat · seret mouse untuk melihat sekeliling · scroll zoom.
          <br />
          <b>F</b> bangun · <b>R</b> bongkar · <b>B</b> cetakan · <b>T</b> jinakkan · <b>G</b> naik.
        </div>
      )}

      {/* Ajakan memiringkan HP. Muncul sekali saja, hanya di layar sentuh yang
          sempit & tegak, dan bisa ditutup — bukan dinding yang memblokir main. */}
      {tata.sentuh && tata.bentuk === "hp-tegak" && !miringDitutup && (
        <button
          onClick={() => setMiringDitutup(true)}
          // di bawah palet warna, bukan di atas joystick: di HP kecil posisi
          // bawah menutupi tombol Naik (ketahuan lewat uji-tata-layar.mjs)
          aria-label="Miringkan HP supaya pulau terlihat lebih lebar. Ketuk untuk menutup."
          // Satu baris pendek tepat di bawah palet (top-48 + 40px): di HP kecil
          // kolom sihir & aksi dimulai ±250px, jadi teks panjang menimpanya.
          className="absolute top-[236px] left-1/2 z-30 w-max -translate-x-1/2 rounded-full bg-slate-900/85 px-3 py-1 text-xs font-bold text-white shadow-xl backdrop-blur"
        >
          📱↻ Miringkan HP ✕
        </button>
      )}

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
        <div
          className={`pointer-events-none absolute left-1/2 z-20 w-[min(90vw,28rem)] -translate-x-1/2 rounded-2xl bg-slate-900/90 text-white shadow-xl ${
            tata.baring ? "bottom-24 p-2.5" : "bottom-44 p-4"
          }`}
        >
          <p className="text-sm font-black text-amber-300">{npc.name}</p>
          <p className="mt-1 text-sm leading-relaxed">{npc.line}</p>
        </div>
      )}

      {/* Palet warna balok — turun ke bawah bar atas di layar sempit
          supaya tidak bertabrakan dengan chip status. */}
      {/* Dimiringkan, palet pindah ke tepi kanan sebagai kisi 2 lajur: bar status
          atas sudah membungkus jadi beberapa baris di layar pendek dan akan
          menimpanya kalau palet tetap di atas. */}
      <div
        className={
          tata.baring
            // geser ke kiri minimap (lebar ≤112px di right-3), jangan di bawahnya
            ? "absolute right-32 top-1/2 grid -translate-y-1/2 grid-cols-2 gap-1 rounded-2xl bg-white/80 p-1.5 shadow"
            // HP tegak: bar status membungkus jadi tiga baris (~138px), jadi
            // palet diletakkan di bawahnya; di layar lebar bar hanya satu baris.
            // minimap tegak menempati top-16 s/d ±180px di kanan; palet 8 warna
            // selebar ±264px pasti menabraknya kalau diletakkan di atas itu.
            : "absolute left-1/2 top-48 sm:top-14 flex -translate-x-1/2 gap-1 rounded-2xl bg-white/80 p-1.5 shadow sm:gap-1.5"
        }
      >
        {PALETTE.map((p, i) => (
          <button
            key={p.name}
            onClick={() => pickColor(i)}
            title={p.name}
            aria-label={`Warna ${p.name}`}
            className={`rounded-lg border-2 transition-transform hover:scale-110 ${
              tata.baring ? "h-6 w-6" : "h-7 w-7 sm:h-8 sm:w-8"
            } ${colorIdx === i ? "border-slate-900 scale-110" : "border-white/60"}`}
            style={{ backgroundColor: `#${p.hex.toString(16).padStart(6, "0")}` }}
          />
        ))}
      </div>

      {/* Panel sihir. Tegak/laptop: kolom di kiri tengah. Dimiringkan: satu baris
          rapat tepat di atas stik, supaya tidak menimpa pemandangan. */}
      <div
        className={
          tata.baring
            ? "absolute bottom-14 left-1/2 z-10 flex -translate-x-1/2 gap-1"
            : "absolute left-3 top-1/2 flex -translate-y-1/2 flex-col gap-2"
        }
      >
        {SPELLS.map((s) => (
          <button
            key={s.id}
            onClick={() => gameRef.current?.cast(s.id)}
            className={`rounded-xl bg-violet-500/90 font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${
              tata.baring ? "px-2 py-1 text-[10px]" : "px-3 py-2 text-xs"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Laci cetakan bangunan — ditutup secara bawaan supaya tidak menutupi
          joystick di layar HP yang sempit. */}
      {showBuild && (
        <div
          className={`absolute left-1/2 z-20 w-[min(92vw,22rem)] -translate-x-1/2 overflow-y-auto rounded-2xl bg-white/95 p-3 shadow-xl ${
            tata.baring ? "bottom-24 max-h-[52vh]" : "bottom-44 max-h-[60vh]"
          }`}
        >
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

      {/* Aksi bangun / bongkar / tunggang. Tiap tombol menyebut pintasan papan
          ketiknya, supaya anak yang main di laptop tidak perlu menebak. */}
      {/* Nyawa. Hanya muncul di mode Petualangan — di mode Santai tidak ada yang
          bisa melukai, jadi bar nyawa cuma akan membingungkan. */}
      {mode === "petualangan" && (
        <div
          data-uji="nyawa"
          aria-label={`Nyawa ${nyawa} dari ${NYAWA_MAKS}`}
          className={`absolute z-20 flex gap-1 rounded-full bg-slate-950/45 px-2.5 py-1.5 ${
            tata.baring ? "left-1/2 top-2 -translate-x-1/2" : "left-1/2 top-16 -translate-x-1/2"
          }`}
        >
          {Array.from({ length: NYAWA_MAKS }, (_, i) => (
            <span
              key={i}
              // hati yang hilang tetap tergambar samar, supaya anak melihat
              // berapa yang bisa kembali — bukan sekadar berapa yang tersisa
              className={`text-base leading-none transition-opacity ${i < nyawa ? "opacity-100" : "opacity-25 grayscale"}`}
            >
              ❤️
            </span>
          ))}
        </div>
      )}

      <div
        className={
          tata.baring
            ? "absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1"
            : "absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-2"
        }
      >
        {AKSI.map((a) => {
          const nyala = a.id === "cetakan" ? showBuild : a.id === "tunggang" ? riding : false;
          return (
            <button
              key={a.id}
              onClick={() => jalankanAksi(a.id)}
              title={`${a.label} (tombol ${a.tombol.toUpperCase()})`}
              className={`rounded-xl font-black text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${
                tata.baring ? "px-2 py-1.5 text-[10px]" : "px-4 py-3 text-sm"
              } ${nyala ? a.warnaNyala : a.warna}`}
            >
              {a.id === "cetakan" && showBuild ? "Tutup" : a.id === "tunggang" && riding ? "Turun" : a.label}
              {!tata.hp && <span className="ml-1 opacity-60">{a.tombol.toUpperCase()}</span>}
            </button>
          );
        })}
      </div>

      {/* Stik jalan. Ukurannya mengecil saat HP dimiringkan supaya tidak menelan
          layar yang sudah pendek. Knop di dalamnya benar-benar mengikuti jari —
          tanpa itu anak tidak tahu stiknya sudah terpegang atau belum. */}
      <div
        ref={padRef}
        data-uji="stik"
        aria-label="Stik jalan"
        // z-30: laci cetakan & panel lain memakai z-20 dan dulu menimbun stik,
        // sehingga di HP kendalinya seolah "tidak pernah muncul".
        className={`absolute z-30 touch-none rounded-full border-4 border-white/60 bg-white/25 transition-colors ${
          stikDipegang ? "border-white/90 bg-white/40" : ""
        } ${tata.baring ? "bottom-3 left-3 h-28 w-28" : "bottom-8 left-6 h-32 w-32"}`}
      >
        <div
          ref={knobRef}
          data-uji="knop"
          className={`pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 rounded-full bg-white/80 shadow-md ${
            // Saat dipegang, knop harus menempel di jari tanpa jeda. Saat dilepas,
            // ia meluncur pulang ke tengah — itu yang membuat stiknya terasa hidup.
            stikDipegang ? "" : "transition-transform duration-200 ease-out"
          }`}
          style={{ transform: "translate(-50%, -50%)" }}
        />
      </div>
      <button
        type="button"
        data-uji="lompat"
        aria-label="Lompat"
        className={`absolute z-30 touch-none rounded-full border-4 border-white/60 bg-sky-400/80 font-black text-white shadow-lg transition-transform duration-100 active:scale-90 active:bg-sky-500 ${
          tata.baring ? "bottom-3 right-3 h-20 w-20 text-xs" : "bottom-10 right-6 h-24 w-24 text-base"
        }`}
        // pointerdown, bukan touchstart/click: satu jalur untuk jari, tetikus, dan
        // pena, dan lompatnya terjadi saat ditekan — bukan saat dilepas.
        onPointerDown={(e) => { e.preventDefault(); lompat(); }}
      >
        LOMPAT
      </button>

      {/* Toast pencapaian */}
      {toast && (
        <div
          key={toast}
          className={`anim-pop pointer-events-none absolute left-1/2 z-30 max-w-[86vw] -translate-x-1/2 rounded-2xl bg-slate-900/90 px-5 py-3 text-center text-sm font-bold text-amber-300 shadow-xl ${
            tata.baring ? "top-14" : "bottom-64"
          }`}
        >
          {toast}
        </div>
      )}

      {/* Panel peliharaan & jalan pintas (teleport) */}
      {showPet && (
        <div className="absolute right-3 top-16 z-30 w-64 rounded-2xl bg-white/95 p-4 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-black text-slate-800">🐾 Peliharaan</p>
            <button onClick={() => setShowPet(false)} className="text-slate-400 hover:text-slate-700">✕</button>
          </div>
          <button
            onClick={() => { gameRef.current?.feedPet(); showToast("Nyam! Peliharaanmu senang ❤️"); }}
            className="w-full rounded-xl bg-pink-500 py-2.5 text-sm font-black text-white shadow active:scale-95"
          >
            🍎 Beri makan
          </button>
          <p className="mb-1.5 mt-3 text-xs font-black text-slate-800">Kostum topi</p>
          <div className="grid grid-cols-2 gap-1.5">
            {(gameRef.current?.petCostumes() ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => { gameRef.current?.setPetCostume(c.id); showToast(`Peliharaanmu memakai ${c.label}`); }}
                className="rounded-lg bg-slate-100 px-1 py-2 text-xs font-bold text-slate-700 active:scale-95"
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="mb-1.5 mt-3 text-xs font-black text-slate-800">🚀 Jalan pintas</p>
          <div className="grid grid-cols-2 gap-1.5">
            {(gameRef.current?.landmarks() ?? []).map((l) => (
              <button
                key={l.id}
                onClick={() => { gameRef.current?.teleport(l.id); showToast(`Melompat ke ${l.label}`); setShowPet(false); }}
                className="rounded-lg bg-sky-100 px-1 py-2 text-xs font-bold text-sky-800 active:scale-95"
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toko skin kosmetik — dibeli pakai keping 💎, dicatat di Solana devnet */}
      {showShop && (
        <div className="absolute right-3 top-16 z-30 max-h-[80vh] w-72 overflow-y-auto rounded-2xl bg-white/95 p-4 shadow-xl">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-black text-slate-800">🛍️ Toko Skin</p>
            <button onClick={() => setShowShop(false)} className="text-slate-400 hover:text-slate-700">✕</button>
          </div>
          <p className="mb-3 text-[11px] leading-snug text-slate-500">
            Skin cuma mengubah tampilan — tidak memengaruhi permainan. Dibeli pakai
            keping 💎 hasil main dungeon, dan kepemilikannya dicatat di Solana devnet.
          </p>
          <div className="mb-3 rounded-lg bg-violet-50 px-3 py-2 text-xs font-black text-violet-700">
            Keping kamu: 💎 {keping}
          </div>
          <div className="space-y-2">
            {(skinData?.skins ?? SKINS.map((s) => ({ ...s, mint: null, mintExplorer: null }))).map((s) => {
              const owned = skinData?.owned.includes(s.id) ?? false;
              const busy = buyingSkin === s.id;
              return (
                <div key={s.id} data-uji={`skin-${s.id}`} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                  {/* Baju di atas, celana di bawah — seperti yang akan dipakai
                      karakternya. Dulu hanya warna baju yang terlihat, jadi anak
                      memilih skin tanpa tahu setengah tampilannya. */}
                  <span
                    className="flex h-9 w-9 shrink-0 flex-col overflow-hidden rounded-lg"
                    aria-label={`Baju dan celana ${s.name}`}
                  >
                    <span
                      className="flex flex-1 items-center justify-center text-sm"
                      style={{ background: `#${s.shirt.toString(16).padStart(6, "0")}` }}
                    >
                      {s.emoji}
                    </span>
                    <span
                      className="h-3 w-full"
                      style={{ background: `#${s.pants.toString(16).padStart(6, "0")}` }}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-slate-800">{s.name}</p>
                    {/* Harga selalu terlihat. Dulu ia digantikan tautan Explorer,
                        sehingga skin yang mint-nya sudah dibuat tampak tanpa harga. */}
                    <p className="text-[10px] text-slate-400">
                      💎 {s.price}
                      {s.mintExplorer && (
                        <>
                          {" · "}
                          <a href={s.mintExplorer} target="_blank" rel="noreferrer" className="text-cyan-600 hover:underline">
                            Explorer ↗
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => beliSkin(s)}
                    data-uji={`skin-tombol-${s.id}`}
                    disabled={busy || (!owned && keping < s.price)}
                    className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-black shadow active:scale-95 disabled:opacity-40 ${
                      owned ? "bg-emerald-500 text-white" : "bg-violet-500 text-white"
                    }`}
                  >
                    {busy ? "…" : owned ? "Pakai" : `💎 ${s.price}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Panel pengaturan: volume musik & efek suara */}
      <Minimap mesin={() => gameRef.current} saudara={temanPeta} />

      {showSettings && (
        <div className="absolute right-3 top-16 z-30 w-64 rounded-2xl bg-white/95 p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-black text-slate-800">Pengaturan</p>
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

          <p className="mb-1.5 mt-4 text-xs font-black text-slate-700">🖥️ Tampilan layar</p>
          <label className="block text-xs font-bold text-slate-600">
            Kecerahan: {Math.round(kecerahan * 100)}%
            <input
              data-uji="kecerahan"
              type="range" min={0.6} max={1.6} step={0.05} value={kecerahan}
              onChange={(e) => {
                const v = Number(e.target.value);
                setKecerahan(v);
                gameRef.current?.setTampilan({ kecerahan: v });
                try { localStorage.setItem("kubantara_kecerahan", String(v)); } catch {}
              }}
              className="mt-1 w-full accent-amber-500"
            />
          </label>
          <label className="mt-3 block text-xs font-bold text-slate-600">
            Kontras: {Math.round(kontras * 100)}%
            <input
              data-uji="kontras"
              type="range" min={0.7} max={1.5} step={0.05} value={kontras}
              onChange={(e) => {
                const v = Number(e.target.value);
                setKontras(v);
                gameRef.current?.setTampilan({ kontras: v });
                try { localStorage.setItem("kubantara_kontras", String(v)); } catch {}
              }}
              className="mt-1 w-full accent-sky-500"
            />
          </label>

          <p className="mb-1.5 mt-4 text-xs font-black text-slate-700">🎮 Cara main</p>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { id: "santai", label: "Santai", catatan: "membangun tanpa bahaya apa pun" },
              { id: "petualangan", label: "Petualangan", catatan: "jatuh dari tinggi mengurangi nyawa" },
            ] as { id: Mode; label: string; catatan: string }[]).map((m) => (
              <button
                key={m.id}
                data-uji={`mode-${m.id}`}
                onClick={() => gantiMode(m.id)}
                title={m.catatan}
                className={`rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors ${
                  mode === m.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] leading-snug text-slate-500">
            Di mode Petualangan nyawa pulih sendiri, dan kalau habis kamu cuma
            bangun lagi di tempat aman. Bangunanmu tidak pernah hilang.
          </p>

          <p className="mb-1.5 mt-4 text-xs font-black text-slate-700">🎨 Mutu grafis</p>
          <div className="grid grid-cols-2 gap-1.5">
            {KUALITAS.map((k) => (
              <button
                key={k.id}
                data-uji={`mutu-${k.id}`}
                onClick={() => pilihKualitas(k.id)}
                title={k.catatan}
                className={`rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors ${
                  kualitas === k.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] leading-snug text-slate-500">
            Mengganti mutu memuat ulang pemandangan sebentar. Bangunanmu tetap aman.
          </p>

          {/* Angka apa adanya, supaya pilihan di atas bisa dibuktikan — dan supaya
              pertanyaan "berapa latency-nya" dijawab ukuran, bukan klaim. */}
          <p className="mb-1 mt-4 text-xs font-black text-slate-700">📊 Ukuran sebenarnya</p>
          <div data-uji="diagnosa" className="rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] leading-relaxed text-slate-600">
            <p>
              Kelancaran:{" "}
              <b data-uji="fps">{diagnosa ? diagnosa.fps.toFixed(0) : "…"}</b> FPS
              {diagnosa && ` (${diagnosa.ms.toFixed(1)} ms per gambar)`}
            </p>
            <p>
              Jaringan ke server:{" "}
              <b data-uji="latensi">
                {diagnosa ? (diagnosa.jaringan === null ? "putus" : `${diagnosa.jaringan.toFixed(0)} ms`) : "…"}
              </b>{" "}
              pulang-pergi
            </p>
            <p>
              Termasuk baca data:{" "}
              <b data-uji="latensi-data">
                {diagnosa ? (diagnosa.basis === null ? "putus" : `${diagnosa.basis.toFixed(0)} ms`) : "…"}
              </b>
            </p>
          </div>
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
