"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const blocks = [
  { c: "bg-emerald-500", d: 0 },
  { c: "bg-amber-400", d: 0.15 },
  { c: "bg-sky-500", d: 0.3 },
  { c: "bg-rose-400", d: 0.45 },
  { c: "bg-violet-500", d: 0.6 },
];

// Janji keamanan — inti kepercayaan orang tua. Ditampilkan besar & jelas.
const JANJI = [
  { icon: "🛡️", t: "Tanpa kekerasan", d: "Tidak ada senjata, darah, musuh, atau kekalahan. Anak tidak bisa gagal — hanya berkarya dan menjelajah." },
  { icon: "💬", t: "Tanpa obrolan orang asing", d: "Tidak ada kolom chat teks sama sekali. Antar saudara pun hanya berbagi posisi dan lambang emote tetap." },
  { icon: "🚫", t: "Tanpa iklan & pembelian", d: "Nol iklan, nol pop-up, nol tombol beli. Tidak ada yang menguras dompet atau perhatian anak." },
  { icon: "🔒", t: "Data anak dijaga", d: "Tak butuh email anak, tak ada pelacak pihak ketiga, tak ada data yang dijual. Progres disimpan hanya untuk melanjutkan main." },
];

const FITUR = [
  { icon: "🧱", t: "Bangun apa pun", d: "Delapan warna dan empat bentuk balok — kubus, kaca, lampu, setengah. Susun rumah, menara, jembatan, atau kota sesuka hati; cetakan sekali-tekan untuk bangunan instan." },
  { icon: "✨", t: "Empat sihir warna", d: "Tumbuhkan pohon, tebar bunga pelangi, bentang jembatan di atas air, dan luncurkan kembang api — semua tanpa merusak apa pun." },
  { icon: "🐾", t: "Peliharaan & tunggangan", d: "Rawat hewan setia: beri makan, pakaikan topi kostum. Jinakkan satwa liar, dan naiki tunggangan untuk melaju jauh lebih cepat." },
  { icon: "🕳️", t: "Gua & kristal", d: "Telusuri gua batu berongga yang meredup saat dimasuki, dengan kristal bercahaya dan bintang hadiah tersembunyi di dalamnya." },
  { icon: "🏞️", t: "Pulau yang hidup", d: "Danau beriak, hutan lebat, puncak salju, dan padang luas. Langit berganti pagi–siang–malam, cuaca berubah dari cerah, hujan, hingga pelangi." },
  { icon: "👨‍👩‍👧‍👦", t: "Main bersama saudara", d: "Kakak-adik dengan kode keluarga yang sama saling melihat di dunia yang sama dan membangun bersama — diatur penuh oleh orang tua." },
];

