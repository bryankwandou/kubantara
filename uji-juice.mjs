import { chromium } from "playwright";
const B=(process.env.BASE ?? "http://localhost:3000")+"";
const br=await chromium.launch({args:["--use-gl=swiftshader","--enable-unsafe-swiftshader"]});
const p=await (await br.newContext({viewport:{width:1200,height:700}})).newPage();
p.on("pageerror",e=>console.log("PAGEERROR:",e.message));
await p.goto(B+"/play",{waitUntil:"networkidle"});
await p.waitForSelector("canvas"); await p.waitForTimeout(4000);
const b=p.locator("button",{hasText:/Lewati/}).first();
if(await b.isVisible().catch(()=>false)) await b.click();
await p.waitForTimeout(800);
// dekatkan kamera dari atas biar karakter jelas terlihat
await p.locator("canvas").click({position:{x:600,y:350}});
// pasang beberapa balok (lihat percik) lalu bangun bintang buatan? cukup bangun.
for(let i=0;i<3;i++){ await p.locator("button",{hasText:/^Bangun/}).click(); await p.waitForTimeout(300); }
await p.screenshot({path:"uji-hasil/juice-1-bangun.png"});
// lompat & tangkap saat melayang (stretch) lalu mendarat (squash)
await p.keyboard.press("Space");
await p.waitForTimeout(120);
await p.screenshot({path:"uji-hasil/juice-2-lompat.png"});
await p.waitForTimeout(400);
await p.screenshot({path:"uji-hasil/juice-3-mendarat.png"});
// cast bunga untuk lihat warna-warni
await p.locator("button",{hasText:/^Bunga$/}).click();
await p.waitForTimeout(600);
await p.screenshot({path:"uji-hasil/juice-4-bunga.png"});
console.log("selesai, tanpa galat");
await br.close();
