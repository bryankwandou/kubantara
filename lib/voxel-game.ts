// Kubantara — mesin dunia voxel terbuka untuk anak.
// Bangun & bongkar blok, sihir warna, hewan peliharaan, tunggangan,
// satwa liar, siklus siang-malam. Tanpa musuh, tanpa kalah.
import * as THREE from "three";
import { sfx } from "./sound";

const WORLD = 112;
const HALF = WORLD / 2;
const WATER_LEVEL = 2.5;
const MAX_PLACED = 4000;
const DAY_LEN = 120; // detik satu putaran siang-malam penuh
// Mulai permainan di tengah siang, bukan tengah malam. Kesan pertama anak
// harus dunia yang terang, dan mereka tidak boleh dapat pencapaian "bertahan
// sampai malam" secara gratis di detik nol.
// 0,26 = tepat lewat fajar, memberi rentang terang terpanjang sebelum malam.
const DAY_START = 0.26;

// ---------- noise sederhana (value noise) ----------
function hash(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function smooth(x: number, z: number) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi);
  const c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function terrainHeight(x: number, z: number) {
  return Math.floor(
    smooth(x / 26 + 100, z / 26 + 100) * 8 +
    smooth(x / 10 + 40, z / 10 + 40) * 3
  );
}

export type Biome = "grass" | "dirt" | "sand" | "stone" | "wood" | "leaf" | "snow";
export const PALETTE = [
  { name: "Rumput", hex: 0x5fbf4a },
  { name: "Tanah", hex: 0x8a5a33 },
  { name: "Pasir", hex: 0xead89a },
  { name: "Batu", hex: 0x9aa2ab },
  { name: "Kayu", hex: 0x7a4f2a },
  { name: "Merah", hex: 0xe2554d },
  { name: "Biru", hex: 0x3b7fd6 },
  { name: "Ungu", hex: 0x9b5de5 },
];

export type Spell = "jembatan" | "bunga" | "kembang-api" | "pohon";
export type Blueprint = "rumah" | "menara" | "tangga" | "pagar";
// Bentuk balok yang bisa dipasang anak.
export type Shape = "kubus" | "kaca" | "lampu" | "setengah";
// Emote aman: hanya lambang tetap, tidak ada teks yang bisa diketik anak.
export const EMOTES = ["👋", "❤️", "😀", "🎉", "⭐", "👍"] as const;
export type Emote = (typeof EMOTES)[number];

export const SHAPES: { id: Shape; name: string }[] = [
  { id: "kubus", name: "Balok" },
  { id: "kaca", name: "Kaca" },
  { id: "lampu", name: "Lampu" },
  { id: "setengah", name: "Setengah" },
];

export interface GameHooks {
  onStars: (collected: number, total: number) => void;
  onTime: (label: "Pagi" | "Siang" | "Senja" | "Malam") => void;
  onRide: (riding: boolean) => void;
  onStat?: (stats: GameStats) => void;
  onNpc?: (npc: { name: string; line: string } | null) => void;
  onWeather?: (w: "Cerah" | "Hujan" | "Pelangi" | "Salju") => void;
}

export interface GameStats {
  blocksPlaced: number;
  blocksRemoved: number;
  spellsCast: number;
  rides: number;
  jumps: number;
  distance: number;
  nights: number;
  npcMet: number;
  tamed: number;
}

export interface Perks {
  speedMul: number;   // pengali kecepatan lari
  jumpMul: number;    // pengali tinggi lompat
  reach: number;      // jarak pasang balok
  spellScale: number; // besaran efek sihir
  camExtra: number;   // tambahan jarak kamera
  waterWalk: boolean; // melaju cepat saat berada di perairan dangkal
  nightGlow: boolean; // sekeliling pemain bersinar saat malam
  // efek peralatan (gear) — tiap janji di deskripsi jadi nyata di gameplay
  bungaBonus: number;  // Tongkat Bunga: lingkaran bunga lebih lebar
  bridgeBonus: number; // Tongkat Pelangi: jembatan lebih panjang
  removeRange: number;  // Palu Batu: sekali Bongkar meruntuhkan area
  callMount: boolean;  // Peluit Emas: tunggangan datang sendiri saat dipanggil
  crown: boolean;      // Mahkota Kubantara: mahkota emas di kepala
}

// `s` menyusul setelah rilis pertama; simpanan lama tanpa `s` dianggap kubus.
export interface SavedBlock { x: number; y: number; z: number; c: number; s?: Shape }

