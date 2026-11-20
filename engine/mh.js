// MakeHuman-based characters (CC0 base mesh + shape targets), skinned and painted in code, PS2 look.
import * as THREE from 'three';
import { tex, noise } from './cast.js';

const L = o => new THREE.MeshLambertMaterial(o);
const V3 = (a, i) => new THREE.Vector3(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]);

export async function loadMH(url) { return await (await fetch(url)).json(); }

// spec: skin, lips, liner, brow, iris, top, legs, shoes, hair, hairStyle, cropTop(bool), sleeve('long'|'short'), neckline
export function makeMH(D, spec) {
  const n = D.pos.length / 3, pos = new Float32Array(D.pos), C = { spec, bones: {} };
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(D.uv), 2));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(D.si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(D.sw, 4));
  // colors
  const col = new Float32Array(n * 3), c = new THREE.Color(), tmp = new THREE.Color();
  const skin = new THREE.Color(spec.skin), lips = new THREE.Color(spec.lips), liner = new THREE.Color(spec.liner || '#2a1a14'), brow = new THREE.Color(spec.brow || spec.hair);
  const inGroup = new Uint8Array(n), clothF = new Uint8Array(n); const gid = { body: 1, 'helper-tights': 2, 'helper-l-eye': 3, 'helper-r-eye': 4 };
  for (const [g, idx] of Object.entries(D.groups)) for (const i of idx) inGroup[i] = gid[g];
  // inflate clothes along averaged normals (oversized hoodie, wide-leg pants, chunky shoes)
  if (spec.topPuff || spec.legFlare || spec.shoePuff) {
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(pos.slice(), 3)); tg.setIndex(D.groups['helper-tights']); tg.computeVertexNormals();
    const tn = tg.attributes.normal, acc = new Map();
    for (let i = 0; i < n; i++) if (inGroup[i] === 2) { const k = D.src[i], a = acc.get(k) || [0, 0, 0]; a[0] += tn.getX(i); a[1] += tn.getY(i); a[2] += tn.getZ(i); acc.set(k, a); }
    const knee = .5;
    for (let i = 0; i < n; i++) if (inGroup[i] === 2) {
      const a = acc.get(D.src[i]), l = Math.hypot(...a) || 1, y = pos[i * 3 + 1];
      const arm = /arm|wrist|finger|metacarpal|shoulder|clavicle/.test(D.bones[D.si[i * 4]].n);
      let d = 0;
      if (y >= (spec.waist ?? 1.0) || arm) d = spec.topPuff || 0;
      else if (y > (spec.shoeTop ?? .095)) d = (spec.legFlare || 0) * (y < knee ? .45 + (knee - y) / knee * 1.1 : .45) + (spec.legBase || 0);
      else d = spec.shoePuff || 0;
      if (arm && spec.topPuff) d *= .8;
      pos[i * 3] += a[0] / l * d; pos[i * 3 + 1] += a[1] / l * d * .3; pos[i * 3 + 2] += a[2] / l * d;
    }
  }
  // bones
  const bones = D.bones.map(b => { const o = new THREE.Bone(); o.name = b.n; return o; });
  D.bones.forEach((b, i) => { const h = new THREE.Vector3(...b.h); if (b.p >= 0) { h.sub(new THREE.Vector3(...D.bones[b.p].h)); bones[b.p].add(bones[i]); } bones[i].position.copy(h); C.bones[b.n] = bones[i]; });
  const head = (name) => new THREE.Vector3(...D.bones.find(b => b.n === name).h);
  const eyeC = { 3: new THREE.Vector3(...D.eyeC.l), 4: new THREE.Vector3(...D.eyeC.r) };
  const top = new THREE.Color(spec.top), legs = new THREE.Color(spec.legs), shoes = new THREE.Color(spec.shoes);
  const M = D.mask; const sleeveC = new THREE.Color(spec.sleeveCol || spec.top);
  const bname = i => D.bones[D.si[i * 4]].n;
  const clothAt = (p, i) => { // null = skin, else clothing color
    const b = bname(i), arm = /arm|wrist|finger|metacarpal|shoulder|clavicle/.test(b);
    if (/neck|head|jaw|eye|oris|oculi|orbicularis|levator|risorius|temporalis|tongue|special/.test(b)) return null;
    if (/wrist|finger|metacarpal/.test(b)) return null;
    if (p.y < (spec.shoeTop ?? .095)) return shoes;
    if (spec.sleeve === 'short' && /lowerarm|upperarm02/.test(b)) return null;
    if (!arm && p.y > (spec.neckline ?? 1.42)) return null;
    if (spec.cropTop && !arm && p.y > (spec.cropLow ?? 1.0) && p.y < (spec.cropHigh ?? 1.075)) return null;
    if (arm && spec.sleeveCol && !/clavicle|shoulder/.test(b)) return sleeveC;
    return (p.y < (spec.waist ?? 1.0) && !arm) ? legs : top;
  };
  for (let i = 0; i < n; i++) {
    const p = V3(pos, i), g = inGroup[i];
    const cl = g <= 2 ? clothAt(p, i) : null; if (cl) clothF[i] = 1;
    if (g === 1 && cl) c.copy(cl);
    if (g === 2 && cl) c.copy(cl);
    if (cl && spec.detail && cl !== shoes) { const ang = Math.atan2(p.x - (p.x > 0 ? .09 : -.09) * (cl === legs ? 1 : 0), p.z);
      if (cl === top) { c.multiplyScalar(.93 + .07 * (Math.sin(Math.atan2(p.x, p.z) * 70) > 0 ? 1 : 0)); if (spec.cropTop && p.y < (spec.cropHigh ?? 1.075) + .018) c.multiplyScalar(.86); }
      if (cl === legs) { if (p.y > (spec.waist ?? 1.0) - .035) c.multiplyScalar(1.08); else if (p.y < .5) c.multiplyScalar(.9 + .1 * Math.sin(ang * 5 + p.y * 9)); } }
    else if (g === 1) {
      c.copy(skin);
      c.lerp(lips, Math.min(1, Math.max(0, M.lips[i] - .45) * 2.2) * (spec.lipAmt ?? .8));
      const ec = p.x > 0 ? eyeC[3] : eyeC[4]; const up = p.y > ec.y + .004 ? 1 : .25;
      c.lerp(liner, Math.min(1, Math.max(0, M.lids[i] - .3) * 1.8) * (spec.linerAmt ?? .75) * up);
      // cheeks warm tint
      { const ecb = p.x > 0 ? eyeC[3] : eyeC[4], dx = Math.abs(p.x - ecb.x - (p.x > 0 ? .003 : -.003)), dy = p.y - ecb.y;
        const arch = .019 + .004 * Math.cos(dx / .022 * 1.4) - (dx > .012 ? (dx - .012) * .25 : 0);
        const th = .0042 - dx * .07; if (dx < .022 && dy > arch - th && dy < arch + th && p.z > ecb.z - .01) c.copy(brow); }
      if (spec.glam) { const e2 = p.x > 0 ? eyeC[3] : eyeC[4], ox = (p.x - e2.x) * Math.sign(p.x), dy2 = p.y - e2.y;
        if (ox > .009 && ox < .021 && dy2 > -.001 + (ox - .009) * .25 && dy2 < .0035 + (ox - .009) * .45 && p.z > e2.z - .012) c.lerp(liner, .9); // wing
        if (M.lips[i] > .42 && M.lips[i] < .56) c.lerp(tmp.set(spec.lipLiner || '#8a3a4c'), .4); // lip liner
        const cb = Math.max(0, 1 - Math.hypot((ox - .006) / .018, (dy2 + .048) / .008)); c.multiplyScalar(1 - cb * .18); // contour
        const hl = Math.max(0, 1 - Math.hypot((ox - .008) / .014, (dy2 + .026) / .007)) + Math.max(0, 1 - Math.hypot(p.x / .004, (dy2 + .01) / .02)) * (p.z > e2.z + .01 ? 1 : 0); c.lerp(tmp.set('#fff1e6'), Math.min(spec.hlAmt ?? .22, hl * .3)); }
      if (spec.nails && /finger\d-3/.test(D.bones[D.si[i * 4]].n) && D.sw[i * 4] > .6) c.lerp(tmp.set(spec.nails), .9);
      const ecc = p.x > 0 ? eyeC[3] : eyeC[4], ch = Math.max(0, 1 - Math.hypot((p.x - ecc.x * 1.05) / .022, (p.y - ecc.y + .03) / .016)) * (p.z > ecc.z - .02 ? 1 : 0);
      c.lerp(tmp.set(spec.blush || '#d8737a'), Math.min(spec.blushAmt ?? .25, ch));
    } else if (g === 2) {
      c.copy(cl || skin);
    } else {
      const e = eyeC[g], d = p.clone().sub(e).normalize(), f = d.z; 
      c.set('#F2EEE6'); if (f > .8) c.set(spec.iris || '#3a2414'); if (f > .93) c.set('#0d0907');
    }
    const j = .95 + Math.random() * .07; col[i * 3] = c.r * j; col[i * 3 + 1] = c.g * j; col[i * 3 + 2] = c.b * j;
  }
  if (spec.bake !== false) bakeShade(D, pos, col, inGroup, spec, clothF);
  if (spec.clothUV) { const uvA = geo.attributes.uv, k = spec.clothUV; // world-scale projection so fabric texels are even
    for (let i = 0; i < n; i++) if (clothF[i]) { const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2]; const lx = Math.abs(x) > .2 && y > 1.0 ? x : x * .9; uvA.setXY(i, (lx * .8 + z * .6) * k, y * k); } }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  // morphs
  const names = Object.keys(D.morph);
  geo.morphTargetsRelative = true;
  geo.morphAttributes.position = names.map(k => new THREE.Float32BufferAttribute(D.morph[k], 3));
  // index with groups (filter tights faces for crop top / neckline / sleeves)
  const order = [], mats = [];
  const fabric = tex(64, 64, (g, w, h) => noise(g, w, h, '#ffffff', 12)); fabric.wrapS = fabric.wrapT = THREE.RepeatWrapping; fabric.repeat.set(14, 14);
  const skinTex = tex(64, 64, (g, w, h) => noise(g, w, h, '#ffffff', 7));
  const push = (idx, mat) => { geo.addGroup(order.length, idx.length, mats.length); order.push(...idx); mats.push(mat); };
  { const bI = D.groups.body, sk = [], cf = [];
    for (let k = 0; k < bI.length; k += 3) { const t = [bI[k], bI[k + 1], bI[k + 2]]; (t.every(v => clothF[v]) ? cf : sk).push(...t); }
    push(sk, L({ vertexColors: true, map: skinTex })); C.bodyCloth = cf; }
  const tIdx = D.groups['helper-tights'], keepT = [];
  for (let k = 0; k < tIdx.length; k += 3) {
    let ok = true;
    for (let q = 0; q < 3; q++) { const v = tIdx[k + q]; if (!clothAt(V3(pos, v), v)) ok = false; }
    if (ok) keepT.push(tIdx[k], tIdx[k + 1], tIdx[k + 2]);
  }
  push([...C.bodyCloth, ...keepT], L({ vertexColors: true, map: fabric }));
  push([...D.groups['helper-l-eye'], ...D.groups['helper-r-eye']], L({ vertexColors: true }));
  geo.setIndex(order); geo.computeVertexNormals();
  const mesh = new THREE.SkinnedMesh(geo, mats); mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
  mesh.morphTargetDictionary = Object.fromEntries(names.map((k, i) => [k, i])); mesh.morphTargetInfluences = names.map(() => 0);
  const root = new THREE.Group(); root.add(bones[0]); root.add(mesh);
  root.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(bones));
  C.root = root; C.mesh = mesh;
  // hair from scalp faces of the body (offset outward), attached to head bone
  buildHair(C, D, pos, spec);
  C.eyeballs = [];
  const irisTex = tex(128, 64, (x, w, h) => { x.fillStyle = '#F4F0E8'; x.fillRect(0, 0, w, h); x.save(); x.translate(w * .25, h / 2); x.scale(1.6, 1); const g = x.createRadialGradient(0, 0, 1, 0, 0, 11); g.addColorStop(0, '#0b0806'); g.addColorStop(.38, '#0b0806'); g.addColorStop(.42, spec.iris || '#4a2a16'); g.addColorStop(.95, '#1c120c'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 11, 0, 7); x.fill(); x.restore(); x.fillStyle = 'rgba(255,255,255,.85)'; x.fillRect(w * .25 + 4, h / 2 - 5, 3, 3); });
  const hp0 = head('head');
  ['l', 'r'].forEach(sd => { const e = new THREE.Vector3(...D.eyeC[sd]); const g = new THREE.SphereGeometry(spec.eyeR ?? .0118, 20, 14); 
    const m = new THREE.Mesh(g, L({ map: irisTex })); m.position.copy(e).sub(hp0); m.position.z -= .002; C.bones.head.add(m); C.eyeballs.push(m); });
  mats[2].visible = false;
  // rest pose bookkeeping for aim()
  C.bind = {}; D.bones.forEach(b => { C.bind[b.n] = new THREE.Vector3(...b.t).sub(new THREE.Vector3(...b.h)).normalize(); });
  return C;
}

