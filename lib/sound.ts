// Suara ceria yang dibangkitkan langsung di peramban lewat Web Audio.
// Tidak memakai satu pun berkas audio dari luar.
let ctx: AudioContext | null = null;

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
  if (!a) return;
  if (a.state === "suspended") a.resume();
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, a.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + dur);
  g.gain.setValueAtTime(gain, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  osc.connect(g).connect(a.destination);
  osc.start();
  osc.stop(a.currentTime + dur);
}

export const sfx = {
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
  win() {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => tone(f, 0.22, "triangle", 0.14), i * 130)
    );
  },
};