const KONTROL = [
  { t: "Batas waktu harian", d: "Tetapkan berapa menit anak boleh main tiap hari. Saat habis, layar “Waktunya istirahat” muncul dan progres tersimpan aman." },
  { t: "Dasbor kemajuan", d: "Lihat level, bintang, pencapaian, dan total waktu main setiap anak dalam satu tabel yang rapi." },
  { t: "Kode keluarga", d: "Hanya anak dengan kode yang sama bisa saling bermain. Diatur khusus oleh orang tua, jadi orang asing tak bisa ikut." },
  { t: "Reset sandi", d: "Anak lupa sandi? Orang tua memulihkannya dalam sekali klik — tanpa perlu email." },
];

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yBg = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Navbar tipis */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <span className="flex items-center gap-2 font-black tracking-tight">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500 text-xs text-slate-950">▛</span>
            Kubantara
          </span>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/ortu" className="hidden rounded-lg px-3 py-1.5 text-slate-300 hover:text-cyan-300 sm:block">Orang Tua</Link>
            <Link href="/masuk" className="rounded-lg px-3 py-1.5 text-slate-300 hover:text-cyan-300">Masuk</Link>
            <Link href="/play" className="rounded-xl bg-amber-400 px-4 py-1.5 font-bold text-slate-900 hover:bg-amber-300">Main</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section ref={heroRef} className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-16">
        <motion.div style={{ y: yBg }} className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,#0e7490_0%,#020617_60%)]" />
        {blocks.map((b, i) => (
          <motion.div
            key={i}
            className={`absolute h-14 w-14 rounded-lg ${b.c} shadow-2xl`}
            style={{ left: `${8 + i * 19}%`, top: `${16 + (i % 2) * 52}%` }}
            animate={{ y: [0, -22, 0], rotate: [0, 8, -6, 0] }}
            transition={{ duration: 5 + b.d * 3, repeat: Infinity, delay: b.d, ease: "easeInOut" }}
          />
        ))}

        <motion.div style={{ opacity: fade }} className="relative z-10 max-w-3xl text-center">
          <motion.p variants={fadeUp} initial="hidden" animate="show" className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
            Dunia 3D aman untuk penjelajah kecil
          </motion.p>
          <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1} className="text-5xl font-black leading-tight md:text-7xl">
            KUBANTARA
          </motion.h1>
          <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2} className="mx-auto mt-6 max-w-xl text-lg text-slate-300">
            Pulau kubus warna-warni tempat anak membangun, merapal sihir, merawat
            peliharaan, dan menjelajah gua serta danau — di dunia 3D yang berganti
            pagi ke malam. <strong className="text-white">Tanpa kekerasan, tanpa iklan,
            tanpa orang asing.</strong> Langsung main di peramban, gratis.
          </motion.p>
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/play" className="group rounded-2xl bg-amber-400 px-8 py-4 text-lg font-black text-slate-900 shadow-lg shadow-amber-400/30 transition-transform hover:scale-105 active:scale-95">
              Mulai Menjelajah
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
            </Link>
            <Link href="/daftar" className="rounded-2xl border border-cyan-500/60 px-8 py-4 text-lg font-semibold text-cyan-300 transition-colors hover:border-cyan-300 hover:text-cyan-200">
              Daftar akun
            </Link>
          </motion.div>
          <motion.p variants={fadeUp} initial="hidden" animate="show" custom={4} className="mt-6 text-sm text-slate-400">
            Cocok untuk usia 4–12 tahun · Bermain di laptop atau ponsel · Tanpa unduhan
          </motion.p>
        </motion.div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-500">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>↓</motion.div>
        </div>
      </section>

      {/* PERNYATAAN / MANIFESTO */}
      <section className="relative border-t border-white/5 bg-slate-900/40 px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <motion.p variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">
            Pernyataan kami
          </motion.p>
          <motion.blockquote
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={1}
            className="mt-6 text-2xl font-bold leading-relaxed text-slate-100 md:text-3xl"
          >
            “Anak berhak punya dunia digital yang <span className="text-emerald-400">membangun</span>, bukan
            menakuti. Kubantara dibuat agar orang tua bisa menyerahkan laptop tanpa cemas —
            sebuah ruang tempat imajinasi tumbuh, tanpa kekerasan, tanpa jebakan, tanpa
            orang asing.”
          </motion.blockquote>
          <motion.p variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={2} className="mt-6 text-slate-400">
            Sebuah alternatif sehat dari game dewasa — dirancang keras pada keamanan, lembut pada anak.
          </motion.p>
        </div>
      </section>

      {/* JANJI KEAMANAN */}
      <section id="aman" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <motion.h2 variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center text-3xl font-black md:text-4xl">
            Aman sesuai standar game anak
          </motion.h2>
          <motion.p variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={1} className="mx-auto mt-4 max-w-2xl text-center text-slate-400">
            Empat janji yang tidak akan pernah kami langgar. Inilah dasar mengapa Kubantara layak dibuka anak sekarang juga.
          </motion.p>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {JANJI.map((j, i) => (
              <motion.div
                key={j.t}
                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} custom={i}
                className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6"
              >
                <div className="text-3xl">{j.icon}</div>
                <h3 className="mt-3 text-lg font-bold text-emerald-300">{j.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{j.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FITUR */}
      <section className="border-t border-white/5 bg-slate-900/40 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <motion.h2 variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center text-3xl font-black md:text-4xl">
            Satu pulau, ribuan kemungkinan
          </motion.h2>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FITUR.map((f, i) => (
              <motion.div
                key={f.t}
                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} custom={i % 3}
                whileHover={{ y: -8 }}
                className="rounded-3xl border border-slate-800 bg-slate-950/60 p-8 transition-colors hover:border-cyan-500/50"
              >
                <div className="text-3xl">{f.icon}</div>
                <h3 className="mt-4 text-xl font-bold">{f.t}</h3>
                <p className="mt-3 text-slate-400">{f.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* KONTROL ORANG TUA */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <motion.p variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
                Kendali penuh di tangan Anda
              </motion.p>
              <motion.h2 variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={1} className="mt-4 text-3xl font-black md:text-4xl">
                Panel orang tua bawaan
              </motion.h2>
              <motion.p variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={2} className="mt-4 text-slate-400">
                Bukan tempelan. Sejak awal Kubantara dibangun dengan alat pengawasan
                agar orang tua memegang kemudi — dari batas waktu hingga siapa yang
                boleh bermain bersama.
              </motion.p>
              <Link href="/ortu" className="mt-6 inline-block rounded-xl border border-cyan-500/60 px-6 py-3 font-semibold text-cyan-300 hover:border-cyan-300">
                Buka panel orang tua
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {KONTROL.map((k, i) => (
                <motion.div
                  key={k.t}
                  variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }} custom={i}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
                >
                  <h3 className="font-bold text-cyan-300">{k.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{k.d}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CARA MAIN */}
      <section id="cara" className="border-t border-white/5 bg-slate-900/40 px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <motion.h2 variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center text-3xl font-black md:text-4xl">
            Tiga langkah, langsung main
          </motion.h2>
          <div className="mt-14 space-y-6">
            {[
              ["Buka halaman main", "Tekan tombol kuning. Dunia 3D dimuat dalam hitungan detik — tanpa unduhan, bahkan tanpa daftar akun untuk sekadar mencoba."],
              ["Jelajah, bangun, rapal sihir", "Gerakkan si kotak dengan W A S D atau joystick sentuh, seret mouse untuk melihat sekeliling. Pilih warna, tekan Bangun, coba sihir, jinakkan satwa, dan naiki tunggangan."],
              ["Kumpulkan 24 bintang", "Bintang emas tersebar di pulau — beberapa tersembunyi di dalam gua. Temukan semuanya untuk layar perayaan. Daftar akun agar semua kemajuan tersimpan."],
            ].map(([t, d], i) => (
              <motion.div
                key={t}
                initial={{ opacity: 0, x: i % 2 ? 60 : -60 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, ease: "easeOut" }}
                className="flex items-start gap-5 rounded-2xl border border-slate-800 bg-slate-950 p-6"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500 font-black text-slate-950">{i + 1}</span>
                <div>
                  <h3 className="text-lg font-bold">{t}</h3>
                  <p className="mt-1 text-slate-400">{d}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* KEPERCAYAAN / TEKNOLOGI */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <motion.h2 variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center text-3xl font-black md:text-4xl">
            Dibangun terbuka, bisa diperiksa
          </motion.h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { t: "Kode sumber terbuka", d: "Seluruh kode tersedia di GitHub untuk ditinjau siapa saja. Tidak ada yang disembunyikan di balik layar." },
              { t: "Tanpa aset pihak ketiga", d: "Grafik, suara, dan musik dibangkitkan langsung di peramban. Tak ada berkas eksternal, tak ada jejak pihak lain." },
              { t: "Ringan & lintas perangkat", d: "Berjalan mulus di laptop maupun ponsel, menyesuaikan diri otomatis pada perangkat kelas bawah." },
            ].map((c, i) => (
              <motion.div
                key={c.t}
                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} custom={i}
                className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8 text-center"
              >
                <h3 className="text-lg font-bold text-slate-100">{c.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{c.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA AKHIR */}
      <section className="px-6 py-28 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <h2 className="text-3xl font-black md:text-5xl">Sore ini anakmu sudah bisa main</h2>
          <p className="mx-auto mt-4 max-w-md text-slate-400">
            Gratis, terbuka, dan aman. Serahkan laptop dengan tenang — dunia yang menunggu di dalamnya hanya ingin membangun.
          </p>
          <Link href="/play" className="mt-10 inline-block rounded-2xl bg-emerald-500 px-10 py-5 text-xl font-black text-slate-950 shadow-lg shadow-emerald-500/30 transition-transform hover:scale-105 active:scale-95">
            Masuk ke Kubantara
          </Link>
        </motion.div>
      </section>

      <footer className="border-t border-slate-800 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <span className="font-bold text-slate-400">Kubantara — dunia kubus terbuka untuk anak</span>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/privasi" className="hover:text-cyan-300">Privasi</Link>
            <Link href="/ketentuan" className="hover:text-cyan-300">Ketentuan</Link>
            <Link href="/ortu" className="hover:text-cyan-300">Orang Tua</Link>
            <Link href="/daftar" className="hover:text-cyan-300">Daftar</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
