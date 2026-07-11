"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createGame, PALETTE, type Spell } from "@/lib/voxel-game";

const SPELLS: { id: Spell; label: string }[] = [
  { id: "jembatan", label: "Jembatan" },
  { id: "bunga", label: "Bunga" },
  { id: "kembang-api", label: "Kembang api" },
  { id: "pohon", label: "Tumbuh pohon" },
];

export default function PlayPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<ReturnType<typeof createGame> | null>(null);
  const padRef = useRef<HTMLDivElement>(null);
  const [stars, setStars] = useState({ got: 0, total: 24 });
  const [time, setTime] = useState<string>("Pagi");
  const [riding, setRiding] = useState(false);
  const [colorIdx, setColorIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const game = createGame(canvasRef.current, {
      onStars: (got, total) => {
        setStars({ got, total });
        if (got === total) setDone(true);
      },
      onTime: (label) => setTime(label),
      onRide: (r) => setRiding(r),
    });
    gameRef.current = game;
    return () => game.dispose();
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
      </div>

      <div className="pointer-events-none absolute right-3 top-3 hidden max-w-[220px] rounded-xl bg-white/70 px-3 py-2 text-xs leading-relaxed text-slate-700 shadow md:block">
        WASD jalan · Spasi lompat · Q/E putar kamera. Pilih warna lalu tekan Bangun untuk menaruh balok di depanmu.
      </div>

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