export function createGame(canvas: HTMLCanvasElement, hooks: GameHooks) {
  // Perangkat kelas bawah: inti CPU sedikit atau layar kecil. Turunkan beban
  // grafis daripada memaksa dan membuat permainan patah-patah.
  const lowEnd =
    (navigator.hardwareConcurrency ?? 4) <= 4 ||
    Math.min(window.screen.width, window.screen.height) <= 480;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowEnd });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowEnd ? 1.25 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = lowEnd ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  // Warna & pencahayaan lebih nyata: ruang warna sRGB + tone mapping sinema
  // membuat cahaya matahari terasa hangat, bukan datar & pucat.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  const skyDay = new THREE.Color(0x8ecfff);
  const skyNight = new THREE.Color(0x0a1440);
  const skyDusk = new THREE.Color(0xf3934f);
  scene.background = skyDay.clone();
  // jarak pandang lebih pendek di perangkat lemah: kabut menutup batasnya
  // sehingga tidak terlihat seperti dunia yang terpotong
  scene.fog = new THREE.Fog(skyDay.getHex(), lowEnd ? 45 : 70, lowEnd ? 105 : 165);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, lowEnd ? 220 : 500);

  // ---------- cahaya ----------
  const sun = new THREE.DirectionalLight(0xfff4d6, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lowEnd ? 1024 : 2048, lowEnd ? 1024 : 2048);
  const scam = sun.shadow.camera as THREE.OrthographicCamera;
  scam.left = -80; scam.right = 80; scam.top = 80; scam.bottom = -80;
  const ambient = new THREE.AmbientLight(0xbfd9ff, 0.9);
  const moon = new THREE.DirectionalLight(0x9fb8ff, 0.0);
  // Cahaya Malam: lentera tak terlihat yang mengikuti pemain saat gelap
  const glow = new THREE.PointLight(0xffe6a8, 0, 18, 2);
  scene.add(sun, ambient, moon, glow);

  // bola matahari & bulan (dekorasi)
  const sunBall = new THREE.Mesh(
    new THREE.SphereGeometry(4, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8 })
  );
  const moonBall = new THREE.Mesh(
    new THREE.SphereGeometry(3, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xe8eeff })
  );
  scene.add(sunBall, moonBall);

  // bintang langit malam
  const starField = (() => {
    const g = new THREE.BufferGeometry();
    const pts: number[] = [];
    for (let i = 0; i < 400; i++) {
      const v = new THREE.Vector3().setFromSphericalCoords(
        200, Math.acos(Math.random() * 0.6 + 0.2), Math.random() * Math.PI * 2
      );
      pts.push(v.x, v.y, v.z);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const m = new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, transparent: true, opacity: 0 });
    return new THREE.Points(g, m);
  })();
  scene.add(starField);

  // ---------- dunia voxel ----------
  const box = new THREE.BoxGeometry(1, 1, 1);
  const heights: number[][] = [];
  type Layer = { color: number; cells: THREE.Matrix4[] };
  const layers: Record<Biome, Layer> = {
    grass: { color: 0x5fbf4a, cells: [] },
    dirt: { color: 0x8a5a33, cells: [] },
    sand: { color: 0xead89a, cells: [] },
    stone: { color: 0x9aa2ab, cells: [] },
    wood: { color: 0x7a4f2a, cells: [] },
    leaf: { color: 0x3e9e3e, cells: [] },
    snow: { color: 0xf2f6fb, cells: [] },
  };
  const m = new THREE.Matrix4();
  const put = (l: Layer, x: number, y: number, z: number) =>
    l.cells.push(m.clone().setPosition(x, y, z));

  for (let x = -HALF; x < HALF; x++) {
    heights[x + HALF] = [];
    for (let z = -HALF; z < HALF; z++) {
      const h = terrainHeight(x, z);
      heights[x + HALF][z + HALF] = h;
      // suhu menentukan biome: dingin di utara (salju), panas di tenggara (gurun)
      const temp = smooth(x / 44 + 300, z / 44 + 300);
      const top =
        h <= WATER_LEVEL ? layers.sand
        : h > 11 ? layers.snow
        : h > 9 ? layers.stone
        : temp > 0.74 ? layers.sand
        : layers.grass;
      put(top, x, h, z);
      put(layers.dirt, x, h - 1, z);
      // Hutan lebat: di barat laut pulau pepohonan tumbuh jauh lebih rapat.
      // Nilai forest 0..1 makin tinggi makin ke dalam hutan.
      const forest = smooth(x / 30 - 200, z / 30 - 200);
      const inForest = x < -18 && z < -18;
      const treeChance = inForest ? 0.9 - forest * 0.06 : 0.986;
      if (top === layers.grass && hash(x * 3.7, z * 3.7) > treeChance) {
        const th = 3 + Math.floor(hash(x, z) * 2);
        for (let y = 1; y <= th; y++) put(layers.wood, x, h + y, z);
        for (let dx = -2; dx <= 2; dx++)
          for (let dz = -2; dz <= 2; dz++)
            for (let dy = 0; dy <= 2; dy++)
              if (Math.abs(dx) + Math.abs(dz) + dy < 4)
                put(layers.leaf, x + dx, h + th + dy, z + dz);
      }
    }
  }
  // ---------- desa: rumah kecil di dekat tiap penduduk ----------
  // Koordinat harus sejalan dengan NPC_DATA di bawah agar tiap penduduk punya rumah.
  const VILLAGE_SPOTS = [
    { x: 4, z: -6 }, { x: -14, z: 10 }, { x: 18, z: 14 },
    { x: -24, z: -20 }, { x: 30, z: -12 }, { x: -8, z: 28 },
  ];
  const hAt = (x: number, z: number) => {
    const xi = Math.round(x) + HALF, zi = Math.round(z) + HALF;
    return heights[xi]?.[zi] ?? 0;
  };
  for (const spot of VILLAGE_SPOTS) {
    // rumah dibangun 3 blok di samping penduduk supaya pintunya menghadap mereka
    const bx = spot.x + 3, bz = spot.z;
    const base = hAt(bx, bz) + 1;
    const R = 2; // setengah lebar rumah (rumah 5x5)
    for (let dx = -R; dx <= R; dx++) {
      for (let dz = -R; dz <= R; dz++) {
        const edge = Math.abs(dx) === R || Math.abs(dz) === R;
        if (!edge) continue;
        // lubang pintu di sisi yang menghadap penduduk
        const isDoor = dx === -R && dz === 0;
        for (let dy = 0; dy < 3; dy++) {
          if (isDoor && dy < 2) continue;
          put(layers.wood, bx + dx, base + dy, bz + dz);
        }
      }
    }
    // atap daun bertingkat supaya terlihat seperti rumah panggung Nusantara
    for (let dx = -R - 1; dx <= R + 1; dx++)
      for (let dz = -R - 1; dz <= R + 1; dz++)
        put(layers.leaf, bx + dx, base + 3, bz + dz);
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++)
        put(layers.leaf, bx + dx, base + 4, bz + dz);
  }

  for (const key of Object.keys(layers) as Biome[]) {
    const l = layers[key];
    const mesh = new THREE.InstancedMesh(
      box, new THREE.MeshLambertMaterial({ color: l.color }), l.cells.length
    );
    l.cells.forEach((mat, i) => mesh.setMatrixAt(i, mat));
    mesh.castShadow = key === "wood" || key === "leaf";
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // ---------- air: permukaan danau & laut ----------
  // Bidang biru tembus pandang setinggi permukaan air. Riak halus dari
  // gelombang vertex membuat danau terasa hidup, bukan sekadar warna datar.
  const waterGeo = new THREE.PlaneGeometry(WORLD, WORLD, lowEnd ? 24 : 48, lowEnd ? 24 : 48);
  waterGeo.rotateX(-Math.PI / 2);
  const waterBaseY = new Float32Array(waterGeo.attributes.position.count);
  {
    const p = waterGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) waterBaseY[i] = p.getY(i);
  }
  const water = new THREE.Mesh(
    waterGeo,
    new THREE.MeshLambertMaterial({
      color: 0x2f8fd6, transparent: true, opacity: 0.68,
      emissive: 0x0a3a66, emissiveIntensity: 0.25,
    })
  );
  water.position.y = WATER_LEVEL + 0.35;
  water.receiveShadow = true;
  scene.add(water);

  // ---------- awan yang menghanyut pelan ----------
  const cloudGroup = new THREE.Group();
  const cloudMat = new THREE.MeshLambertMaterial({
    color: 0xffffff, transparent: true, opacity: 0.85, emissive: 0x9fb4cc, emissiveIntensity: 0.15,
  });
  for (let i = 0; i < (lowEnd ? 8 : 16); i++) {
    const puff = new THREE.Group();
    const n = 3 + Math.floor(hash(i, 71) * 3);
    for (let j = 0; j < n; j++) {
      const s = 3 + hash(i * 7, j * 3) * 4;
      const b = new THREE.Mesh(box, cloudMat);
      b.scale.set(s, s * 0.55, s);
      b.position.set((hash(i, j) - 0.5) * 10, (hash(j, i) - 0.5) * 2, (hash(i + j, j) - 0.5) * 8);
      puff.add(b);
    }
    puff.position.set((hash(i, 2) - 0.5) * WORLD, 34 + hash(i, 4) * 12, (hash(i, 8) - 0.5) * WORLD);
    puff.userData.speed = 0.6 + hash(i, 6) * 0.8;
    cloudGroup.add(puff);
  }
  scene.add(cloudGroup);

  // ---------- blok yang dipasang pemain (dinamis) ----------
  // Satu InstancedMesh per bentuk; semuanya memakai warna per-instance.
  const halfBox = new THREE.BoxGeometry(1, 0.5, 1);
  function makeShapeMesh(geo: THREE.BufferGeometry, mat: THREE.Material) {
    const mesh = new THREE.InstancedMesh(geo, mat, MAX_PLACED);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PLACED * 3), 3);
    scene.add(mesh);
    return mesh;
  }
  const shapeMeshes: Record<Shape, THREE.InstancedMesh> = {
    kubus: makeShapeMesh(box, new THREE.MeshLambertMaterial()),
    kaca: makeShapeMesh(box, new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.4 })),
    // lampu memancarkan cahayanya sendiri agar terlihat menyala saat malam
    lampu: makeShapeMesh(box, new THREE.MeshLambertMaterial({ emissive: 0xffffff, emissiveIntensity: 0.55 })),
    setengah: makeShapeMesh(halfBox, new THREE.MeshLambertMaterial()),
  };
  // kaca tidak menjatuhkan bayangan supaya tetap terasa tembus pandang
  shapeMeshes.kaca.castShadow = false;
  const placed: { x: number; y: number; z: number; c: number; s: Shape }[] = [];
  const stats: GameStats = {
    blocksPlaced: 0, blocksRemoved: 0, spellsCast: 0,
    rides: 0, jumps: 0, distance: 0, nights: 0, npcMet: 0, tamed: 0,
  };
  const perks: Perks = {
    speedMul: 1, jumpMul: 1, reach: 1.6, spellScale: 1, camExtra: 0,
    waterWalk: false, nightGlow: false,
    bungaBonus: 0, bridgeBonus: 0, removeRange: 0, callMount: false, crown: false,
  };
  const bump = (k: keyof GameStats, n = 1) => {
    stats[k] += n;
    hooks.onStat?.(stats);
  };
  const colTop = new Map<string, number>(); // "x,z" -> puncak blok pasang
  const tmpColor = new THREE.Color();

  // jumlah instance terpakai per bentuk
  const shapeCount: Record<Shape, number> = { kubus: 0, kaca: 0, lampu: 0, setengah: 0 };

  // Tulis satu blok ke mesh bentuknya. Setengah balok duduk di separuh bawah sel.
  function writeInstance(b: { x: number; y: number; z: number; c: number; s: Shape }) {
    const mesh = shapeMeshes[b.s];
    const i = shapeCount[b.s]++;
    m.identity().setPosition(b.x, b.s === "setengah" ? b.y - 0.25 : b.y, b.z);
    mesh.setMatrixAt(i, m);
    tmpColor.setHex(b.c);
    mesh.setColorAt(i, tmpColor);
  }

  function flushShapes() {
    for (const s of Object.keys(shapeMeshes) as Shape[]) {
      const mesh = shapeMeshes[s];
      mesh.count = shapeCount[s];
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  function rebuildPlaced() {
    shapeCount.kubus = shapeCount.kaca = shapeCount.lampu = shapeCount.setengah = 0;
    for (const b of placed) writeInstance(b);
    flushShapes();
  }

  let placeColor = PALETTE[0].hex;
  let placeShape: Shape = "kubus";
  // antrean balok yang baru dipasang pemain ini, menunggu dikirim ke saudara
  let outbox: SavedBlock[] = [];
  // kunci sel yang sudah ada, supaya balok saudara tidak dipasang dua kali
  const cellKeys = new Set<string>();
  const cellKey = (x: number, y: number, z: number) => `${x},${y},${z}`;
  function addBlock(x: number, y: number, z: number, color: number, shape: Shape = "kubus") {
    if (placed.length >= MAX_PLACED) return;
    if (cellKeys.has(cellKey(x, y, z))) return; // sel sudah terisi
    const b = { x, y, z, c: color, s: shape };
    placed.push(b);
    cellKeys.add(cellKey(x, y, z));
    writeInstance(b);
    flushShapes();
    const key = `${x},${z}`;
    colTop.set(key, Math.max(colTop.get(key) ?? -Infinity, y));
  }

  const groundAt = (x: number, z: number) => {
    const gx = Math.round(x) + HALF, gz = Math.round(z) + HALF;
    if (gx < 0 || gz < 0 || gx >= WORLD || gz >= WORLD) return 20;
    const base = heights[gx][gz] + 0.5;
    const key = `${Math.round(x)},${Math.round(z)}`;
    const top = colTop.get(key);
    return top !== undefined ? Math.max(base, top + 1) : base;
  };

  // ---------- karakter kotak ----------
  function buildKid() {
    const g = new THREE.Group();
    const skin = new THREE.MeshLambertMaterial({ color: 0xf5c396 });
    const shirt = new THREE.MeshLambertMaterial({ color: 0xe2554d });
    const pants = new THREE.MeshLambertMaterial({ color: 0x3b5bd6 });
    const mk = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      p.position.set(x, y, z); p.castShadow = true; return p;
    };
    const head = mk(0.55, 0.55, 0.55, skin, 0, 1.55, 0);
    head.add(mk(0.08, 0.08, 0.02, new THREE.MeshBasicMaterial({ color: 0x222222 }), -0.12, 0.05, 0.29));
    head.add(mk(0.08, 0.08, 0.02, new THREE.MeshBasicMaterial({ color: 0x222222 }), 0.12, 0.05, 0.29));
    const body = mk(0.6, 0.7, 0.35, shirt, 0, 0.95, 0);
    const armL = mk(0.2, 0.6, 0.2, shirt, -0.42, 0.95, 0);
    const armR = mk(0.2, 0.6, 0.2, shirt, 0.42, 0.95, 0);
    const legL = mk(0.24, 0.6, 0.24, pants, -0.16, 0.3, 0);
    const legR = mk(0.24, 0.6, 0.24, pants, 0.16, 0.3, 0);
    g.add(head, body, armL, armR, legL, legR);
    return { g, head, armL, armR, legL, legR, shirt, pants };
  }
  const kid = buildKid();
  const player = kid.g;
  player.position.set(0, groundAt(0, 0), 0);
  scene.add(player);

  // preview blok (hantu)
  const ghost = new THREE.Mesh(
    box, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, wireframe: false })
  );
  ghost.scale.setScalar(1.001);
  scene.add(ghost);

  function targetCell() {
    const yaw = player.rotation.y;
    const tx = Math.round(player.position.x + Math.sin(yaw) * perks.reach);
    const tz = Math.round(player.position.z + Math.cos(yaw) * perks.reach);
    const ty = Math.round(groundAt(tx, tz) + 0.5);
    return { x: tx, y: ty, z: tz };
  }

  // ---------- hewan kubus generik ----------
  function buildCritter(bodyColor: number, w: number, h: number, d: number) {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: bodyColor });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    body.position.y = h / 2 + 0.25;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(h * 0.9, h * 0.9, h * 0.7), mat);
    head.position.set(0, h * 0.9 + 0.25, d / 2);
    head.castShadow = true;
    const legGeo = new THREE.BoxGeometry(w * 0.22, 0.5, w * 0.22);
    const legs: THREE.Mesh[] = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set((sx * w) / 3, 0.25, (sz * d) / 3);
      leg.castShadow = true;
      legs.push(leg);
      g.add(leg);
    }
    g.add(body, head);
    return { g, legs };
  }

  // hewan peliharaan (mengikuti pemain)
  const pet = buildCritter(0xf4a340, 0.5, 0.4, 0.7);
  pet.g.position.set(2, groundAt(2, 0), 1);
  scene.add(pet.g);
  // rasa kenyang & lonjakan senang saat diberi makan
  let petHop = 0;
  // topi kostum peliharaan (disembunyikan sampai anak memilih kostum)
  const petHat = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.4, 4),
    new THREE.MeshLambertMaterial({ color: 0xe2554d })
  );
  petHat.position.y = 1.15;
  petHat.visible = false;
  petHat.castShadow = true;
  pet.g.add(petHat);
  const PET_COSTUMES = [
    { id: "topi-merah", label: "🎩 Topi Merah", color: 0xe2554d },
    { id: "topi-ungu", label: "🎓 Topi Ungu", color: 0x9b5de5 },
    { id: "topi-emas", label: "👑 Topi Emas", color: 0xffd23e },
    { id: "topi-hijau", label: "🍀 Topi Hijau", color: 0x2f9e44 },
  ];

  // tunggangan (bisa dinaiki)
  const mount = buildCritter(0xb5651d, 1.1, 1.0, 1.6);
  const mountStart = new THREE.Vector3(6, groundAt(6, 4), 4);
  mount.g.position.copy(mountStart);
  mount.g.position.y = groundAt(mount.g.position.x, mount.g.position.z);
  scene.add(mount.g);
  let riding = false;

  // satwa liar (berkeliaran)
  const wildlife: {
    c: ReturnType<typeof buildCritter>;
    dir: number; timer: number; tamed: boolean; heart: THREE.Mesh;
  }[] = [];
  const heartGeo = new THREE.OctahedronGeometry(0.16);
  const heartMat = new THREE.MeshBasicMaterial({ color: 0xff6b9d });
  for (let i = 0; i < 8; i++) {
    const col = [0xffffff, 0xdddddd, 0xf7c59f, 0x9ad1f5][i % 4];
    const c = buildCritter(col, 0.4, 0.3, 0.55);
    const x = Math.floor((hash(i, 5) - 0.5) * (WORLD - 20));
    const z = Math.floor((hash(i, 9) - 0.5) * (WORLD - 20));
    c.g.position.set(x, groundAt(x, z), z);
    // hati kecil muncul di atas satwa yang sudah dijinakkan
    const heart = new THREE.Mesh(heartGeo, heartMat);
    heart.position.y = 1.1;
    heart.visible = false;
    c.g.add(heart);
    scene.add(c.g);
    wildlife.push({ c, dir: hash(i, 3) * Math.PI * 2, timer: 0, tamed: false, heart });
  }

  // ---------- penduduk pulau (NPC cerita) ----------
  const NPC_DATA = [
    { name: "Kakek Bimasakti", line: "Dahulu langit kami penuh cahaya. Lalu satu per satu bintang jatuh dan padam. Maukah kamu mengumpulkannya kembali?", color: 0x8d99ae, x: 4, z: -6 },
    { name: "Bu Renjana", line: "Setiap balok yang kamu pasang membuat pulau ini hidup lagi. Bangunlah sesukamu, jangan takut salah.", color: 0xff8fd0, x: -14, z: 10 },
    { name: "Pak Cakrawala", line: "Sihir pelangi tersimpan di tanganmu. Rapalkan di tepi air dan lihat apa yang terjadi.", color: 0x1982c4, x: 18, z: 14 },
    { name: "Adik Kirana", line: "Aku pernah melihat bintang jatuh di balik bukit salju sana. Hati-hati, di sana dingin sekali!", color: 0xffca3a, x: -24, z: -20 },
    { name: "Bang Samudra", line: "Tunggangan itu sahabat, bukan alat. Ajak dia berlari dan dia akan membawamu lebih jauh dari siapa pun.", color: 0x2f9e44, x: 30, z: -12 },
    { name: "Nini Wengi", line: "Jangan takut pada malam. Justru saat gelap, bintang-bintang yang kamu selamatkan bersinar paling terang.", color: 0x9b5de5, x: -8, z: 28 },
  ];
  const npcMarkerGeo = new THREE.OctahedronGeometry(0.22);
  const npcs = NPC_DATA.map((d) => {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: d.color });
    const skin = new THREE.MeshLambertMaterial({ color: 0xf5c396 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), mat);
    body.position.y = 0.9; body.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skin);
    head.position.y = 1.5; head.castShadow = true;
    const marker = new THREE.Mesh(npcMarkerGeo, new THREE.MeshBasicMaterial({ color: 0xffd23e }));
    marker.position.y = 2.2;
    g.add(body, head, marker);
    g.position.set(d.x, groundAt(d.x, d.z), d.z);
    scene.add(g);
    return { ...d, g, marker, met: false };
  });
  let activeNpc: string | null = null;
  let npcCheck = 0;

  // ---------- saudara yang main bersama ----------
  const HERO_COLORS: Record<string, number> = {
    penjelajah: 0xe2554d, penyihir: 0x9b5de5, "penjaga-hutan": 0x2f9e44,
    pelaut: 0x1982c4, "penjaga-fajar": 0xffca3a, "bayangan-baik": 0x2b2d42,
  };
  const friends = new Map<string, {
    g: THREE.Group; target: THREE.Vector3; bubble: THREE.Sprite | null; bubbleUntil: number;
  }>();

  // Gelembung emote digambar ke kanvas lalu dipakai sebagai tekstur sprite.
  const emoteTextures = new Map<string, THREE.Texture>();
  function emoteTexture(e: string) {
    let tex = emoteTextures.get(e);
    if (tex) return tex;
    const cv = document.createElement("canvas");
    cv.width = cv.height = 128;
    const g2 = cv.getContext("2d");
    if (g2) {
      g2.font = "96px serif";
      g2.textAlign = "center";
      g2.textBaseline = "middle";
      g2.fillText(e, 64, 70);
    }
    tex = new THREE.CanvasTexture(cv);
    emoteTextures.set(e, tex);
    return tex;
  }

  // ---------- cuaca ----------
  const rainGeo = new THREE.BufferGeometry();
  {
    const pts: number[] = [];
    for (let i = 0; i < (lowEnd ? 200 : 500); i++)
      pts.push((Math.random() - 0.5) * 60, Math.random() * 30, (Math.random() - 0.5) * 60);
    rainGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  }
  const rain = new THREE.Points(
    rainGeo,
    new THREE.PointsMaterial({ color: 0x9db8d9, size: 0.35, transparent: true, opacity: 0.7 })
  );
  rain.visible = false;
  scene.add(rain);
  const rainbowGroup = new THREE.Group();
  const rainbowCols = [0xff595e, 0xff924c, 0xffca3a, 0x8ac926, 0x1982c4, 0x6a4c93];
  rainbowCols.forEach((c, i) => {
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(30 + i * 1.4, 0.6, 8, 40, Math.PI),
      new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55 })
    );
    rainbowGroup.add(torus);
  });
  rainbowGroup.visible = false;
  scene.add(rainbowGroup);
  let weather: "Cerah" | "Hujan" | "Pelangi" = "Cerah";
  let weatherTimer = 25 + Math.random() * 30;
  let weatherDim = 1; // peredup cahaya saat hujan
  let snowing = false; // hujan sedang turun sebagai salju

  // ---------- bintang ----------
  const starGeo = new THREE.OctahedronGeometry(0.45);
  const starMat = new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x8a6000 });
  const stars: THREE.Mesh[] = [];
  let seed = 7, placedStars = 0;
  while (placedStars < 24) {
    seed++;
    const x = Math.floor((hash(seed, 11) - 0.5) * (WORLD - 12));
    const z = Math.floor((hash(seed, 23) - 0.5) * (WORLD - 12));
    const h = groundAt(x, z);
    if (h < WATER_LEVEL + 1) continue;
    const s = new THREE.Mesh(starGeo, starMat);
    s.position.set(x, h + 1.2, z);
    s.userData.baseY = h + 1.2;
    s.userData.phase = Math.random() * Math.PI * 2;
    stars.push(s); scene.add(s); placedStars++;
  }
  let collected = 0;
  hooks.onStars(0, stars.length);

  // ---------- partikel sihir ----------
  type P = { mesh: THREE.Mesh; vel: THREE.Vector3; life: number };
  const particles: P[] = [];
  const pGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
  function burst(pos: THREE.Vector3, color: number, n = 26) {
    for (let i = 0; i < n; i++) {
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(pGeo, mat);
      mesh.position.copy(pos);
      scene.add(mesh);
      particles.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 6, Math.random() * 7 + 2, (Math.random() - 0.5) * 6
        ),
        life: 1.2,
      });
    }
  }

  const rainbow = [0xff595e, 0xff924c, 0xffca3a, 0x8ac926, 0x1982c4, 0x6a4c93];
  function castSpell(spell: Spell) {
    sfx.magic();
    bump("spellsCast");
    const yaw = player.rotation.y;
    const p = player.position;
    const sc = perks.spellScale;
    if (spell === "kembang-api") {
      burst(new THREE.Vector3(p.x, p.y + 4, p.z), rainbow[Math.floor(Math.random() * 6)], Math.round(40 * sc));
    } else if (spell === "bunga") {
      // Tongkat Bunga memperlebar lingkaran & menambah jumlah bunga
      const bunga = sc * (1 + perks.bungaBonus);
      const n = Math.round(10 * bunga);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const x = Math.round(p.x + Math.cos(a) * 2 * bunga);
        const z = Math.round(p.z + Math.sin(a) * 2 * bunga);
        addBlock(x, Math.round(groundAt(x, z) + 0.5), z, rainbow[i % 6]);
      }
      burst(p.clone().setY(p.y + 1), 0xff8fd0, 20);
    } else if (spell === "jembatan") {
      // Tongkat Pelangi menambah panjang jembatan
      for (let i = 1; i <= Math.round(8 * sc) + perks.bridgeBonus; i++) {
        const x = Math.round(p.x + Math.sin(yaw) * i);
        const z = Math.round(p.z + Math.cos(yaw) * i);
        addBlock(x, Math.round(WATER_LEVEL + 1), z, rainbow[i % 6]);
      }
    } else if (spell === "pohon") {
      const bx = Math.round(p.x + Math.sin(yaw) * 3);
      const bz = Math.round(p.z + Math.cos(yaw) * 3);
      const by = Math.round(groundAt(bx, bz) + 0.5);
      for (let y = 0; y < 4; y++) addBlock(bx, by + y, bz, 0x7a4f2a);
      for (let dx = -2; dx <= 2; dx++)
        for (let dz = -2; dz <= 2; dz++)
          for (let dy = 0; dy <= 2; dy++)
            if (Math.abs(dx) + Math.abs(dz) + dy < 4)
              addBlock(bx + dx, by + 4 + dy, bz + dz, 0x3e9e3e);
      burst(new THREE.Vector3(bx, by + 5, bz), 0x8ac926, 20);
    }
  }

  // ---------- input ----------
  const keys: Record<string, boolean> = {};
  const kd = (e: KeyboardEvent) => { keys[e.code] = true; sfx.resume(); };
  const ku = (e: KeyboardEvent) => { keys[e.code] = false; };
  window.addEventListener("keydown", kd);
  window.addEventListener("keyup", ku);
  const touch = { x: 0, y: 0, jump: false };

  let vy = 0, yaw = 0, camYaw = 0, walk = 0, distAcc = 0;
  // keadaan animasi "juice" karakter — memberi rasa hidup
  let squash = 0;      // >0 = habis mendarat (memampat lalu memantul balik)
  let wasAirborne = false;
  let stepSign = 0;    // tanda ayunan kaki terakhir, untuk memicu bunyi langkah
  // sudut naik-turun kamera & zoom, dikendalikan mouse (anak main di laptop)
  let camPitch = 0.62;      // 0 = datar, ~1.4 = dari atas
  let camZoom = 1;          // pengali jarak kamera dari scroll
  // seret mouse untuk memutar pandangan, seperti Minecraft/Roblox
  let dragging = false, lastMx = 0, lastMy = 0;
  let crown: THREE.Mesh | null = null; // mahkota di kepala (Mahkota Kubantara)
  const onDown = (e: PointerEvent) => {
    // hanya area kanvas kosong; tombol HUD menangani kliknya sendiri
    if (e.button !== 0) return;
    dragging = true; lastMx = e.clientX; lastMy = e.clientY;
  };
  const onMove = (e: PointerEvent) => {
    // Saat pointer terkunci, mouse memutar kamera bebas tanpa perlu menahan
    // klik — gaya Minecraft/Roblox. Pakai movementX/Y, bukan posisi absolut.
    if (pointerLocked) {
      camYaw -= e.movementX * 0.004;
      camPitch = Math.max(0.05, Math.min(1.35, camPitch + e.movementY * 0.004));
      return;
    }
    if (!dragging) return;
    camYaw -= (e.clientX - lastMx) * 0.005;
    camPitch = Math.max(0.05, Math.min(1.35, camPitch + (e.clientY - lastMy) * 0.005));
    lastMx = e.clientX; lastMy = e.clientY;
  };
  const onUp = () => { dragging = false; };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    camZoom = Math.max(0.6, Math.min(2.2, camZoom + (e.deltaY > 0 ? 0.12 : -0.12)));
  };
  let pointerLocked = false;
  const onLockChange = () => { pointerLocked = document.pointerLockElement === canvas; };
  document.addEventListener("pointerlockchange", onLockChange);
  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  const clock = new THREE.Clock();
  let gameTime = 0;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // gerakkan hewan sederhana ke arah target
  function stepCritter(c: ReturnType<typeof buildCritter>, tx: number, tz: number, speed: number, dt: number, hop: number) {
    const dx = tx - c.g.position.x, dz = tz - c.g.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.05) {
      const nx = c.g.position.x + (dx / dist) * Math.min(speed * dt, dist);
      const nz = c.g.position.z + (dz / dist) * Math.min(speed * dt, dist);
      c.g.position.x = nx; c.g.position.z = nz;
      c.g.rotation.y = Math.atan2(dx, dz);
      const sw = Math.sin(hop) * 0.5;
      c.legs[0].rotation.x = sw; c.legs[3].rotation.x = sw;
      c.legs[1].rotation.x = -sw; c.legs[2].rotation.x = -sw;
    }
    c.g.position.y = groundAt(c.g.position.x, c.g.position.z);
    return dist;
  }

  let raf = 0;
  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    // Waktu game ditumpuk dari dt yang sudah dibatasi, bukan dari jam dinding.
    // Kalau tidak, di laptop lambat anak bergerak pelan tapi malam tetap
    // datang secepat biasanya — dunia terasa tidak adil.
    gameTime += dt;
    const t = gameTime;

    // ----- siklus siang-malam -----
    const phase = ((t / DAY_LEN) + DAY_START) % 1; // 0..1, mulai dari siang
    const ang = phase * Math.PI * 2 - Math.PI / 2;
    const sunY = Math.sin(ang), sunX = Math.cos(ang);
    sun.position.set(sunX * 60, sunY * 80, 30);
    sunBall.position.copy(player.position).add(new THREE.Vector3(sunX * 120, sunY * 140, 60));
    moon.position.set(-sunX * 60, -sunY * 80, 30);
    moonBall.position.copy(player.position).add(new THREE.Vector3(-sunX * 120, -sunY * 140, 60));
    const daylight = THREE.MathUtils.clamp(sunY * 1.4 + 0.35, 0, 1);
    sun.intensity = daylight * 2.2 * weatherDim;
    ambient.intensity = (0.3 + daylight * 0.7) * (0.6 + weatherDim * 0.4);
    moon.intensity = (1 - daylight) * 0.5;
    // lentera hanya menyala saat gelap, dan hanya jika keahliannya terbuka
    glow.intensity = perks.nightGlow ? (1 - daylight) * 2.4 : 0;
    glow.position.copy(player.position).add(new THREE.Vector3(0, 2, 0));
    const sky = skyNight.clone();
    if (daylight > 0.5) sky.lerpColors(skyDusk, skyDay, (daylight - 0.5) * 2);
    else sky.lerpColors(skyNight, skyDusk, daylight * 2);
    scene.background = sky;
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(sky);
    (starField.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - daylight * 2);
    starField.position.copy(player.position);
    sunBall.visible = sunY > -0.1;
    moonBall.visible = sunY < 0.1;
    const label = sunY < 0 ? "Malam" : phase < 0.3 ? "Pagi" : phase < 0.6 ? "Siang" : "Senja";
    if (label !== lastLabel) {
      // label pertama hanya menetapkan keadaan awal — bukan malam yang dilalui
      if (label === "Malam" && lastLabel !== "") bump("nights");
      lastLabel = label; hooks.onTime(label);
    }

    // ----- gerak pemain -----
    let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + touch.x;
    let iz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0) + touch.y;
    const len = Math.hypot(ix, iz);
    if (len > 1) { ix /= len; iz /= len; }
    const moving = len > 0.15;
    // Kaki Air: melaju lebih kencang saat berdiri di perairan dangkal
    const onWater = groundAt(player.position.x, player.position.z) <= WATER_LEVEL + 0.5;
    const waterBoost = perks.waterWalk && onWater ? 1.5 : 1;
    const speed = (riding ? 11 : 6) * perks.speedMul * waterBoost;

    if (moving) {
      const a = Math.atan2(ix, iz) + camYaw;
      yaw = a;
      const nx = player.position.x + Math.sin(a) * speed * dt;
      const nz = player.position.z + Math.cos(a) * speed * dt;
      const g = groundAt(nx, nz);
      const climb = riding ? 2.2 : 1.6;
      if (g - player.position.y < climb) {
        player.position.x = THREE.MathUtils.clamp(nx, -HALF + 2, HALF - 2);
        player.position.z = THREE.MathUtils.clamp(nz, -HALF + 2, HALF - 2);
      }
      walk += dt * (riding ? 14 : 10);
      distAcc += speed * dt;
      if (distAcc >= 25) { bump("distance", Math.floor(distAcc)); distAcc = 0; }
    } else walk *= 0.8;

    let d = yaw - player.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    player.rotation.y += d * Math.min(1, dt * 12);

    const g = groundAt(player.position.x, player.position.z);
    vy -= 22 * dt;
    const onGround = player.position.y <= g + 0.02;
    if ((keys.Space || touch.jump) && onGround) {
      vy = (riding ? 11 : 9) * perks.jumpMul; sfx.jump(); touch.jump = false; bump("jumps");
      squash = -0.5; // sedikit meregang saat melejit ke atas
    }
    player.position.y += vy * dt;
    if (player.position.y < g) { player.position.y = g; vy = 0; }
    // mendarat: picu memampat sebanding kecepatan jatuh
    if (onGround && wasAirborne) squash = Math.min(1, Math.abs(vy) * 0.05 + 0.55);
    wasAirborne = !onGround;
    squash *= Math.pow(0.001, dt); // pegas kembali ke normal dengan cepat

    // ayunan kaki & tangan saat berjalan
    const sw = Math.sin(walk) * 0.6 * Math.min(1, len);
    kid.legL.rotation.x = sw; kid.legR.rotation.x = -sw;
    kid.armL.rotation.x = -sw; kid.armR.rotation.x = sw;

    // bunyi langkah kaki: picu tiap ayunan kaki melewati titik tengah, hanya
    // saat benar-benar berjalan di tanah (bukan melompat / diam).
    if (moving && onGround && !riding) {
      const s = Math.sin(walk);
      const sign = s > 0.35 ? 1 : s < -0.35 ? -1 : 0;
      if (sign !== 0 && sign !== stepSign) { sfx.step(sign < 0); stepSign = sign; }
    } else stepSign = 0;

    // squash & stretch + napas halus saat diam — karakter terasa bernyawa.
    // Pivot grup di kaki (y=0), jadi menskala Y membuat kaki tetap menapak.
    const napas = moving ? 0 : Math.sin(t * 2.2) * 0.02;
    const sy = 1 - squash * 0.28 + napas;     // memampat = lebih pendek
    const sxz = 1 + squash * 0.18 - napas * 0.5; // sekaligus melebar
    player.scale.set(sxz, sy, sxz);
    // badan sedikit memantul mengikuti langkah
    kid.head.position.y = 1.55 + Math.abs(Math.sin(walk)) * 0.06 * Math.min(1, len);

    // tunggangan mengikuti posisi pemain saat dinaiki
    if (riding) {
      mount.g.position.set(player.position.x, groundAt(player.position.x, player.position.z), player.position.z);
      mount.g.rotation.y = player.rotation.y;
      player.position.y = mount.g.position.y + 1.2;
      const swm = Math.sin(walk) * 0.5 * Math.min(1, len);
      mount.legs[0].rotation.x = swm; mount.legs[3].rotation.x = swm;
      mount.legs[1].rotation.x = -swm; mount.legs[2].rotation.x = -swm;
    }

    // ----- hewan peliharaan -----
    stepCritter(pet, player.position.x - Math.sin(player.rotation.y) * 2, player.position.z - Math.cos(player.rotation.y) * 2, 5, dt, walk);
    // lonjakan senang setelah diberi makan
    if (petHop > 0) {
      petHop = Math.max(0, petHop - dt);
      pet.g.position.y += Math.abs(Math.sin(petHop * 12)) * 0.4;
    }

    // ----- satwa liar -----
    for (const w of wildlife) {
      if (w.tamed) {
        // satwa jinak berjalan mengikuti pemain, berhenti saat sudah dekat
        w.heart.rotation.y += dt * 2;
        w.heart.position.y = 1.1 + Math.sin(t * 3) * 0.08;
        const d = w.c.g.position.distanceTo(player.position);
        if (d > 2.5)
          stepCritter(w.c, player.position.x, player.position.z, 4.5, dt, t * 8);
        continue;
      }
      w.timer -= dt;
      if (w.timer <= 0) { w.dir = Math.random() * Math.PI * 2; w.timer = 2 + Math.random() * 3; }
      const tx = w.c.g.position.x + Math.sin(w.dir) * 3;
      const tz = w.c.g.position.z + Math.cos(w.dir) * 3;
      stepCritter(w.c, THREE.MathUtils.clamp(tx, -HALF + 3, HALF - 3), THREE.MathUtils.clamp(tz, -HALF + 3, HALF - 3), 2, dt, t * 6 + w.dir);
    }

    // ----- saudara sekeluarga: geser halus ke posisi terbaru dari server -----
    for (const e of friends.values()) {
      e.g.position.lerp(e.target, Math.min(1, dt * 4));
      e.g.rotation.y += dt * 0.6; // berputar pelan agar terlihat hidup
      if (e.bubble && e.bubble.visible) {
        if (t > e.bubbleUntil) e.bubble.visible = false;
        else e.bubble.position.y = 2.6 + Math.sin(t * 4) * 0.1;
      }
    }

    // ----- preview blok -----
    const cell = targetCell();
    ghost.position.set(cell.x, cell.y, cell.z);
    ghost.visible = !riding;
    (ghost.material as THREE.MeshBasicMaterial).color.setHex(placeColor);
    (ghost.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(t * 4) * 0.1;

    // ----- kamera -----
    // keyboard Q/E tetap ada untuk yang tanpa mouse; mouse mengatur yaw & pitch
    if (keys.KeyQ) camYaw += dt * 2;
    if (keys.KeyE) camYaw -= dt * 2;
    const camDist = ((riding ? 12 : 9) + perks.camExtra) * camZoom;
    // pitch menentukan seberapa tinggi kamera mengambang vs seberapa jauh mundur
    const horiz = Math.cos(camPitch) * camDist;
    const vert = Math.sin(camPitch) * camDist;
    const cx = player.position.x - Math.sin(camYaw) * horiz;
    const cz = player.position.z - Math.cos(camYaw) * horiz;
    camera.position.lerp(new THREE.Vector3(cx, player.position.y + 1.5 + vert, cz), 0.12);
    camera.lookAt(player.position.x, player.position.y + 1.5, player.position.z);

    // ----- bintang: berputar, mengambang naik-turun & berdenyut memikat -----
    for (const s of stars) {
      if (!s.visible) continue;
      s.rotation.y = t * 2;
      // mengambang lembut + denyut skala supaya "memanggil" untuk didekati
      s.position.y = s.userData.baseY + Math.sin(t * 2 + s.userData.phase) * 0.25;
      const pulse = 1 + Math.sin(t * 4 + s.userData.phase) * 0.12;
      s.scale.setScalar(pulse);
      if (s.position.distanceTo(player.position) < 1.8) {
        s.visible = false; collected++;
        sfx.star();
        // perayaan: ledakan emas besar + percik warna-warni
        burst(s.position.clone(), 0xffd23e, 34);
        burst(s.position.clone().add(new THREE.Vector3(0, 0.5, 0)), rainbow[collected % 6], 20);
        hooks.onStars(collected, stars.length);
        if (collected === stars.length) sfx.win();
      }
    }

    // ----- partikel -----
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.vel.y -= 12 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += dt * 6; p.mesh.rotation.y += dt * 6;
      (p.mesh.material as THREE.MeshBasicMaterial).transparent = true;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life);
      if (p.life <= 0) {
        scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        particles.splice(i, 1);
      }
    }

    // ----- NPC: penanda berputar & deteksi jarak -----
    npcCheck -= dt;
    for (const n of npcs) {
      n.marker.rotation.y = t * 2;
      n.marker.position.y = 2.2 + Math.sin(t * 3) * 0.12;
    }
    if (npcCheck <= 0) {
      npcCheck = 0.25;
      let nearest: (typeof npcs)[number] | null = null;
      for (const n of npcs)
        if (n.g.position.distanceTo(player.position) < 3) { nearest = n; break; }
      const name = nearest?.name ?? null;
      if (name !== activeNpc) {
        activeNpc = name;
        hooks.onNpc?.(nearest ? { name: nearest.name, line: nearest.line } : null);
        if (nearest && !nearest.met) { nearest.met = true; bump("npcMet"); }
      }
    }

    // ----- cuaca -----
    weatherTimer -= dt;
    if (weatherTimer <= 0) {
      if (weather === "Cerah") { weather = "Hujan"; weatherTimer = 14 + Math.random() * 10; }
      else if (weather === "Hujan") { weather = "Pelangi"; weatherTimer = 18; }
      else { weather = "Cerah"; weatherTimer = 40 + Math.random() * 50; }
      rain.visible = weather === "Hujan";
      rainbowGroup.visible = weather === "Pelangi";
      if (weather === "Pelangi") {
        rainbowGroup.position.set(player.position.x, WATER_LEVEL, player.position.z - 55);
      }
      hooks.onWeather?.(weather);
    }
    weatherDim += ((weather === "Hujan" ? 0.45 : 1) - weatherDim) * Math.min(1, dt * 2);
    if (rain.visible) {
      // di dataran tinggi bersalju, hujan turun sebagai salju
      const gx = Math.round(player.position.x) + HALF;
      const gz = Math.round(player.position.z) + HALF;
      const bersalju = (heights[gx]?.[gz] ?? 0) > 11;
      const rm = rain.material as THREE.PointsMaterial;
      if (bersalju !== snowing) {
        snowing = bersalju;
        rm.color.setHex(bersalju ? 0xffffff : 0x9db8d9);
        rm.size = bersalju ? 0.5 : 0.35;
        rm.opacity = bersalju ? 0.9 : 0.7;
        hooks.onWeather?.(bersalju ? "Salju" : weather);
      }
      rain.position.set(player.position.x, player.position.y, player.position.z);
      const pos = rainGeo.getAttribute("position") as THREE.BufferAttribute;
      // salju melayang turun jauh lebih pelan daripada hujan
      const fall = dt * (bersalju ? 6 : 24);
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - fall;
        if (y < 0) y = 30;
        pos.setY(i, y);
        if (bersalju) {
          // sedikit goyangan agar salju terlihat melayang, bukan jatuh lurus
          pos.setX(i, pos.getX(i) + Math.sin(t * 1.5 + i) * dt * 0.6);
        }
      }
      pos.needsUpdate = true;
    }

    // ----- air beriak + awan menghanyut -----
    water.position.set(player.position.x, WATER_LEVEL + 0.35, player.position.z);
    {
      const p = waterGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const bx = p.getX(i), bz = p.getZ(i);
        p.setY(i, waterBaseY[i] + Math.sin(t * 1.3 + bx * 0.25 + bz * 0.18) * 0.14);
      }
      p.needsUpdate = true;
      waterGeo.computeVertexNormals();
    }
    for (const c of cloudGroup.children) {
      c.position.x += (c.userData.speed as number) * dt;
      if (c.position.x > HALF + 20) c.position.x = -HALF - 20;
    }

    renderer.render(scene, camera);
  }
  let lastLabel = "";
  frame();

  return {
    touch,
    setColor(hex: number) { placeColor = hex; },
    setShape(s: Shape) { placeShape = s; },
    place() {
      if (riding) return;
      const c = targetCell();
      const before = placed.length;
      addBlock(c.x, c.y, c.z, placeColor, placeShape);
      if (placed.length === before) return; // sel sudah terisi
      outbox.push({ x: c.x, y: c.y, z: c.z, c: placeColor, s: placeShape });
      // percik kecil sewarna balok — memasang jadi terasa "nendang"
      burst(new THREE.Vector3(c.x, c.y + 0.3, c.z), placeColor, 8);
      sfx.place();
      bump("blocksPlaced");
    },
    removeBlock() {
      if (!placed.length) return;
      // cari blok pasang terdekat dari pemain
      let bi = -1, bd = 16;
      for (let i = 0; i < placed.length; i++) {
        const dx = placed[i].x - player.position.x;
        const dz = placed[i].z - player.position.z;
        const dy = placed[i].y - player.position.y;
        const dd = dx * dx + dy * dy + dz * dz;
        if (dd < bd) { bd = dd; bi = i; }
      }
      if (bi < 0) return;
      const pusat = placed[bi];
      // Palu Batu: runtuhkan semua blok dalam radius sekaligus. Tanpa gear,
      // radius 0 = hanya satu blok seperti biasa.
      const r = perks.removeRange;
      const buang = r > 0
        ? placed.filter((b) =>
            Math.abs(b.x - pusat.x) <= r && Math.abs(b.y - pusat.y) <= r && Math.abs(b.z - pusat.z) <= r)
        : [pusat];
      const kolom = new Set<string>();
      for (const rem of buang) {
        const idx = placed.indexOf(rem);
        if (idx < 0) continue;
        placed.splice(idx, 1);
        cellKeys.delete(cellKey(rem.x, rem.y, rem.z));
        kolom.add(`${rem.x},${rem.z}`);
      }
      // hitung ulang puncak tiap kolom yang tersentuh
      for (const key of kolom) {
        const [kx, kz] = key.split(",").map(Number);
        let top = -Infinity;
        for (const p of placed) if (p.x === kx && p.z === kz) top = Math.max(top, p.y);
        if (top === -Infinity) colTop.delete(key); else colTop.set(key, top);
      }
      rebuildPlaced();
      sfx.breakBlock();
      bump("blocksRemoved", buang.length);
    },
    cast(spell: Spell) { castSpell(spell); },
    toggleRide() {
      if (!riding) {
        // Peluit Emas: tunggangan datang sendiri ke sisi pemain dari mana pun
        if (perks.callMount && mount.g.position.distanceTo(player.position) > 4) {
          mount.g.position.set(player.position.x + 1.5, groundAt(player.position.x + 1.5, player.position.z), player.position.z);
        }
        // tanpa peluit, hanya bisa naik bila sudah dekat
        if (mount.g.position.distanceTo(player.position) > 4) return false;
      }
      riding = !riding;
      hooks.onRide(riding);
      sfx.mount();
      if (riding) bump("rides");
      if (!riding) {
        // turun di samping tunggangan
        player.position.x += 1.5;
        player.position.y = groundAt(player.position.x, player.position.z);
      }
      return riding;
    },
    getStats(): GameStats { return { ...stats } },
    getStars() { return collected; },
    exportBlocks(): SavedBlock[] {
      return placed.map((p) => ({ x: p.x, y: p.y, z: p.z, c: p.c, s: p.s }));
    },
    loadBlocks(blocks: SavedBlock[]) {
      for (const b of blocks) {
        if (placed.length >= MAX_PLACED) break;
        const s: Shape = b.s && b.s in shapeMeshes ? b.s : "kubus";
        const x = Math.round(b.x), y = Math.round(b.y), z = Math.round(b.z);
        if (cellKeys.has(cellKey(x, y, z))) continue;
        placed.push({ x, y, z, c: b.c, s });
        cellKeys.add(cellKey(x, y, z));
        colTop.set(`${x},${z}`, Math.max(colTop.get(`${x},${z}`) ?? -Infinity, y));
      }
      rebuildPlaced(); // sekali di akhir, jauh lebih cepat daripada per blok
    },
    // Ambil balok baru yang belum dikirim ke saudara, lalu kosongkan antrean.
    takeOutbox(): SavedBlock[] {
      const out = outbox;
      outbox = [];
      return out;
    },
    // Kembalikan balok ke antrean saat pengiriman gagal, supaya tidak hilang.
    requeueOutbox(blocks: SavedBlock[]) {
      if (blocks.length) outbox = [...blocks, ...outbox].slice(0, 200);
    },
    // Pasang balok kiriman saudara. Tidak menambah statistik pemain ini.
    applyRemoteBlocks(blocks: SavedBlock[]) {
      let n = 0;
      for (const b of blocks) {
        const before = placed.length;
        const s: Shape = b.s && b.s in shapeMeshes ? b.s : "kubus";
        addBlock(Math.round(b.x), Math.round(b.y), Math.round(b.z), b.c, s);
        if (placed.length > before) n++;
      }
      return n;
    },
    // Posisi pemain, dikirim ke server saat main bersama.
    getPosition() {
      return { x: player.position.x, y: player.position.y, z: player.position.z };
    },
    // Gambar ulang avatar saudara sekeluarga. Bergerak halus ke posisi terbaru.
    setFriends(list: { username: string; x: number; y: number; z: number; hero: string; emote?: string }[]) {
      const seen = new Set<string>();
      for (const f of list) {
        seen.add(f.username);
        let e = friends.get(f.username);
        if (!e) {
          const g = new THREE.Group();
          const col = HERO_COLORS[f.hero] ?? 0x3b7fd6;
          const mat = new THREE.MeshLambertMaterial({ color: col });
          const skin = new THREE.MeshLambertMaterial({ color: 0xf5c396 });
          const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.35), mat);
          body.position.y = 0.95; body.castShadow = true;
          const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), skin);
          head.position.y = 1.55; head.castShadow = true;
          // tanda di atas kepala supaya mudah dikenali dari jauh
          const tag = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.18),
            new THREE.MeshBasicMaterial({ color: 0x7ee6ff })
          );
          tag.position.y = 2.15;
          g.add(body, head, tag);
          g.position.set(f.x, f.y, f.z);
          scene.add(g);
          e = { g, target: new THREE.Vector3(f.x, f.y, f.z), bubble: null, bubbleUntil: 0 };
          friends.set(f.username, e);
        }
        e.target.set(f.x, f.y, f.z);
        // emote tampil 4 detik lalu hilang sendiri
        if (f.emote) {
          if (!e.bubble) {
            const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true }));
            sp.scale.setScalar(0.9);
            sp.position.y = 2.6;
            e.g.add(sp);
            e.bubble = sp;
          }
          (e.bubble.material as THREE.SpriteMaterial).map = emoteTexture(f.emote);
          (e.bubble.material as THREE.SpriteMaterial).needsUpdate = true;
          e.bubble.visible = true;
          // pakai waktu game yang sama dengan loop, bukan jam dinding
          e.bubbleUntil = gameTime + 4;
        }
      }
      // yang sudah tidak online dihapus dari layar
      for (const [name, e] of friends) {
        if (seen.has(name)) continue;
        scene.remove(e.g);
        friends.delete(name);
      }
    },
    // Pulihkan satwa jinak dari simpanan: jinakkan n ekor pertama.
    setTamedCount(n: number) {
      const want = Math.min(Math.max(0, Math.floor(n)), wildlife.length);
      for (let i = 0; i < want; i++) {
        wildlife[i].tamed = true;
        wildlife[i].heart.visible = true;
      }
      stats.tamed = Math.max(stats.tamed, want);
    },
    // Jinakkan satwa liar terdekat. Ramah: cukup mendekat lalu menekan tombol.
    tameNearest() {
      let best: (typeof wildlife)[number] | null = null;
      let bestD = 4; // harus benar-benar dekat
      for (const w of wildlife) {
        if (w.tamed) continue;
        const d = w.c.g.position.distanceTo(player.position);
        if (d < bestD) { bestD = d; best = w; }
      }
      if (!best) return false;
      best.tamed = true;
      best.heart.visible = true;
      bump("tamed");
      sfx.star();
      return true;
    },
    // Cetakan bangunan: satu tekan berdiri di depan pemain.
    buildBlueprint(kind: Blueprint) {
      const t = targetCell();
      const before = placed.length;
      const wood = 0x7a4f2a, leaf = 0x3e9e3e, stone = 0x9aa2ab;
      if (kind === "rumah") {
        for (let dx = -2; dx <= 2; dx++)
          for (let dz = -2; dz <= 2; dz++) {
            const edge = Math.abs(dx) === 2 || Math.abs(dz) === 2;
            if (!edge) continue;
            for (let dy = 0; dy < 3; dy++) {
              if (dx === -2 && dz === 0 && dy < 2) continue; // pintu
              addBlock(t.x + dx, t.y + dy, t.z + dz, wood);
            }
          }
        for (let dx = -2; dx <= 2; dx++)
          for (let dz = -2; dz <= 2; dz++) addBlock(t.x + dx, t.y + 3, t.z + dz, leaf);
      } else if (kind === "menara") {
        for (let dy = 0; dy < 10; dy++)
          for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]])
            addBlock(t.x + dx, t.y + dy, t.z + dz, stone);
        for (let dx = -1; dx <= 2; dx++)
          for (let dz = -1; dz <= 2; dz++) addBlock(t.x + dx, t.y + 10, t.z + dz, placeColor);
      } else if (kind === "tangga") {
        for (let s = 0; s < 8; s++)
          for (let w = 0; w < 2; w++)
            for (let dy = 0; dy <= s; dy++)
              addBlock(t.x + s, t.y + dy, t.z + w, placeColor);
      } else if (kind === "pagar") {
        for (let i = -4; i <= 4; i++) {
          addBlock(t.x + i, t.y, t.z - 4, wood);
          addBlock(t.x + i, t.y, t.z + 4, wood);
          addBlock(t.x - 4, t.y, t.z + i, wood);
          addBlock(t.x + 4, t.y, t.z + i, wood);
        }
      }
      const made = placed.length - before;
      if (made > 0) { bump("blocksPlaced", made); sfx.place(); }
      return made;
    },
    // Mouse look bebas: kunci pointer ke kanvas. Klik lagi / Esc melepasnya.
    toggleFreeLook() {
      if (document.pointerLockElement === canvas) { document.exitPointerLock(); return false; }
      canvas.requestPointerLock?.();
      return true;
    },
    isFreeLook() { return pointerLocked; },
    setPerks(next: Partial<Perks>) {
      Object.assign(perks, next);
      // Mahkota Kubantara muncul di kepala begitu perknya aktif
      if (perks.crown && !crown) {
        crown = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.34, 0.22, 6),
          new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x6a5000 })
        );
        crown.position.y = 1.95;
        crown.castShadow = true;
        player.add(crown);
      }
    },
    // ----- peliharaan: beri makan & kostum -----
    petCostumes() { return PET_COSTUMES.map((c) => ({ id: c.id, label: c.label })); },
    feedPet() {
      petHop = 1.1;
      burst(pet.g.position.clone().setY(pet.g.position.y + 1), 0xff6b9d, 14);
      sfx.feed();
    },
    setPetCostume(id: string) {
      const c = PET_COSTUMES.find((x) => x.id === id);
      if (!c) { petHat.visible = false; return; }
      (petHat.material as THREE.MeshLambertMaterial).color.setHex(c.color);
      petHat.visible = true;
    },
    // Tempat-tempat penting untuk teleport cepat. Kirim ke HUD agar anak
    // bisa melompat ke sudut pulau tanpa berjalan jauh.
    landmarks(): { id: string; label: string }[] {
      return [
        { id: "rumah", label: "🏡 Titik Awal" },
        { id: "desa", label: "🏘️ Desa" },
        { id: "hutan", label: "🌲 Hutan Lebat" },
        { id: "danau", label: "🏞️ Tepi Danau" },
        { id: "salju", label: "🏔️ Puncak Salju" },
      ];
    },
    teleport(id: string) {
      const spots: Record<string, [number, number]> = {
        rumah: [0, 0], desa: [4, -6], hutan: [-34, -34], danau: [0, 0], salju: [0, 0],
      };
      // danau & salju dicari dinamis: titik air terendah / dataran tertinggi
      if (id === "danau" || id === "salju") {
        let best: [number, number] = [0, 0];
        let bestH = id === "salju" ? -Infinity : Infinity;
        for (let gx = 4; gx < WORLD; gx += 6)
          for (let gz = 4; gz < WORLD; gz += 6) {
            const hh = heights[gx][gz];
            if (id === "salju" ? hh > bestH : hh <= bestH && hh > 0) {
              bestH = hh; best = [gx - HALF, gz - HALF];
            }
          }
        spots[id] = best;
      }
      const [tx, tz] = spots[id] ?? [0, 0];
      if (riding) { riding = false; hooks.onRide(false); }
      player.position.set(tx, groundAt(tx, tz), tz);
      vy = 0;
      burst(player.position.clone().setY(player.position.y + 1), 0x7ee6ff, 24);
      sfx.teleport();
    },
    setHero(shirtHex: number, pantsHex: number) {
      kid.shirt.color.setHex(shirtHex);
      kid.pants.color.setHex(pantsHex);
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel);
      document.removeEventListener("pointerlockchange", onLockChange);
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
      renderer.dispose();
    },
  };
}
