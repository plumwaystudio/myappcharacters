// MakeHuman-based characters (CC0 base mesh + shape targets), skinned and painted in code, PS2 look.
import * as THREE from 'three';
import { tex, noise } from './cast.js';
export const MODE = { clean: false };
const F = () => MODE.clean ? THREE.LinearFilter : THREE.NearestFilter;

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
  const socksC = new THREE.Color(spec.socks || '#ffffff');
  const innerC = new THREE.Color(spec.cardigan || '#fff');
  const M = D.mask; const sleeveC = new THREE.Color(spec.sleeveCol || spec.top);
  const bname = i => D.bones[D.si[i * 4]].n;
  const clothAt = (p, i) => { // null = skin, else clothing color
    const b = bname(i), arm = /arm|wrist|finger|metacarpal|shoulder|clavicle/.test(b);
    if (/neck|head|jaw|eye|oris|oculi|orbicularis|levator|risorius|temporalis|tongue|special/.test(b)) return null;
    if (/wrist|finger|metacarpal/.test(b)) return null;
    if (p.y < (spec.shoeTop ?? .095)) return shoes;
    if (spec.socks && p.y < (spec.sockTop ?? .17)) return socksC;
    if (spec.shorts && !arm && p.y < spec.shorts) return null;
    if (spec.sleeve === 'short' && /lowerarm|upperarm02/.test(b)) return null;
    if (!arm && p.y > (spec.neckline ?? 1.42)) return null;
    if (spec.cropTop && !arm && p.y > (spec.cropLow ?? 1.0) && p.y < (spec.cropHigh ?? 1.075)) return null;
    if (arm && spec.sleeveCol && !/clavicle|shoulder/.test(b)) return sleeveC;
    if (spec.cardigan && !arm && p.y >= (spec.waist ?? 1.0) && Math.abs(p.x) < .052 + (p.y - 1.0) * .05 && p.z > .02) return innerC;
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
    else if (g === 1 && !cl && spec.faceTex) { c.copy(skin); }
    else if (g === 1) {
      c.copy(skin);
      c.lerp(lips, Math.min(1, Math.max(0, M.lips[i] - .46) * 4) * (spec.lipAmt ?? .8));
      const ec = p.x > 0 ? eyeC[3] : eyeC[4]; const up = p.y > ec.y + .004 ? 1 : .25;
      c.lerp(liner, Math.min(1, Math.max(0, M.lids[i] - .3) * 1.8) * (spec.linerAmt ?? .75) * up);
      // cheeks warm tint
      { const ecb = p.x > 0 ? eyeC[3] : eyeC[4], dx = Math.abs(p.x - ecb.x - (p.x > 0 ? .003 : -.003)), dy = p.y - ecb.y;
        const arch = .019 + .004 * Math.cos(dx / .022 * 1.4) - (dx > .012 ? (dx - .012) * .25 : 0);
        const th = (spec.fluffy ? .0055 : .0042) - dx * .07; if (dx < .022 && dy > arch - th && dy < arch + th && p.z > ecb.z - .01) { c.copy(brow); if (spec.fluffy) { const st = Math.sin((p.x * 900) + dy * 400) > .2; if (!st) c.lerp(skin, .45); } } }
      if (spec.glam) { const e2 = p.x > 0 ? eyeC[3] : eyeC[4], ox = (p.x - e2.x) * Math.sign(p.x), dy2 = p.y - e2.y;
        if (ox > .009 && ox < .021 && dy2 > -.001 + (ox - .009) * .25 && dy2 < .0035 + (ox - .009) * .45 && p.z > e2.z - .012) c.lerp(liner, .9); // wing
        if (M.lips[i] > .42 && M.lips[i] < .56) c.lerp(tmp.set(spec.lipLiner || '#8a3a4c'), .4); // lip liner
        const cb = Math.max(0, 1 - Math.hypot((ox - .006) / .018, (dy2 + .048) / .008)); c.multiplyScalar(1 - cb * .18); // contour
        const hl = Math.max(0, 1 - Math.hypot((ox - .008) / .014, (dy2 + .026) / .007)) + Math.max(0, 1 - Math.hypot(p.x / .004, (dy2 + .01) / .02)) * (p.z > e2.z + .01 ? 1 : 0); c.lerp(tmp.set('#fff1e6'), Math.min(spec.hlAmt ?? .22, hl * .3)); }
      if (spec.sunburn) { const e4 = p.x > 0 ? eyeC[3] : eyeC[4], dyb = p.y - e4.y; const band = Math.max(0, 1 - Math.abs(dyb + .024) / .012) * (Math.abs(p.x) < Math.abs(e4.x) + .02 ? 1 : 0) * (p.z > e4.z - .015 ? 1 : 0); c.lerp(tmp.set(spec.sunburn), Math.min(.42, band * .5)); }
      if (spec.freckles) { const e5 = p.x > 0 ? eyeC[3] : eyeC[4]; if (Math.abs(p.y - e5.y + .022) < .014 && Math.abs(p.x) < Math.abs(e5.x) + .012 && p.z > e5.z - .005 && Math.random() < .18) c.multiplyScalar(.78); }
      if (spec.edges) { const e6 = p.x > 0 ? eyeC[3] : eyeC[4], ax6 = Math.abs(p.x), dy6 = p.y - e6.y; if (ax6 > .045 && ax6 < .075 && dy6 > .02 && dy6 < .05 && p.z > e6.z - .03) { const sw = Math.sin((ax6 - .045) * 260 + dy6 * 180); if (sw > .55) c.copy(tmp.set(spec.hair)); } }
      if (spec.shadow) { const e3 = p.x > 0 ? eyeC[3] : eyeC[4], ox3 = Math.abs(p.x - e3.x), dy3 = p.y - e3.y;
        if (ox3 < .018 && dy3 > .003 && dy3 < .013 - ox3 * .25 && p.z > e3.z - .01) { c.lerp(tmp.set(spec.shadow), .55); if (spec.glitter && Math.random() < .25) c.lerp(tmp.set('#ffffff'), .5); } }
      if (spec.gloss && M.lips[i] > .7) c.lerp(tmp.set('#fff4f6'), spec.gloss);
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
    for (let i = 0; i < n; i++) if (clothF[i]) { const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2]; const lx = Math.abs(x) > .2 && y > 1.0 ? x : x * .9; uvA.setXY(i, (lx * .8 + z * .6) * k, y * k); if (spec.plainLegs && y < (spec.waist ?? 1.0) && !/arm|wrist|finger/.test(D.bones[D.si[i * 4]].n)) uvA.setXY(i, .51, .51); } }
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
  C.clothIdx = [...C.bodyCloth, ...keepT]; push(C.clothIdx, L({ vertexColors: true, map: fabric }));
  push([...D.groups['helper-l-eye'], ...D.groups['helper-r-eye']], L({ vertexColors: true }));
  geo.setIndex(order); geo.computeVertexNormals();
  const mesh = new THREE.SkinnedMesh(geo, mats); mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
  mesh.morphTargetDictionary = Object.fromEntries(names.map((k, i) => [k, i])); mesh.morphTargetInfluences = names.map(() => 0);
  const root = new THREE.Group(); root.add(bones[0]); root.add(mesh);
  root.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(bones));
  C.root = root; C.mesh = mesh;
  if (spec.faceTex && spec.faceProj) addFace(C, D, geo, pos, spec, mesh);
  if (spec.outfitTex && spec.outfitProj) addOutfit(C, geo, pos, spec, mesh);
  C.eyeC = { l: new THREE.Vector3(...D.eyeC.l), r: new THREE.Vector3(...D.eyeC.r) };
  { let best = -9, bi = 0; const ey = C.eyeC.l.y; for (const v of D.groups.body) { const y = pos[v * 3 + 1], x = pos[v * 3]; if (Math.abs(x) < .006 && y < ey - .02 && y > ey - .07 && pos[v * 3 + 2] > best) { best = pos[v * 3 + 2]; bi = v; } } C.noseTip = new THREE.Vector3(pos[bi * 3], pos[bi * 3 + 1], pos[bi * 3 + 2]); }
  // hair from scalp faces of the body (offset outward), attached to head bone
  buildHair(C, D, pos, spec);
  C.eyeballs = [];
  const irisTex = tex(128, 64, (x, w, h) => { x.fillStyle = '#F4F0E8'; x.fillRect(0, 0, w, h); x.save(); x.translate(w * .25, h / 2); x.scale(1.6, 1); const IR = spec.irisR ?? 11; const g = x.createRadialGradient(0, 0, 1, 0, 0, IR); g.addColorStop(0, '#0b0806'); g.addColorStop(.38, '#0b0806'); g.addColorStop(.42, spec.iris || '#4a2a16'); g.addColorStop(.95, '#1c120c'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, IR, 0, 7); x.fill(); x.restore(); x.fillStyle = 'rgba(255,255,255,.95)'; x.fillRect(w * .25 + 4, h / 2 - 6, 4, 4); x.fillRect(w * .25 - 6, h / 2 + 4, 2, 2); });
  const hp0 = head('head');
  ['l', 'r'].forEach(sd => { const e = new THREE.Vector3(...D.eyeC[sd]); const g = new THREE.SphereGeometry(spec.eyeR ?? .0118, 20, 14); 
    const m = new THREE.Mesh(g, L({ map: irisTex })); m.position.copy(e).sub(hp0); m.position.z -= .002; C.bones.head.add(m); C.eyeballs.push(m); });
  mats[2].visible = false; if (spec.faceTex) C.eyeballs.forEach(e => e.visible = false);
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
  const strands = tex(16, 32, (x, w, h) => { x.fillStyle = spec.hair; x.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? '255,235,210' : '0,0,0'},${.12 + Math.random() * .16})`; x.fillRect(Math.random() * w | 0, 0, 1, h); } for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(Math.random() * w | 0, Math.random() * h | 0, 1, 3); } }); strands.magFilter = F();
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
  const curlM = L({ map: (() => { const t = tex(16, 16, (x, w, h) => noise(x, w, h, spec.hair, 30)); t.magFilter = F(); return t; })() });
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
  styleHead(C, spec, headB, hm, fy, ez, eyeL, hp);
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

// --- signature accessories ----------------------------------------------------
const M3 = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
function styleHead(C, spec, H, hm, fy, ez, eyeL, hp) {
  const hc = new THREE.Vector3(0, fy + .005, ez - .092); // approx skull center in head space
  if (spec.cards) hairCards(H, spec, hc, hm);
  const curlT = (() => { const t = tex(16, 16, (x, w, h) => { for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) { const v = 150 + Math.sin(i * 1.7 + y * 2.3) * 60 + Math.random() * 40; x.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`; x.fillRect(i, y, 1, 1); } }); t.magFilter = F(); return t; })();
  const curlM = M3(spec.hair, { map: curlT });
  let cs = 4242; const cr = () => (cs = (cs * 16807) % 2147483647) / 2147483647;
  const curls = (center, rad, n, size, opt = {}) => { for (let i = 0; i < n; i++) { const th = cr() * Math.PI * 2, ph = Math.acos(1 - 2 * cr() * (opt.cap ?? 1)), r = rad * (.86 + cr() * .2);
      const g = new THREE.TorusKnotGeometry(size, size * .45, 16, 5, 2, 3); const m = new THREE.Mesh(g, curlM);
      m.position.set(center.x + Math.sin(ph) * Math.cos(th) * r * (opt.sx ?? 1), center.y + Math.cos(ph) * r * (opt.sy ?? 1), center.z + Math.sin(ph) * Math.sin(th) * r * (opt.sz ?? 1)); m.rotation.set(cr() * 6, cr() * 6, cr() * 6); m.castShadow = true; H.add(m); } };
  if (spec.curlBuns) [-1, 1].forEach(sd => { const c = new THREE.Vector3(sd * .06, fy + .088, ez - .088); const core = new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 8), curlM); core.position.copy(c); H.add(core); curls(c, .034, 70, .0065);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(.028, .006, 6, 16), M3(spec.scrunchie || '#C9A7F5')); tie.position.copy(c).add(new THREE.Vector3(-sd * .01, -.026, 0)); tie.rotation.set(Math.PI / 2, 0, -sd * .5); H.add(tie); });
  if ((spec.curlTop || spec.curlBuns) && C.hair) { const sl = tex(16, 16, (x, w, h) => { for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) { const v = 170 + Math.sin(i * 2.1) * 25 + Math.random() * 30; x.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`; x.fillRect(i, y, 1, 1); } }); sl.magFilter = F(); sl.wrapS = sl.wrapT = THREE.RepeatWrapping; C.hair.material = M3(spec.hair, { map: sl, side: THREE.DoubleSide }); }
  if (spec.curlTop) { const c = new THREE.Vector3(0, fy + .045, ez - .075); curls(c, .068, spec.curlTop, .0075, { sy: .5, sx: 1.0, sz: 1.12, cap: .5 }); }
  if (spec.cap) { // baseball cap: six-panel crown + curved brim
    const g = new THREE.Group(); g.position.copy(hc).add(new THREE.Vector3(0, spec.capY ?? .0, spec.capZ ?? .006)); H.add(g);
    const CH = spec.capH ?? .78; const cm = new THREE.MeshStandardMaterial({ color: spec.cap, roughness: .85 }), R0 = spec.capR ?? .086;
    const crown = new THREE.Mesh(new THREE.SphereGeometry(R0, 48, 24, 0, Math.PI * 2, 0, Math.PI * .5), cm); crown.scale.set(1, spec.capH ?? .78, 1.13); g.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(R0, R0 * 1.01, .018, 48, 1, true), cm); band.scale.set(1, 1, 1.13); band.position.y = -.009; g.add(band);
    const seamM = new THREE.MeshStandardMaterial({ color: new THREE.Color(spec.cap).multiplyScalar(.82), roughness: .9 });
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + Math.PI / 6; const pts = []; for (let t = 0; t <= 12; t++) { const ph = t / 12 * Math.PI / 2; pts.push(new THREE.Vector3(Math.sin(ph) * Math.sin(a) * R0 * 1.002, Math.cos(ph) * R0 * CH + .0005, Math.sin(ph) * Math.cos(a) * R0 * 1.13 * 1.002)); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, .0012, 4), seamM)); }
    [0, 1, 2, 3, 4, 5].forEach(k => { const a = k / 6 * Math.PI * 2; const e = new THREE.Mesh(new THREE.CircleGeometry(.003, 8), seamM); const ph = Math.PI * .28; e.position.set(Math.sin(ph) * Math.sin(a) * R0 * 1.003, Math.cos(ph) * R0 * CH, Math.sin(ph) * Math.cos(a) * R0 * 1.13 * 1.003); e.lookAt(e.position.clone().multiplyScalar(2)); g.add(e); });
    const btn = new THREE.Mesh(new THREE.SphereGeometry(.007, 12, 8), cm); btn.scale.y = .5; btn.position.y = R0 * CH; g.add(btn);
    // brim: curved annulus segment in front, drooping at the sides
    const bw = Math.PI * .62, BL = spec.brimLen ?? .075, P = [], I = [], segA = 24, segR = 6;
    for (let ia = 0; ia <= segA; ia++) { const a = -bw / 2 + ia / segA * bw;
      for (let ir = 0; ir <= segR; ir++) { const u = ir / segR, r0x = R0 * .99, r0z = R0 * 1.13 * .99, cosA = Math.cos(a), sinA = Math.sin(a);
        const L = BL * Math.pow(Math.cos(a / bw * Math.PI), .6) * u; const x = sinA * (r0x + L * .8), z = cosA * (r0z + L);
        const y = -.012 - u * .006 - Math.pow(Math.abs(a) / (bw / 2), 2) * .014 * u; P.push(x, y, z); } }
    for (let ia = 0; ia < segA; ia++) for (let ir = 0; ir < segR; ir++) { const a = ia * (segR + 1) + ir, b = a + segR + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); bg.setIndex(I); bg.computeVertexNormals();
    const brim = new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ color: spec.capBrim || spec.cap, roughness: .85, side: THREE.DoubleSide })); g.add(brim);
    const under = brim.clone(); under.material = new THREE.MeshStandardMaterial({ color: spec.capUnder || new THREE.Color(spec.capBrim || spec.cap).multiplyScalar(.9), roughness: .9, side: THREE.DoubleSide }); under.position.y = -.0025; g.add(under);
    g.rotation.x = spec.capTilt ?? -.12; if (spec.capBack) g.rotation.y = Math.PI; g.scale.setScalar(spec.capScale ?? 1);
    C.cap = g; if (C.hair && !spec.capBack) C.hair.visible = false;
  }
  if (spec.buns) [-1, 1].forEach(sd => { const b = new THREE.Mesh(new THREE.SphereGeometry(.036, 14, 10), M3(spec.hair, { map: (() => { const t = tex(16, 16, (x, w, h) => noise(x, w, h, '#ffffff', 40)); t.magFilter = F(); return t; })() })); b.position.set(sd * .058, fy + .085, ez - .085); H.add(b);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(.03, .006, 6, 16), M3(spec.scrunchie || '#C9A7F5')); tie.position.copy(b.position).add(new THREE.Vector3(-sd * .012, -.022, 0)); tie.rotation.set(Math.PI / 2, 0, -sd * .5); H.add(tie); });
  if (spec.clips) spec.clips.forEach((col, i) => { const wing = new THREE.Group(); [-1, 1].forEach(w => { const m = new THREE.Mesh(new THREE.CircleGeometry(.011, 10), M3(col, { side: THREE.DoubleSide, emissive: '#222' })); m.scale.set(1, .75, 1); m.position.x = w * .009; m.rotation.z = w * .4; wing.add(m); });
    const a = [-.9, -.35, .35, .9][i % 4]; wing.position.set(Math.sin(a) * .088, fy + .03 - Math.abs(a) * .02, ez - .09 + Math.cos(a) * .1); wing.lookAt(H.localToWorld(wing.position.clone().multiplyScalar(2))); wing.lookAt(wing.position.clone().add(new THREE.Vector3(Math.sin(a), .3, Math.cos(a)))); H.add(wing); });
  if (spec.shadesUp) { const g = new THREE.Group(); const lm = new THREE.MeshLambertMaterial({ color: spec.shadesUp, transparent: true, opacity: .75 });
    [-1, 1].forEach(sd => { const l = new THREE.Mesh(new THREE.CircleGeometry(.022, 16), lm); l.scale.set(1.35, .85, 1); l.position.x = sd * .034; g.add(l); });
    const br = new THREE.Mesh(new THREE.BoxGeometry(.03, .004, .004), M3('#e8e0f0')); g.add(br); g.position.set(0, fy + .07, ez + .0); g.rotation.x = -1.0; H.add(g); }
  if (spec.lashes2 && !spec.faceTex) { C.lashes = []; [-1, 1].forEach(sd => { const ec = (sd > 0 ? C.eyeC.l : C.eyeC.r), g = new THREE.Group(); const lm = M3('#0d0806');
      for (let i = 0; i < 7; i++) { const u = i / 6 - .5, x = u * .026, out = sd * u > 0 ? Math.abs(u) : 0; const l = new THREE.Mesh(new THREE.BoxGeometry(.0022, .009 + out * .009, .0016), lm);
        l.position.set(sd * 0 + x, .0075 - u * u * .01 + out * .002, .004); l.rotation.z = -u * 1.1 - sd * out * .3; l.rotation.x = -.6; g.add(l); }
      g.position.set(ec.x - hp.x, ec.y - hp.y, ec.z - hp.z + .009); H.add(g); C.lashes.push(g); }); }
  if (spec.nosePierce) { const tip = C.noseTip.clone().sub(hp); const m = spec.nosePierce === 'septum' ? new THREE.Mesh(new THREE.TorusGeometry(.0055, .0011, 6, 16), M3('#D8D8D8', { emissive: '#333' })) : new THREE.Mesh(new THREE.SphereGeometry(.0022, 8, 6), M3('#F2E6C9', { emissive: '#665' }));
    if (spec.nosePierce === 'septum') { m.position.set(tip.x, tip.y - .012, tip.z - .006); } else { m.position.set(tip.x + .011, tip.y - .006, tip.z - .01); } H.add(m); }
  if (spec.moneyPiece) [-1, 1].forEach(sd => { const st = new THREE.Mesh(new THREE.BoxGeometry(.008, .15, .01), M3(spec.moneyPiece, { map: (() => { const t = tex(4, 32, (x, w, h) => noise(x, w, h, '#ffffff', 30)); t.magFilter = F(); return t; })() }));
      st.position.set(sd * .062, fy - .055, ez - .045); st.rotation.z = sd * .1; st.rotation.x = .1; H.add(st); });
  if (spec.earStack) [-1, 1].forEach(sd => { for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(.005, .0012, 5, 12), M3('#E9C45A', { emissive: '#4a3500' })); r.position.set(sd * (Math.abs(eyeL.x) + .03), eyeL.y - hp.y - .035 + i * .012, eyeL.z - hp.z - .07); r.rotation.y = Math.PI / 2; H.add(r); } });
  if (spec.studs) [-1, 1].forEach(sd => { const st = new THREE.Mesh(new THREE.SphereGeometry(.0035, 8, 6), M3('#F2E6C9', { emissive: '#554a2a' })); st.position.set(sd * (Math.abs(eyeL.x) + .028), eyeL.y - hp.y - .052, eyeL.z - hp.z - .072); H.add(st); });
  if (spec.roundGlasses) { const g = new THREE.Group(), fm = M3(spec.roundGlasses);
    [-1, 1].forEach(sd => { const r = new THREE.Mesh(new THREE.TorusGeometry(.019, .0016, 6, 24), fm); r.position.x = sd * Math.abs(eyeL.x); g.add(r);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(.002, .002, .1), fm); arm.position.set(sd * (Math.abs(eyeL.x) + .019), 0, -.05); g.add(arm); });
    const br = new THREE.Mesh(new THREE.TorusGeometry(.009, .0014, 4, 10, Math.PI), fm); g.add(br); g.position.set(0, eyeL.y - hp.y, eyeL.z - hp.z + .018); H.add(g); C.glasses = g; }
}
// body accessories: call after makeMH, positions in world bind space
export function styleBody(C, D, spec) {
  const B = C.bones, bp = n => new THREE.Vector3(...D.bones.find(b => b.n === n).h);
  const at = (bone, obj, world) => { obj.position.copy(world).sub(bp(bone)); B[bone].add(obj); return obj; };
  const PA = C.mesh.geometry.attributes.position; // bind pose (clothes already inflated)
  const surf = (x, y, dir = 'z', r = .025) => { let best = -9; for (let i = 0; i < PA.count; i += 2) { const px = PA.getX(i), py = PA.getY(i); if (Math.abs(py - y) > r) continue;
      if (dir === 'z' && Math.abs(px - x) < r) best = Math.max(best, PA.getZ(i)); if (dir === '+x' && Math.abs(PA.getZ(i)) < r * 2) best = Math.max(best, px); if (dir === '-x' && Math.abs(PA.getZ(i)) < r * 2) best = Math.max(best, -px); } return best; };
  if (spec.mat) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .62, 18), M3(spec.mat)); m.rotation.z = Math.PI / 2 - .45; const ends = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .625, 14), M3(new THREE.Color(spec.mat).multiplyScalar(.8))); ends.rotation.copy(m.rotation);
    const g = new THREE.Group(); g.add(m); g.add(ends); at('spine03', g, new THREE.Vector3(0, 1.22, -.16)); }
  const wristBand = (side, col, r = .036, n = 1, thick = .004) => { for (let i = 0; i < n; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, thick, 6, 20), M3(Array.isArray(col) ? col[i % col.length] : col, { emissive: '#222' })); t.rotation.y = Math.PI / 2; t.position.x = (side === 'L' ? 1 : -1) * (-.01 - i * .009); B['lowerarm02.' + side].add(t); t.position.add(new THREE.Vector3(0, -.12, 0)); } };
  if (spec.tennis) wristBand(spec.tennis, '#F4F1EA', .03, 1, .0025);
  if (spec.bangles) wristBand('L', spec.bangles, .035, spec.bangles.length, .005);
  if (spec.charmBag) { const bag = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(.2, .13, .06), M3(spec.charmBag)); bag.add(body);
    const cols = ['#FF7AB6', '#7AD3FF', '#FFE36E', '#B7F07A', '#C9A7F5', '#FF9F5A', '#ffffff'];
    for (let i = 0; i < 9; i++) { const ch = new THREE.Mesh(i % 3 ? new THREE.SphereGeometry(.013, 8, 6) : new THREE.BoxGeometry(.022, .022, .01), M3(cols[i % cols.length], { emissive: '#333' })); ch.position.set(-.09 + i * .022, -.075 - (i % 2) * .018, .035); bag.add(ch); }
    at('pelvis.R', bag, new THREE.Vector3(-.16, .92, .1)); bag.rotation.y = .5;
    const sb = bp('spine05'), pts = [[.1, 1.4], [.05, 1.3], [0, 1.2], [-.07, 1.1], [-.13, .99]].map(([x, y]) => new THREE.Vector3(x, y, surf(x, y) + .008).sub(sb));
    const strap = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .006, 5), M3(spec.charmBag)); B.spine05.add(strap); }
  if (spec.cargo) ['L', 'R'].forEach(sd => { const pk = new THREE.Mesh(new THREE.BoxGeometry(.06, .08, .02), M3(new THREE.Color(spec.legs).multiplyScalar(.85))); const x = (sd === 'L' ? 1 : -1) * (surf(0, .66, sd === 'L' ? '+x' : '-x') + .004);
    at('upperleg02.' + sd, pk, new THREE.Vector3(x, .66, .0)); pk.rotation.y = (sd === 'L' ? 1 : -1) * 1.1; const flap = new THREE.Mesh(new THREE.BoxGeometry(.064, .02, .024), M3(new THREE.Color(spec.legs).multiplyScalar(.75))); flap.position.y = .04; pk.add(flap); });
  if (spec.platforms) ['L', 'R'].forEach(sd => { const so = new THREE.Mesh(new THREE.BoxGeometry(.1, .035, .27), M3(spec.platforms)); const fa = bp('foot.' + sd); at('foot.' + sd, so, new THREE.Vector3(fa.x, .0, fa.z + .045)); });
  if (spec.camera) { const cam = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(.1, .062, .04), M3('#2a2a2a')); cam.add(b); const top = new THREE.Mesh(new THREE.BoxGeometry(.1, .02, .04), M3('#c9c9c9')); top.position.y = .035; cam.add(top);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(.02, .022, .03, 16), M3('#1a1a1a')); lens.rotation.x = Math.PI / 2; lens.position.z = .03; cam.add(lens); const gl = new THREE.Mesh(new THREE.CircleGeometry(.015, 16), M3('#5a7aa8', { emissive: '#223' })); gl.position.z = .046; cam.add(gl);
    at('spine03', cam, new THREE.Vector3(0, 1.17, .17)); const strap = new THREE.Mesh(new THREE.TorusGeometry(.13, .004, 4, 30, Math.PI), M3('#5a3a22')); strap.rotation.z = Math.PI; strap.position.y = .17; strap.scale.set(1, 1.35, 1); cam.add(strap); C.camera = cam; }
  if (spec.keys) { const k = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(.016, .002, 6, 16), M3('#d8d8d8')); k.add(ring); const fob = new THREE.Mesh(new THREE.BoxGeometry(.022, .036, .01), M3('#111')); fob.position.y = -.03; k.add(fob);
    const key = new THREE.Mesh(new THREE.BoxGeometry(.008, .04, .002), M3('#c8c8c8')); key.position.set(.014, -.028, 0); k.add(key); B['wrist.R'].add(k); k.position.set(-.02, -.1, .02); C.keys = k; }
}

// eyes look direction (x: + = character's left, y: + = up), lashes hide on blink
export function look(C, x = 0, y = 0) { (C.eyeballs || []).forEach(e => { e.rotation.set(-y * .5, x * .6, 0); }); }
export function lashBlink(C, v) { (C.lashes || []).forEach(l => l.visible = v < .5); }

// game-style hair: tapered strand cards falling from a ring around the skull (middle part)
function hairCards(H, spec, hc, hm) {
  const o = spec.cards, n = o.count ?? 46, len = o.len ?? .3, segs = 10, R0 = o.r ?? .1, rootY = o.rootY ?? .03;
  const col = new THREE.Color(spec.hair), hi = new THREE.Color(o.tips || spec.hair);
  const strandT = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d');
    for (let i = 0; i < 64; i++) { const v = 175 + Math.sin(i * 1.7) * 25 + Math.sin(i * .43) * 30 + Math.random() * 25; x.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`; x.fillRect(i, 0, 1, 256); }
    for (let k = 0; k < 40; k++) { x.fillStyle = `rgba(255,255,255,${.08 + Math.random() * .12})`; x.fillRect(Math.random() * 64 | 0, 0, 1, 256); }
    const im = x.getImageData(0, 0, 64, 256); for (let y = 0; y < 256; y++) for (let i = 0; i < 64; i++) { const e = Math.min(i, 63 - i) / 10, tip = y > 200 ? Math.max(0, 1 - (y - 200) / 56 * (1 + Math.abs(Math.sin(i * 1.3)))) : 1;
      im.data[(y * 64 + i) * 4 + 3] = 255 * Math.min(1, e) * tip; } x.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  strandT.magFilter = F(); strandT.wrapS = strandT.wrapT = THREE.RepeatWrapping;
  let sd = 77; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < n; k++) {
    const a = (k / (n - 1) - .5) * Math.PI * (o.spread ?? 1.72) + Math.PI; // around the back, ends at the temples
    const side = Math.sin(a) >= 0 ? 1 : -1;
    const dirOut = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const root = hc.clone().add(new THREE.Vector3(Math.sin(a) * R0 * .95, rootY + Math.cos(a) * -.01, Math.cos(a) * R0 * 1.12));
    const streak = (o.streaks ?? 0) > rr() ? .45 + rr() * .3 : rr() * .12;
    const P = [], N = [], UV = [], I = [], C2 = [], w0 = (o.width ?? .034) * (.8 + rr() * .4), L = len * (.85 + rr() * .3);
    for (let j = 0; j <= segs; j++) { const t = j / segs;
      const out = Math.sin(Math.min(1, t * 2.2) * Math.PI / 2) * (o.bulge ?? .028) + t * .006;
      const c = root.clone().addScaledVector(dirOut, out).add(new THREE.Vector3(0, -t * L, 0)).add(new THREE.Vector3(Math.sin(t * 6 + k) * .004 * (o.wave ?? 1), 0, 0));
      const tan = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)); const w = w0 * (1 - t * .75);
      [-1, 1].forEach(e => { const q = c.clone().addScaledVector(tan, e * w / 2); P.push(q.x, q.y, q.z); N.push(dirOut.x, 0, dirOut.z); UV.push(e > 0 ? 1 : 0, t * .98); const cc = col.clone().lerp(hi, Math.min(1, Math.pow(t, 1.3) * .8 + streak)); C2.push(cc.r, cc.g, cc.b); }); }
    for (let j = 0; j < segs; j++) { const b = j * 2; I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(C2, 3)); g.setIndex(I);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: strandT, vertexColors: true, side: THREE.DoubleSide, alphaTest: .35, roughness: .55 })); m.castShadow = true; H.add(m);
  }
}

