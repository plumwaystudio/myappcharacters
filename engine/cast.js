// PS2-style original cast built from primitives + low-res canvas textures.
import * as THREE from 'three';

export function tex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export function noise(g, w, h, base, amt = 14) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h / 3; i++) { const v = (rnd() - .5) * amt; g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 100})`; g.fillRect(rnd() * w | 0, rnd() * h | 0, 1, 1); }
}
const L = (o) => new THREE.MeshLambertMaterial(o);
const plain = (col, amt = 10) => L({ map: tex(32, 32, (g, w, h) => noise(g, w, h, col, amt)) });

function cap(r, len, mat, seg = 12) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, seg), mat); m.castShadow = true; return m; }
function sph(r, mat, s = 20) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, s, Math.round(s * .75)), mat); m.castShadow = true; return m; }
function box(w, h, d, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d, 2, 2, 2), mat); m.castShadow = true; return m; }

// limb: pivot group at the joint, mesh hanging down
function limb(r, len, mat) { const g = new THREE.Group(); const m = cap(r, len, mat); m.position.y = -len / 2 - r * .3; g.add(m); g.userData.len = len + r; return g; }

/* spec: {skin, top, topTex, sleeve:'short'|'long', sleeveMat, legs, shoes, hair:'curls'|'fade'|'pony'|'puffs', hairCol, extra:fn, wide, lashes} */
export function makeChar(spec) {
  const root = new THREE.Group(), C = { root, spec };
  const skin = plain(spec.skin, 8), top = spec.topMat || plain(spec.top, 12), legs = spec.legsMat || plain(spec.legs, 16), shoe = plain(spec.shoes, 6);
  const hips = new THREE.Group(); hips.position.y = .95; root.add(hips); C.hips = hips;
  // legs
  ['L', 'R'].forEach((s, i) => {
    const x = i ? -.1 : .1, up = limb(.075, .36, legs); up.position.set(x, 0, 0); hips.add(up);
    const lo = limb(.065, .36, legs); lo.position.y = -.47; up.add(lo);
    const sh = box(.13, .09, .26, shoe); sh.position.set(0, -.44, .05); lo.add(sh);
    const sole = box(.135, .03, .27, plain('#F2F2F2', 4)); sole.position.set(0, -.49, .05); lo.add(sole);
    C['leg' + s] = up; C['knee' + s] = lo;
  });
  const pel = box(.32, .16, .2, legs); pel.position.y = .02; hips.add(pel);
  // torso
  const chest = new THREE.Group(); chest.position.y = .08; hips.add(chest); C.chest = chest;
  const wide = spec.wide || 1;
  const torso = cap(.17, .3, top, 16); torso.scale.set(1.1 * wide, 1, .7 * Math.min(1.2, wide)); torso.position.y = .25; chest.add(torso);
  if (spec.torsoExtra) spec.torsoExtra(chest, C);
  // neck + head
  const neck = cap(.05, .06, skin); neck.position.y = .55; chest.add(neck);
  const head = new THREE.Group(); head.position.y = .62; chest.add(head); C.head = head;
  const skull = sph(.125, skin, 24); skull.scale.set(.95, 1.12, 1); skull.position.y = .12; head.add(skull);
  const jaw = sph(.1, skin, 18); jaw.scale.set(.9, .7, .95); jaw.position.set(0, .04, .015); head.add(jaw);
  [-1, 1].forEach(s => { const ear = sph(.03, skin, 10); ear.scale.set(.5, 1, .8); ear.position.set(s * .118, .12, 0); head.add(ear); });
  const nose = sph(.024, skin, 10); nose.scale.set(.9, 1.1, 1.3); nose.position.set(0, .1, .118); head.add(nose);
  // eyes
  const white = L({ color: '#F4F1EA' }), iris = L({ color: '#2A1A12' }), dark = L({ color: '#1A1110' });
  C.eyes = [];
  [-1, 1].forEach(s => {
    const eg = new THREE.Group(); eg.position.set(s * .043, .14, .105); head.add(eg);
    const w = sph(.021, white, 12); w.scale.set(1.15, .85, .5); eg.add(w);
    const ir = sph(.011, iris, 10); ir.position.z = .009; eg.add(ir);
    const lid = sph(.023, skin, 12); lid.scale.set(1.2, .3, .6); lid.position.set(0, .016, .002); eg.add(lid); eg.userData.lid = lid;
    const brow = box(.045, .009, .012, plain(spec.hairCol || '#1a1310', 4)); brow.position.set(s * .043, .175, .112); brow.rotation.z = -s * .08; head.add(brow); eg.userData.brow = brow;
    if (spec.lashes) { const lash = box(.05, .006, .01, dark); lash.position.set(0, .012, .008); lash.rotation.z = -s * .25; eg.add(lash); }
    C.eyes.push(eg);
  });
  // mouth (scales with voice)
  const mouth = sph(.03, L({ color: '#3B1414' }), 12); mouth.scale.set(1.1, .18, .4); mouth.position.set(0, .06, .107); head.add(mouth); C.mouth = mouth;
  const lip = box(.05, .008, .01, L({ color: spec.lip || '#8A4B3C' })); lip.position.set(0, .068, .112); head.add(lip);
  // hair
  const hm = plain(spec.hairCol || '#1a1310', 22);
  if (spec.hair === 'curls') {
    seed = 11; for (let i = 0; i < 95; i++) { const th = rnd() * Math.PI * 2, ph = rnd() * 1.15; const r = .13 + rnd() * .02;
      const b = sph(.032 + rnd() * .012, hm, 8); b.position.set(Math.sin(ph) * Math.cos(th) * r * 1.0, .14 + Math.cos(ph) * r * 1.12 + .02, Math.sin(ph) * Math.sin(th) * r - .01);
      if (b.position.z > .07 && b.position.y < .2) continue; head.add(b); }
  } else if (spec.hair === 'fade') {
    const capg = new THREE.Mesh(new THREE.SphereGeometry(.131, 20, 12, 0, Math.PI * 2, 0, Math.PI * .4), hm); capg.scale.set(.98, 1.04, 1.02); capg.position.set(0, .15, -.01); capg.rotation.x = .25; head.add(capg);
    const top = new THREE.Mesh(new THREE.SphereGeometry(.1, 16, 8, 0, Math.PI * 2, 0, Math.PI * .5), hm); top.scale.set(1.0, .35, 1.0); top.position.set(0, .24, -.01); head.add(top);
  } else if (spec.hair === 'pony') {
    const capg = new THREE.Mesh(new THREE.SphereGeometry(.136, 20, 12, 0, Math.PI * 2, 0, Math.PI * .56), hm); capg.scale.set(.97, 1.08, 1.03); capg.position.set(0, .14, -.012); capg.rotation.x = .3; head.add(capg);
    const tie = sph(.04, hm, 10); tie.position.set(0, .27, -.07); head.add(tie);
    const tail = cap(.045, .22, hm); tail.position.set(0, .16, -.15); tail.rotation.x = .35; head.add(tail); C.tail = tail;
  } else if (spec.hair === 'puffs') {
    const capg = new THREE.Mesh(new THREE.SphereGeometry(.134, 20, 12, 0, Math.PI * 2, 0, Math.PI * .5), hm); capg.position.set(0, .14, -.01); capg.rotation.x = .22; head.add(capg);
    [-1, 1].forEach(s => { const p = sph(.068, hm, 14); p.position.set(s * .1, .27, -.03); head.add(p); });
  }
  // arms
  ['L', 'R'].forEach((s, i) => {
    const sx = i ? -1 : 1, sh = new THREE.Group(); sh.position.set(sx * .23 * wide, .42, 0); chest.add(sh);
    const upMat = spec.sleeve === 'short' ? (spec.sleeveMat || top) : (spec.sleeveMat || top);
    const up = limb(.058 * (spec.puffy || 1), .22, upMat); sh.add(up);
    if (spec.sleeve === 'short') { const bare = cap(.048, .1, skin); bare.position.y = -.24; up.add(bare); }
    const el = new THREE.Group(); el.position.y = -.3; up.add(el);
    const lo = limb(.05 * (spec.puffy || 1), .2, spec.sleeve === 'short' ? skin : (spec.sleeveMat || top)); el.add(lo);
    const hand = sph(.045, skin, 12); hand.scale.set(.85, 1.15, .6); hand.position.y = -.29; lo.add(hand);
    if (spec.nails) { const n = box(.05, .015, .03, L({ color: spec.nails })); n.position.set(0, -.34, .02); lo.add(n); }
    const holder = new THREE.Group(); holder.position.y = -.31; lo.add(holder);
    C['sh' + s] = sh; C['el' + s] = el; C['hand' + s] = holder;
    sh.rotation.z = sx * .08;
  });
  if (spec.extra) spec.extra(C);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return C;
}

// props
export function phone(screenTex) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(.075, .15, .01), L({ color: '#151515' })); g.add(body);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(.066, .14), new THREE.MeshBasicMaterial({ map: screenTex || null, color: screenTex ? '#fff' : '#9FC4FF' })); scr.position.z = .0055; g.add(scr); g.userData.screen = scr;
  return g;
}
export function cup(col = '#F5F1E8', lid = '#2A2A2A') {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.CylinderGeometry(.04, .032, .13, 16), L({ color: col })); g.add(c);
  const l = new THREE.Mesh(new THREE.CylinderGeometry(.042, .042, .015, 16), L({ color: lid })); l.position.y = .07; g.add(l);
  const sl = new THREE.Mesh(new THREE.CylinderGeometry(.041, .036, .045, 16), L({ color: '#C08A5B' })); sl.position.y = -.005; g.add(sl);
  return g;
}
export function icedCup() {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.CylinderGeometry(.042, .033, .15, 16), new THREE.MeshLambertMaterial({ color: '#C9A17A', transparent: true, opacity: .92 })); g.add(c);
  const l = new THREE.Mesh(new THREE.SphereGeometry(.043, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), L({ color: '#FFFFFF', transparent: true, opacity: .7 })); l.position.y = .075; g.add(l);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .14, 6), L({ color: '#FF5FA2' })); s.position.set(.01, .14, 0); s.rotation.z = -.15; g.add(s);
  return g;
}
export function shoebox() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(.32, .12, .18), L({ map: tex(64, 32, (x, w, h) => { x.fillStyle = '#FF7A1A'; x.fillRect(0, 0, w, h); x.fillStyle = '#111'; x.fillRect(0, 0, w, 6); x.fillStyle = '#fff'; x.font = 'bold 12px sans-serif'; x.fillText('KICKS', 16, 24); }) })); g.add(b);
  return g;
}

// cast presets (original designs)
export const CAST = {
  lowkey: { skin: '#8A5536', top: '#F4F4F2', sleeve: 'short', legs: '#1C1C20', shoes: '#F5F5F5', hair: 'curls', hairCol: '#1B120E', lip: '#6E3B2B' },
  kid: { skin: '#B97A4E', sleeve: 'long', legs: '#6E8FB8', shoes: '#E23B3B', hair: 'fade', hairCol: '#15100D', wide: 1.08, lip: '#7A4433',
    topMat: L({ map: tex(64, 64, (g, w, h) => { noise(g, w, h, '#1F6BFF', 12); g.fillStyle = '#fff'; g.fillRect(w / 2 - 2, 0, 4, h); g.fillStyle = '#FFE36E'; g.fillRect(0, 6, w, 3); }) }),
    sleeveMat: L({ map: tex(32, 64, (g, w, h) => { noise(g, w, h, '#1F6BFF', 12); g.fillStyle = '#fff'; g.fillRect(4, 0, 4, h); g.fillRect(12, 0, 4, h); }) }),
    extra(C) { const ch = new THREE.Mesh(new THREE.TorusGeometry(.07, .008, 6, 20), L({ color: '#E8C24A' })); ch.position.set(0, .48, .09); ch.rotation.x = 1.2; C.chest.add(ch); } },
  glow: { skin: '#E2B28C', sleeve: 'long', legs: '#A8C4E6', shoes: '#FFFFFF', hair: 'pony', hairCol: '#C99A55', lashes: true, nails: '#FF5FA2', lip: '#C2577A',
    sleeveMat: plain('#F7F3EE', 6),
    topMat: L({ map: tex(64, 64, (g, w, h) => { noise(g, w, h, '#FF8FBF', 10); g.strokeStyle = 'rgba(160,40,90,.45)'; g.lineWidth = 2; for (let y = 6; y < h; y += 11) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }) }) },
  cart: { skin: '#5E3A22', sleeve: 'long', legs: '#8E8E96', shoes: '#2A2A2A', hair: 'puffs', hairCol: '#1A100B', wide: 1.18, puffy: 1.25, lip: '#5A2E22',
    topMat: plain('#B9A6F2', 12),
    extra(C) { const hood = new THREE.Mesh(new THREE.TorusGeometry(.12, .045, 8, 18), plain('#A994E6', 10)); hood.position.set(0, .52, -.06); hood.rotation.x = 1.3; C.chest.add(hood); } }
};

export function pose(C, o = {}) {
  // o: {sway, t, look:[yaw,pitch], armL:[x,z], armR:[x,z], elbowL, elbowR, blink, mouth, lean, browUp}
  const t = o.t || 0, sw = o.sway == null ? 1 : o.sway;
  C.hips.rotation.y = Math.sin(t * .9 + (C.ph || 0)) * .03 * sw;
  C.chest.rotation.z = Math.sin(t * 1.1 + (C.ph || 0)) * .02 * sw;
  C.chest.rotation.x = (o.lean || 0);
  C.chest.position.y = .08 + Math.sin(t * 2 + (C.ph || 0)) * .004;
  const lk = o.look || [0, 0]; C.head.rotation.y = lk[0]; C.head.rotation.x = -lk[1];
  const aL = o.armL || [0, .1], aR = o.armR || [0, -.1];
  C.shL.rotation.x = -aL[0]; C.shL.rotation.z = aL[1]; C.shR.rotation.x = -aR[0]; C.shR.rotation.z = aR[1];
  C.elL.rotation.x = -(o.elbowL || .1); C.elR.rotation.x = -(o.elbowR || .1);
  const bl = o.blink ? 1 : 0;
  C.eyes.forEach(e => { e.userData.lid.scale.y = .3 + bl * .8; e.userData.lid.position.y = .016 - bl * .012; e.userData.brow.position.y = .175 + (o.browUp || 0) * .018; });
  C.mouth.scale.y = .18 + (o.mouth || 0) * .9; C.mouth.position.y = .06 - (o.mouth || 0) * .008;
  if (C.tail) C.tail.rotation.z = Math.sin(t * 2.2) * .12;
}
