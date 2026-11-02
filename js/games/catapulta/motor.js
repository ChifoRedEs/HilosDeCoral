// Motor de Catapulta: física (Matter.js, se le pasa ya cargado) y reglas, sin tocar el DOM. Se prueba con Node (tests/catapulta.mjs).
import { NIVELES } from './niveles.js';

export const W = 900, H = 540, SUELO = 480, HONDA = { x: 140, y: 372 };
export const ARRASTRE = 90, K_LANZ = .16, PASO = 1000 / 60;
const UMBRAL = 4, FACTOR = 6, GRACIA = 70;                   // daño = max(0, velocidad relativa − UMBRAL) · masa reducida · FACTOR (los primeros pasos se ignoran: la estructura se asienta)

export const MATERIALES = {
  madera: { nombre: 'Madera', vida: 60, dens: .0015, pts: 500, fric: .6, rest: .05 },
  piedra: { nombre: 'Piedra', vida: 170, dens: .004, pts: 800, fric: .7, rest: .02 },
  hielo: { nombre: 'Hielo', vida: 30, dens: .0009, pts: 300, fric: .08, rest: .05 },
  hierro: { nombre: 'Hierro', vida: 420, dens: .006, pts: 1200, fric: .45, rest: .03 },
};
// Las 4 clases de proyectil (el dibujo y el nombre dependen del avatar elegido: avatares.js)
export const AVES = {
  normal: { r: 21, dens: .0027, mult: 1.25, hab: 'Sin habilidad: pura fuerza.' },
  divisible: { r: 18, dens: .0023, mult: 1.2, hab: 'Toca en el aire: se divide en tres.' },
  acelerador: { r: 19.5, dens: .0027, mult: 1.25, hab: 'Toca en el aire: sale disparado y arrasa con todo (daño ×2,5).' },
  bomba: { r: 24, dens: .0033, mult: 1.25, hab: 'Toca en el aire (o al chocar): explota.' },
};
export const DANO_ACEL = 3.1;                                 // multiplicador de daño del acelerador una vez activada la habilidad
export const CERDO = { r: 27, vida: 45, dens: .0013, pts: 5000 };
export const PTS_AVE = 10000;

export function crear(M, n) {
  const niv = NIVELES[n - 1];
  const engine = M.Engine.create({ positionIterations: 10, velocityIterations: 8 });
  engine.gravity.y = 1;
  const m = { M, engine, n, niv, bloques: [], cerdos: [], vuelan: [], cola: niv.aves.slice(), pasos: 0, puntos: 0, ev: [], tVuelo: 0, tQuieto: 0 };
  const suelo = M.Bodies.rectangle(W / 2, SUELO + 50, 4000, 100, { isStatic: true, friction: 1, label: 'suelo' });
  suelo.plugin.jr = { tipo: 'suelo' };
  M.Composite.add(engine.world, suelo);
  for (const b of niv.bloques) {
    const mat = MATERIALES[b.m];
    const c = M.Bodies.rectangle(b.x, b.y, b.w, b.h, { density: mat.dens, friction: mat.fric, frictionStatic: 1, restitution: mat.rest, slop: .02 });
    const o = { tipo: 'bloque', cuerpo: c, m: b.m, w: b.w, h: b.h, vida: mat.vida, vida0: mat.vida, dano: 0 };
    c.plugin.jr = o; m.bloques.push(o); M.Composite.add(engine.world, c);
  }
  for (const p of niv.cerdos) {
    const c = M.Bodies.circle(p.x, p.y, p.r, { density: CERDO.dens, friction: .6, frictionStatic: 1, restitution: .05 });
    const o = { tipo: 'cerdo', cuerpo: c, r: p.r, vida: CERDO.vida, vida0: CERDO.vida, dano: 0, vivo: true };
    c.plugin.jr = o; m.cerdos.push(o); M.Composite.add(engine.world, c);
  }
  M.Events.on(engine, 'collisionStart', e => choques(m, e));
  return m;
}

