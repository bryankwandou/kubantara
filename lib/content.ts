// Katalog konten Kubantara: pencapaian, keahlian, pahlawan, dan peralatan.
// Semua ramah anak — "peralatan" adalah alat sihir dan bangun, bukan senjata kekerasan.

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  xp: number;
  // syarat terhadap stats: kunci statistik dan ambangnya
  stat: string;
  need: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "bintang-1", name: "Kilau Pertama", desc: "Kumpulkan 1 bintang", xp: 20, stat: "stars", need: 1 },
  { id: "bintang-8", name: "Pemburu Cahaya", desc: "Kumpulkan 8 bintang", xp: 60, stat: "stars", need: 8 },
  { id: "bintang-24", name: "Raja Bintang", desc: "Kumpulkan semua 24 bintang", xp: 200, stat: "stars", need: 24 },
  { id: "balok-1", name: "Tukang Cilik", desc: "Pasang balok pertamamu", xp: 15, stat: "blocksPlaced", need: 1 },
  { id: "balok-50", name: "Arsitek Muda", desc: "Pasang 50 balok", xp: 80, stat: "blocksPlaced", need: 50 },
  { id: "balok-300", name: "Pembangun Kota", desc: "Pasang 300 balok", xp: 200, stat: "blocksPlaced", need: 300 },
  { id: "bongkar-20", name: "Perombak", desc: "Bongkar 20 balok", xp: 50, stat: "blocksRemoved", need: 20 },
  { id: "sihir-1", name: "Penyihir Pemula", desc: "Rapal sihir pertamamu", xp: 20, stat: "spellsCast", need: 1 },
  { id: "sihir-30", name: "Ahli Mantra", desc: "Rapal 30 sihir", xp: 100, stat: "spellsCast", need: 30 },
  { id: "sihir-100", name: "Penyihir Agung", desc: "Rapal 100 sihir", xp: 250, stat: "spellsCast", need: 100 },
  { id: "naik-1", name: "Penunggang Baru", desc: "Naiki tunggangan", xp: 30, stat: "rides", need: 1 },
  { id: "naik-15", name: "Koboi Kubus", desc: "Naiki tunggangan 15 kali", xp: 120, stat: "rides", need: 15 },
  { id: "lompat-100", name: "Kaki Pegas", desc: "Melompat 100 kali", xp: 60, stat: "jumps", need: 100 },
  { id: "jelajah-1000", name: "Penjelajah Sejati", desc: "Berjalan sejauh 1000 langkah", xp: 90, stat: "distance", need: 1000 },
  { id: "jelajah-5000", name: "Legenda Kubantara", desc: "Berjalan sejauh 5000 langkah", xp: 300, stat: "distance", need: 5000 },
  { id: "malam-1", name: "Penjaga Malam", desc: "Bertahan sampai malam tiba", xp: 40, stat: "nights", need: 1 },
];

export interface Skill {
  id: string;
  name: string;
  desc: string;
  levelNeed: number; // level akun minimal untuk terbuka
}

export const SKILLS: Skill[] = [
  { id: "langkah-cepat", name: "Langkah Cepat", desc: "Berlari lebih gesit", levelNeed: 1 },
  { id: "lompat-tinggi", name: "Lompat Tinggi", desc: "Lompatan lebih jauh ke atas", levelNeed: 2 },
  { id: "tangan-ajaib", name: "Tangan Ajaib", desc: "Memasang balok lebih jauh", levelNeed: 3 },
  { id: "panggil-hewan", name: "Panggil Hewan", desc: "Hewan peliharaan datang seketika", levelNeed: 4 },
  { id: "sihir-ganda", name: "Sihir Ganda", desc: "Efek sihir dua kali lebih besar", levelNeed: 5 },
  { id: "mata-elang", name: "Mata Elang", desc: "Kamera bisa melihat lebih jauh", levelNeed: 6 },
  { id: "kaki-air", name: "Kaki Air", desc: "Berjalan cepat di dekat air", levelNeed: 7 },
  { id: "cahaya-malam", name: "Cahaya Malam", desc: "Sekelilingmu bersinar saat malam", levelNeed: 8 },
];

export interface Hero {
  id: string;
  name: string;
  desc: string;
  levelNeed: number;
  shirt: number; // warna baju
  pants: number; // warna celana
}

export const HEROES: Hero[] = [
  { id: "penjelajah", name: "Penjelajah", desc: "Karakter awal yang riang", levelNeed: 1, shirt: 0xe2554d, pants: 0x3b5bd6 },
  { id: "penyihir", name: "Penyihir Ungu", desc: "Ahli mantra pelangi", levelNeed: 3, shirt: 0x9b5de5, pants: 0x4a3b8f },
  { id: "penjaga-hutan", name: "Penjaga Hutan", desc: "Sahabat semua satwa", levelNeed: 5, shirt: 0x2f9e44, pants: 0x5a4632 },
  { id: "pelaut", name: "Pelaut Biru", desc: "Penakluk lautan kubus", levelNeed: 7, shirt: 0x1982c4, pants: 0xf5f5f5 },
  { id: "penjaga-fajar", name: "Penjaga Fajar", desc: "Bersinar seperti pagi", levelNeed: 9, shirt: 0xffca3a, pants: 0xff924c },
  { id: "bayangan-baik", name: "Bayangan Baik", desc: "Pahlawan malam yang lembut", levelNeed: 12, shirt: 0x2b2d42, pants: 0x8d99ae },
];

export interface Gear {
  id: string;
  name: string;
  desc: string;
  levelNeed: number;
}

export const GEAR: Gear[] = [
  { id: "palu-kayu", name: "Palu Kayu", desc: "Alat bangun dasar", levelNeed: 1 },
  { id: "tongkat-bunga", name: "Tongkat Bunga", desc: "Sihir bunga lebih lebar", levelNeed: 2 },
  { id: "palu-batu", name: "Palu Batu", desc: "Membongkar lebih cepat", levelNeed: 3 },
  { id: "tongkat-pelangi", name: "Tongkat Pelangi", desc: "Jembatan pelangi lebih panjang", levelNeed: 5 },
  { id: "sepatu-angin", name: "Sepatu Angin", desc: "Lari kencang seperti angin", levelNeed: 6 },
  { id: "peluit-emas", name: "Peluit Emas", desc: "Memanggil tunggangan dari jauh", levelNeed: 8 },
  { id: "jubah-bintang", name: "Jubah Bintang", desc: "Berkilau di kegelapan", levelNeed: 10 },
  { id: "mahkota-kubantara", name: "Mahkota Kubantara", desc: "Tanda sang legenda", levelNeed: 15 },
];

export const MAX_LEVEL = 20;
// XP yang dibutuhkan untuk naik ke level berikutnya
export function xpForLevel(level: number) {
  return 100 + (level - 1) * 80;
}
export function levelFromXp(xp: number) {
  let level = 1, rest = xp;
  while (level < MAX_LEVEL && rest >= xpForLevel(level)) {
    rest -= xpForLevel(level);
    level++;
  }
  return level;
}
