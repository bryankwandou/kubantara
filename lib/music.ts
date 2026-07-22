// Musik latar prosedural yang lembut — pentatonik, dibangkitkan Web Audio.
// Tidak memakai berkas audio apa pun.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;

const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25]; // C mayor pentatonik + oktaf

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctor) ctx = new Ctor();
  }
  return ctx;
}

function note(freq: number, dur: number, gain: number, type: OscillatorType, delay = 0) {
  const a = ac();
  if (!a || !master) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

let musicVol = 0.5; // 0..1, diatur pemain

export const music = {
  playing: false,
  setVolume(v: number) {
    musicVol = Math.max(0, Math.min(1, v));
    if (master) master.gain.value = musicVol;
  },
  getVolume() { return musicVol; },
  start() {
    const a = ac();
    if (!a || this.playing) return;
    if (a.state === "suspended") a.resume();
    if (!master) {
      master = a.createGain();
      master.gain.value = musicVol;
      const lp = a.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1800;
      master.connect(lp).connect(a.destination);
    }
    this.playing = true;
    step = 0;
    timer = setInterval(() => {
      if (!this.playing) return;
      // melodi lembut: satu nada tiap ketukan, kadang jeda
      if (Math.random() > 0.25) {
        const f = SCALE[Math.floor(Math.random() * SCALE.length)];
        note(f, 0.9, 0.045, "triangle");
      }
      // pad rendah tiap 4 ketukan
      if (step % 4 === 0) {
        const root = SCALE[step % 8 < 4 ? 0 : 3] / 2;
        note(root, 2.4, 0.03, "sine");
        note(root * 1.5, 2.4, 0.02, "sine");
      }
      step++;
    }, 600);
  },
  stop() {
    this.playing = false;
    if (timer) { clearInterval(timer); timer = null; }
  },
};