function masaRed(a, b) { return a.isStatic ? b.mass : b.isStatic ? a.mass : a.mass * b.mass / (a.mass + b.mass); }
function choques(m, e) {
  if (m.pasos < GRACIA) return;
  for (const p of e.pairs) {
    const a = p.bodyA, b = p.bodyB, ja = a.plugin.jr, jb = b.plugin.jr;
    if (!ja || !jb) continue;
    const rv = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
    if (rv <= UMBRAL) continue;
    const d = (rv - UMBRAL) * masaRed(a, b) * FACTOR * Math.max(ja.tipo === 'ave' ? ja.mult || 1 : 1, jb.tipo === 'ave' ? jb.mult || 1 : 1);
    if (ja.dano !== undefined) ja.dano += d;
    if (jb.dano !== undefined) jb.dano += d;
    if (ja.tipo === 'ave' && ja.bomba && !ja.usada) ja.estalla = true;
    if (jb.tipo === 'ave' && jb.bomba && !jb.usada) jb.estalla = true;
    if (rv > 6 && (ja.tipo !== 'suelo' || jb.tipo !== 'suelo')) m.ev.push({ t: 'golpe', x: (a.position.x + b.position.x) / 2, y: (a.position.y + b.position.y) / 2, f: Math.min(1, rv / 14) });
  }
}

export function trayectoria(vx, vy, n = 40, paso = 3) {
  const g = .2777778, pts = []; let x = HONDA.x, y = HONDA.y, ux = vx, uy = vy;
  for (let i = 0; i < n * paso; i++) { uy += g; x += ux; y += uy; if (i % paso === paso - 1) pts.push({ x, y }); if (y > SUELO) break; }
  return pts;
}

export function lanzar(m, vx, vy) {
  const tipo = m.cola.shift(); if (!tipo) return null;
  const M = m.M, d = AVES[tipo];
  const c = M.Bodies.circle(HONDA.x, HONDA.y, d.r, { density: d.dens, friction: .5, restitution: .15, frictionAir: 0 });
  const o = { tipo: 'ave', cuerpo: c, clase: tipo, r: d.r, edad: 0, usada: false, bomba: tipo === 'bomba', mult: d.mult, pieza: null };
  c.plugin.jr = o; M.Composite.add(m.engine.world, c);
  M.Body.setVelocity(c, { x: vx, y: vy });
  m.vuelan.push(o); m.tVuelo = 0; m.tQuieto = 0; m.lanzado = o;
  return o;
}

// Toca en pleno vuelo: habilidad del último pájaro lanzado
export function habilidad(m) {
  const o = m.lanzado; if (!o || o.usada || !m.vuelan.includes(o)) return false;
  const M = m.M, c = o.cuerpo, v = c.velocity; o.usada = true;
  if (o.clase === 'acelerador') { M.Body.setVelocity(c, { x: v.x * 1.7, y: v.y * 1.7 }); o.mult = DANO_ACEL; m.ev.push({ t: 'hab', clase: 'acelerador', x: c.position.x, y: c.position.y }); }
  else if (o.clase === 'divisible') {
    o.pieza = 0;
    [-.26, .26].forEach((ang, i) => {
      const cs = Math.cos(ang), sn = Math.sin(ang), r = AVES.divisible.r * .75;
      const h = M.Bodies.circle(c.position.x, c.position.y + (ang < 0 ? -r : r), r, { density: AVES.divisible.dens, friction: .5, restitution: .15, frictionAir: 0 });
      const oh = { tipo: 'ave', cuerpo: h, clase: 'divisible', r, edad: 0, usada: true, hijo: true, mult: AVES.divisible.mult, pieza: i + 1 };
      h.plugin.jr = oh; M.Composite.add(m.engine.world, h); M.Body.setVelocity(h, { x: v.x * cs - v.y * sn, y: v.x * sn + v.y * cs }); m.vuelan.push(oh);
    });
    m.ev.push({ t: 'hab', clase: 'divisible', x: c.position.x, y: c.position.y });
  } else if (o.clase === 'bomba') o.estalla = true;
  else return (o.usada = false);
  return true;
}