function buildHair(C, D, pos, spec) {
  const idx = D.groups.body, eyeL = new THREE.Vector3(...D.bones.find(b => b.n === 'eye.L').h);
  const browY = eyeL.y + (spec.hairline ?? .058), backZ = eyeL.z - .06, earY = eyeL.y - .015;
  const nrm = C.mesh.geometry.attributes.normal;
  const sel = v => { const p = V3(pos, v), ax = Math.abs(p.x); if (p.y < earY - .06) return false; if (p.y > browY + Math.pow(ax / .06, 2) * (spec.hairCurve ?? 0) - (ax > .045 ? Math.min(.022, (ax - .045) * .9) : 0)) return true; return p.z < eyeL.z - .045 && p.y > earY - (spec.hairDown ?? .06); };
  const P = [], N = [], I = [], map = new Map(), headB = C.bones.head, hp = new THREE.Vector3(...D.bones.find(b => b.n === 'head').h);
  for (let k = 0; k < idx.length; k += 3) {
    const t = [idx[k], idx[k + 1], idx[k + 2]]; if (!t.every(sel)) continue;
    for (const v of t) {
      if (!map.has(v)) { const p = V3(pos, v), nn = new THREE.Vector3(nrm.getX(v), nrm.getY(v), nrm.getZ(v));
        const lift = (spec.hairVol ?? .008) * (p.y > browY + .03 ? 1.5 : 1); p.addScaledVector(nn, lift).sub(hp); map.set(v, P.length / 3); P.push(p.x, p.y, p.z); }
      I.push(map.get(v));
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
  const strands = tex(16, 32, (x, w, h) => { x.fillStyle = spec.hair; x.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? '255,235,210' : '0,0,0'},${.12 + Math.random() * .16})`; x.fillRect(Math.random() * w | 0, 0, 1, h); } for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(Math.random() * w | 0, Math.random() * h | 0, 1, 3); } }); strands.magFilter = THREE.NearestFilter;
  // spherical uv for strand texture
  const uv = []; for (let i = 0; i < P.length; i += 3) { uv.push(Math.atan2(P[i], P[i + 2]) / Math.PI * 4, P[i + 1] * 6); } g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  strands.wrapS = strands.wrapT = THREE.RepeatWrapping;
  const hm = L({ map: strands, side: THREE.DoubleSide });
  let hg = g; if (spec.cap !== false) { const sc = shrinkCap(D, pos, nrm, spec); hg = sc.geo; hg.translate(-hp.x, -hp.y, -hp.z); }
  const hair = new THREE.Mesh(hg, hm); hair.castShadow = true; headB.add(hair); C.hair = hair;
  if (spec.hairStyle === 'pony') {
    const tie = new THREE.Mesh(new THREE.SphereGeometry(.018, 12, 8), L({ color: spec.scrunchie || '#FF5FA2' })); tie.position.set(0, browY - hp.y + .045, eyeL.z - hp.z - .14); headB.add(tie);
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(.03, .2, 6, 12), hm); tail.position.set(0, browY - hp.y - .06, eyeL.z - hp.z - .19); tail.rotation.x = .38; tail.scale.set(1, 1, .8); headB.add(tail); C.tail = tail;
    const bun = new THREE.Mesh(new THREE.SphereGeometry(.034, 14, 10), hm); bun.position.copy(tie.position).add(new THREE.Vector3(0, -.012, -.02)); headB.add(bun);
  }
  const curlM = L({ map: (() => { const t = tex(16, 16, (x, w, h) => noise(x, w, h, spec.hair, 30)); t.magFilter = THREE.NearestFilter; return t; })() });
  const clump = (n, center, rad, size, mat0, seedv = 1, opts = {}) => { let sd = seedv * 9301; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) { const th = rr() * Math.PI * 2, ph = Math.acos(1 - 2 * rr() * (opts.cap ?? 1)), r = rad * (.75 + rr() * .3);
      const b = new THREE.Mesh(new THREE.SphereGeometry(size * (.75 + rr() * .5), 7, 5), curlM); b.position.set(center.x + Math.sin(ph) * Math.cos(th) * r * (opts.sx ?? 1), center.y + Math.cos(ph) * r * (opts.sy ?? 1), center.z + Math.sin(ph) * Math.sin(th) * r * (opts.sz ?? 1));
      if (opts.skip && opts.skip(b.position)) continue; b.castShadow = true; headB.add(b); } };
  const fy = browY - hp.y, ez = eyeL.z - hp.z;
  if (spec.hairStyle === 'long') {
    const top = fy + .045, bot = -(spec.hairLen ?? .2), h = top - bot, cz = ez - .095;
    const gap = spec.hairGap ?? 1.7;
    const g = new THREE.CylinderGeometry(.082, .104, h, 28, 8, true, gap / 2, Math.PI * 2 - gap);
    const pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { const y = pa.getY(i), t = (y + h / 2) / h; // t=1 top
      const k = 1 - Math.pow(1 - t, 3) * 0 ; const bulge = Math.sin(t * Math.PI) * .012; const r = Math.hypot(pa.getX(i), pa.getZ(i)) || 1;
      pa.setX(i, pa.getX(i) * (1 + bulge / r)); pa.setZ(i, pa.getZ(i) * (1 + bulge / r) * 1.12); }
    g.computeVertexNormals();
    const curtain = new THREE.Mesh(g, hm); curtain.position.set(0, bot + h / 2, cz + .006); curtain.castShadow = true; headB.add(curtain);
    // crown dome
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.094, 28, 14, 0, Math.PI * 2, 0, Math.PI * .56), hm); dome.scale.set(1, .95, 1.14); dome.rotation.x = -.3; dome.position.set(0, fy - .045, cz + .012); headB.add(dome);
    dome.visible = false;
  }
  if (spec.hairStyle === 'curlyTop') clump(150, new THREE.Vector3(0, fy + .035, ez - .085), .075, .016, hm, 3, { sy: .55, sx: 1.05, sz: 1.15, cap: .55 });
  if (spec.hairStyle === 'curlsUp') {
    clump(160, new THREE.Vector3(0, fy + .03, ez - .09), .085, .017, hm, 5, { sy: .6, sz: 1.15, cap: .6 });
    clump(70, new THREE.Vector3(0, fy + .085, ez - .12), .05, .019, hm, 7);
    [-1, 1].forEach(sd => clump(14, new THREE.Vector3(sd * .072, fy - .03, ez - .035), .022, .012, hm, sd + 11, { sy: 2.2 }));
    const clip = new THREE.Mesh(new THREE.BoxGeometry(.07, .018, .02), L({ color: spec.clip || '#C9A27A' })); clip.position.set(0, fy + .07, ez - .165); clip.rotation.x = -.6; headB.add(clip);
  }
  if (spec.chain) {
    const sb = D.bones.find(b => b.n === 'spine05'), sbh = new THREE.Vector3(...sb.h), bodyIdx = D.groups.body;
    const surfZ = (x, y) => { let z = -1; for (let k = 0; k < bodyIdx.length; k += 7) { const v = bodyIdx[k]; const px = pos[v * 3], py = pos[v * 3 + 1]; if (Math.abs(px - x) < .02 && Math.abs(py - y) < .02) z = Math.max(z, pos[v * 3 + 2]); } return z; };
    const nl = (spec.neckline ?? 1.42); const pts = [[-.065, nl + .005], [-.045, nl - .05], [0, nl - .085], [.045, nl - .05], [.065, nl + .005]].map(([x, y]) => new THREE.Vector3(x, y, surfZ(x, y) + .012).sub(sbh));
    const ch = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .0035, 6), L({ color: '#E8C24A', emissive: '#4a3a00' })); C.bones.spine05.add(ch); }
  if (spec.hood) { const hd = new THREE.Mesh(new THREE.TorusGeometry(.085, .03, 8, 20, Math.PI * 1.3), L({ color: spec.top })); hd.rotation.set(1.45, 0, -Math.PI * .15 - Math.PI * .5); hd.position.set(0, -.06, -.07); C.bones.neck01.add(hd); }
  if (spec.bag) {
    const sb = D.bones.find(b => b.n === 'spine05'), sbh = new THREE.Vector3(...sb.h), bi = D.groups['helper-tights'];
    const surf = (x, y) => { let z = -1; for (let k = 0; k < bi.length; k += 3) { const v = bi[k]; if (Math.abs(pos[v * 3] - x) < .02 && Math.abs(pos[v * 3 + 1] - y) < .02) z = Math.max(z, pos[v * 3 + 2]); } return z < -0.5 ? .08 : z; };
    const pts = [[.1, 1.4], [.05, 1.3], [0, 1.22], [-.07, 1.12], [-.13, 1.03]].map(([x, y]) => new THREE.Vector3(x, y, surf(x, y) + .008).sub(sbh));
    const strap = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, .006, 5), L({ color: spec.bag })); C.bones.spine05.add(strap);
    const bag = new THREE.Mesh(new THREE.BoxGeometry(.13, .09, .045), L({ color: spec.bag })); const ph = new THREE.Vector3(...D.bones.find(b => b.n === 'pelvis.R').h);
    bag.position.set(-.16, 1.0, .03).sub(ph); bag.rotation.z = .15; C.bones['pelvis.R'].add(bag);
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(.02, .012, .005), L({ color: '#E9C45A' })); clasp.position.set(0, .02, .024); bag.add(clasp); }
  if (spec.hoops) [-1, 1].forEach(s => { const h = new THREE.Mesh(new THREE.TorusGeometry(.016, .0022, 6, 20), L({ color: '#E9C45A', emissive: '#4a3500' }));
    h.position.set(s * (Math.abs(eyeL.x) + .028) , eyeL.y - hp.y - .062, eyeL.z - hp.z - .075); h.rotation.y = Math.PI / 2; headB.add(h); });
}
function headWorldBind(C, name) { return new THREE.Vector3(); }

// --- posing helpers ---------------------------------------------------------
const _q = new THREE.Quaternion(), _p = new THREE.Quaternion(), _v = new THREE.Vector3();
export function aimBone(C, name, worldDir, amt = 1) {
  const b = C.bones[name]; b.parent.updateMatrixWorld(true); b.parent.getWorldQuaternion(_p);
  _v.copy(worldDir).normalize().applyQuaternion(_p.clone().invert()); _q.setFromUnitVectors(C.bind[name], _v);
  b.quaternion.copy(new THREE.Quaternion().slerp(_q, amt)); b.updateMatrixWorld(true);
}
export function resetPose(C) { Object.values(C.bones).forEach(b => b.quaternion.identity()); }
export function morph(C, k, v) { const i = C.mesh.morphTargetDictionary[k]; if (i !== undefined) C.mesh.morphTargetInfluences[i] = v; }
// procedural idle: breathing + weight shift + head drift
export function idle(C, t, amt = 1) {
  const s = Math.sin, B = C.bones;
  B.spine03.rotation.x = s(t * 1.6) * .012 * amt; B.spine01.rotation.z = s(t * .7) * .015 * amt;
  B.root.rotation.z = s(t * .7 + 1) * .008 * amt; B.root.position.x = s(t * .7) * .006 * amt;
  B.neck02.rotation.y = s(t * .5) * .05 * amt; B.head.rotation.x = s(t * .9 + 2) * .02 * amt;
  if (C.tail) C.tail.rotation.z = s(t * 2) * .08;
}
// arms: dirs in character space (+x = character's left, +z = forward)
export function armDown(C, side, open = .14, fwd = .05) { const sx = side === 'L' ? 1 : -1; aimBone(C, 'upperarm01.' + side, new THREE.Vector3(sx * open, -1, fwd)); }

// painted-in shading: cavity (smoothed-surface difference) + soft top light, welded by source vertex
function bakeShade(D, pos, col, inGroup, spec, clothF) {
  const n = pos.length / 3, src = D.src, S = Math.max(...src) + 1;
  const P = new Float32Array(S * 3), cnt = new Uint8Array(S);
  for (let i = 0; i < n; i++) { const k = src[i]; if (!cnt[k]) { P[k * 3] = pos[i * 3]; P[k * 3 + 1] = pos[i * 3 + 1]; P[k * 3 + 2] = pos[i * 3 + 2]; } cnt[k] = 1; }
  const nb = Array.from({ length: S }, () => new Set());
  const Nn = new Float32Array(S * 3);
  for (const g of ['body', 'helper-tights']) { const idx = D.groups[g];
    for (let t = 0; t < idx.length; t += 3) { const a = src[idx[t]], b = src[idx[t + 1]], c = src[idx[t + 2]];
      nb[a].add(b); nb[a].add(c); nb[b].add(a); nb[b].add(c); nb[c].add(a); nb[c].add(b);
      const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2], ux = P[b * 3] - ax, uy = P[b * 3 + 1] - ay, uz = P[b * 3 + 2] - az, vx = P[c * 3] - ax, vy = P[c * 3 + 1] - ay, vz = P[c * 3 + 2] - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; for (const k of [a, b, c]) { Nn[k * 3] += nx; Nn[k * 3 + 1] += ny; Nn[k * 3 + 2] += nz; } } }
  let Q = P.slice();
  for (let it = 0; it < (spec.aoIter ?? 6); it++) { const Q2 = Q.slice();
    for (let k = 0; k < S; k++) { const s = nb[k]; if (!s.size) continue; let x = 0, y = 0, z = 0; for (const j of s) { x += Q[j * 3]; y += Q[j * 3 + 1]; z += Q[j * 3 + 2]; } Q2[k * 3] = x / s.size; Q2[k * 3 + 1] = y / s.size; Q2[k * 3 + 2] = z / s.size; }
    Q = Q2; }
  const shade = new Float32Array(S);
  for (let k = 0; k < S; k++) { let nx = Nn[k * 3], ny = Nn[k * 3 + 1], nz = Nn[k * 3 + 2]; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const cav = (Q[k * 3] - P[k * 3]) * nx + (Q[k * 3 + 1] - P[k * 3 + 1]) * ny + (Q[k * 3 + 2] - P[k * 3 + 2]) * nz; // >0 concave
    let f = 1 - Math.max(-.12, Math.min(.55, cav * (spec.aoK ?? 90)));
    f *= .92 + .14 * Math.max(0, ny) - .1 * Math.max(0, -ny) + .05 * nz; shade[k] = f; }
  for (let i = 0; i < n; i++) if (inGroup[i] <= 2) { const f0 = shade[src[i]], f = clothF[i] ? 1 - (1 - f0) * (spec.aoCloth ?? .45) : f0; col[i * 3] *= f; col[i * 3 + 1] *= f; col[i * 3 + 2] *= f; }
}

// smooth hair cap: a param grid around the skull with a smooth hairline, shrink-wrapped to the head surface
export function shrinkCap(D, pos, nrm, spec) {
  const idx = D.groups.body, hv = new Set(); for (const i of idx) { const b = D.bones[D.si[i * 4]].n; if (/^head$|temporalis|special0[13]|levator0[5-6]|oculi/.test(b) && D.sw[i * 4] > .4) hv.add(i); }
  const H = [...hv]; const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const i of H) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], pos[i * 3 + k]); mx[k] = Math.max(mx[k], pos[i * 3 + k]); }
  const c = new THREE.Vector3((mn[0] + mx[0]) / 2, mn[1] + (mx[1] - mn[1]) * .55, (mn[2] + mx[2]) / 2);
  const dirs = H.map(i => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).sub(c).normalize());
  const A = 40, Tn = 16, P = [], I = [], off = spec.capOff ?? .006;
  const tmax = a => { const f = spec.capFront ?? .36, sd = spec.capSide ?? .56, b = spec.capBack ?? .74; const ca = Math.cos(a); return Math.PI * (ca >= 0 ? sd + (f - sd) * Math.pow(ca, 1.5) : sd + (b - sd) * Math.pow(-ca, 1.2)); };
  for (let ai = 0; ai <= A; ai++) { const a = ai / A * Math.PI * 2, tm = tmax(a);
    for (let ti = 0; ti <= Tn; ti++) { const t = ti / Tn * tm; const d = new THREE.Vector3(Math.sin(t) * Math.sin(a), Math.cos(t), Math.sin(t) * Math.cos(a));
      let best = -2, bi = 0; for (let k = 0; k < dirs.length; k += 2) { const dd = dirs[k].dot(d); if (dd > best) { best = dd; bi = k; } }
      const v = H[bi], p = new THREE.Vector3(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); const r = p.distanceTo(c) + off + (ti < Tn ? (spec.capPuff ?? .004) * Math.sin(ti / Tn * Math.PI) : 0);
      P.push(c.x + d.x * r, c.y + d.y * r, c.z + d.z * r); } }
  for (let ai = 0; ai < A; ai++) for (let ti = 0; ti < Tn; ti++) { const a = ai * (Tn + 1) + ti, b = a + Tn + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
  const uv = []; for (let ai = 0; ai <= A; ai++) for (let ti = 0; ti <= Tn; ti++) uv.push(ai / A * 6, ti / Tn * 2); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return { geo: g, center: c };
}

// curl a hand's fingers (world-space rotation about the knuckle axis) and return a grip frame for props
export function grip(C, side, amt = 1, sign = 1) {
  const B = C.bones, w = new THREE.Vector3(), f = new THREE.Vector3(), th = new THREE.Vector3(), lt = new THREE.Vector3();
  B['wrist.' + side].getWorldPosition(w); B['finger3-1.' + side].getWorldPosition(f); B['finger5-1.' + side].getWorldPosition(lt); B['finger2-1.' + side].getWorldPosition(th);
  const d = f.clone().sub(w).normalize(); const across = th.clone().sub(lt); across.addScaledVector(d, -across.dot(d)).normalize(); // index->pinky axis
  const palm = new THREE.Vector3().crossVectors(d, across).multiplyScalar(-sign * (side === 'R' ? 1 : -1)).normalize();
  const rot = (b, ang, axis) => { const bw = new THREE.Quaternion(); b.getWorldQuaternion(bw); const r = new THREE.Quaternion().setFromAxisAngle(axis, ang); const pw = new THREE.Quaternion(); b.parent.getWorldQuaternion(pw);
    b.quaternion.copy(pw.invert().multiply(r.multiply(bw))); b.updateMatrixWorld(true); };
  const ax = across.clone().multiplyScalar(side === 'R' ? sign : -sign);
  for (const n of [2, 3, 4, 5]) for (const s of [1, 2, 3]) rot(B[`finger${n}-${s}.${side}`], (s === 1 ? .9 : .75) * amt, ax);
  for (const s of [2, 3]) rot(B[`finger1-${s}.${side}`], .5 * amt, d);
  return { center: w.clone().addScaledVector(d, .045).addScaledVector(palm, .045), palm, dir: d };
}
