// ============================================================
//  REAL TEACH — scroll-driven 4D inverter (3D + time)
//  Edit CONTACT below with the shop's real number.
// ============================================================
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const CONTACT = {
  // International format, digits only, no "+" or spaces. Example: "923001234567"
  phoneIntl: '',
  defaultMsg: "Assalam o Alaikum, I'd like to ask about an inverter (buy / sell / repair).",
};

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * t * (t * (t * 6 - 15) + 10);

/* ---------- contact links ---------- */
function wireContact() {
  const ok = /^\d{10,15}$/.test(CONTACT.phoneIntl);
  $$('[data-contact]').forEach(a => {
    const kind = a.dataset.contact;
    if (!ok) return; // keep "#visit" until a number is set
    if (kind === 'call') a.href = 'tel:+' + CONTACT.phoneIntl;
    if (kind === 'wa') {
      a.href = 'https://wa.me/' + CONTACT.phoneIntl + '?text=' + encodeURIComponent(a.dataset.msg || CONTACT.defaultMsg);
      a.target = '_blank'; a.rel = 'noopener';
    }
  });
}
wireContact();

/* ---------- reveal on scroll ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
$$('[data-reveal]').forEach(el => io.observe(el));

/* card spotlight */
$$('.card').forEach(c => c.addEventListener('pointermove', e => {
  const r = c.getBoundingClientRect();
  c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  c.style.setProperty('--my', (e.clientY - r.top) + 'px');
}));

/* meter animates when visible */
const meter = $('.meter');
if (meter) new IntersectionObserver((es, ob) => es.forEach(e => {
  if (!e.isIntersecting) return;
  $('#m1').style.setProperty('--w', '96%');
  $('#m2').style.setProperty('--w', '62%');
  let n = 0; const v = $('#m2v');
  const t = setInterval(() => { n += 2; v.textContent = Math.min(62, n) + '%'; if (n >= 62) clearInterval(t); }, 22);
  ob.disconnect();
}), { threshold: .5 }).observe(meter);

/* ---------- film UI state ---------- */
const track = $('#film');
const nav = $('#nav');
const caps = $$('.cap');
const hudName = $('#hudName'), hudPct = $('#hudPct'), railFill = $('#railFill'), cue = $('#cue'), rail = $('#rail');
const CHAPTERS = [
  [0.00, 'Arrive'], [0.14, 'Sell'], [0.29, 'Buy'], [0.43, 'Inside'],
  [0.57, 'Diagnose'], [0.71, 'Repair'], [0.87, 'Online'],
];
CHAPTERS.slice(1).forEach(([p]) => { const s = document.createElement('span'); s.style.left = (p * 100) + '%'; rail.appendChild(s); });

function filmProgress() {
  const r = track.getBoundingClientRect();
  const total = r.height - window.innerHeight;
  return clamp(-r.top / total);
}

function updateCaptions(p) {
  caps.forEach(c => {
    const i = parseFloat(c.dataset.in), h = parseFloat(c.dataset.hold), o = parseFloat(c.dataset.out);
    const fadeIn = 0.035, fadeOut = 0.035;
    let a = 0;
    if (p >= i && p < i + fadeIn) a = (p - i) / fadeIn;
    else if (p >= i + fadeIn && p < i + fadeIn + h) a = 1;
    else if (p >= i + fadeIn + h && p < o) a = 1 - (p - (i + fadeIn + h)) / Math.max(0.001, o - (i + fadeIn + h));
    // hero caption visible at p=0
    if (c.classList.contains('hero') && p <= i + fadeIn + h) a = 1;
    if (c.classList.contains('fin') && p >= o) a = 1;
    if (c.classList.contains('fin') && p >= i + fadeIn) a = 1;
    a = clamp(a);
    c.style.opacity = a;
    const dy = (1 - a) * 22;
    if (c.classList.contains('hero')) c.style.transform = `translate(-50%, ${dy}px)`;
    else if (c.classList.contains('fin')) c.style.transform = `translate(-50%, ${dy}px)`;
    else if (window.innerWidth <= 820) c.style.transform = `translateY(${dy}px)`;
    else c.style.transform = `translateY(calc(-50% + ${dy}px))`;
    c.style.pointerEvents = (c.classList.contains('fin') && a > .6) ? 'auto' : 'none';
  });
  let name = CHAPTERS[0][1];
  for (const [at, n] of CHAPTERS) if (p >= at) name = n;
  if (hudName.textContent !== name) hudName.textContent = name;
  hudPct.textContent = String(Math.round(p * 100)).padStart(2, '0') + '%';
  railFill.style.width = (p * 100) + '%';
  cue.style.opacity = p < 0.03 ? 1 : 0;
}