// projected face: the body's front-facing head polygons re-drawn with a painted face texture (aligned to faceview.html)
function addFace(C, D, geo, pos, spec, body) {
  const { cx, cy, half } = spec.faceProj, n = pos.length / 3, nrm = geo.attributes.normal;
  const fg = geo.clone(); const uv = new Float32Array(n * 2), col = new Float32Array(n * 4);

  for (let i = 0; i < n; i++) { const x = pos[i * 3], y = pos[i * 3 + 1]; uv[i * 2] = (x - cx) / half * .5 + .5; uv[i * 2 + 1] = (y - cy) / half * .5 + .5;
    const nz = nrm.getZ(i); const ex = Math.abs(x) / (half * .8), ey2 = (y - (cy + .005)) / (half * (y < cy ? (spec.faceChin ?? .6) : .95)); const r = Math.hypot(ex, ey2);
    let a = Math.min(1, Math.max(0, (nz - .2) / .35)) * Math.min(1, Math.max(0, (1 - r) / .18));
    if (spec.faceTop != null) a *= Math.min(1, Math.max(0, (D.eyeC.l[1] + spec.faceTop - y) / .006));
    col[i * 4] = col[i * 4 + 1] = col[i * 4 + 2] = 1; col[i * 4 + 3] = a; }
  fg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); fg.setAttribute('color', new THREE.BufferAttribute(col, 4));
  const bI = D.groups.body, I = []; for (let k = 0; k < bI.length; k += 3) { const t = [bI[k], bI[k + 1], bI[k + 2]]; if (t.every(v => col[v * 4 + 3] > 0.001)) I.push(...t); }
  fg.clearGroups(); fg.setIndex(I);
  let done; C.loading = (C.loading || []).concat(new Promise(r => done = r)); const t = new THREE.TextureLoader().load(spec.faceTex, () => done()); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = F(); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  const m = new THREE.MeshLambertMaterial({ map: t, vertexColors: true, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false });
  const fm = new THREE.SkinnedMesh(fg, m); fm.frustumCulled = false; fm.bind(body.skeleton, body.bindMatrix);
  fm.morphTargetDictionary = body.morphTargetDictionary; fm.morphTargetInfluences = body.morphTargetInfluences; C.root.add(fm); C.faceMesh = fm;
}

