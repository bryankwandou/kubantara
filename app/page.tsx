"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

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

type Bahasa = "id" | "en";

// Semua teks halaman depan ada di sini, dua bahasa berdampingan, supaya
// terjemahan tidak pernah tertinggal dari isinya. Isinya harus sesuai dengan
// game yang sungguh ada: dulu halaman ini menjanjikan "nol tombol beli" dan
// "tanpa kekalahan" padahal toko skin dan mode Petualangan sudah hadir.
const TEKS = {
  id: {
    navOrtu: "Orang Tua", navMasuk: "Masuk", navMain: "Main",
    heroKecil: "Dunia 3D untuk penjelajah kecil",
    heroIsi: "Pulau balok warna-warni tempat anak membangun rumah yang bisa dimasuki, menjelajah gua, merawat peliharaan, dan bermain bersama saudara secara langsung. Tanpa iklan, tanpa obrolan dengan orang asing, tanpa uang sungguhan.",
    heroTebal: "Langsung main di peramban, gratis.",
    mulai: "Mulai Menjelajah", daftar: "Daftar akun",
    heroCatatan: "Usia 4–12 tahun · Laptop, ponsel, atau stik gim · Tanpa unduhan",
    pernyataanJudul: "Pernyataan kami",
    pernyataan: "Anak berhak punya dunia digital yang membangun, bukan menakuti. Kubantara dibuat supaya orang tua bisa menyerahkan laptop tanpa cemas.",
    pernyataanKecil: "Keras pada keamanan, lembut pada anak.",
    amanJudul: "Apa yang kami jaga, apa adanya",
    amanIsi: "Kami tulis sejujurnya apa yang ada dan tidak ada di dalam game, supaya Anda memutuskan dengan informasi lengkap.",
    janji: [
      { t: "Tanpa kekerasan", d: "Tidak ada senjata dan darah. Mode Santai tidak punya bahaya sama sekali. Mode Petualangan hanya punya nyawa yang berkurang saat jatuh dari tempat tinggi, dan tidak ada yang hilang saat nyawa habis." },
      { t: "Tanpa obrolan orang asing", d: "Tidak ada kolom chat teks. Saudara dengan kode keluarga yang sama hanya saling melihat posisi dan melambai dengan emote tetap." },
      { t: "Tanpa uang sungguhan", d: "Ada toko pakaian, tetapi dibayar dengan keping yang didapat dari bermain di gua. Tidak ada kartu kredit, pulsa, atau iklan. Barang dicatat di Solana devnet, jaringan uji yang koinnya tidak bernilai uang." },
      { t: "Data anak dijaga", d: "Tidak butuh email anak, tidak ada pelacak pihak ketiga, tidak ada data yang dijual. Progres disimpan hanya untuk melanjutkan permainan." },
    ],
    fiturJudul: "Satu pulau, banyak cara bermain",
    fitur: [
      { t: "Bangun dan masuki", d: "Delapan warna dan empat bentuk balok. Rumah dari cetakan maupun buatan sendiri punya pintu, ruang dalam, dan lantai yang bisa diinjak." },
      { t: "Dua cara main", d: "Santai untuk membangun dengan tenang. Petualangan dengan lima nyawa yang pulih sendiri, untuk anak yang ingin tantangan." },
      { t: "Mata sendiri atau dari belakang", d: "Tekan V atau tombol kamera untuk berganti antara pandangan orang pertama dan orang ketiga." },
      { t: "Gua dan kristal", d: "Gua berongga yang meredup saat dimasuki, dengan kristal bercahaya dan keping hadiah di dalamnya." },
      { t: "Lemari pakaian", d: "Kumpulkan keping, pilih pakaian di toko, lalu pakai dari lemari. Kepemilikan bisa diperiksa orang tua di halaman bukti." },
      { t: "Main bersama saudara", d: "Kakak dan adik dengan kode keluarga yang sama saling melihat bergerak di dunia yang sama, secara langsung." },
    ],
    kendaliKecil: "Kendali di tangan Anda",
    kendaliJudul: "Panel orang tua bawaan",
    kendaliIsi: "Alat pengawasan dibangun sejak awal, bukan tempelan. Orang tua mengatur batas waktu, melihat kemajuan, dan menentukan siapa yang boleh bermain bersama.",
    kendaliTombol: "Buka panel orang tua",
    kontrol: [
      { t: "Batas waktu harian", d: "Tentukan berapa menit anak boleh main tiap hari. Saat waktunya habis, layar istirahat muncul dan progres tersimpan." },
      { t: "Dasbor kemajuan", d: "Level, bintang, pencapaian, dan total waktu main setiap anak dalam satu tabel." },
      { t: "Kode keluarga", d: "Hanya anak dengan kode yang sama bisa bermain bersama. Orang asing tidak bisa ikut." },
      { t: "Bukti kepemilikan", d: "Setiap pakaian yang dimiliki anak punya tautan ke explorer Solana devnet yang bisa Anda buka sendiri." },
    ],
    caraJudul: "Tiga langkah, langsung main",
    cara: [
      ["Buka halaman main", "Tekan tombol kuning. Dunia 3D dimuat dalam hitungan detik, tanpa unduhan. Tidak perlu daftar untuk sekadar mencoba."],
      ["Gerak dengan cara apa pun", "Keyboard W A S D dan tetikus di laptop, stik di layar dan tombol sentuh di ponsel (tegak maupun miring), atau stik gim Xbox dan sejenisnya. Arah maju selalu maju."],
      ["Kumpulkan 24 bintang", "Bintang emas tersebar di pulau, sebagian tersembunyi di gua. Daftar akun supaya semua kemajuan tersimpan."],
    ],
    terbukaJudul: "Bisa diperiksa, bukan sekadar diklaim",
    terbuka: [
      { t: "Diuji otomatis", d: "Kendali, rumah, mode main, toko, dan main bersama diuji di peramban sungguhan sebelum setiap rilis." },
      { t: "Tanpa aset pihak ketiga", d: "Grafik, suara, dan musik dibangkitkan langsung di peramban. Tidak ada berkas dari pihak lain." },
      { t: "Tiga pilihan mutu grafis", d: "Rendah, sedang, dan tinggi, dengan angka FPS sungguhan di panel pengaturan supaya bisa dicek sendiri." },
    ],
    akhirJudul: "Sore ini anakmu sudah bisa main",
    akhirIsi: "Gratis dan tanpa uang sungguhan. Serahkan laptop dengan tenang.",
    akhirTombol: "Masuk ke Kubantara",
    kaki: "Kubantara, dunia kubus untuk anak",
    privasi: "Privasi", ketentuan: "Ketentuan", bukti: "Bukti kepemilikan",
    ganti: "English",
  },
  en: {
    navOrtu: "Parents", navMasuk: "Sign in", navMain: "Play",
    heroKecil: "A 3D world for young explorers",
    heroIsi: "A colourful block island where kids build houses they can walk into, explore caves, look after pets, and play live with their siblings. No ads, no chat with strangers, no real money.",
    heroTebal: "Plays in the browser, free.",
    mulai: "Start exploring", daftar: "Create account",
    heroCatatan: "Ages 4–12 · Laptop, phone, or gamepad · Nothing to install",
    pernyataanJudul: "What we stand for",
    pernyataan: "Kids deserve a digital world that helps them make things, not one that frightens them. Kubantara exists so parents can hand over the laptop without worrying.",
    pernyataanKecil: "Strict about safety, gentle with children.",
    amanJudul: "What we protect, stated plainly",
    amanIsi: "We list honestly what is and is not inside the game, so you can decide with the full picture.",
    janji: [
      { t: "No violence", d: "No weapons, no blood. Relaxed mode has no danger at all. Adventure mode only has hearts that drop after a long fall, and nothing is lost when they run out." },
      { t: "No chat with strangers", d: "There is no text chat. Siblings who share a family code can only see each other move and wave with fixed emotes." },
      { t: "No real money", d: "There is a clothing shop, paid with coins earned by playing in caves. No cards, no phone credit, no ads. Items are recorded on Solana devnet, a test network whose coins have no cash value." },
      { t: "Private by default", d: "No child email needed, no third-party trackers, no data sold. Progress is stored only so play can continue." },
    ],
    fiturJudul: "One island, many ways to play",
    fitur: [
      { t: "Build it, walk in", d: "Eight colours and four block shapes. Houses from a blueprint or built by hand have doors, rooms, and floors you can stand on." },
      { t: "Two ways to play", d: "Relaxed for calm building. Adventure with five hearts that refill on their own, for kids who want a challenge." },
      { t: "First or third person", d: "Press V or the camera button to switch between your own eyes and an over-the-shoulder view." },
      { t: "Caves and crystals", d: "Hollow caves that dim as you enter, with glowing crystals and reward coins inside." },
      { t: "Wardrobe", d: "Collect coins, pick an outfit in the shop, then wear it from the wardrobe. Parents can check ownership on the proof page." },
      { t: "Play with siblings", d: "Brothers and sisters with the same family code see each other moving in the same world, live." },
    ],
    kendaliKecil: "You stay in charge",
    kendaliJudul: "Built-in parent panel",
    kendaliIsi: "Supervision was designed in from day one. Parents set time limits, follow progress, and decide who can play together.",
    kendaliTombol: "Open the parent panel",
    kontrol: [
      { t: "Daily time limit", d: "Choose how many minutes a child may play each day. When time is up, a rest screen appears and progress is saved." },
      { t: "Progress dashboard", d: "Level, stars, achievements, and total play time for every child in one table." },
      { t: "Family code", d: "Only children with the same code can play together. Strangers cannot join." },
      { t: "Proof of ownership", d: "Every outfit a child owns links to the Solana devnet explorer so you can check it yourself." },
    ],
    caraJudul: "Three steps to play",
    cara: [
      ["Open the play page", "Press the yellow button. The 3D world loads in seconds with nothing to install. No account needed just to try."],
      ["Move however you like", "W A S D and mouse on a laptop, on-screen stick and buttons on a phone (portrait or landscape), or an Xbox-style gamepad. Forward always means forward."],
      ["Collect 24 stars", "Gold stars are spread across the island, some hidden in caves. Create an account so all progress is saved."],
    ],
    terbukaJudul: "Checkable, not just claimed",
    terbuka: [
      { t: "Tested automatically", d: "Controls, houses, play modes, the shop, and multiplayer are tested in a real browser before each release." },
      { t: "No third-party assets", d: "Graphics, sound, and music are generated in the browser. No files from anyone else." },
      { t: "Three graphics settings", d: "Low, medium, and high, with a real FPS counter in settings so you can see the difference." },
    ],
    akhirJudul: "Your kids can play this afternoon",
    akhirIsi: "Free, with no real money involved. Hand over the laptop with peace of mind.",
    akhirTombol: "Enter Kubantara",
    kaki: "Kubantara, a block world for kids",
    privasi: "Privacy", ketentuan: "Terms", bukti: "Proof of ownership",
    ganti: "Bahasa Indonesia",
  },
} as const;

