// Catapulta — lanza proyectiles con la catapulta y derriba las fortalezas de los enemigos. Física con Matter.js (js/vendor).
// Apuntas con el círculo táctil del menú flotante (dirección = hacia dónde mueves el punto, fuerza = lo lejos que lo pones).
import { $, esc } from '../../core/dom.js';
import * as C from './motor.js';
import { NIVELES, validarNivel } from './niveles.js';
import { AVATARES, IDS, CLASES, valido, imgAve, imgPieza, imgEnemigo, nombreAve } from './avatares.js';
import { img, cargar, url, TROZOS } from './imagenes.js';
import { grupoPantalla, tapeteElegido } from '../../core/aspectos.js';
import { imagenTapete, pintarTapete } from '../../core/cartas.js';
import { crearFlotante } from '../../core/flotante.js';

let api = null, asp = null, root = null, M = null, m = null, cv = null, ctx = null, dpr = 1, escala = 1, fl = null, padCv = null;
let raf = 0, tPrev = 0, acum = 0, fase = 'menu', nivel = 1, part = [], textos = [], onVis = null, onRes = null, onKey = null, cerrando = false, finTimer = 0, hudAnt = '';
let ultimo = null, podioPos = -1, mira = { ang: 45, fz: .65 }, cfg = { nivel: 1 }, anim = null, armAng = 0, flags = '', patrones = new Map(), eraJugando = false;
const RAD = Math.PI / 180;

/* ---------- validación / resumen ---------- */
export function validar(d) { return d && validarNivel(d.nivel) ? { nivel: d.nivel } : null; }
export const migrarV1 = d => d;
export const resumen = d => ({ texto: `Nivel ${d.nivel} · ${NIVELES[d.nivel - 1].nombre}`, fin: false });

function cargarMatter() {
  if (window.Matter) return Promise.resolve(window.Matter);
  return new Promise((ok, ko) => { const s = document.createElement('script'); s.src = new URL('../../vendor/matter.min.js', import.meta.url); s.onload = () => ok(window.Matter); s.onerror = () => ko(new Error('matter')); document.head.append(s); });
}
const prog = () => { const p = api.pref('prog', []); return Array.isArray(p) ? p.map(x => x && Number.isInteger(x.est) ? { est: Math.min(3, Math.max(0, x.est)), pts: Math.max(0, x.pts | 0) } : { est: 0, pts: 0 }) : []; };
const nivelMax = () => { const p = prog(); let n = 1; while (n < NIVELES.length && p[n - 1] && p[n - 1].est > 0) n++; return n; };
const avatar = () => valido(asp && asp.valores.avatar);
const enemigo = () => { const e = asp && asp.valores.enemigo; return e && e !== 'igual' ? valido(e) : avatar(); };
const nombresImg = () => ['mat-madera', 'mat-piedra', 'mat-hielo', 'mat-hierro', 'fx-explosion', 'fx-humo', 'fx-impacto', 'fx-escombros-madera', 'fx-escombros-piedra', 'fx-escombros-hielo', 'lanzador-base', 'lanzador-brazo', imgEnemigo(enemigo()), ...CLASES.map(c => imgAve(avatar(), c)), ...[0, 1, 2].map(i => imgPieza(avatar(), i))];
const refrescar = () => { patrones.clear(); hudAnt = ''; if (cv && m) { dibujar(); pintarHud(); } };

