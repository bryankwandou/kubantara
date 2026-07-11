"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const blocks = [
  { c: "bg-emerald-500", d: 0 },
  { c: "bg-amber-400", d: 0.15 },
  { c: "bg-sky-500", d: 0.3 },
  { c: "bg-rose-400", d: 0.45 },
];

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const yBg = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* HERO */}
      <section
        ref={heroRef}
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
      >
        <motion.div
          style={{ y: yBg }}
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,#0e7490_0%,#020617_60%)]"
        />
        {/* balok melayang */}
        {blocks.map((b, i) => (
          <motion.div
            key={i}
            className={`absolute h-14 w-14 rounded-lg ${b.c} shadow-2xl`}
            style={{
              left: `${12 + i * 22}%`,
              top: `${18 + (i % 2) * 50}%`,
            }}
            animate={{ y: [0, -22, 0], rotate: [0, 8, -6, 0] }}
            transition={{ duration: 5 + b.d * 3, repeat: Infinity, delay: b.d, ease: "easeInOut" }}
          />
        ))}

        <motion.div style={{ opacity: fade }} className="relative z-10 max-w-3xl text-center">
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300"
          >
            Dunia balok untuk penjelajah kecil
          </motion.p>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            className="text-5xl font-black leading-tight md:text-7xl"
          >
            KUBANTARA
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
            className="mx-auto mt-6 max-w-xl text-lg text-slate-300"
          >
            Sebuah pulau luas dari kubus warna-warni. Anak membangun dan
            membongkar balok, merapal sihir yang menumbuhkan pohon atau
            membentang jembatan pelangi, ditemani hewan peliharaan, dan menaiki
            tunggangan menyeberangi bukit saat langit berganti dari pagi ke
            malam. Tidak ada musuh, tidak ada kalah, tidak ada iklan.
          </motion.p>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={3}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              href="/play"
              className="group rounded-2xl bg-amber-400 px-8 py-4 text-lg font-black text-slate-900 shadow-lg shadow-amber-400/30 transition-transform hover:scale-105 active:scale-95"
            >
              Mulai Menjelajah
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">
                &rarr;
              </span>
            </Link>
            <a
              href="#cara"
              className="rounded-2xl border border-slate-600 px-8 py-4 text-lg font-semibold text-slate-200 transition-colors hover:border-cyan-400 hover:text-cyan-300"
            >
              Cara bermain
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* KEUNGGULAN */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="text-center text-3xl font-black md:text-4xl"
        >
          Dibuat supaya orang tua tenang
        </motion.h2>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            {
              t: "Bangun sesukanya",
              d: "Delapan warna balok siap dipasang dan dibongkar. Anak menyusun rumah, menara, atau jembatan sendiri, lalu merapal empat sihir untuk menumbuhkan pohon dan menebar bunga.",
            },
            {
              t: "Teman dan tunggangan",
              d: "Ada hewan peliharaan kotak yang setia mengikuti ke mana pun, tunggangan yang bisa dinaiki untuk melaju lebih cepat, serta satwa liar yang berkeliaran di seluruh pulau.",
            },
            {
              t: "Aman dan langsung jalan",
              d: "Tidak ada pertarungan, obrolan orang asing, maupun pembelian. Buka di peramban ponsel atau laptop, ada tombol sentuh sekaligus dukungan keyboard.",
            },
          ].map((f, i) => (
            <motion.div
              key={f.t}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              custom={i}
              whileHover={{ y: -8, scale: 1.02 }}
              className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 transition-colors hover:border-cyan-500/50"
            >
              <div className={`mb-5 h-10 w-10 rounded-lg ${blocks[i].c}`} />
              <h3 className="text-xl font-bold">{f.t}</h3>
              <p className="mt-3 text-slate-400">{f.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CARA MAIN */}
      <section id="cara" className="border-t border-slate-800 bg-slate-900/40 px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center text-3xl font-black md:text-4xl"
          >
            Tiga langkah, selesai
          </motion.h2>
          <div className="mt-14 space-y-6">
            {[
              ["Buka halaman main", "Tekan tombol kuning di atas. Dunia dimuat dalam hitungan detik, tanpa daftar akun."],
              ["Jelajah, bangun, dan rapal sihir", "Gerakkan si kotak dengan W A S D atau lingkaran sentuh. Pilih warna balok lalu tekan Bangun, coba tombol sihir di sisi kiri, dan naiki tunggangan lewat tombol Naik."],
              ["Kumpulkan dua puluh empat bintang", "Bintang emas berputar tersebar di seluruh pulau. Temukan semuanya dan layar perayaan akan muncul."],
            ].map(([t, d], i) => (
              <motion.div
                key={t}
                initial={{ opacity: 0, x: i % 2 ? 60 : -60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="flex items-start gap-5 rounded-2xl border border-slate-800 bg-slate-950 p-6"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500 font-black text-slate-950">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-bold">{t}</h3>
                  <p className="mt-1 text-slate-400">{d}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA AKHIR */}
      <section className="px-6 py-28 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-black md:text-5xl">
            Sore ini anakmu sudah bisa main
          </h2>
          <p className="mx-auto mt-4 max-w-md text-slate-400">
            Gratis, terbuka, dan bisa dimainkan kapan saja sambil menunggu orang
            rumah pulang kerja.
          </p>
          <Link
            href="/play"
            className="mt-10 inline-block rounded-2xl bg-emerald-500 px-10 py-5 text-xl font-black text-slate-950 shadow-lg shadow-emerald-500/30 transition-transform hover:scale-105 active:scale-95"
          >
            Masuk ke Kubantara
          </Link>
        </motion.div>
      </section>

      <footer className="border-t border-slate-800 px-6 py-8 text-center text-sm text-slate-500">
        Kubantara — dunia kubus terbuka untuk anak. Kode sumber tersedia di GitHub.
      </footer>
    </main>
  );
}
