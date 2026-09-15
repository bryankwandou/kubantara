// Toko skin on-chain — Solana devnet. Tiap skin = satu token SPL unik (0 desimal).
// Membeli skin = mint 1 token ke akun skin milik anak (dimiliki guardian, jadi
// anak tak bisa memindahkannya). Kepemilikan bisa dibuka di Solana Explorer.
// RAHASIA guardian hanya dibaca dari environment, tak pernah dikirim ke klien.
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createAccount, mintTo, getAccount } from "@solana/spl-token";
import bs58 from "bs58";
import { createHash } from "node:crypto";
import mints from "./skin-mints.json";

const RPC = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const MINTS = mints as Record<string, string>;

export function connection() {
  return new Connection(RPC, "confirmed");
}
export function guardian(): Keypair {
  const b58 = process.env.GUARDIAN_SECRET_B58;
  if (!b58) throw new Error("GUARDIAN_SECRET_B58 belum diset");
  return Keypair.fromSecretKey(bs58.decode(b58));
}
export function skinMint(skinId: string): PublicKey {
  const m = MINTS[skinId];
  if (!m) throw new Error("Skin belum punya mint di devnet: " + skinId);
  return new PublicKey(m);
}
export function hasMints() {
  return Object.keys(MINTS).length > 0;
}
export const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
export const explorerAddr = (a: string) => `https://explorer.solana.com/address/${a}?cluster=devnet`;

// Akun skin anak: alamat tetap turunan dari nama anak + id skin, pemiliknya guardian.
//
// Benihnya di-hash, bukan dipotong. Versi lama menyalin teks
// `kubantara-skin:<nama>:<skin>` apa adanya ke 32 byte pertama — padahal
// awalannya saja sudah 15 karakter. Untuk nama pengguna 17 huruf ke atas,
// bagian `:<skin>` tak pernah ikut terbaca, sehingga SELURUH skin anak itu
// memakai satu akun token yang sama: membeli satu skin membuat semuanya
// tampak dimiliki. Dan dua anak yang 17 huruf pertama namanya sama akan
// berbagi akun — masing-masing melihat barang milik yang lain.
//
// SHA-256 memakai seluruh masukan dan selalu menghasilkan tepat 32 byte, jadi
// panjang nama tidak lagi berpengaruh.
export function skinAccountKeypair(username: string, skinId: string): Keypair {
  const seed = createHash("sha256")
    .update(`kubantara-skin:${username.toLowerCase()}:${skinId}`)
    .digest();
  return Keypair.fromSeed(new Uint8Array(seed));
}

async function ensureSkinAccount(username: string, skinId: string) {
  const conn = connection();
  const g = guardian();
  const kp = skinAccountKeypair(username, skinId);
  try {
    await getAccount(conn, kp.publicKey);
  } catch {
    await createAccount(conn, g, skinMint(skinId), g.publicKey, kp);
  }
  return kp.publicKey;
}

// Beli skin: mint 1 token skin ke akun anak. Kembalikan tanda transaksi.
export async function buySkin(username: string, skinId: string) {
  const conn = connection();
  const g = guardian();
  const acct = await ensureSkinAccount(username, skinId);
  const sig = await mintTo(conn, g, skinMint(skinId), acct, g, 1);
  return { sig, explorer: explorerTx(sig), account: acct.toBase58() };
}

// Daftar id skin yang sudah dimiliki anak (saldo token > 0).
export async function ownedSkins(username: string): Promise<string[]> {
  const conn = connection();
  const owned: string[] = [];
  await Promise.all(
    Object.keys(MINTS).map(async (skinId) => {
      try {
        const acc = await getAccount(conn, skinAccountKeypair(username, skinId).publicKey);
        if (Number(acc.amount) > 0) owned.push(skinId);
      } catch { /* akun belum ada = belum dimiliki */ }
    })
  );
  return owned;
}