/* ---------- ciclo de vida ---------- */
export async function mount(r, a) {
  api = a; root = r; cerrando = false; part = []; textos = []; fase = 'menu';
  asp = api.aspecto([
    { ...grupoPantalla(''), def: 't-pradera' },
    { clave: 'avatar', titulo: 'Avatar', icono: '🎯', ventana: true, forma: 'cuadrada', def: 'pajaros', opciones: IDS.map(id => ({ id, nombre: AVATARES[id].nombre, img: url('mosaico-' + id) })) },
    { clave: 'enemigo', titulo: 'Personaje (enemigos)', icono: '🐷', ventana: true, forma: 'cuadrada', def: 'igual', opciones: [{ id: 'igual', nombre: 'El del avatar', icono: '🔗' }, ...IDS.map(id => ({ id, nombre: AVATARES[id].enemigo, img: url('en-' + id) }))] },
  ], () => { cargar(nombresImg()).then(refrescar); refrescar(); if (fase === 'menu') menu(); });
  await api.css(new URL('./catapulta.css', import.meta.url));
  root.innerHTML = '<p class="note">Cargando el motor de física…</p>';
  try { M = await cargarMatter(); } catch { root.innerHTML = '<p class="note">No se pudo cargar el motor de física. Comprueba la conexión y vuelve a entrar.</p>'; return; }
  await cargar(nombresImg(), 4000);
  if (cerrando) return;
  const c0 = api.pref('cfg', null); if (c0 && Number.isInteger(c0.nivel)) cfg.nivel = c0.nivel;
  const m0 = api.pref('mira', null); if (m0 && Number.isFinite(m0.ang) && Number.isFinite(m0.fz)) mira = { ang: Math.min(90, Math.max(0, m0.ang)), fz: Math.min(1, Math.max(.05, m0.fz)) };
  root.addEventListener('click', clic);
  onVis = () => { if (document.hidden) pausar(); }; document.addEventListener('visibilitychange', onVis);
  onRes = () => { if (cv) { ajustar(); dibujar(); dibujarPad(); } }; addEventListener('resize', onRes);
  onKey = teclado; document.addEventListener('keydown', onKey);
  api.barra({ etiqueta: 'Reintentar', nueva: () => jugar(nivel),
    salir: () => { pausar(); location.hash = '#/cat/arcade'; },
    pausar: () => { eraJugando = ['apuntar', 'vuelo', 'espera'].includes(fase); pausar(); },
    reanudar: o => { if (o === 'salir' && eraJugando) seguir(); },
    config: { valores: () => ({ nivel: cfg.nivel }), grupos: () => [{ clave: 'nivel', titulo: 'Nivel', opciones: NIVELES.map((n, i) => [i + 1, `${i + 1}`]).filter(([i]) => i <= nivelMax()) }], aplicar: v => { cfg.nivel = +v.nivel; api.setPref('cfg', cfg); jugar(cfg.nivel); } } });
  api.menu([{ texto: 'Nueva partida', accion: () => { pausar(); menu(); } }, { texto: '🏆 Podio (10 mejores)', accion: () => { pausar(); verPodio(); } }, { texto: '⏸️ Pausa', accion: pausar }, { texto: '🎨 Apariencia', accion: () => { pausar(); asp.abrir(); } }, { texto: 'Cómo se juega', accion: () => { pausar(); reglas(); } }]);
  const g = api.cargar();
  if (g && g.nivel <= nivelMax()) jugar(g.nivel); else menu();
}
export function unmount() {
  cerrando = true; pausar(); cancelAnimationFrame(raf); raf = 0; clearTimeout(finTimer); quitarFl();
  document.removeEventListener('visibilitychange', onVis); removeEventListener('resize', onRes); document.removeEventListener('keydown', onKey);
  if (root) root.removeEventListener('click', clic);
  limpiarMundo(); m = null; cv = null; ctx = null; asp = null;
}
function limpiarMundo() { if (m) { try { M.World.clear(m.engine.world); M.Engine.clear(m.engine); } catch { /* nada */ } } }
function quitarFl() { if (fl) { fl.destruir(); fl = null; } padCv = null; }

/* ---------- pantallas ---------- */
const estr = n => '★'.repeat(n) + '☆'.repeat(3 - n);
function menu() {
  cancelAnimationFrame(raf); raf = 0; fase = 'menu'; cv = null; quitarFl(); limpiarMundo(); m = null;
  const p = prog(), max = nivelMax(); if (cfg.nivel > max || cfg.nivel < 1) cfg.nivel = max;
  const tot = p.reduce((s, x) => s + x.pts, 0), est = p.reduce((s, x) => s + x.est, 0), s = avatar();
  root.innerHTML = `<p class="note">Aprieta ✨ y 🚀 del menú flotante: mueve el punto del cuarto de círculo para elegir la dirección y la fuerza, y lanza. Derriba las estructuras y vence a los enemigos con las estrellas que puedas.</p>
    <div class="bar"><span class="lbl">Empezar en</span><div class="seg ctniv">${NIVELES.map((n, i) => { const k = i + 1; return `<button class="btn ${cfg.nivel === k ? 'on' : ''}" data-cfg="nivel" data-v="${k}" title="${esc(n.nombre)}" ${k > max ? 'disabled title="Llega a este nivel para desbloquearlo"' : ''}>${k > max ? '🔒' : k}</button>`; }).join('')}</div></div>
    <div class="ctcaps">${CLASES.map(c => `<span><img src="${url(imgAve(s, c))}" alt=""><b>${esc(nombreAve(s, c))}</b> ${esc(C.AVES[c].hab)}</span>`).join('')}</div>
    ${est || tot ? `<div class="ldrecs"><b>🏆 Tus récords</b><span>Estrellas: <b>${est}/${NIVELES.length * 3}</b></span><span>Puntos: <b>${tot.toLocaleString('es-ES')}</b></span></div>` : ''}
    <div class="bar"><button class="btn on" data-ac="jugar">🪃 ${est || tot ? 'Jugar nivel ' + cfg.nivel : 'Nueva partida'}</button><button class="btn" data-ac="podio">🏆 Podio</button><button class="btn" data-ac="aspecto">🎨 Apariencia</button></div>`;
}
function reglas() {
  const s = avatar();
  api.modal('Catapulta', `<ul><li>Mueve el punto del <b>cuarto de círculo</b> del menú flotante (de 0° a 90°): hacia dónde lo muevas es la dirección del disparo y cuanto más lejos de la esquina, más fuerza. Con teclado: ↑ ↓ cambian el ángulo y ← → la fuerza.</li>
    <li>Pulsa <b>🚀 Lanzar</b>. La línea de puntos muestra cómo empieza la trayectoria.</li>
    <li><b>✨ Habilidad</b> (o toca el campo) en pleno vuelo:</li>
    <li style="list-style:none"><ul>${CLASES.map(c => `<li><b>${esc(nombreAve(s, c))}</b>: ${esc(C.AVES[c].hab)}</li>`).join('')}</ul></li>
    <li>La <b>madera</b> se parte con un golpe fuerte, el <b>hielo</b> se rompe casi con cualquier cosa, la <b>piedra</b> aguanta mucho y el <b>hierro</b> es el más duro de todos.</li>
    <li>Cada proyectil que te sobre al ganar vale 10.000 puntos. Hasta 3 estrellas por nivel.</li>
    <li>El menú flotante se mueve arrastrándolo (doble toque en el asa: vuelve a su sitio).</li></ul>`);
}
async function verPodio() { api.modal('🏆 Podio · Campaña', api.podio.html('Campaña')); }

