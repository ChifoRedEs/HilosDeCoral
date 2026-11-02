// Pruebas de Catapulta: física de Matter.js sin navegador. Uso: node tests/catapulta.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from '../js/games/catapulta/motor.js';
import { NIVELES } from '../js/games/catapulta/niveles.js';

const mod = { exports: {} };
new Function('module', 'exports', readFileSync(new URL('../js/vendor/matter.min.js', import.meta.url), 'utf8')).call(mod.exports, mod, mod.exports);
const M = mod.exports;

export function simular(n, tiros) {                         // tiros = [[ángulo°, fuerza 0..1, tocar?]]
  const m = C.crear(M, n);
  for (let i = 0; i < 120; i++) C.paso(m);
  for (const [ang, f, tocar] of tiros) {
    if (!m.cola.length) break;
    const v = f * C.ARRASTRE * C.K_LANZ, a = ang * Math.PI / 180;
    C.lanzar(m, Math.cos(a) * v, -Math.sin(a) * v);
    for (let i = 0; i < 1500; i++) { if (tocar && i === tocar) C.habilidad(m); C.paso(m); if (C.quieto(m) && i > 30) break; }
    if (!C.cerdosVivos(m)) break;
  }
  return m;
}
if (process.argv[2] === 'barrer') {                          // utilidad de ajuste: mejores tiros por nivel
  for (let n = 1; n <= NIVELES.length; n++) {
    let mejor = null;
    for (let ang = 20; ang <= 70; ang += 2) for (let f = .5; f <= 1.001; f += .05) {
      const m = simular(n, [[ang, f]]); const r = { ang, f: +f.toFixed(2), cerdos: C.cerdosVivos(m), pts: m.puntos };
      if (!mejor || r.pts > mejor.pts) mejor = r;
    }
    console.log('nivel', n, 'un tiro:', JSON.stringify(mejor));
  }
  process.exit(0);
}

// 1) Las estructuras se asientan sin destruirse solas
for (let n = 1; n <= NIVELES.length; n++) {
  const m = C.crear(M, n); const b0 = m.bloques.length;
  for (let i = 0; i < 600; i++) C.paso(m);
  assert.equal(m.bloques.length, b0, `nivel ${n}: se rompen bloques solos`);
  assert.equal(C.cerdosVivos(m), NIVELES[n - 1].cerdos.length, `nivel ${n}: mueren cerdos solos`);
  assert.equal(m.puntos, 0);
}
// 2) La trayectoria prevista coincide con la real
{ const m = C.crear(M, 1); const v = { x: 11, y: -8 }; C.lanzar(m, v.x, v.y); const pr = C.trayectoria(v.x, v.y, 20, 3), c = m.lanzado.cuerpo;
  for (let i = 0; i < 30; i++) C.paso(m);
  assert.ok(Math.abs(c.position.x - pr[9].x) < 3 && Math.abs(c.position.y - pr[9].y) < 3, `trayectoria: real ${c.position.x.toFixed(1)},${c.position.y.toFixed(1)} vs ${pr[9].x.toFixed(1)},${pr[9].y.toFixed(1)}`); }
// 3) Un tiro fuerte daña y puntúa; hay pájaros de sobra para ganar cada nivel
{ const m = simular(1, [[20, .95]]); assert.ok(m.puntos > 0, 'el primer nivel no puntúa con un tiro razonable'); }
// 4) Habilidades
{ const m = C.crear(M, 2); for (let i = 0; i < 100; i++) C.paso(m); m.cola = ['divisible']; C.lanzar(m, 9, -6); for (let i = 0; i < 10; i++) C.paso(m);
  assert.ok(C.habilidad(m)); assert.equal(m.vuelan.length, 3); assert.deepEqual(m.vuelan.map(o => o.pieza).sort(), [0, 1, 2], 'cada pieza lleva su imagen'); }
{ const m = C.crear(M, 2); m.cola = ['acelerador']; const o = C.lanzar(m, 9, -6); for (let i = 0; i < 10; i++) C.paso(m); const v0 = o.cuerpo.speed; C.habilidad(m); assert.ok(o.cuerpo.speed > v0 * 1.5); assert.ok(o.mult >= 2 * C.AVES.normal.mult, 'el acelerador activado hace mucho más daño'); }
{ const m = C.crear(M, 3); for (let i = 0; i < 100; i++) C.paso(m); m.cola = ['bomba']; const o = C.lanzar(m, 9, -6); for (let i = 0; i < 5; i++) C.paso(m); C.habilidad(m); C.paso(m); assert.equal(m.vuelan.length, 0); }
// 4b) El hierro es el material más duro y todos los avatares tienen sus imágenes
{ const V = C.MATERIALES; assert.ok(V.hierro.vida > V.piedra.vida && V.piedra.vida > V.madera.vida && V.madera.vida > V.hielo.vida); }
{ const { existsSync } = await import('node:fs'); const { AVATARES, imgAve, imgEnemigo, CLASES } = await import('../js/games/catapulta/avatares.js');
  const { imgPieza } = await import('../js/games/catapulta/avatares.js');
  for (const id of Object.keys(AVATARES)) { for (let i = 0; i < 3; i++) assert.ok(existsSync(new URL(`../img/catapulta/${imgPieza(id, i)}.webp`, import.meta.url)), imgPieza(id, i)); assert.ok(existsSync(new URL(`../img/catapulta/${imgEnemigo(id)}.webp`, import.meta.url)), imgEnemigo(id)); assert.ok(existsSync(new URL(`../img/catapulta/mosaico-${id}.webp`, import.meta.url)));
    for (const c of CLASES) assert.ok(existsSync(new URL(`../img/catapulta/${imgAve(id, c)}.webp`, import.meta.url)), imgAve(id, c)); }
  for (const f of ['mat-madera', 'mat-piedra', 'mat-hielo', 'mat-hierro', 'fx-explosion', 'fx-humo', 'fx-impacto', 'fx-escombros-madera', 'fx-escombros-piedra', 'fx-escombros-hielo', 'lanzador-base', 'lanzador-brazo']) assert.ok(existsSync(new URL(`../img/catapulta/${f}.webp`, import.meta.url)), f); }
// 5) Estrellas y puntuación
assert.equal(C.estrellas(1, 1000), 1); assert.equal(C.estrellas(1, NIVELES[0].est[0]), 2); assert.equal(C.estrellas(1, NIVELES[0].est[1]), 3);
console.log('catapulta: OK');
