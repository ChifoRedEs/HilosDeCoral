// Carga y caché de las imágenes de Catapulta (img/catapulta/*.webp). Mientras una imagen no esté lista, `img()` devuelve null y el juego pinta un dibujo de reserva.
const BASE = new URL('../../../img/catapulta/', import.meta.url);
const cache = new Map();
export const url = n => new URL(n + '.webp', BASE).href;
export function img(n, alCargar) {
  let e = cache.get(n);
  if (!e) { e = { im: new Image(), ok: false, cbs: [] }; e.im.onload = () => { e.ok = true; e.cbs.splice(0).forEach(f => f()); }; e.im.src = url(n); cache.set(n, e); }
  if (e.ok) return e.im;
  if (alCargar && !e.cbs.includes(alCargar)) e.cbs.push(alCargar);
  return null;
}
// Espera a que estén listas (con un tiempo máximo para no dejar el juego bloqueado si alguna falla)
export function cargar(nombres, esperaMs = 6000) {
  return new Promise(ok => {
    let falta = 0; const fin = () => { if (--falta <= 0) ok(); };
    for (const n of nombres) if (!img(n, fin)) falta++;
    if (!falta) return ok();
    setTimeout(ok, esperaMs);
  });
}
// Trozos de las hojas de escombros (en la hoja de 512 px): [x, y, ancho, alto]
export const TROZOS = {
  'escombros-hielo': [[20, 39, 185, 208], [354, 40, 131, 203], [215, 42, 129, 134], [218, 209, 91, 91], [294, 275, 199, 196], [36, 289, 144, 168], [198, 350, 84, 86]],
  'escombros-madera': [[25, 30, 181, 222], [338, 47, 142, 178], [216, 70, 110, 101], [217, 243, 95, 225], [24, 251, 194, 216], [326, 284, 161, 165]],
  'escombros-piedra': [[22, 51, 172, 188], [206, 64, 114, 127], [326, 68, 169, 155], [204, 222, 101, 86], [295, 278, 200, 177], [31, 289, 146, 151], [198, 349, 82, 76]],
};