function jugar(n) {
  if (!validarNivel(n)) n = 1;
  cancelAnimationFrame(raf); clearTimeout(finTimer); quitarFl(); limpiarMundo(); nivel = n; cfg.nivel = n; api.setPref('cfg', cfg);
  m = C.crear(M, n); part = []; textos = []; ultimo = null; podioPos = -1; hudAnt = ''; acum = 0; anim = null; armAng = brazoAng(mira.fz); flags = ''; patrones.clear();
  root.innerHTML = `<div class="cthud" id="ctHud"></div>
    <div class="ctzona" id="ctZona"><canvas id="ctCv" aria-label="Campo de juego"></canvas><div class="ctover" id="ctOver" hidden></div></div>
    <p class="note ctayuda" id="ctAyuda"></p>${api.barraHtml()}`;
  cv = $('#ctCv'); ctx = cv.getContext('2d'); dpr = Math.min(window.devicePixelRatio || 1, 3); ajustar();
  $('#ctZona').addEventListener('pointerdown', () => { if (fase === 'vuelo') habilidad(); });
  fl = crearFlotante(api, { ancla: $('#ctZona'), raiz: root, centro: true, clave: 'flotCt',
    botones: [{ id: 'hab', texto: '✨ Habilidad', lado: 'izq' }, { id: 'lanzar', texto: '🚀 Lanzar', lado: 'der' }],
    alClic: id => { if (id === 'lanzar') lanzar(); else if (id === 'hab') habilidad(); } });
  fl.marcar('lanzar', true);
  construirPad();
  api.guardar({ nivel: n }, resumen({ nivel: n }).texto, false);
  api.titulo && api.titulo(`Catapulta · ${n}`);
  siguienteAve();
  tPrev = performance.now(); raf = requestAnimationFrame(bucle);
}
function ajustar() {
  if (!cv) return;
  const ancho = Math.floor(cv.parentElement.getBoundingClientRect().width), alto = Math.round(ancho * C.H / C.W);
  cv.width = ancho * dpr; cv.height = alto * dpr; cv.style.width = ancho + 'px'; cv.style.height = alto + 'px'; escala = ancho / C.W;
}
function siguienteAve() {
  if (!m.cola.length) { fase = 'espera'; return; }
  fase = 'apuntar'; m.lanzado = null;
  const c = m.cola[0], a = $('#ctAyuda'); if (a) a.textContent = `Ahora: ${nombreAve(avatar(), c)} — ${C.AVES[c].hab}`;
  api.sonido('mover');
}

