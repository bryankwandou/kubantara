"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createGame } from "@/lib/voxel-game";

export default function PlayPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<ReturnType<typeof createGame> | null>(null);
  const padRef = useRef<HTMLDivElement>(null);
  const [stars, setStars] = useState({ got: 0, total: 20 });
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const game = createGame(canvasRef.current, {
      onStars: (got, total) => {
        setStars({ got, total });
        if (got === total) setDone(true);
      },
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
      if (gameRef.current) {
        gameRef.current.touch.x = 0;
        gameRef.current.touch.y = 0;
      }
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

  return (
    <main className="fixed inset-0 overflow-hidden bg-sky-300">
      <canvas ref={canvasRef} className="h-full w-full" />

      {/* HUD */}
      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-3">
        <Link
          href="/"
          className="pointer-events-auto rounded-xl bg-white/85 px-3 py-2 text-sm font-bold text-slate-800 shadow"
        >
          Keluar
        </Link>
        <div className="rounded-xl bg-white/85 px-4 py-2 font-bold text-amber-600 shadow">
          Bintang {stars.got} / {stars.total}
        </div>
      </div>

      <div className="pointer-events-none absolute right-4 top-4 hidden rounded-xl bg-white/70 px-4 py-2 text-xs text-slate-700 shadow md:block">
        WASD jalan · Spasi lompat · Q/E putar kamera
      </div>

      {/* kontrol sentuh */}
      <div
        ref={padRef}
        className="absolute bottom-8 left-8 h-32 w-32 rounded-full border-4 border-white/60 bg-white/25 md:hidden"
      >
        <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
      </div>
      <button
        className="absolute bottom-10 right-8 h-24 w-24 rounded-full border-4 border-white/60 bg-amber-400/80 text-lg font-black text-white shadow-lg md:hidden"
        onTouchStart={() => gameRef.current && (gameRef.current.touch.jump = true)}
        onTouchEnd={() => gameRef.current && (gameRef.current.touch.jump = false)}
      >
        LOMPAT
      </button>

      {done && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="rounded-3xl bg-white p-8 text-center shadow-2xl">
            <p className="text-3xl font-black text-amber-500">Hebat sekali!</p>
            <p className="mt-2 text-slate-600">
              Semua bintang di Kubantara sudah kamu temukan.
            </p>
            <button
              onClick={() => location.reload()}
              className="mt-5 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white"
            >
              Main lagi
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
