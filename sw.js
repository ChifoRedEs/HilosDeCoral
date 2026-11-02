// Service worker: guarda la app en caché para que funcione sin conexión.
// La lista de archivos y VERSION se regeneran con:  python tools/generar_sw.py
const VERSION = 'jr-11fb2f71f7';
const ARCHIVOS = [
/*ARCHIVOS-INICIO*/
'./',
'./index.html',
'./manifest.webmanifest',
'./css/base.css',
'./css/cartas.css',
'./css/fichas.css',
'./css/marca.css',
'./data/diccionario/indice.json',
'./data/nonogramas/pixelart.json',
'./icons/icon-192.png',
'./icons/icon-512.png',
'./icons/icon-maskable-512.png',
'./img/cartas/barajas.json',
'./img/cartas/dorsos/nombres.json',
'./img/cartas/fondos/nombres.json',
'./img/cartas/tapetes/nombres.json',
'./img/catapulta/info.json',
'./img/memorama/animales/nombres.json',
'./img/memorama/banderas/nombres.json',
'./img/memorama/caras/nombres.json',
'./img/memorama/comida/nombres.json',
'./img/memorama/deportes/nombres.json',
'./img/memorama/fiestas/nombres.json',
'./img/memorama/frutas/nombres.json',
'./img/memorama/lugares/nombres.json',
'./img/memorama/musica/nombres.json',
'./img/memorama/naturaleza/nombres.json',
'./img/memorama/objetos/nombres.json',
'./img/memorama/ropa/nombres.json',
'./img/memorama/transportes/nombres.json',
'./js/app.js',
'./js/registry.js',
'./js/version.js',
'./js/core/ajustes.js',
'./js/core/anillo3d.js',
'./js/core/arrastrar.js',
'./js/core/aspectos.js',
'./js/core/barajasol.js',
'./js/core/cartas.js',
'./js/core/cronometro.js',
'./js/core/dado3d.js',
'./js/core/definiciones.js',
'./js/core/diccionario.js',
'./js/core/dom.js',
'./js/core/duelo.js',
'./js/core/escena3d.js',
'./js/core/fichas.js',
'./js/core/flotante.js',
'./js/core/historial.js',
'./js/core/logros.js',
'./js/core/mesa3d.js',
'./js/core/mesacartas3d.js',
'./js/core/personajes.js',
'./js/core/semilla.js',
'./js/core/sonido.js',
'./js/core/stats.js',
'./js/core/storage.js',
'./js/core/teclado.js',
'./js/core/undo.js',
'./js/core/victoria.js',
'./js/core/ia/minimax.js',
'./js/core/ia/remoto.js',
'./js/core/ia/trabajador.js',
'./js/games/ahorcado/ahorcado.css',
'./js/games/ahorcado/dibujos.js',
'./js/games/ahorcado/index.js',
'./js/games/ahorcado/palabras.js',
'./js/games/airhockey/airhockey.css',
'./js/games/airhockey/index.js',
'./js/games/airhockey/motor.js',
'./js/games/ajedrez/ajedrez.css',
'./js/games/ajedrez/index.js',
'./js/games/ajedrez/reglas.js',
'./js/games/billar/billar.css',
'./js/games/billar/index.js',
'./js/games/billar/motor.js',
'./js/games/billar/vista3d.js',
'./js/games/blackjack/blackjack.css',
'./js/games/blackjack/index.js',
'./js/games/blackjack/motor.js',
'./js/games/bloques/bloques.css',
'./js/games/bloques/index.js',
'./js/games/bloques/motor.js',
'./js/games/brisca/brisca.css',
'./js/games/brisca/ia.js',
'./js/games/brisca/index.js',
'./js/games/brisca/motor.js',
'./js/games/buscaminas/buscaminas.css',
'./js/games/buscaminas/index.js',
'./js/games/buscaminas/motor.js',
'./js/games/catapulta/avatares.js',
'./js/games/catapulta/catapulta.css',
'./js/games/catapulta/imagenes.js',
'./js/games/catapulta/index.js',
'./js/games/catapulta/motor.js',
'./js/games/catapulta/niveles.js',
'./js/games/chinchon/chinchon.css',
'./js/games/chinchon/index.js',
'./js/games/chinchon/motor.js',
'./js/games/cifrasletras/cifrasletras.css',
'./js/games/cifrasletras/index.js',
'./js/games/cifrasletras/motor.js',
'./js/games/cinquillo/cinquillo.css',
'./js/games/cinquillo/index.js',
'./js/games/cinquillo/motor.js',
'./js/games/conecta4/conecta4.css',
'./js/games/conecta4/index.js',
'./js/games/conecta4/reglas.js',
'./js/games/continental/continental.css',
'./js/games/continental/index.js',
'./js/games/continental/motor.js',
'./js/games/corazones/corazones.css',
'./js/games/corazones/index.js',
'./js/games/corazones/motor.js',
'./js/games/crucigrama/crucigrama.css',
'./js/games/crucigrama/generador.js',
'./js/games/crucigrama/index.js',
'./js/games/crucigrama/pistas.js',
'./js/games/damas/damas.css',
'./js/games/damas/ia.js',
'./js/games/damas/index.js',
'./js/games/damas/reglas.js',
'./js/games/domino/domino.css',
'./js/games/domino/index.js',
'./js/games/domino/motor.js',
'./js/games/encadenadas/diccionario.js',
'./js/games/encadenadas/encadenadas.css',
'./js/games/encadenadas/index.js',
'./js/games/encadenadas/motor.js',
'./js/games/encadenadas/silabas.js',
'./js/games/flota/flota.css',
'./js/games/flota/index.js',
'./js/games/flota/motor.js',
'./js/games/flota/vista3d.js',
'./js/games/freecell/freecell.css',
'./js/games/freecell/index.js',
'./js/games/freecell/motor.js',
'./js/games/freecell/solver.js',
'./js/games/freecell/solver.worker.js',
'./js/games/holdem/holdem.css',
'./js/games/holdem/index.js',
'./js/games/holdem/motor.js',
'./js/games/hotel/datos.js',
'./js/games/hotel/hotel.css',
'./js/games/hotel/index.js',
'./js/games/hotel/motor.js',
'./js/games/hotel/vista2d.js',
'./js/games/hotel/vista3d.js',
'./js/games/kakuro/generador.js',
'./js/games/kakuro/index.js',
'./js/games/kakuro/kakuro.css',
'./js/games/kenken/generador.js',
'./js/games/kenken/index.js',
'./js/games/kenken/kenken.css',
'./js/games/klondike/index.js',
'./js/games/klondike/klondike.css',
'./js/games/klondike/motor.js',
'./js/games/klondike/solver.js',
'./js/games/klondike/solver.worker.js',
'./js/games/klotski/index.js',
'./js/games/klotski/klotski.css',
'./js/games/klotski/motor.js',
'./js/games/klotski/vista3d.js',
'./js/games/ladrillos/index.js',
'./js/games/ladrillos/ladrillos.css',
'./js/games/ladrillos/motor.js',
'./js/games/magnate/datos.js',
'./js/games/magnate/index.js',
'./js/games/magnate/magnate.css',
'./js/games/magnate/motor.js',
'./js/games/mastermind/index.js',
'./js/games/mastermind/mastermind.css',
'./js/games/mastermind/motor.js',
'./js/games/mastermind/vista3d.js',
'./js/games/memorama/bancos.js',
'./js/games/memorama/index.js',
'./js/games/memorama/memorama.css',
'./js/games/memorama/motor.js',
'./js/games/mus/index.js',
'./js/games/mus/motor.js',
'./js/games/mus/mus.css',
'./js/games/nonogram/index.js',
'./js/games/nonogram/nonogram.css',
'./js/games/nonogram/solver.js',
'./js/games/oca/index.js',
'./js/games/oca/motor.js',
'./js/games/oca/oca.css',
'./js/games/oca/vista3d.js',
'./js/games/parchis/index.js',
'./js/games/parchis/parchis.css',
'./js/games/parchis/reglas.js',
'./js/games/parchis/tablero.js',
'./js/games/parchis/vista3d.js',
'./js/games/pokercub/index.js',
'./js/games/pokercub/motor.js',
'./js/games/pokercub/pokercub.css',
'./js/games/quantix/index.js',
'./js/games/quantix/motor.js',
'./js/games/quantix/quantix.css',
'./js/games/quecara/LICENSE-vue-color-avatar.txt',
'./js/games/quecara/avatar.js',
'./js/games/quecara/defecto.js',
'./js/games/quecara/index.js',
'./js/games/quecara/motor.js',
'./js/games/quecara/piezas.js',
'./js/games/quecara/preguntas.js',
'./js/games/quecara/quecara.css',
'./js/games/rosco/index.js',
'./js/games/rosco/motor.js',
'./js/games/rosco/palabras.js',
'./js/games/rosco/rosco.css',
'./js/games/ruleta/index.js',
'./js/games/ruleta/motor.js',
'./js/games/ruleta/paneles.js',
'./js/games/ruleta/ruleta.css',
'./js/games/ruleta/vista3d.js',
'./js/games/rummy/index.js',
'./js/games/rummy/motor.js',
'./js/games/rummy/rummy.css',
'./js/games/rummy/vista3d.js',
'./js/games/scrabble/diccio.js',
'./js/games/scrabble/index.js',
'./js/games/scrabble/motor.js',
'./js/games/scrabble/scrabble.css',
'./js/games/scrabble/servicio.js',
'./js/games/scrabble/trabajador.js',
'./js/games/serpiente/index.js',
'./js/games/serpiente/motor.js',
'./js/games/serpiente/serpiente.css',
'./js/games/sokoban/index.js',
'./js/games/sokoban/motor.js',
'./js/games/sokoban/niveles.js',
'./js/games/sokoban/sokoban.css',
'./js/games/sokoban/vista3d.js',
'./js/games/sopa/generador.js',
'./js/games/sopa/index.js',
'./js/games/sopa/palabras.js',
'./js/games/sopa/sopa.css',
'./js/games/spider/index.js',
'./js/games/spider/motor.js',
'./js/games/spider/spider.css',
'./js/games/sudoku/generador.js',
'./js/games/sudoku/index.js',
'./js/games/sudoku/sudoku.css',
'./js/games/tresenraya/index.js',
'./js/games/tresenraya/reglas.js',
'./js/games/tresenraya/tresenraya.css',
'./js/games/trivial/clasicas.js',
'./js/games/trivial/index.js',
'./js/games/trivial/motor.js',
'./js/games/trivial/trivial.css',
'./js/games/vuelaalto/index.js',
'./js/games/vuelaalto/motor.js',
'./js/games/vuelaalto/vuelaalto.css',
'./js/games/worms/ia.js',
'./js/games/worms/index.js',
'./js/games/worms/motor.js',
'./js/games/worms/worms.css',
'./js/vendor/matter.min.js',
'./js/vendor/three.module.min.js'
/*ARCHIVOS-FIN*/
];
// Tipografías de Google Fonts (Baloo 2, Chewy y Nunito): se guardan en una caché aparte que NO se borra al actualizar la app,
// para que sin conexión los textos se vean igual que con internet. Debe ser la MISMA dirección que en index.html.
const FUENTES = 'jr-fuentes', CARTAS = 'jr-cartas', DICC = 'jr-diccionario';      // cachés que se conservan entre versiones
const esDiccionario = url => url.origin === location.origin && /\/data\/diccionario\/(es|lemas)-[0-9a-f]{8}\.txt$/.test(url.pathname);
// Imágenes de los naipes (img/cartas): no van en la lista de arriba para no volver a bajar varios MB en cada actualización.
// Se guardan en su propia caché al usarlas. En segundo plano solo se descargan las barajas y el dorso que el usuario
// tiene elegidos en 🎨 Apariencia (más una carta de muestra de cada baraja; los tapetes también), no todas: así no se gastan datos móviles.
const esImgCarta = url => url.origin === location.origin && url.pathname.includes('/img/cartas/') && /\.(webp|png|jpe?g)$/i.test(url.pathname);
const EXT_OK = ['webp', 'png', 'jpg', 'jpeg'];
const extJoker = b => (EXT_OK.includes(b.joker) ? b.joker : b.ext);       // igual que urlJoker() en js/core/cartas.js
function rutasBaraja(b, tipo) {
  const r = [], n2 = n => String(n).padStart(2, '0');
  if (tipo === 'es') { for (const rg of [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]) for (const l of 'OCEB') r.push(`${b.ruta}/${n2(rg)}-${l}.${b.ext}`); }
  else for (let rg = 1; rg <= 13; rg++) for (const l of 'PCDT') r.push(`${b.ruta}/${n2(rg)}-${l}.${b.ext}`);
  if (b.joker) r.push(`${b.ruta}/00.${extJoker(b)}`);                  // comodín: también en las españolas (Chinchón)
  return r;
}
async function guardarCartas(elegidas) {
  const base = new URL('./img/cartas/', self.registration.scope), r = await fetch(new URL('barajas.json', base), { cache: 'no-cache' });
  if (!r.ok) return;
  const d = await r.json(), todas = new Set(), bajar = new Set(), quiero = new Set(Array.isArray(elegidas) ? elegidas : []);
  for (const [lista, tipo] of [[d.espanola, 'es'], [d.francesa, 'fr']]) for (const b of lista || []) {
    const rs = rutasBaraja(b, tipo), muestra = `${b.ruta}/${b.muestra}.${b.ext}`;
    rs.forEach(x => todas.add(x)); todas.add(muestra); bajar.add(muestra);
    if (quiero.has(b.id)) rs.forEach(x => bajar.add(x));
  }
  for (const x of [...(d.dorsos || []), ...(d.tapetes || []), ...(d.fondos || [])]) { todas.add(x.archivo); if (quiero.has(x.id)) bajar.add(x.archivo); }
  const url = x => new URL(x.split('/').map(encodeURIComponent).join('/'), base).href, ok = x => typeof x === 'string' && !x.includes('..');
  const validas = new Set([...todas].filter(ok).map(url)), urls = [...bajar].filter(ok).map(url), c = await caches.open(CARTAS);
  for (const req of await c.keys()) if (!validas.has(req.url)) await c.delete(req);   // barajas que ya no están
  for (let i = 0; i < urls.length; i += 6) await Promise.all(urls.slice(i, i + 6).map(async u => { if (await c.match(u)) return; try { const res = await fetch(u); if (res.ok) await c.put(u, res); } catch { /* sin red: otra vez será */ } }));
}
self.addEventListener('message', e => {
  const m = e.data;
  if (m === 'guardar-cartas') e.waitUntil(guardarCartas([]).catch(() => {}));
  else if (m && m.tipo === 'guardar-cartas') e.waitUntil(guardarCartas(m.ids).catch(() => {}));
});
const FUENTES_CSS = 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Chewy&family=Nunito:wght@500;700;800&display=swap';
const esFuente = url => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
async function guardarFuentes() {                 // descarga la hoja de estilos y todos los archivos de letra que enlaza
  const c = await caches.open(FUENTES), res = await fetch(FUENTES_CSS, { cache: 'reload' });
  if (!res.ok) return;
  await c.put(FUENTES_CSS, res.clone());
  const urls = [...(await res.text()).matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(m => m[1]);
  await Promise.all(urls.map(u => c.match(u).then(ya => ya || fetch(u).then(r => (r.ok ? c.put(u, r) : null)))));
}

// Guarda los archivos uno a uno: si alguno falla (por ejemplo, uno que no se ha subido a GitHub), los demás se guardan igual
// y la app sigue funcionando sin conexión. (Con addAll, un solo fallo cancelaba la instalación entera.)
async function guardarApp() {
  const c = await caches.open(VERSION);
  const r = await Promise.allSettled(ARCHIVOS.map(async u => {
    const res = await fetch(new Request(u, { cache: 'reload' }));
    if (!res.ok) throw new Error(u + ' → ' + res.status);
    await c.put(u, res);
  }));
  const fallos = r.filter(x => x.status === 'rejected');
  if (fallos.length) console.warn('Sin conexión no estarán disponibles:', fallos.map(x => x.reason && x.reason.message));
  if (fallos.length > ARCHIVOS.length / 2) throw new Error('Demasiados archivos fallidos: se reintentará');   // probablemente sin red
}

// cache: 'reload' obliga a bajar cada archivo del servidor: sin esto, la caché HTTP del navegador (GitHub Pages guarda ~10 min)
// podía meter archivos ANTIGUOS en la versión nueva y los cambios no se veían.
self.addEventListener('install', e => {
  e.waitUntil(Promise.all([
    guardarApp(),
    guardarFuentes().catch(() => {}),             // sin conexión o si Google falla, la app se instala igual
  ]).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== FUENTES && k !== CARTAS && k !== DICC).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (esFuente(url)) {                            // fuentes: primero la copia guardada; si no está, se descarga y se guarda
    e.respondWith(caches.open(FUENTES).then(c => c.match(req, { ignoreVary: true }).then(r => r || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }))).catch(() => new Response('', { status: 200, headers: { 'Content-Type': url.hostname === 'fonts.googleapis.com' ? 'text/css' : 'font/woff2' } })));
    return;
  }
  if (esImgCarta(url)) {                          // naipes: primero la copia guardada; si no está, se descarga y se guarda
    e.respondWith(caches.open(CARTAS).then(c => c.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }))));
    return;
  }
  if (esDiccionario(url)) {                      // diccionario: se guarda la primera vez que se usa y se conserva entre versiones
    e.respondWith(caches.open(DICC).then(c => c.match(req).then(r => r || fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }))));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => {
    if (res.ok) { const copia = res.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
    return res;
  }).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