function updateNav() {
  const r = track.getBoundingClientRect();
  const past = r.bottom <= window.innerHeight * 1.05;
  nav.classList.toggle('after', past);
  nav.classList.toggle('solid', window.scrollY > 40);
}

/* ============================================================
   3D SCENE
   ============================================================ */
function boot() {
  const canvas = $('#gl');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
    fallback();
    return;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);

  /* ----- lights ----- */
  scene.add(new THREE.HemisphereLight(0x8aa4ff, 0x1a1208, 0.35));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.2); key.position.set(3, 4, 5); scene.add(key);
  const rimC = new THREE.PointLight(0x35e0ff, 28, 14, 1.6); rimC.position.set(-3.4, 1.4, -2.2); scene.add(rimC);
  const rimA = new THREE.PointLight(0xffb400, 22, 14, 1.6); rimA.position.set(3.6, -0.8, -2.0); scene.add(rimA);
  const core = new THREE.PointLight(0xffb400, 0, 6, 1.7); core.position.set(0, 0, -0.9); scene.add(core);

  /* ----- helpers ----- */
  function roundedBox(w, h, d, r, bevel = 0.025) {
    const W = w - bevel * 2, H = h - bevel * 2, x = -W / 2, y = -H / 2, rr = Math.max(0.001, r - bevel);
    const s = new THREE.Shape();
    s.moveTo(x + rr, y); s.lineTo(x + W - rr, y); s.quadraticCurveTo(x + W, y, x + W, y + rr);
    s.lineTo(x + W, y + H - rr); s.quadraticCurveTo(x + W, y + H, x + W - rr, y + H);
    s.lineTo(x + rr, y + H); s.quadraticCurveTo(x, y + H, x, y + H - rr);
    s.lineTo(x, y + rr); s.quadraticCurveTo(x, y, x + rr, y);
    const dd = Math.max(0.001, d - bevel * 2);
    const g = new THREE.ExtrudeGeometry(s, { depth: dd, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 10 });
    g.translate(0, 0, -dd / 2);
    return g;
  }
  const mesh = (g, m) => new THREE.Mesh(g, m);
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (r, h, seg = 24) => { const g = new THREE.CylinderGeometry(r, r, h, seg); g.rotateX(Math.PI / 2); return g; }; // axis = z

  /* ----- materials ----- */
  const M = {
    shell: new THREE.MeshStandardMaterial({ color: 0x15181d, metalness: .85, roughness: .4, envMapIntensity: .9 }),
    front: new THREE.MeshStandardMaterial({ color: 0x1f242c, metalness: .8, roughness: .28, envMapIntensity: 1.1 }),
    fin: new THREE.MeshStandardMaterial({ color: 0x2a2f38, metalness: 1, roughness: .32, envMapIntensity: 1 }),
    black: new THREE.MeshStandardMaterial({ color: 0x08090b, metalness: .3, roughness: .6 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xa8b0ba, metalness: 1, roughness: .28, envMapIntensity: 1.2 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xc96a2c, metalness: 1, roughness: .32, envMapIntensity: 1.2 }),
    pcb: new THREE.MeshStandardMaterial({ color: 0x0b3b2d, metalness: .2, roughness: .65 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xffb400, metalness: .6, roughness: .3, emissive: 0xffb400, emissiveIntensity: .25 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc9332a, metalness: .5, roughness: .4 }),
    redT: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: .5, roughness: .4 }),
  };

  /* ----- procedural textures ----- */
  function circleTex(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, inner); g.addColorStop(.4, inner.replace(/[\d.]+\)$/, '.35)')); g.addColorStop(1, outer);
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function pcbTex() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 704;
    const x = c.getContext('2d'); x.fillStyle = '#0b3b2d'; x.fillRect(0, 0, 512, 704);
    x.strokeStyle = 'rgba(120,230,170,.28)'; x.lineWidth = 2; x.lineCap = 'round';
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 90; i++) {
      let px = Math.floor(rnd() * 32) * 16, py = Math.floor(rnd() * 44) * 16;
      x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 4; k++) { if (rnd() > .5) px += (rnd() > .5 ? 1 : -1) * 16 * (1 + Math.floor(rnd() * 5)); else py += (rnd() > .5 ? 1 : -1) * 16 * (1 + Math.floor(rnd() * 5)); x.lineTo(px, py); }
      x.stroke(); x.fillStyle = 'rgba(210,230,200,.55)'; x.beginPath(); x.arc(px, py, 3.5, 0, 7); x.fill();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  function labelTex() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96;
    const x = c.getContext('2d'); x.clearRect(0, 0, 512, 96);
    x.fillStyle = '#ffb400'; x.font = '800 40px Inter Tight, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('REAL TECH', 256, 38);
    x.fillStyle = '#7b828d'; x.font = '500 17px JetBrains Mono, monospace';
    x.fillText('PURE SINE WAVE INVERTER', 256, 76);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }

  /* ----- display (live canvas) ----- */
  const dc = document.createElement('canvas'); dc.width = 512; dc.height = 256;
  const dx = dc.getContext('2d');
  const dispTex = new THREE.CanvasTexture(dc); dispTex.colorSpace = THREE.SRGBColorSpace;
  let lastKey = '';
  function drawDisplay(st) {
    const col = st.color;
    dx.fillStyle = '#031016'; dx.fillRect(0, 0, 512, 256);
    const g = dx.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(53,224,255,.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    dx.fillStyle = g; dx.fillRect(0, 0, 512, 256);
    dx.fillStyle = col; dx.shadowColor = col; dx.shadowBlur = 18;
    dx.font = '800 78px JetBrains Mono, monospace'; dx.textAlign = 'left'; dx.textBaseline = 'alphabetic';
    dx.fillText(st.big, 28, 108);
    dx.font = '500 30px JetBrains Mono, monospace'; dx.fillText(st.unit, 28 + st.big.length * 47 + 6, 108);
    dx.shadowBlur = 0;
    dx.fillStyle = '#7fa3ab'; dx.font = '500 22px JetBrains Mono, monospace';
    dx.fillText('LOAD', 28, 160);
    dx.strokeStyle = '#1b3a42'; dx.lineWidth = 2; dx.strokeRect(100, 142, 380, 22);
    dx.fillStyle = col; dx.fillRect(103, 145, Math.max(0, 374 * st.load), 16);
    dx.fillStyle = col; dx.font = '700 32px JetBrains Mono, monospace';
    dx.fillText(st.status, 28, 226);
    dx.fillStyle = '#7fa3ab'; dx.font = '500 20px JetBrains Mono, monospace'; dx.textAlign = 'right';
    dx.fillText('BATT ' + st.batt, 484, 226);
    dispTex.needsUpdate = true;
  }

  /* ============ BUILD INVERTER ============ */
  const rig = new THREE.Group(); scene.add(rig);

  // back plate
  const back = new THREE.Group();
  back.add(mesh(roundedBox(1.7, 2.3, 0.05, 0.12, 0.01), M.shell));
  back.position.z = -0.335; rig.add(back);

  // side frame + cooling fins
  const frame = new THREE.Group();
  const wallL = mesh(box(0.06, 2.3, 0.62), M.shell); wallL.position.x = -0.82;
  const wallR = mesh(box(0.06, 2.3, 0.62), M.shell); wallR.position.x = 0.82;
  const wallT = mesh(box(1.7, 0.06, 0.62), M.shell); wallT.position.y = 1.12;
  const wallB = mesh(box(1.7, 0.06, 0.62), M.shell); wallB.position.y = -1.12;
  frame.add(wallL, wallR, wallT, wallB);
  for (let i = 0; i < 12; i++) {
    const z = -0.26 + i * 0.048;
    for (const s of [-1, 1]) {
      const f = mesh(box(0.13, 1.95, 0.02), M.fin); f.position.set(s * 0.915, 0, z); frame.add(f);
    }
  }
  frame.position.z = -0.025; rig.add(frame);

  // PCB (stays as base) + traces
  const pcbG = new THREE.Group();
  pcbG.add(mesh(box(1.54, 2.14, 0.03), M.pcb));
  const traces = mesh(new THREE.PlaneGeometry(1.54, 2.14), new THREE.MeshStandardMaterial({ map: pcbTex(), roughness: .7, metalness: .1 }));
  traces.position.z = 0.0155; pcbG.add(traces);
  for (let i = 0; i < 7; i++) { // little black ICs
    const ic = mesh(box(0.16 + (i % 3) * .04, 0.1, 0.035), M.black); ic.position.set(-0.55 + (i % 4) * 0.34, 0.05 - Math.floor(i / 4) * 0.42, 0.034); pcbG.add(ic);
  }
  pcbG.position.z = -0.22; rig.add(pcbG);

  // capacitors (group floats a bit when exploded)
  const capsG = new THREE.Group();
  const capPos = [[-0.1, 0.78], [0.12, 0.78], [-0.1, 0.5], [0.12, 0.5], [0.34, 0.78], [-0.55, 0.15], [-0.3, 0.15]];
  capPos.forEach(([x, y]) => {
    const cp = mesh(cyl(0.085, 0.2), M.alu); cp.position.set(x, y, 0.1);
    const top = mesh(cyl(0.07, 0.01), M.black); top.position.set(x, y, 0.205);
    capsG.add(cp, top);
  });
  capsG.position.z = -0.22; rig.add(capsG);

  // faulty capacitor
  const faultG = new THREE.Group();
  const faultMat = new THREE.MeshStandardMaterial({ color: 0x5b2a10, metalness: .5, roughness: .45, emissive: 0xff3a2d, emissiveIntensity: 0 });
  const faultCap = mesh(cyl(0.11, 0.3), faultMat); faultCap.position.set(0, 0, 0.15);
  const faultTop = mesh(cyl(0.085, 0.012), M.black); faultTop.position.set(0, 0, 0.305);
  const faultRing = mesh(new THREE.TorusGeometry(0.22, 0.008, 10, 64), new THREE.MeshBasicMaterial({ color: 0xff4a3d, transparent: true, opacity: 0 }));
  faultRing.position.z = 0.15;
  faultG.add(faultCap, faultTop, faultRing);
  faultG.position.set(-0.46, 0.62, -0.22); rig.add(faultG);

  // transformer
  const trafoG = new THREE.Group();
  const trafo = mesh(new THREE.TorusGeometry(0.34, 0.15, 28, 56), M.copper);
  const base = mesh(cyl(0.5, 0.04, 40), M.black); base.position.z = -0.1;
  trafoG.add(trafo, base);
  trafoG.position.set(-0.36, -0.5, -0.1); rig.add(trafoG);

  // heatsink
  const heatG = new THREE.Group();
  heatG.add(mesh(box(0.7, 0.5, 0.04), M.alu));
  for (let i = 0; i < 10; i++) { const f = mesh(box(0.02, 0.5, 0.2), M.alu); f.position.set(-0.3 + i * 0.066, 0, 0.12); heatG.add(f); }
  heatG.position.set(0.42, 0.28, -0.14); rig.add(heatG);

  // fan
  const fanG = new THREE.Group();
  fanG.add(mesh(box(0.7, 0.7, 0.08), M.black));
  const blades = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const b = mesh(box(0.25, 0.08, 0.012), M.alu); b.position.x = 0.15; b.rotation.z = .35;
    const holder = new THREE.Group(); holder.rotation.z = (i / 7) * Math.PI * 2; holder.add(b); blades.add(holder);
  }
  const hub = mesh(cyl(0.07, 0.07, 20), M.alu); blades.add(hub);
  blades.position.z = 0.06; fanG.add(blades);
  fanG.position.set(0.42, -0.62, -0.14); rig.add(fanG);

  // front panel
  const front = new THREE.Group();
  front.add(mesh(roundedBox(1.7, 2.3, 0.12, 0.14, 0.02), M.front));
  const bezel = mesh(box(1.22, 0.64, 0.03), M.black); bezel.position.set(0, 0.62, 0.07); front.add(bezel);
  const dispMat = new THREE.MeshBasicMaterial({ map: dispTex, toneMapped: false });
  const disp = mesh(new THREE.PlaneGeometry(1.12, 0.56), dispMat); disp.position.set(0, 0.62, 0.0865); front.add(disp);
  const ledMats = ['#46e08a', '#ffb400', '#ff4a3d'].map(c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
  const leds = ledMats.map((m, i) => { const l = mesh(new THREE.SphereGeometry(0.032, 16, 16), m); l.position.set(-0.5 + i * 0.13, 0.18, 0.07); front.add(l); return l; });
  const pw = mesh(cyl(0.085, 0.04, 32), M.amber); pw.position.set(0.52, 0.17, 0.075); front.add(pw);
  const pwHole = mesh(cyl(0.05, 0.045, 32), M.black); pwHole.position.set(0.52, 0.17, 0.077); front.add(pwHole);
  for (let i = 0; i < 9; i++) { const v = mesh(box(1.1, 0.02, 0.02), M.black); v.position.set(0, -0.12 - i * 0.065, 0.062); front.add(v); }
  const lbl = mesh(new THREE.PlaneGeometry(1.0, 0.19), new THREE.MeshBasicMaterial({ map: labelTex(), transparent: true, toneMapped: false })); lbl.position.set(0, -0.9, 0.0615); front.add(lbl);
  [[-0.6, M.red], [0.6, M.redT]].forEach(([x, m]) => { const t = mesh(cyl(0.055, 0.09, 24), m); t.position.set(x, -1.03, 0.07); front.add(t); });
  front.position.z = 0.35; rig.add(front);

  // scan plane
  const scanG = new THREE.Group();
  const scanMat = new THREE.MeshBasicMaterial({ color: 0x35e0ff, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
  const sp = mesh(new THREE.PlaneGeometry(2.5, 1.7), scanMat); sp.rotation.x = -Math.PI / 2;
  const sl = mesh(box(2.5, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: 0x9aefff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  sl.position.z = 0.85; const sl2 = sl.clone(); sl2.position.z = -0.85;
  scanG.add(sp, sl, sl2); rig.add(scanG);

  // floor glow
  const floorMat = new THREE.MeshBasicMaterial({ map: circleTex('rgba(255,180,0,.55)'), transparent: true, opacity: .25, depthWrite: false, blending: THREE.AdditiveBlending });
  const floor = mesh(new THREE.PlaneGeometry(9, 9), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.55; scene.add(floor);
  const grid = new THREE.GridHelper(14, 28, 0x1d2430, 0x11151c); grid.position.y = -1.56; grid.material.transparent = true; grid.material.opacity = .55; scene.add(grid);

  // power rings
  const rings = [0, 1, 2].map(() => {
    const r = mesh(new THREE.TorusGeometry(1, 0.0045, 8, 160), new THREE.MeshBasicMaterial({ color: 0x35e0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    r.position.z = 0.1; rig.add(r); return r;
  });

  // particles
  const NP = 650; const ppos = new Float32Array(NP * 3), pcol = new Float32Array(NP * 3), pspd = new Float32Array(NP);
  for (let i = 0; i < NP; i++) {
    ppos[i * 3] = (Math.random() - .5) * 11; ppos[i * 3 + 1] = (Math.random() - .5) * 7; ppos[i * 3 + 2] = (Math.random() - .5) * 8;
    pspd[i] = .12 + Math.random() * .4;
    const c = new THREE.Color(Math.random() > .35 ? 0xffb400 : 0x35e0ff); pcol.set([c.r, c.g, c.b], i * 3);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(ppos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(pcol, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: .06, map: circleTex(), vertexColors: true, transparent: true, opacity: .75, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  scene.add(pts);

  /* ----- explode config ----- */
  const parts = [
    { g: front, dz: 2.0, dx: 0, dy: 0 },
    { g: fanG, dz: 1.45, dx: 0.5, dy: -0.15 },
    { g: trafoG, dz: 1.1, dx: -0.55, dy: -0.15 },
    { g: heatG, dz: 0.85, dx: 0.55, dy: 0.2 },
    { g: faultG, dz: 0.95, dx: -0.1, dy: 0.2 },
    { g: capsG, dz: 0.5, dx: 0, dy: 0.0 },
    { g: pcbG, dz: 0, dx: 0, dy: 0 },
    { g: frame, dz: -0.3, dx: 0, dy: 0 },
    { g: back, dz: -0.9, dx: 0, dy: 0 },
  ];
  parts.forEach(p => p.base = p.g.position.clone());

  /* ----- keyframes ----- */
  // ry/rx: model rotation · ex: explode · sc/sy: scan opacity/height · fo: focus on fault · zm: zoom · fx: fixed 0..1 · pw: power 0..1
  const D = { look: [0, 0, 0], ry: 0, rx: 0.04, ex: 0, sc: 0, sy: 1.3, fo: 0, zm: 1, fx: 0, pw: 0, ly: 0, fa: 0 };
  const KF = [
    { p: 0.00, pos: [0, 0.2, 9.0], ry: -1.2, pw: .15, ly: -1.25 },
    { p: 0.10, pos: [0.1, 0.25, 6.6], ry: 0.3, pw: .25, ly: -0.1 },
    { p: 0.20, pos: [-1.5, 0.3, 6.2], ry: 1.1, rx: .03, pw: .3, ly: 0 },
    { p: 0.30, pos: [1.5, 0.35, 6.2], ry: -0.95, pw: .3 },
    { p: 0.40, pos: [0, 0.3, 6.2], ry: 0.0, pw: .3 },
    { p: 0.46, pos: [0.3, 0.45, 7.2], ry: 0.4, ex: 0, pw: .2 },
    { p: 0.54, pos: [-0.9, 0.55, 8.6], ry: 0.62, ex: 1, pw: .1, fa: 0 },
    { p: 0.60, pos: [0.6, 0.5, 7.4], ry: 0.72, ex: 1, sc: 0, sy: 1.3, pw: 0, fa: 0 },
    { p: 0.62, pos: [0.6, 0.5, 7.4], ry: 0.72, ex: 1, sc: 1, sy: 1.3, pw: 0, fa: .6 },
    { p: 0.68, pos: [-0.9, 0.9, 6.4], ry: 0.5, ex: 1, sc: 1, sy: -1.3, fo: .55, zm: .85, pw: 0, fa: 1 },
    { p: 0.69, pos: [-0.9, 0.9, 6.4], ry: 0.4, ex: .95, sc: 0, sy: -1.3, fo: .8, zm: .55, pw: 0, fa: 1 },
    { p: 0.73, pos: [-0.9, 0.9, 6.4], ry: 0.3, ex: .9, fo: .85, zm: .5, fx: 0, pw: 0, fa: 1 },
    { p: 0.77, pos: [-0.9, 0.7, 6.6], ry: 0.4, ex: .85, fo: .6, zm: .6, fx: 1, pw: .1, fa: 1 },
    { p: 0.82, pos: [1.4, 0.4, 8.2], ry: 0.8, ex: .5, fo: 0, zm: 1, fx: 1, pw: .35, fa: .5 },
    { p: 0.87, pos: [0.0, 0.3, 7.0], ry: 0.25, ex: 0, fx: 1, pw: .8, fa: 0, ly: 0 },
    { p: 0.93, pos: [0, 0.35, 7.0], ry: 0, ex: 0, fx: 1, pw: 1, ly: -0.9 },
    { p: 1.00, pos: [0, 0.35, 8.6], ry: -0.15, ex: 0, fx: 1, pw: 1, ly: -0.85 },
  ];
  function sample(p) {
    let a = KF[0], b = KF[KF.length - 1];
    for (let i = 0; i < KF.length - 1; i++) if (p >= KF[i].p && p <= KF[i + 1].p) { a = KF[i]; b = KF[i + 1]; break; }
    const span = b.p - a.p || 1, t = smooth(clamp((p - a.p) / span));
    const out = {};
    for (const k of Object.keys(D)) {
      if (k === 'look') { out.look = D.look; continue; }
      // carry forward last defined value for keys missing in a keyframe
      const va = valAt(KF.indexOf(a), k), vb = valAt(KF.indexOf(b), k);
      out[k] = lerp(va, vb, t);
    }
    out.pos = a.pos.map((v, i) => lerp(v, b.pos[i], t));
    return out;
  }
  function valAt(i, k) { for (let j = i; j >= 0; j--) if (KF[j][k] !== undefined) return KF[j][k]; return D[k]; }

  /* ----- sizing ----- */
  function resize() {
    const w = innerWidth, h = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w / h < 1 ? 52 : 36; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  /* ----- pointer parallax ----- */
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  addEventListener('pointermove', e => { tmx = (e.clientX / innerWidth - .5) * 2; tmy = (e.clientY / innerHeight - .5) * 2; });

  /* ----- display state by progress ----- */
  function stateFor(p, t) {
    if (p < 0.44) return { color: '#46e08a', big: '230', unit: 'V', status: 'ONLINE', load: .34 + Math.sin(t * 1.3) * .03, batt: '100%', led: [1, 0, 0] };
    if (p < 0.575) return { color: '#ffb400', big: '230', unit: 'V', status: 'OPENING', load: .1, batt: '100%', led: [0, 1, 0] };
    if (p < 0.73) return { color: '#ff4a3d', big: '0', unit: 'V', status: 'FAULT E-07', load: 0, batt: '--', led: [0, 0, 1] };
    if (p < 0.84) return { color: '#ffb400', big: '--', unit: '', status: 'TESTING', load: .5, batt: '88%', led: [0, 1, 0] };
    return { color: '#46e08a', big: '230', unit: 'V', status: 'ONLINE', load: .55 + Math.sin(t * 1.3) * .04, batt: '100%', led: [1, 0, 0] };
  }

  /* ----- main loop ----- */
  let cur = filmProgress(), tPrev = performance.now(), time = 0, lastDraw = 0;
  const lookV = new THREE.Vector3(), fw = new THREE.Vector3(), tmpV = new THREE.Vector3();

  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - tPrev) / 1000); tPrev = now; time += dt;
    const target = filmProgress();
    cur += (target - cur) * (1 - Math.exp(-dt * 9));
    if (Math.abs(target - cur) < 0.0002) cur = target;
    mx += (tmx - mx) * (1 - Math.exp(-dt * 4)); my += (tmy - my) * (1 - Math.exp(-dt * 4));

    updateCaptions(cur); updateNav();

    const s = sample(cur);
    const aspect = camera.aspect;
    const fit = aspect >= 1 ? 1 : lerp(1, 1.3, clamp((1 - aspect) / 0.6));

    // rig
    rig.rotation.y = s.ry + mx * 0.12;
    rig.rotation.x = s.rx !== undefined ? s.rx + my * 0.05 : 0.04 + my * 0.05;
    rig.position.y = Math.sin(time * .8) * 0.035;
    rig.scale.setScalar(1);
    rig.updateMatrixWorld(true);

    // explode
    parts.forEach((p, i) => {
      const e = smooth(clamp(s.ex * 1.15 - i * 0.012));
      p.g.position.set(p.base.x + p.dx * e, p.base.y + p.dy * e, p.base.z + p.dz * e);
    });
    front.position.x += s.fa * 5.5;
    fanG.position.x += s.fa * 4.5;

    // fault state
    const st = stateFor(cur, time);
    const faultOn = cur >= 0.575 && cur < 0.76 ? 1 : 0;
    const pulse = (Math.sin(time * 9) + 1) / 2;
    const fixedFlash = s.fx > 0 && s.fx < 1 ? 1 : 0;
    faultMat.emissive.setHex(s.fx > .5 ? 0x46e08a : 0xff3a2d);
    faultMat.emissiveIntensity = (faultOn ? (0.25 + pulse * 1.6) : 0) * (1 - smooth(clamp(s.fx * 2 - 0.2))) + (s.fx > 0 && cur < 0.80 ? (1 - Math.abs(s.fx - .5) * 2) * 1.2 : 0);
    faultMat.color.setHex(s.fx > .5 ? 0x2c3a30 : 0x5b2a10);
    faultRing.material.opacity = faultOn * (0.35 + pulse * .65) * (1 - smooth(clamp(s.fx * 2)));
    faultRing.scale.setScalar(1 + pulse * .12);
    faultRing.lookAt(camera.position);

    // display + LEDs
    const k = st.status + st.big + Math.round(st.load * 60);
    if (k !== lastKey && now - lastDraw > 70) { drawDisplay(st); lastKey = k; lastDraw = now; }
    leds.forEach((l, i) => { l.material.color.setHex([0x46e08a, 0xffb400, 0xff4a3d][i]).multiplyScalar(st.led[i] ? (i === 2 ? .45 + pulse * .55 : 1) : .12); });

    // fan
    const fanSpd = cur < 0.575 ? 3 : cur < 0.73 ? 0 : cur < 0.84 ? 8 : 16;
    blades.rotation.z -= fanSpd * dt;

    // scan
    scanMat.opacity = s.sc * .22; sl.material.opacity = s.sc * .95; sl2.material.opacity = s.sc * .95;
    scanG.position.y = s.sy; scanG.position.z = 0.1;
    scanG.position.x = 0;

    // power: rings, light, floor
    core.intensity = s.pw * (4 + Math.sin(time * 3) * .6);
    floorMat.opacity = .16 + s.pw * .34;
    rings.forEach((r, i) => {
      const ph = ((time * .45 + i / 3) % 1);
      r.scale.setScalar(.9 + ph * 2.2);
      r.material.opacity = s.pw > .55 ? Math.pow(1 - ph, 1.6) * (s.pw - .55) * 1.1 : 0;
    });

    // particles
    const pa = pg.attributes.position.array;
    const boost = 1 + s.pw * 2.2;
    for (let i = 0; i < NP; i++) {
      pa[i * 3 + 1] += pspd[i] * dt * boost;
      if (pa[i * 3 + 1] > 3.6) pa[i * 3 + 1] = -3.6;
    }
    pg.attributes.position.needsUpdate = true;
    pts.rotation.y = time * .03 + cur * 1.2;

    // camera
    faultG.getWorldPosition(fw);
    lookV.set(0, s.ly, 0).lerp(fw, s.fo);
    tmpV.set(s.pos[0] + mx * 0.25, s.pos[1] - my * 0.12, s.pos[2]);
    // zoom toward look target, then apply portrait fit
    tmpV.sub(lookV).multiplyScalar(s.zm * fit).add(lookV);
    camera.position.copy(tmpV);
    camera.lookAt(lookV);

    renderer.render(scene, camera);
  }

  drawDisplay(stateFor(0, 0));
  requestAnimationFrame(t => { tPrev = t; loop(t); });
  document.documentElement.classList.add('gl-ready');
  setTimeout(() => $('#loader').classList.add('done'), 500);
}

function fallback() {
  const ticking = () => { const p = filmProgress(); updateCaptions(p); updateNav(); requestAnimationFrame(ticking); };
  ticking();
  setTimeout(() => $('#loader').classList.add('done'), 300);
}

try { boot(); } catch (err) { console.error(err); document.documentElement.classList.add('no-webgl'); fallback(); }
// document fonts: redraw display once fonts are in
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { /* display redraws on next state change */ });