function explotar(m, o) {
  const M = m.M, p = o.cuerpo.position, R = 120; o.usada = true;
  for (const b of M.Composite.allBodies(m.engine.world)) {
    if (b.isStatic || b === o.cuerpo) continue;
    const dx = b.position.x - p.x, dy = b.position.y - p.y, d = Math.hypot(dx, dy);
    if (d > R + 30) continue;
    const f = Math.max(0, 1 - d / R), j = b.plugin.jr;
    if (j && j.dano !== undefined) j.dano += 210 * f;
    const k = 9 * f / Math.sqrt(b.mass), n = d || 1;
    M.Body.setVelocity(b, { x: b.velocity.x + dx / n * k, y: b.velocity.y + dy / n * k - f * 2 });
  }
  m.ev.push({ t: 'bomba', x: p.x, y: p.y, R });
  quitar(m, o);
}
function quitar(m, o) { m.M.Composite.remove(m.engine.world, o.cuerpo); const i = m.vuelan.indexOf(o); if (i >= 0) m.vuelan.splice(i, 1); }

// Un paso de física (1/60 s). Devuelve y vacía los eventos (para sonidos y partículas).
export function paso(m) {
  const M = m.M;
  M.Engine.update(m.engine, PASO); m.pasos++;
  for (const o of m.vuelan.slice()) {
    o.edad++;
    const p = o.cuerpo.position;
    if (o.estalla && !o.usada || o.estalla && o.bomba) { explotar(m, o); continue; }
    if (p.x > W + 250 || p.x < -250 || p.y > H + 200) quitar(m, o);
  }
  for (const b of m.bloques.slice()) if (b.dano > 0) {
    b.vida -= b.dano; b.dano = 0;
    if (b.vida <= 0) { m.puntos += MATERIALES[b.m].pts; m.ev.push({ t: 'rompe', m: b.m, x: b.cuerpo.position.x, y: b.cuerpo.position.y, w: b.w, h: b.h }); M.Composite.remove(m.engine.world, b.cuerpo); m.bloques.splice(m.bloques.indexOf(b), 1); }
  }
  for (const c of m.cerdos) if (c.vivo && (c.dano > 0 || c.cuerpo.position.y > H + 100)) {
    c.vida -= c.dano; c.dano = 0;
    if (c.vida <= 0 || c.cuerpo.position.y > H + 100) { c.vivo = false; m.puntos += CERDO.pts; m.ev.push({ t: 'cerdo', x: c.cuerpo.position.x, y: c.cuerpo.position.y }); M.Composite.remove(m.engine.world, c.cuerpo); }
  }
  // Fin del vuelo: ningún pájaro se mueve (o pasaron 10 s)
  if (m.vuelan.length) {
    m.tVuelo++;
    const mov = m.vuelan.some(o => o.cuerpo.speed > .5);
    m.tQuieto = mov ? 0 : m.tQuieto + 1;
    if (m.tQuieto > 40 || m.tVuelo > 600) { for (const o of m.vuelan.slice()) quitar(m, o); m.lanzado = null; m.tVuelo = 0; }
  }
  const ev = m.ev; m.ev = []; return ev;
}

export const cerdosVivos = m => m.cerdos.filter(c => c.vivo).length;
export const enVuelo = m => m.vuelan.length > 0;
// ¿Todo quieto? (después de lanzar, para decidir si se gana, se pierde o sigue)
export function quieto(m) {
  if (m.vuelan.length) return false;
  for (const b of m.bloques) if (b.cuerpo.speed > .12) return false;
  for (const c of m.cerdos) if (c.vivo && c.cuerpo.speed > .12) return false;
  return true;
}
export const estrellas = (n, pts) => { const e = NIVELES[n - 1].est; return pts >= e[1] ? 3 : pts >= e[0] ? 2 : 1; };
export const bonus = m => m.cola.length * PTS_AVE;
