// Uji alur beli skin di devnet: mint 1 token skin ke akun anak (milik guardian),
// lalu baca saldonya. Membuktikan toko benar-benar mencatat di on-chain.
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createAccount, mintTo, getAccount } from "@solana/spl-token";
import bs58 from "bs58";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const mints = JSON.parse(fs.readFileSync(new URL("../lib/skin-mints.json", import.meta.url), "utf8"));
const conn = new Connection(env.SOLANA_RPC_URL, "confirmed");
const g = Keypair.fromSecretKey(bs58.decode(env.GUARDIAN_SECRET_B58));

const username = "rafi", skinId = "kesatria-emas";
const mint = new PublicKey(mints[skinId]);
const enc = new TextEncoder().encode(`kubantara-skin:${username}:${skinId}`);
const seed = new Uint8Array(32); for (let i = 0; i < enc.length && i < 32; i++) seed[i] = enc[i];
const kp = Keypair.fromSeed(seed);
console.log("Akun skin:", kp.publicKey.toBase58());

let exists = true;
try { await getAccount(conn, kp.publicKey); } catch { exists = false; }
if (!exists) { console.log("buat akun skin…"); await createAccount(conn, g, mint, g.publicKey, kp); }

const before = Number((await getAccount(conn, kp.publicKey)).amount);
console.log("saldo sebelum:", before);
if (before === 0) {
  const sig = await mintTo(conn, g, mint, kp.publicKey, g, 1);
  console.log("beli tx:", `https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}
console.log("saldo sesudah:", Number((await getAccount(conn, kp.publicKey)).amount), "(1 = skin dimiliki)");
