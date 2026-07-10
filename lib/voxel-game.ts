// Kubantara — mesin dunia voxel untuk eksplorasi anak.
// Tanpa musuh, tanpa game over: jalan, lompat, kumpulkan bintang.
import * as THREE from "three";

const WORLD = 96; // ukuran dunia (blok)
const HALF = WORLD / 2;
const WATER_LEVEL = 2.5;

// ---- noise sederhana (value noise 2 oktaf) ----
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
  const n =
    smooth(x / 24 + 100, z / 24 + 100) * 7 +
    smooth(x / 9 + 40, z / 9 + 40) * 2.5;
  return Math.floor(n);
}

export interface GameHooks {
  onStars: (collected: number, total: number) => void;
}

export function createGame(canvas: HTMLCanvasElement, hooks: GameHooks) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8ecfff);
  scene.fog = new THREE.Fog(0x8ecfff, 60, 150);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);

  // ---- cahaya ----
  const sun = new THREE.DirectionalLight(0xfff4d6, 2.2);
  sun.position.set(40, 70, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const cam = sun.shadow.camera as THREE.OrthographicCamera;
  cam.left = -70; cam.right = 70; cam.top = 70; cam.bottom = -70;
  scene.add(sun, new THREE.AmbientLight(0xbfd9ff, 0.9));

  // ---- dunia voxel via InstancedMesh per warna ----
  const box = new THREE.BoxGeometry(1, 1, 1);
  const heights: number[][] = [];
  type Layer = { color: number; cells: THREE.Matrix4[] };
  const layers: Record<string, Layer> = {
    grass: { color: 0x5fbf4a, cells: [] },
    dirt: { color: 0x8a5a33, cells: [] },
    sand: { color: 0xead89a, cells: [] },
    stone: { color: 0x9aa2ab, cells: [] },
    wood: { color: 0x7a4f2a, cells: [] },
    leaf: { color: 0x3e9e3e, cells: [] },
  };
  const m = new THREE.Matrix4();
  const put = (l: Layer, x: number, y: number, z: number) =>
    l.cells.push(m.clone().setPosition(x, y, z));

  for (let x = -HALF; x < HALF; x++) {
    heights[x + HALF] = [];
    for (let z = -HALF; z < HALF; z++) {
      const h = terrainHeight(x, z);
      heights[x + HALF][z + HALF] = h;
      const top = h <= WATER_LEVEL ? layers.sand : h > 9 ? layers.stone : layers.grass;
      put(top, x, h, z);
      put(layers.dirt, x, h - 1, z);
      // pohon di dataran hijau
      if (top === layers.grass && hash(x * 3.7, z * 3.7) > 0.985) {
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
  for (const key of Object.keys(layers)) {
    const l = layers[key];
    const mesh = new THREE.InstancedMesh(
      box,
      new THREE.MeshLambertMaterial({ color: l.color }),
      l.cells.length
    );
    l.cells.forEach((mat, i) => mesh.setMatrixAt(i, mat));
    mesh.castShadow = key === "wood" || key === "leaf";
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // air
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD, WORLD),
    new THREE.MeshLambertMaterial({ color: 0x3f8fd4, transparent: true, opacity: 0.75 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER_LEVEL + 0.4;
  scene.add(water);

  // awan kotak
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  const clouds: THREE.Mesh[] = [];
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Mesh(
      new THREE.BoxGeometry(4 + hash(i, 1) * 6, 1, 3 + hash(i, 2) * 4),
      cloudMat
    );
    c.position.set((hash(i, 3) - 0.5) * WORLD, 24 + hash(i, 4) * 6, (hash(i, 5) - 0.5) * WORLD);
    clouds.push(c);
    scene.add(c);
  }

  const groundAt = (x: number, z: number) => {
    const gx = Math.round(x) + HALF, gz = Math.round(z) + HALF;
    if (gx < 0 || gz < 0 || gx >= WORLD || gz >= WORLD) return 20;
    return heights[gx][gz] + 0.5;
  };

  // ---- karakter kotak ----
  const player = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xf5c396 });
  const shirt = new THREE.MeshLambertMaterial({ color: 0xe2554d });
  const pants = new THREE.MeshLambertMaterial({ color: 0x3b5bd6 });
  const mk = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    p.position.set(x, y, z);
    p.castShadow = true;
    return p;
  };
  const head = mk(0.55, 0.55, 0.55, skin, 0, 1.55, 0);
  const body = mk(0.6, 0.7, 0.35, shirt, 0, 0.95, 0);
  const armL = mk(0.2, 0.6, 0.2, shirt, -0.42, 0.95, 0);
  const armR = mk(0.2, 0.6, 0.2, shirt, 0.42, 0.95, 0);
  const legL = mk(0.24, 0.6, 0.24, pants, -0.16, 0.3, 0);
  const legR = mk(0.24, 0.6, 0.24, pants, 0.16, 0.3, 0);
  // mata
  head.add(mk(0.08, 0.08, 0.02, new THREE.MeshBasicMaterial({ color: 0x222 }), -0.12, 0.05, 0.29));
  head.add(mk(0.08, 0.08, 0.02, new THREE.MeshBasicMaterial({ color: 0x222 }), 0.12, 0.05, 0.29));
  player.add(head, body, armL, armR, legL, legR);
  player.position.set(0, groundAt(0, 0), 0);
  scene.add(player);

  // ---- bintang koleksi ----
  const starGeo = new THREE.OctahedronGeometry(0.45);
  const starMat = new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x996f00 });
  const stars: THREE.Mesh[] = [];
  let placed = 0;
  let seed = 7;
  while (placed < 20) {
    seed++;
    const x = Math.floor((hash(seed, 11) - 0.5) * (WORLD - 10));
    const z = Math.floor((hash(seed, 23) - 0.5) * (WORLD - 10));
    const h = groundAt(x, z);
    if (h < WATER_LEVEL + 1) continue;
    const s = new THREE.Mesh(starGeo, starMat);
    s.position.set(x, h + 1.2, z);
    stars.push(s);
    scene.add(s);
    placed++;
  }
  let collected = 0;
  hooks.onStars(0, stars.length);

  // ---- input ----
  const keys: Record<string, boolean> = {};
  const kd = (e: KeyboardEvent) => { keys[e.code] = true; };
  const ku = (e: KeyboardEvent) => { keys[e.code] = false; };
  window.addEventListener("keydown", kd);
  window.addEventListener("keyup", ku);
  // joystick sentuh diisi dari luar
  const touch = { x: 0, y: 0, jump: false };

  let vy = 0;
  let yaw = 0;
  let camYaw = 0;
  let walk = 0;
  const clock = new THREE.Clock();

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  let raf = 0;
  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // arah gerak
    let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + touch.x;
    let iz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0) + touch.y;
    const len = Math.hypot(ix, iz);
    if (len > 1) { ix /= len; iz /= len; }
    const moving = len > 0.15;

    if (moving) {
      const ang = Math.atan2(ix, iz) + camYaw;
      yaw = ang;
      const speed = 6;
      const nx = player.position.x + Math.sin(ang) * speed * dt;
      const nz = player.position.z + Math.cos(ang) * speed * dt;
      const g = groundAt(nx, nz);
      // tidak bisa memanjat tebing lebih dari 1.6 blok sekaligus
      if (g - player.position.y < 1.6) {
        player.position.x = THREE.MathUtils.clamp(nx, -HALF + 2, HALF - 2);
        player.position.z = THREE.MathUtils.clamp(nz, -HALF + 2, HALF - 2);
      }
      walk += dt * 10;
    } else walk *= 0.8;

    // rotasi halus
    let d = yaw - player.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    player.rotation.y += d * Math.min(1, dt * 12);

    // gravitasi & lompat
    const g = groundAt(player.position.x, player.position.z);
    vy -= 22 * dt;
    if ((keys.Space || touch.jump) && player.position.y <= g + 0.01) vy = 9;
    player.position.y += vy * dt;
    if (player.position.y < g) { player.position.y = g; vy = 0; }

    // animasi jalan
    const sw = Math.sin(walk) * 0.6 * Math.min(1, len);
    legL.rotation.x = sw; legR.rotation.x = -sw;
    armL.rotation.x = -sw; armR.rotation.x = sw;

    // kamera orang ketiga
    if (keys.KeyQ) camYaw += dt * 2;
    if (keys.KeyE) camYaw -= dt * 2;
    const cx = player.position.x - Math.sin(camYaw) * 9;
    const cz = player.position.z - Math.cos(camYaw) * 9;
    camera.position.lerp(new THREE.Vector3(cx, player.position.y + 6, cz), 0.08);
    camera.lookAt(player.position.x, player.position.y + 1.5, player.position.z);

    // bintang
    for (const s of stars) {
      if (!s.visible) continue;
      s.rotation.y = t * 2;
      s.position.y += Math.sin(t * 3 + s.position.x) * 0.003;
      if (s.position.distanceTo(player.position) < 1.6) {
        s.visible = false;
        collected++;
        hooks.onStars(collected, stars.length);
      }
    }

    // awan bergerak pelan
    for (const c of clouds) {
      c.position.x += dt * 0.6;
      if (c.position.x > HALF + 10) c.position.x = -HALF - 10;
    }

    renderer.render(scene, camera);
  }
  frame();

  return {
    touch,
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("resize", resize);
      renderer.dispose();
    },
  };
}
