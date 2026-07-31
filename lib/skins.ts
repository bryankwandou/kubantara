// Katalog skin KOSMETIK Kubantara. Skin hanya mengubah tampilan karakter
// (warna baju & celana) — NOL pengaruh ke gameplay. Dibeli pakai keping kristal
// hasil main dungeon (bukan uang), dan kepemilikannya dicatat sebagai 1 token
// SPL di Solana devnet (lihat lib/toko.ts). Anak tidak pernah pegang dompet.
export interface Skin {
  id: string;
  name: string;
  emoji: string;
  shirt: number; // hex warna baju
  pants: number; // hex warna celana
  price: number; // harga dalam keping kristal 💎
}

export const SKINS: Skin[] = [
  { id: "kesatria-emas", name: "Kesatria Emas", emoji: "🛡️", shirt: 0xffd23e, pants: 0x8a5a33, price: 6 },
  { id: "penyihir-ungu", name: "Penyihir Ungu", emoji: "🔮", shirt: 0x9b5de5, pants: 0x3a2a5a, price: 6 },
  { id: "penyelam-biru", name: "Penyelam Biru", emoji: "🌊", shirt: 0x3b7fd6, pants: 0x1a3a6a, price: 9 },
  { id: "rimbawan-hijau", name: "Rimbawan Hijau", emoji: "🍃", shirt: 0x2f9e44, pants: 0x5a3a1a, price: 9 },
  { id: "juara-merah", name: "Juara Merah", emoji: "🔥", shirt: 0xe2554d, pants: 0x2a2a2a, price: 12 },
];

export const skinById = (id: string) => SKINS.find((s) => s.id === id);
