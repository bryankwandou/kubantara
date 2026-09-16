"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PetaDunia = { n: number; langkah: number; half: number; warna: number[]; tinggi: number[] };
type Titik = { x: number; z: number; nama?: string };

export type MesinPeta = {
  petaDunia: (langkah?: number) => PetaDunia;
  posisi: () => { x: number; y: number; z: number };
  getYaw: () => number;
};

const ZOOM = [1.5, 3, 6] as const; // piksel layar per petak peta
const NAMA_ZOOM = ["Jauh", "Sedang", "Dekat"];

/**
 * Minimap yang dapat diperbesar.
 *
 * Bentang alam dunia ini tidak berubah, jadi petanya digambar SEKALI ke kanvas
 * di luar layar lalu dipakai ulang tiap bingkai. Yang digambar ulang hanya
 * penanda pemain dan saudara — itu sebabnya minimap ini praktis tidak
 * membebani perangkat, bahkan di HP kelas bawah.
 */
export default function Minimap({
  mesin,
  saudara = [],
}: {
  mesin: () => MesinPeta | null;
  saudara?: Titik[];
}) {
  const [besar, setBesar] = useState(false);
  const [tingkat, setTingkat] = useState(1);
  const dasarRef = useRef<HTMLCanvasElement | null>(null);
  const petaRef = useRef<PetaDunia | null>(null);
  const layarRef = useRef<HTMLCanvasElement | null>(null);

  // Keadaan terbaru disimpan di ref, bukan dijadikan kebergantungan effect.
  // Kalau `mesin` dan `saudara` ikut jadi kebergantungan, effect-nya dibongkar
  // pasang tiap kali induknya render ulang — dan karena induknya render lebih
  // sering daripada 160 ms, interval-nya selalu dibersihkan sebelum sempat
  // berdetak sekali pun. Akibatnya peta berhenti mengikuti pemain: gambarnya
  // membeku persis seperti saat terakhir render sempat jeda.
  const mesinRef = useRef(mesin);
  const saudaraRef = useRef(saudara);
  const besarRef = useRef(besar);
  const tingkatRef = useRef(tingkat);
  mesinRef.current = mesin;
  saudaraRef.current = saudara;
  besarRef.current = besar;
  tingkatRef.current = tingkat;

  // Gambar seluruh dunia sekali ke kanvas luar layar.
  const siapkanDasar = useCallback(() => {
    const g = mesinRef.current();
    if (!g || dasarRef.current) return;
    const peta = g.petaDunia(2);
    const c = document.createElement("canvas");
    c.width = peta.n;
    c.height = peta.n;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(peta.n, peta.n);
    for (let i = 0; i < peta.n; i++) {
      for (let j = 0; j < peta.n; j++) {
        const warna = peta.warna[i * peta.n + j];
        // Bayangan lereng: petak yang lebih tinggi dari tetangga baratnya
        // dibuat lebih terang, yang lebih rendah lebih gelap. Tanpa ini peta
        // terlihat rata dan bukitnya tidak terbaca sama sekali.
        const h = peta.tinggi[i * peta.n + j];
        const hBarat = i > 0 ? peta.tinggi[(i - 1) * peta.n + j] : h;
        const terang = Math.max(0.72, Math.min(1.28, 1 + (h - hBarat) * 0.13));
        const p = (j * peta.n + i) * 4;
        img.data[p] = Math.min(255, ((warna >> 16) & 255) * terang);
        img.data[p + 1] = Math.min(255, ((warna >> 8) & 255) * terang);
        img.data[p + 2] = Math.min(255, (warna & 255) * terang);
        img.data[p + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    dasarRef.current = c;
    petaRef.current = peta;
  }, []);

  useEffect(() => {
    // Mesin dunia dibuat secara asinkron, jadi dicoba berkala sampai ada.
    const t = setInterval(() => {
      siapkanDasar();
      if (dasarRef.current) clearInterval(t);
    }, 400);
    return () => clearInterval(t);
  }, [siapkanDasar]);

  // Gambar ulang penanda. 6x per detik sudah terasa hidup tanpa ikut
  // memperebutkan waktu render dengan dunia 3D-nya.
  useEffect(() => {
    const t = setInterval(() => {
      const mesin = mesinRef.current;
      const saudara = saudaraRef.current;
      const besar = besarRef.current;
      const tingkat = tingkatRef.current;
      const g = mesin();
      const dasar = dasarRef.current;
      const peta = petaRef.current;
      const kanvas = layarRef.current;
      if (!g || !dasar || !peta || !kanvas) return;
      const ctx = kanvas.getContext("2d");
      if (!ctx) return;

      const sisi = besar ? kanvas.width : kanvas.width;
      const skala = ZOOM[tingkat] * (besar ? 1.6 : 1);
      const p = g.posisi();
      // posisi pemain dalam satuan petak peta
      const px = (p.x + peta.half) / peta.langkah;
      const pz = (p.z + peta.half) / peta.langkah;

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, sisi, sisi);
      ctx.save();
      ctx.beginPath();
      ctx.arc(sisi / 2, sisi / 2, sisi / 2, 0, Math.PI * 2);
      if (!besar) ctx.clip();
      ctx.translate(sisi / 2, sisi / 2);
      ctx.scale(skala, skala);
      ctx.translate(-px, -pz);
      ctx.fillStyle = "#12324a";
      ctx.fillRect(-4, -4, peta.n + 8, peta.n + 8); // laut di luar tepi pulau
      ctx.drawImage(dasar, 0, 0);
      ctx.restore();

      const keLayar = (wx: number, wz: number) => [
        sisi / 2 + ((wx + peta.half) / peta.langkah - px) * skala,
        sisi / 2 + ((wz + peta.half) / peta.langkah - pz) * skala,
      ];

      // saudara sekeluarga
      for (const s of saudara) {
        const [sx, sy] = keLayar(s.x, s.z);
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(sx, sy, besar ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#0c4a6e";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // kerucut arah pandang + penanda pemain
      const yaw = g.getYaw();
      ctx.save();
      ctx.translate(sisi / 2, sisi / 2);
      ctx.rotate(-yaw);
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, besar ? 34 : 22, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sisi / 2, sisi / 2, besar ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }, 160);
    return () => clearInterval(t);
  }, []);

  // Layar pendek (HP mendatar) mendapat lingkaran lebih kecil: kolom tombol
  // aksi di kanan-tengah mulai di sekitar y=150 dan dulu tertimpa minimap.
  const [pendek, setPendek] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(max-height: 500px)");
    if (!mq) return;
    const ubah = () => setPendek(mq.matches);
    ubah();
    mq.addEventListener("change", ubah);
    return () => mq.removeEventListener("change", ubah);
  }, []);

  const sisi = besar ? 420 : pendek ? 88 : 112;

  return (
    <div
      data-uji="minimap"
      className={
        besar
          ? "absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/70 px-4"
          : `absolute right-3 z-10 ${pendek ? "top-12" : "top-16"}`
      }
    >
      <div className="relative">
        <canvas
          ref={layarRef}
          width={sisi}
          height={sisi}
          data-uji="minimap-kanvas"
          className={
            besar
              ? "rounded-2xl border-4 border-white/80 bg-slate-900 shadow-2xl"
              : "rounded-full border-4 border-white/70 bg-slate-900 shadow-lg"
          }
          style={{ width: sisi, height: sisi }}
        />
        {!besar && (
          <span className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded bg-slate-900/80 px-1 text-[9px] font-black text-white">
            U
          </span>
        )}
      </div>

      {/* Di mode kecil tombolnya menempel DI DALAM kotak lingkaran (sudut
          bawah), jadi minimap tidak memakan satu piksel pun di luar kotaknya
          dan tidak pernah menimpa tombol lain (uji-tata-layar.mjs). */}
      <div className={besar ? "mt-4 flex gap-2" : "absolute inset-x-0 -bottom-1 flex justify-between"}>
        <button
          type="button"
          data-uji="minimap-perbesar"
          aria-label={besar ? "Tutup peta besar" : "Perbesar peta"}
          title={besar ? "Tutup peta" : "Peta besar"}
          onClick={() => setBesar((v) => !v)}
          className={besar
            ? "rounded-lg bg-slate-900/80 px-3 py-1.5 text-sm font-bold text-white hover:bg-slate-900"
            : "grid h-6 w-6 place-items-center rounded-full bg-slate-900/85 text-[11px] text-white shadow hover:bg-slate-900"}
        >
          {besar ? "Tutup peta" : "⤢"}
        </button>
        <button
          type="button"
          data-uji="minimap-zoom"
          aria-label={`Ganti jarak pandang peta (sekarang ${NAMA_ZOOM[tingkat]})`}
          title={`Jarak: ${NAMA_ZOOM[tingkat]}`}
          onClick={() => setTingkat((t) => (t + 1) % ZOOM.length)}
          className={besar
            ? "rounded-lg bg-slate-900/80 px-3 py-1.5 text-sm font-bold text-white hover:bg-slate-900"
            : "grid h-6 w-6 place-items-center rounded-full bg-slate-900/85 text-[11px] font-black text-white shadow hover:bg-slate-900"}
        >
          {besar ? NAMA_ZOOM[tingkat] : ["−", "○", "+"][tingkat]}
        </button>
      </div>
    </div>
  );
}