// Tanda balok kecil pengganti ikon emoji, senada dengan dunia kubus di game.
const WARNA_TANDA = ["bg-emerald-400", "bg-sky-400", "bg-amber-400", "bg-rose-400", "bg-violet-400", "bg-cyan-400"];
function Tanda({ i }: { i: number }) {
  const w = WARNA_TANDA[i % WARNA_TANDA.length];
  return (
    <span className="grid h-8 w-8 grid-cols-2 gap-0.5" aria-hidden>
      <span className={`rounded-sm ${w}`} />
      <span className={`rounded-sm ${w} opacity-60`} />
      <span className={`rounded-sm ${w} opacity-40`} />
      <span className={`rounded-sm ${w}`} />
    </span>
  );
}

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yBg = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  // Bawaannya Indonesia (anak-anak pemainnya di sini); pengunjung yang
  // perambannya bukan berbahasa Indonesia mendapat English. Pilihan manual
  // selalu menang dan diingat.
  const [bahasa, setBahasa] = useState<Bahasa>("id");
  useEffect(() => {
    try {
      const simpan = localStorage.getItem("kubantara_bahasa");
      if (simpan === "id" || simpan === "en") setBahasa(simpan);
      else if (!navigator.language.toLowerCase().startsWith("id")) setBahasa("en");
    } catch {}
  }, []);
  const gantiBahasa = () => {
    const b: Bahasa = bahasa === "id" ? "en" : "id";
    setBahasa(b);
    try { localStorage.setItem("kubantara_bahasa", b); } catch {}
  };
  useEffect(() => { document.documentElement.lang = bahasa; }, [bahasa]);
  const t = TEKS[bahasa];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-5">
          <span className="flex items-center gap-2 font-black tracking-tight">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500 text-xs text-slate-950">▛</span>
            Kubantara
          </span>
          <div className="flex items-center gap-1 text-sm sm:gap-2">
            {/* Di ponsel sempit cukup kode bahasanya; label lengkap membuat
                bilah ini lebih lebar dari layar 390px. */}
            <button
              data-uji="ganti-bahasa"
              onClick={gantiBahasa}
              aria-label={t.ganti}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-slate-300 hover:border-cyan-400 hover:text-cyan-300 sm:px-3"
            >
              <span className="sm:hidden">{bahasa === "id" ? "EN" : "ID"}</span>
              <span className="hidden sm:inline">{t.ganti}</span>
            </button>
            <Link href="/ortu" className="hidden rounded-lg px-3 py-1.5 text-slate-300 hover:text-cyan-300 sm:block">{t.navOrtu}</Link>
            <Link href="/masuk" className="rounded-lg px-2 py-1.5 text-slate-300 hover:text-cyan-300 sm:px-3">{t.navMasuk}</Link>
            <Link href="/play" className="rounded-xl bg-amber-400 px-4 py-1.5 font-bold text-slate-900 hover:bg-amber-300">{t.navMain}</Link>
          </div>
        </div>
      </nav>

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
            {t.heroKecil}
          </motion.p>
          <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1} className="text-5xl font-black leading-tight md:text-7xl">
            KUBANTARA
          </motion.h1>
          <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2} className="mx-auto mt-6 max-w-xl text-lg text-slate-300">
            {t.heroIsi} <strong className="text-white">{t.heroTebal}</strong>
          </motion.p>
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/play" className="group rounded-2xl bg-amber-400 px-8 py-4 text-lg font-black text-slate-900 shadow-lg shadow-amber-400/30 transition-transform hover:scale-105 active:scale-95">
              {t.mulai}
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
            </Link>
            <Link href="/daftar" className="rounded-2xl border border-cyan-500/60 px-8 py-4 text-lg font-semibold text-cyan-300 transition-colors hover:border-cyan-300 hover:text-cyan-200">
              {t.daftar}
            </Link>
          </motion.div>
          <motion.p variants={fadeUp} initial="hidden" animate="show" custom={4} className="mt-6 text-sm text-slate-400">
            {t.heroCatatan}
          </motion.p>
        </motion.div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-500">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>↓</motion.div>
        </div>
      </section>

      <section className="relative border-t border-white/5 bg-slate-900/40 px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <motion.p variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">
            {t.pernyataanJudul}
          </motion.p>
          <motion.blockquote
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={1}
            className="mt-6 text-2xl font-bold leading-relaxed text-slate-100 md:text-3xl"
          >
            “{t.pernyataan}”
          </motion.blockquote>
          <motion.p variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={2} className="mt-6 text-slate-400">
            {t.pernyataanKecil}
          </motion.p>
        </div>
      </section>

      <section id="aman" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <motion.h2 variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center text-3xl font-black md:text-4xl">
            {t.amanJudul}
          </motion.h2>
          <motion.p variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={1} className="mx-auto mt-4 max-w-2xl text-center text-slate-400">
            {t.amanIsi}
          </motion.p>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {t.janji.map((j, i) => (
              <motion.div
                key={j.t}
                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} custom={i}
                className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6"
              >
                <Tanda i={i} />
                <h3 className="mt-3 text-lg font-bold text-emerald-300">{j.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{j.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-slate-900/40 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <motion.h2 variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center text-3xl font-black md:text-4xl">
            {t.fiturJudul}
          </motion.h2>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {t.fitur.map((f, i) => (
              <motion.div
                key={f.t}
                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} custom={i % 3}
                whileHover={{ y: -8 }}
                className="rounded-3xl border border-slate-800 bg-slate-950/60 p-8 transition-colors hover:border-cyan-500/50"
              >
                <Tanda i={i + 2} />
                <h3 className="mt-4 text-xl font-bold">{f.t}</h3>
                <p className="mt-3 text-slate-400">{f.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <motion.p variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
                {t.kendaliKecil}
              </motion.p>
              <motion.h2 variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={1} className="mt-4 text-3xl font-black md:text-4xl">
                {t.kendaliJudul}
              </motion.h2>
              <motion.p variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={2} className="mt-4 text-slate-400">
                {t.kendaliIsi}
              </motion.p>
              <Link href="/ortu" className="mt-6 inline-block rounded-xl border border-cyan-500/60 px-6 py-3 font-semibold text-cyan-300 hover:border-cyan-300">
                {t.kendaliTombol}
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {t.kontrol.map((k, i) => (
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

      <section id="cara" className="border-t border-white/5 bg-slate-900/40 px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <motion.h2 variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center text-3xl font-black md:text-4xl">
            {t.caraJudul}
          </motion.h2>
          <div className="mt-14 space-y-6 overflow-x-clip">
            {t.cara.map(([judul, isi], i) => (
              <motion.div
                key={judul}
                initial={{ opacity: 0, x: i % 2 ? 60 : -60 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, ease: "easeOut" }}
                className="flex items-start gap-5 rounded-2xl border border-slate-800 bg-slate-950 p-6"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500 font-black text-slate-950">{i + 1}</span>
                <div>
                  <h3 className="text-lg font-bold">{judul}</h3>
                  <p className="mt-1 text-slate-400">{isi}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <motion.h2 variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center text-3xl font-black md:text-4xl">
            {t.terbukaJudul}
          </motion.h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {t.terbuka.map((c, i) => (
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

      <section className="px-6 py-28 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <h2 className="text-3xl font-black md:text-5xl">{t.akhirJudul}</h2>
          <p className="mx-auto mt-4 max-w-md text-slate-400">{t.akhirIsi}</p>
          <Link href="/play" className="mt-10 inline-block rounded-2xl bg-emerald-500 px-10 py-5 text-xl font-black text-slate-950 shadow-lg shadow-emerald-500/30 transition-transform hover:scale-105 active:scale-95">
            {t.akhirTombol}
          </Link>
        </motion.div>
      </section>

      <footer className="border-t border-slate-800 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <span className="font-bold text-slate-400">{t.kaki}</span>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/privasi" className="hover:text-cyan-300">{t.privasi}</Link>
            <Link href="/ketentuan" className="hover:text-cyan-300">{t.ketentuan}</Link>
            <Link href="/bukti" className="hover:text-cyan-300">{t.bukti}</Link>
            <Link href="/ortu" className="hover:text-cyan-300">{t.navOrtu}</Link>
            <Link href="/daftar" className="hover:text-cyan-300">{t.daftar}</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
