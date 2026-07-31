// Sekali jalan: cetak 1 mint SPL (0 desimal) untuk tiap skin di Solana devnet.
// Guardian = mint authority. Hasil (skinId -> alamat mint) ditulis ke
// lib/skin-mints.json. Aman diulang: skin yang sudah punya mint dilewati.
import { Connection, Keypair } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
import bs58 from "bs58";
import fs from "node:fs";

const SKIN_IDS = ["kesatria-emas", "penyihir-ungu", "penyelam-biru", "rimbawan-hijau", "juara-merah"];

const envPath = new URL("../.env.local", import.meta.url);
const env = Object.fromEntries(
  fs.readFileSync(envPath, "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const conn = new Connection(env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com", "confirmed");
const g = Keypair.fromSecretKey(bs58.decode(env.GUARDIAN_SECRET_B58));
console.log("Guardian:", g.publicKey.toBase58());

const mintsPath = new URL("../lib/skin-mints.json", import.meta.url);
const mints = JSON.parse(fs.readFileSync(mintsPath, "utf8"));

for (const id of SKIN_IDS) {
  if (mints[id]) { console.log("lewati (sudah ada):", id, mints[id]); continue; }
  process.stdout.write(`cetak mint ${id} … `);
  const mint = await createMint(conn, g, g.publicKey, g.publicKey, 0);
  mints[id] = mint.toBase58();
  fs.writeFileSync(mintsPath, JSON.stringify(mints, null, 2) + "\n");
  console.log(mint.toBase58());
}
console.log("\nSelesai. Mint skin tersimpan di lib/skin-mints.json (alamat publik, aman di-commit).");
