import { chromium } from "playwright";
const B="http://localhost:3000";
const br=await chromium.launch({args:["--use-gl=swiftshader","--enable-unsafe-swiftshader"]});
const p=await (await br.newContext({viewport:{width:1366,height:768}})).newPage();
p.on("pageerror",e=>console.log("PAGEERROR:",e.message));
const U="jalan"+Math.floor(Math.random()*1e9), P="Uji-"+Math.random().toString(36).slice(2)+"-Aa1!";
await p.goto(B+"/daftar",{waitUntil:"networkidle"});
await p.locator('input[autocomplete="username"]').first().fill(U);
await p.locator('input[type="email"]').first().fill(U+"@contoh.test");
const s=await p.locator('input[type="password"]').all(); await s[0].fill(P); if(s[1]) await s[1].fill(P);
for(const c of await p.locator('input[type="checkbox"]').all()) await c.check();
await p.locator("button",{hasText:/daftar|buat/i}).first().click();
await p.waitForURL(/play/,{timeout:30000}).catch(()=>{});
await p.waitForSelector("canvas"); await p.waitForTimeout(2500);
const b=p.locator("button",{hasText:/Lewati/}).first();
if(await b.isVisible().catch(()=>false)) await b.click();
await p.waitForTimeout(1000);
// apakah event keyboard benar-benar sampai ke window?
await p.evaluate(()=>{window.__k=[];window.addEventListener("keydown",e=>window.__k.push(e.code));});
await p.locator("canvas").click({position:{x:600,y:400}});
await p.keyboard.down("KeyW");
await p.waitForTimeout(15000);   // tahan W lurus 15 detik
await p.keyboard.up("KeyW");
const kode=await p.evaluate(()=>[...new Set(window.__k)]);
console.log("kode tombol diterima window:", JSON.stringify(kode));
await p.waitForTimeout(1000);
const prog=await p.evaluate(async()=>{const r=await fetch("/api/progress");return (await r.json()).progress;});
console.log("distance tersimpan :", prog?.stats?.distance ?? "(belum tersimpan)");
// paksa simpan lalu baca lagi
await p.evaluate(()=>window.dispatchEvent(new Event("pagehide")));
await p.waitForTimeout(2500);
const prog2=await p.evaluate(async()=>{const r=await fetch("/api/progress");return (await r.json()).progress;});
console.log("setelah simpan paksa:", JSON.stringify(prog2?.stats));
await br.close();