// projected outfit: front/back painted turnaround (bodyview.html layout: front left half, back right half)
function addOutfit(C, geo, pos, spec, body) {
  const { cy, hh, hw } = spec.outfitProj, n = pos.length / 3, nrm = geo.attributes.normal;
  let done; C.loading = (C.loading || []).concat(new Promise(r => done = r));
  const t = new THREE.TextureLoader().load(spec.outfitTex, () => done()); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = F(); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  for (const side of [1, -1]) {
    const g = geo.clone(), uv = new Float32Array(n * 2), col = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const x = pos[i * 3], y = pos[i * 3 + 1], nz = nrm.getZ(i) * side;
      const u = side > 0 ? (x / hw * .5 + .5) * .5 : .5 + (-x / hw * .5 + .5) * .5; uv[i * 2] = u; uv[i * 2 + 1] = (y - cy) / hh * .5 + .5;
      col[i * 4] = col[i * 4 + 1] = col[i * 4 + 2] = 1; col[i * 4 + 3] = Math.min(1, Math.max(0, (nz + .12) / .3)); }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(col, 4));
    const I = []; const ci = C.clothIdx; for (let k = 0; k < ci.length; k += 3) if (col[ci[k] * 4 + 3] + col[ci[k + 1] * 4 + 3] + col[ci[k + 2] * 4 + 3] > .01) I.push(ci[k], ci[k + 1], ci[k + 2]);
    g.clearGroups(); g.setIndex(I);
    const m = new THREE.MeshLambertMaterial({ map: t, vertexColors: true, transparent: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, depthWrite: false });
    const om = new THREE.SkinnedMesh(g, m); om.frustumCulled = false; om.bind(body.skeleton, body.bindMatrix); om.morphTargetDictionary = body.morphTargetDictionary; om.morphTargetInfluences = body.morphTargetInfluences; C.root.add(om);
  }
}