/* ---------- el círculo táctil ---------- */
function construirPad() {
  const c = fl.centro;
  c.innerHTML = `<div class="ctpad" id="ctPad" tabindex="0" role="application" aria-label="Cuarto de círculo de puntería: dirección y fuerza del disparo. Flechas arriba y abajo cambian el ángulo; izquierda y derecha, la fuerza."><canvas></canvas></div><small class="ctlec" id="ctLec"></small>`;
  const pad = $('#ctPad'); padCv = pad.querySelector('canvas');
  let id = null;
  const punto = e => {                                          // el origen del cuarto de círculo está en su esquina inferior izquierda
    const r = padCv.getBoundingClientRect(), R = r.width - 14, dx = e.clientX - (r.left + 7), dy = (r.bottom - 7) - e.clientY;
    let ang = Math.atan2(dy, dx) / RAD; const d = Math.hypot(dx, dy);
    if (ang > 90 || ang < -90) ang = ang > 90 ? 90 : 0; else if (ang < 0) ang = 0;       // solo se dispara hacia la derecha y hacia arriba
    mira = { ang: Math.round(ang), fz: Math.min(1, Math.max(.05, d / R)) }; dibujarPad(); pintarLectura();
  };
  pad.addEventListener('pointerdown', e => { e.stopPropagation(); if (fase !== 'apuntar') return; id = e.pointerId; try { pad.setPointerCapture(id); } catch { /* nada */ } punto(e); e.preventDefault(); });
  pad.addEventListener('pointermove', e => { if (e.pointerId === id) { e.stopPropagation(); punto(e); } });
  const fin = e => { if (e.pointerId !== id) return; id = null; api.setPref('mira', mira); };
  pad.addEventListener('pointerup', fin); pad.addEventListener('pointercancel', fin);
  dibujarPad(); pintarLectura();
}
function pintarLectura() { const l = $('#ctLec'); if (l) l.textContent = `${mira.ang}° · fuerza ${Math.round(mira.fz * 100)}%`; }
function dibujarPad() {
  const c = padCv; if (!c || !c.isConnected) return;
  const s = c.clientWidth || 150, d = Math.min(window.devicePixelRatio || 1, 3); const px = Math.round(s * d); if (c.width !== px || c.height !== px) { c.width = px; c.height = px; }
  const g = c.getContext('2d'), cs = getComputedStyle(c), col = n => (cs.getPropertyValue(n) || '').trim();
  const purple = col('--purple') || '#7A4DFF', blue = col('--blue') || '#2F6BFF', line = col('--line') || '#C9D2F0', card = col('--card') || '#fff', mut = col('--mut') || '#6B7490';
  g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, s, s);
  const cx = 7, cy = s - 7, R = s - 14;                          // cuarto de círculo: de 0° (derecha) a 90° (arriba)
  g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, -Math.PI / 2, 0); g.closePath(); g.fillStyle = card; g.fill();
  const rel = g.createRadialGradient(cx, cy, 0, cx, cy, R); rel.addColorStop(0, 'rgba(122,77,255,.04)'); rel.addColorStop(1, 'rgba(122,77,255,.2)'); g.fillStyle = rel; g.fill();
  g.lineWidth = 3; g.strokeStyle = line; g.stroke();
  g.strokeStyle = line; g.lineWidth = 1.5; g.setLineDash([3, 4]);
  for (const f of [1 / 3, 2 / 3]) { g.beginPath(); g.arc(cx, cy, R * f, -Math.PI / 2, 0); g.stroke(); }
  for (const a of [15, 30, 45, 60, 75]) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a * RAD) * R, cy - Math.sin(a * RAD) * R); g.stroke(); }
  g.setLineDash([]); g.fillStyle = mut; g.font = '700 10px Nunito, sans-serif'; g.textAlign = 'center';
  for (const a of [0, 30, 60, 90]) { const rr = R - (a === 0 ? 13 : a === 90 ? 2 : 14); g.fillText(a + '°', Math.min(s - 12, cx + Math.cos(a * RAD) * rr + (a === 90 ? 14 : 0)), Math.max(11, cy - Math.sin(a * RAD) * rr + (a === 0 ? -4 : a === 90 ? 10 : 4))); }
  const a = mira.ang * RAD, kx = cx + Math.cos(a) * R * mira.fz, ky = cy - Math.sin(a) * R * mira.fz;
  const gr = g.createLinearGradient(cx, cy, kx, ky); gr.addColorStop(0, purple); gr.addColorStop(1, blue);
  g.strokeStyle = gr; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(kx, ky); g.stroke();
  g.beginPath(); g.arc(cx, cy, 5, 0, 6.2832); g.fillStyle = purple; g.fill();
  g.beginPath(); g.arc(kx, ky, 13, 0, 6.2832); g.fillStyle = gr; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
}
function teclado(e) {
  if (!m || !cv || document.querySelector('.modal,.hoja') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const k = e.key; let cambio = true;
  if (fase === 'apuntar') {
    if (k === 'ArrowUp') mira.ang = Math.min(90, mira.ang + 2); else if (k === 'ArrowDown') mira.ang = Math.max(0, mira.ang - 2);
    else if (k === 'ArrowRight') mira.fz = Math.min(1, mira.fz + .03); else if (k === 'ArrowLeft') mira.fz = Math.max(.05, mira.fz - .03);
    else if (k === ' ' || k === 'Enter') { e.preventDefault(); lanzar(); return; } else cambio = false;
    if (cambio) { e.preventDefault(); dibujarPad(); pintarLectura(); api.setPref('mira', mira); }
  } else if (fase === 'vuelo' && (k === ' ' || k === 'Enter')) { e.preventDefault(); habilidad(); }
}

/* ---------- lanzar ---------- */
const TH0 = -58 * RAD, PIV = { x: 99.9, y: 436.1 }, LB = 75.6, ESC = .311;      // posición de la catapulta: eje, largo del brazo y escala del dibujo
const brazoAng = f => TH0 - f * 142 * RAD;
const punta = a => ({ x: PIV.x + LB * Math.cos(a), y: PIV.y + LB * Math.sin(a) });
function lanzar() {
  if (fase !== 'apuntar' || !m.cola.length) return;
  if (mira.fz < .12) { api.aviso('Estira más: mueve el punto lejos del centro'); return; }
  anim = { t: 0, a0: armAng, clase: m.cola[0], fz: mira.fz, ang: mira.ang }; fase = 'tirando'; api.sonido('captura'); api.vibrar(20);
  const a = $('#ctAyuda'); if (a) a.textContent = '';
}
function habilidad() { if (fase === 'vuelo' && m && C.habilidad(m)) { api.sonido('ok'); api.vibrar(15); } }

/* ---------- bucle ---------- */
function bucle(t) {
  if (!m || !cv) return;
  const dt = Math.min(t - tPrev, 100); tPrev = t; acum += dt;
  let n = 0;
  while (acum >= C.PASO && n++ < 6) { acum -= C.PASO; if (fase === 'tirando') pasoAnim(); efectos(C.paso(m)); revisar(); }
  if (n >= 6) acum = 0;
  const objetivo = fase === 'apuntar' ? brazoAng(mira.fz) : TH0;
  if (fase !== 'tirando') armAng += (objetivo - armAng) * .3;
  for (const p of part) { p.x += p.vx; p.y += p.vy; p.vy += p.g; p.r += p.vr; p.t -= 1; p.a = Math.max(0, Math.min(1, p.t / (p.fade || p.t0))); if (p.crece) p.s += p.crece; }
  part = part.filter(p => p.t > 0);
  for (const x of textos) { x.y -= .6; x.t -= 1; }
  textos = textos.filter(x => x.t > 0);
  dibujar(); pintarHud(); botones();
  if (fase !== 'menu' && fase !== 'pausa' && fase !== 'fin') raf = requestAnimationFrame(bucle); else raf = 0;
}
function pasoAnim() {
  anim.t++; const u = Math.min(1, anim.t / 8), e = 1 - (1 - u) * (1 - u);
  armAng = anim.a0 + (TH0 - anim.a0) * e;
  if (u >= 1) {
    const v = anim.fz * C.ARRASTRE * C.K_LANZ, a = anim.ang * RAD;
    C.lanzar(m, Math.cos(a) * v, -Math.sin(a) * v); fase = 'vuelo'; anim = null;
    const h = $('#ctAyuda'); if (h && m.lanzado && m.lanzado.clase !== 'normal') h.textContent = 'Toca el campo o pulsa ✨ para usar la habilidad.';
  }
}
function botones() {
  if (!fl) return;
  const hab = fase === 'vuelo' && m.lanzado && !m.lanzado.usada && m.lanzado.clase !== 'normal', lz = fase === 'apuntar', k = `${hab}${lz}`;
  if (k === flags) return; flags = k; fl.activar('hab', !!hab); fl.activar('lanzar', lz);
}
function revisar() {
  if (fase === 'vuelo' && !C.enVuelo(m)) { fase = 'espera'; m.reposo = 0; const a = $('#ctAyuda'); if (a) a.textContent = ''; }
  if (fase === 'espera') {
    m.reposo = (m.reposo || 0) + 1;
    const todos = C.cerdosVivos(m) === 0;
    if ((C.quieto(m) && m.reposo > 45) || m.reposo > 420 || (todos && m.reposo > 90)) {
      if (todos) terminar(true); else if (!m.cola.length) terminar(false); else siguienteAve();
    }
  }
}
const rnd = (a, b) => a + Math.random() * (b - a);
function trozosDe(mat, x, y, w, h) {
  const hoja = { madera: 'escombros-madera', piedra: 'escombros-piedra', hielo: 'escombros-hielo', hierro: 'escombros-piedra' }[mat], lista = TROZOS[hoja];
  for (let k = 0; k < 5; k++) { const r = lista[Math.random() * lista.length | 0]; part.push({ tipo: 'trozo', hoja, r, x: x + rnd(-w / 2, w / 2), y: y + rnd(-h / 2, h / 2), vx: rnd(-3.2, 3.2), vy: rnd(-5, -1), g: .26, rot: rnd(0, 6.3), vr: rnd(-.25, .25), s: rnd(9, 16), t: 55, t0: 55, fade: 20, a: 1 }); }
}
function humo(x, y, s0 = 18) { part.push({ tipo: 'fx', n: 'fx-humo', x, y, vx: rnd(-.3, .3), vy: -.5, g: 0, rot: 0, vr: 0, s: s0, crece: 1.1, t: 30, t0: 30, fade: 30, a: 1, alfa: .85 }); }
function efectos(ev) {
  for (const e of ev) {
    if (e.t === 'rompe') { api.sonido('click'); trozosDe(e.m, e.x, e.y, e.w, e.h); humo(e.x, e.y, 16); textos.push({ x: e.x, y: e.y, s: String(C.MATERIALES[e.m].pts), t: 45 }); }
    else if (e.t === 'cerdo') { api.sonido('perder'); api.vibrar(30); humo(e.x, e.y, 26); part.push({ tipo: 'fx', n: 'fx-impacto', x: e.x, y: e.y, vx: 0, vy: 0, g: 0, rot: .3, vr: .05, s: 30, crece: 1.2, t: 14, t0: 14, fade: 14, a: 1 }); textos.push({ x: e.x, y: e.y - 10, s: String(C.CERDO.pts), t: 60 }); }
    else if (e.t === 'bomba') { api.sonido('error'); api.vibrar([40, 30, 60]); part.push({ tipo: 'fx', n: 'fx-explosion', x: e.x, y: e.y, vx: 0, vy: 0, g: 0, rot: 0, vr: .02, s: e.R * .6, crece: 2.6, t: 24, t0: 24, fade: 14, a: 1 }); humo(e.x, e.y - 10, 40); }
    else if (e.t === 'hab') { part.push({ tipo: 'fx', n: 'fx-impacto', x: e.x, y: e.y, vx: 0, vy: 0, g: 0, rot: 0, vr: .08, s: 20, crece: 1.2, t: 12, t0: 12, fade: 12, a: 1 }); }
    else if (e.t === 'golpe' && e.f > .5) { api.sonido('mover'); part.push({ tipo: 'fx', n: 'fx-impacto', x: e.x, y: e.y, vx: 0, vy: 0, g: 0, rot: rnd(0, 6), vr: 0, s: 12 + 14 * e.f, crece: .6, t: 9, t0: 9, fade: 9, a: 1 }); }
  }
}
function terminar(gana) {
  fase = 'fin'; clearTimeout(finTimer);
  const bon = gana ? C.bonus(m) : 0, pts = m.puntos + bon;
  if (gana) {
    const est = C.estrellas(nivel, pts), p = prog(); while (p.length < NIVELES.length) p.push({ est: 0, pts: 0 });
    const antes = p[nivel - 1], record = pts > antes.pts;
    p[nivel - 1] = { est: Math.max(antes.est, est), pts: Math.max(antes.pts, pts) }; api.setPref('prog', p);
    api.registrar({ res: 'partida', variante: `Nivel ${nivel}`, puntos: pts });
    ultimo = { n: nivel, pts, bon, est, record, gana };
    api.sonido('ganar'); api.vibrar([40, 30, 80]);
    if (nivel === NIVELES.length && p.every(x => x.est > 0)) { const total = p.reduce((s, x) => s + x.pts, 0); ultimo.campana = total; api.registrar({ res: 'victoria', variante: 'Campaña', puntos: total }); }
  } else { ultimo = { n: nivel, pts, bon: 0, est: 0, gana: false }; api.sonido('perder'); }
  finTimer = setTimeout(() => { if (!cv) return; pintarOver(); dibujar(); anotarPodio(); }, gana ? 500 : 400);
}
async function anotarPodio() {
  if (!ultimo || !ultimo.campana || podioPos >= 0) return;
  if (!api.podio.entra('Campaña', ultimo.campana)) return;
  podioPos = await api.podio.anotar('Campaña', ultimo.campana);
}
function pintarOver() {
  const o = $('#ctOver'); if (!o) return;
  if (fase === 'pausa') { o.hidden = false; o.innerHTML = '<div><b>⏸️ Pausa</b><span class="bts"><button class="btn on" data-ac="seguir">Seguir</button></span></div>'; return; }
  if (fase !== 'fin' || !ultimo) { o.hidden = true; return; }
  const u = ultimo, sig = u.gana && u.n < NIVELES.length;
  o.hidden = false;
  o.innerHTML = u.gana
    ? `<div><b>🎉 ¡Nivel ${u.n} superado!</b><span class="ctest">${estr(u.est)}</span><span class="g">${u.pts.toLocaleString('es-ES')} puntos</span>${u.bon ? `<span>Incluye ${u.bon.toLocaleString('es-ES')} por proyectiles sobrantes</span>` : ''}${u.record ? '<span class="rec">¡Mejor marca del nivel!</span>' : ''}${u.campana ? `<span class="rec">🏴‍☠️ ¡Campaña completada! ${u.campana.toLocaleString('es-ES')} puntos</span>` : ''}<span class="bts">${sig ? `<button class="btn on" data-ac="nivel" data-n="${u.n + 1}">Nivel ${u.n + 1} ▶</button>` : ''}<button class="btn ${sig ? '' : 'on'}" data-ac="nivel" data-n="${u.n}">Repetir</button><button class="btn" data-ac="menu">Niveles</button></span></div>`
    : `<div><b>☠️ Los enemigos resisten</b><span>Te has quedado sin proyectiles. Prueba otro ángulo o usa las habilidades.</span><span class="bts"><button class="btn on" data-ac="nivel" data-n="${u.n}">Reintentar</button><button class="btn" data-ac="menu">Niveles</button></span></div>`;
}
function pausar() { if (!m || !cv || ['menu', 'fin', 'pausa'].includes(fase)) return; m.faseAntes = fase; fase = 'pausa'; pintarOver(); }
function seguir() { if (fase !== 'pausa') return; fase = m.faseAntes || 'apuntar'; pintarOver(); tPrev = performance.now(); acum = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(bucle); }
function clic(e) {
  const c = e.target.closest('[data-cfg]');
  if (c && !c.disabled) { cfg[c.dataset.cfg] = +c.dataset.v; api.setPref('cfg', cfg); menu(); return; }
  const b = e.target.closest('[data-ac]'); if (!b) return;
  const ac = b.dataset.ac;
  if (ac === 'nivel') { const n = +b.dataset.n; if (n <= nivelMax()) jugar(n); }
  else if (ac === 'jugar') jugar(cfg.nivel);
  else if (ac === 'menu') menu();
  else if (ac === 'seguir') seguir();
  else if (ac === 'podio') verPodio();
  else if (ac === 'aspecto') asp.abrir();
}
function pintarHud() {
  const h = $('#ctHud'); if (!h || !m) return;
  const s = `${nivel}|${m.puntos}|${C.cerdosVivos(m)}|${m.cola.join()}`; if (s === hudAnt) return; hudAnt = s;
  h.innerHTML = `<span><small>Nivel</small><b>${nivel}</b></span><span><small>Puntos</small><b>${m.puntos.toLocaleString('es-ES')}</b></span><span><small>Enemigos</small><b class="ctenem"><img src="${url(imgEnemigo(enemigo()))}" alt=""> ${C.cerdosVivos(m)}</b></span><span><small>Disparos</small><b class="ctcola">${m.cola.map(k => `<img src="${url(imgAve(avatar(), k))}" alt="">`).join('') || '—'}</b></span>`;
}

/* ---------- dibujo ---------- */
function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function sprite(nombre, x, y, w, h = w, ang = 0, alfa = 1, voltear = false) {
  const im = img(nombre, () => { if (cv && fase !== 'menu' && !raf) dibujar(); }); if (!im) return false;
  ctx.save(); ctx.translate(x, y); if (ang) ctx.rotate(ang); if (voltear) ctx.scale(-1, 1); if (alfa < 1) ctx.globalAlpha = alfa; ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); return true;
}
function dibujar() {
  if (!m || !cv || !ctx) return;
  const k = escala * dpr; ctx.setTransform(k, 0, 0, k, 0, 0);
  const tid = tapeteElegido(asp), fondo = tid && imagenTapete(tid, () => { if (cv && !raf) dibujar(); });
  if (fondo) pintarTapete(ctx, fondo, C.W, C.H, 0);
  else {                                                       // sin fondo de pantalla: cielo y colinas dibujados
    const cielo = ctx.createLinearGradient(0, 0, 0, C.SUELO); cielo.addColorStop(0, '#6EC6F5'); cielo.addColorStop(1, '#CFF0FF'); ctx.fillStyle = cielo; ctx.fillRect(0, 0, C.W, C.H);
    ctx.fillStyle = '#8CCB7A'; ctx.beginPath(); ctx.moveTo(0, C.SUELO); ctx.quadraticCurveTo(220, 330, 460, C.SUELO); ctx.quadraticCurveTo(700, 380, 900, C.SUELO); ctx.fill();
    ctx.fillStyle = '#5FA34E'; ctx.fillRect(0, C.SUELO, C.W, 8);
    const tierra = ctx.createLinearGradient(0, C.SUELO + 8, 0, C.H); tierra.addColorStop(0, '#9B6B3F'); tierra.addColorStop(1, '#6E4A2A'); ctx.fillStyle = tierra; ctx.fillRect(0, C.SUELO + 8, C.W, C.H - C.SUELO - 8);
  }
  // sombra suave del suelo bajo las estructuras
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fillRect(0, C.SUELO, C.W, 3);
  catapulta();
  for (const b of m.bloques) bloque(b);
  for (const c of m.cerdos) if (c.vivo) enemigoDib(c);
  for (const o of m.vuelan) { const t = o.pieza != null ? o.r * (o.hijo ? 3.6 : 3.33) : o.r * 3.33; sprite(o.pieza != null ? imgPieza(avatar(), o.pieza) : imgAve(avatar(), o.clase), o.cuerpo.position.x, o.cuerpo.position.y, t, t, o.cuerpo.angle); }
  for (const p of part) {
    ctx.globalAlpha = p.a * (p.alfa || 1);
    if (p.tipo === 'trozo') { const im = img('fx-' + p.hoja); if (im) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); const q = p.r, e = p.s / Math.max(q[2], q[3]); ctx.drawImage(im, q[0], q[1], q[2], q[3], -q[2] * e / 2, -q[3] * e / 2, q[2] * e, q[3] * e); ctx.restore(); } }
    else if (p.tipo === 'fx') { const im = img(p.n); if (im) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.drawImage(im, -p.s, -p.s, p.s * 2, p.s * 2); ctx.restore(); } p.rot += p.vr; }
  }
  ctx.globalAlpha = 1; ctx.font = '800 18px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.55)';
  for (const t of textos) { ctx.globalAlpha = Math.min(1, t.t / 20); ctx.strokeText(t.s, t.x, t.y); ctx.fillStyle = '#fff'; ctx.fillText(t.s, t.x, t.y); }
  ctx.globalAlpha = 1;
}
function catapulta() {
  const base = img('lanzador-base'), brazo = img('lanzador-brazo');
  if (base) ctx.drawImage(base, PIV.x - 195 * ESC, PIV.y - 127 * ESC, 384 * ESC, 270 * ESC);
  // puntería (la línea de puntos arranca en el punto de suelta)
  const apuntando = fase === 'apuntar' && m.cola.length;
  if (apuntando) {
    const v = mira.fz * C.ARRASTRE * C.K_LANZ, a = mira.ang * RAD;
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = 'rgba(40,40,60,.4)'; ctx.lineWidth = 1;
    C.trayectoria(Math.cos(a) * v, -Math.sin(a) * v, 16, 4).forEach((p, i) => { ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2, 5 - i * .18), 0, 6.3); ctx.fill(); ctx.stroke(); });
  }
  if (brazo) { ctx.save(); ctx.translate(PIV.x, PIV.y); ctx.rotate(armAng); if (Math.cos(armAng) < 0) ctx.scale(1, -1); ctx.drawImage(brazo, -105 * ESC, -42 * ESC, 384 * ESC, 100 * ESC); ctx.restore(); }
  const clase = fase === 'tirando' && anim ? anim.clase : apuntando ? m.cola[0] : null;
  if (clase) { const p = punta(armAng), r = C.AVES[clase].r; sprite(imgAve(avatar(), clase), p.x, p.y - r * .35, r * 3); }
}
function patron(mat) {
  let p = patrones.get(mat); if (p) return p;
  const im = img('mat-' + mat); if (!im) return null;
  p = ctx.createPattern(im, 'repeat'); if (p && p.setTransform) p.setTransform(new DOMMatrix().scale(72 / im.width)); patrones.set(mat, p); return p;
}
const BORDE = { madera: '#5C3A1A', piedra: '#3E4756', hielo: '#2C6E9C', hierro: '#14161B' };
function bloque(b) {
  const c = b.cuerpo, w = b.w, h = b.h, da = 1 - b.vida / b.vida0, pat = patron(b.m);
  ctx.save(); ctx.translate(c.position.x, c.position.y); ctx.rotate(c.angle);
  rr(-w / 2, -h / 2, w, h, 3);
  if (pat) { ctx.save(); ctx.clip(); if (h > w) ctx.rotate(Math.PI / 2); ctx.fillStyle = pat; ctx.fillRect(h > w ? -h / 2 : -w / 2, h > w ? -w / 2 : -h / 2, h > w ? h : w, h > w ? w : h); ctx.restore(); }
  else { ctx.fillStyle = { madera: '#B4753A', piedra: '#8D97A7', hielo: '#A9DDF5', hierro: '#555B66' }[b.m]; ctx.fill(); }
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.2)');
  rr(-w / 2, -h / 2, w, h, 3); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = BORDE[b.m]; ctx.stroke();
  if (da > .3) { ctx.strokeStyle = 'rgba(20,12,6,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-w * .2, -h / 2); ctx.lineTo(-w * .05, 0); ctx.lineTo(-w * .22, h / 2); if (da > .6) { ctx.moveTo(w * .25, -h / 2); ctx.lineTo(w * .1, h * .1); ctx.lineTo(w * .3, h / 2); } ctx.stroke(); }
  ctx.restore();
}
function enemigoDib(c) {
  const p = c.cuerpo.position, r = c.r, da = 1 - c.vida / c.vida0, s = r * 4.3;
  const ang = Math.max(-.5, Math.min(.5, c.cuerpo.angle * .35));
  if (!sprite(imgEnemigo(enemigo()), p.x, p.y - r * .15, s, s, ang)) { ctx.fillStyle = '#8FD14F'; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.3); ctx.fill(); }
  if (da > .35) { ctx.save(); ctx.translate(p.x, p.y); ctx.strokeStyle = 'rgba(40,10,10,.75)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(r * .1, -r * .8); ctx.lineTo(r * .35, -r * .35); ctx.lineTo(r * .15, r * .05); if (da > .7) { ctx.moveTo(-r * .5, -r * .5); ctx.lineTo(-r * .2, 0); ctx.lineTo(-r * .45, r * .4); } ctx.stroke(); ctx.restore(); }
}
