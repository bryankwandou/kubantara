// Suara ceria yang dibangkitkan langsung di peramban lewat Web Audio.
// Tidak memakai satu pun berkas audio dari luar.
let ctx: AudioContext | null = null;
let sfxVol = 1; // 0..1, diatur pemain di menu pengaturan

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctor) ctx = new Ctor();
  }
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, gain = 0.12, slideTo?: number) {
  const a = ac();
  if (!a || sfxVol <= 0) return;
  if (a.state === "suspended") a.resume();
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, a.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + dur);
  g.gain.setValueAtTime(gain * sfxVol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  osc.connect(g).connect(a.destination);
  osc.start();
  osc.stop(a.currentTime + dur);
}

export const sfx = {
  setVolume(v: number) { sfxVol = Math.max(0, Math.min(1, v)); },
  getVolume() { return sfxVol; },
  resume() {
    const a = ac();
    if (a && a.state === "suspended") a.resume();
  },
  jump() {
    tone(320, 0.16, "sine", 0.1, 620);
  },
  star() {
    tone(660, 0.1, "triangle", 0.14);
    setTimeout(() => tone(880, 0.14, "triangle", 0.14), 90);
    setTimeout(() => tone(1180, 0.18, "triangle", 0.12), 190);
  },
  place() {
    tone(180, 0.09, "square", 0.08, 120);
  },
  breakBlock() {
    tone(150, 0.12, "sawtooth", 0.07, 70);
  },
  magic() {
    tone(520, 0.12, "sine", 0.1, 1040);
    setTimeout(() => tone(780, 0.16, "sine", 0.1, 1560), 80);
  },
  mount() {
    tone(240, 0.2, "sine", 0.1, 400);
  },
  // langkah kaki: denyut rendah singkat, nada berganti agar tidak monoton.
  // dipanggil tiap kaki menyentuh tanah dari loop permainan.
  step(left: boolean) {
    tone(left ? 92 : 104, 0.07, "sine", 0.05, left ? 66 : 74);
  },
  // memberi makan peliharaan: bunyi "nyam" ceria
  feed() {
    tone(300, 0.1, "sine", 0.09, 480);
    setTimeout(() => tone(440, 0.12, "triangle", 0.08), 90);
  },
  // teleport: bunyi berdengung naik lalu berkilau
  teleport() {
    tone(220, 0.18, "sine", 0.09, 880);
    setTimeout(() => tone(1320, 0.16, "triangle", 0.1), 150);
  },
  win() {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => tone(f, 0.22, "triangle", 0.14), i * 130)
    );
  },
};
