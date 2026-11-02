#!/usr/bin/env python3
"""Convierte las imágenes originales de Catapulta (JPG con fondo magenta) en WebP con transparencia.
Uso:  python tools/procesar_catapulta.py CARPETA_CON_LAS_IMAGENES
Busca (a cualquier profundidad) archivos que se llamen av-*, en-*, fx-*, lanzador-*, mat-* y fondo-* (con cualquier extensión)
y deja el resultado en img/catapulta/ (sprites y texturas) e img/cartas/fondos/ (fondos de pantalla).
Quita el magenta #FF00FF del fondo con un «chroma key» suave (sin tocar los magentas del interior de los dibujos)."""
import os, sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAL = os.path.join(RAIZ, 'img', 'catapulta')
FONDOS = os.path.join(RAIZ, 'img', 'cartas', 'fondos')


def quitar_magenta(im):
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.minimum(r, b) - g                                   # «magentez»: 255 en el magenta puro, ≈ 0 en casi todo lo demás
    cand = (m > 60) & (r > 140) & (b > 110)                    # magenta o rosa de los halos
    puro = (g < 60) & (r > 215) & (b > 200)                    # magenta casi puro (sirve para los huecos cerrados)
    lab, n = ndi.label(cand)
    fondo = np.zeros(cand.shape, bool)
    if n:
        borde = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
        fondo = np.isin(lab, borde[borde > 0])                 # conectado al borde de la imagen
    lab2, n2 = ndi.label(puro)
    if n2:
        tam = ndi.sum(puro, lab2, index=np.arange(1, n2 + 1))
        fondo |= np.isin(lab2, [i + 1 for i, t in enumerate(tam) if t > 40])   # huecos cerrados (dentro de un aro, entre las ruedas…)
    banda = ndi.binary_dilation(fondo, iterations=4) & ~fondo
    alfa = np.ones(fondo.shape, np.float32); alfa[fondo] = 0
    # En el borde, la mezcla es píxel = α·color + (1-α)·magenta → se despeja α y el color real
    al = np.clip(1 - m / 235.0, 0, 1)
    alfa[banda] = al[banda]
    out = a.copy()
    mag = np.array([255, 0, 255], np.float32)
    k = np.maximum(alfa, 1e-3)[..., None]
    des = np.clip((a - (1 - alfa)[..., None] * mag) / k, 0, 255)
    out[banda] = des[banda]
    res = np.dstack([out, alfa * 255]).astype(np.uint8)
    return Image.fromarray(res, 'RGBA')


def recortar(im, cuadrado=True, margen=0.03):
    bb = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    if not bb: return im
    im = im.crop(bb)
    if cuadrado:
        s = int(max(im.size) * (1 + 2 * margen)); lienzo = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        lienzo.paste(im, ((s - im.width) // 2, (s - im.height) // 2)); return lienzo
    return im


def guardar(im, nombre, ancho=None, q=86):
    if ancho and im.width != ancho: im = im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)
    os.makedirs(SAL, exist_ok=True); im.save(os.path.join(SAL, nombre + '.webp'), 'WEBP', quality=q, method=6)
    return im


def quitar_aro(im, fuerte=False):
    """Algunos dibujos traen un aro fino alrededor (cangrejo, calavera): se quitan las líneas finas que quedan lejos del centro."""
    a = np.asarray(im).copy(); al = a[..., 3] > 40
    ys, xs = np.where(al); cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2; R = (xs.max() - xs.min()) / 2
    nucleo = ndi.binary_dilation(ndi.binary_erosion(al, iterations=9), iterations=13)
    yy, xx = np.mgrid[0:al.shape[0], 0:al.shape[1]]
    lejos = np.hypot(xx - cx, yy - cy) > 0.84 * R
    a[al & ~nucleo & lejos, 3] = 0
    lab, n = ndi.label(a[..., 3] > 40)
    tam = ndi.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1))
    for i in range(1, n + 1):
        if tam[i - 1] < 0.08 * tam.max(): a[lab == i, 3] = 0
    if fuerte:                                                  # aro pegado al dibujo: solo se conserva lo que está cerca de zonas con color (el aro es negro)
        al2 = a[..., 3] > 40; color = al2 & (a[..., :3].max(axis=2) >= 110)
        color = ndi.binary_opening(color, iterations=2)
        a[~(ndi.binary_dilation(color, iterations=10) & al2), 3] = 0
        lab, n = ndi.label(a[..., 3] > 40); tam = ndi.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1))
        for i in range(1, n + 1):
            if tam[i - 1] < 0.08 * tam.max(): a[lab == i, 3] = 0
    return Image.fromarray(a, 'RGBA')


def trozos(im, nombre):
    """Hoja de escombros: devuelve los rectángulos [x, y, w, h] de cada pieza (en una hoja de 512 px)."""
    im = im.resize((512, 512), Image.LANCZOS)
    al = np.asarray(im.getchannel('A')) > 40
    al = ndi.binary_dilation(al, iterations=3)
    lab, n = ndi.label(al); piezas = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(ys) < 250: continue
        piezas.append([int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)])
    guardar(im, nombre, 512, 84)
    return piezas


def buscar(raiz):
    d = {}
    for ruta, _, fs in os.walk(raiz):
        for f in fs:
            n = f.split('.')[0]
            if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')) and n.split('-')[0] in ('av', 'en', 'fx', 'lanzador', 'mat', 'fondo'): d[n] = os.path.join(ruta, f)
    return d


def main(entrada):
    f = buscar(entrada); info = {'trozos': {}, 'tam': {}}
    for n, ruta in sorted(f.items()):
        im = Image.open(ruta)
        if n.startswith('fondo-'):
            os.makedirs(FONDOS, exist_ok=True)
            im.convert('RGB').resize((1024, round(1024 * im.height / im.width)), Image.LANCZOS).save(os.path.join(FONDOS, n[6:] + '.webp'), 'WEBP', quality=82, method=6); continue
        if n.startswith('mat-'):
            guardar(im.convert('RGB').resize((256, 256), Image.LANCZOS), n, None, 84); continue
        t = quitar_magenta(im)
        if n.startswith('fx-escombros'): info['trozos'][n[3:]] = trozos(t, n); continue
        if n.startswith(('en-piratas', 'en-acuaticos')): t = quitar_aro(t, n.startswith('en-acuaticos'))
        if n == 'av-objetos-2': t = quitar_aro(t)
        if n.endswith('-div'):                                   # hoja con las 3 piezas del proyectil divisible: se corta en tercios → <nombre>-1…3
            w = t.width // 3
            for i in range(3): guardar(recortar(t.crop((i * w, 0, (i + 1) * w, t.height)), True), '%s-%d' % (n, i + 1), 256)
            continue
        if n.startswith('lanzador'):
            t = recortar(t, False); guardar(t, n, 384); info['tam'][n] = [t.width, t.height]; continue
        t = recortar(t, True)
        guardar(t, n, 128 if n == 'fx-impacto' else 256)
    # mosaicos para el selector de Apariencia (2×2: normal, divisible, acelerador, bomba)
    for s in sorted({n.split('-')[1] for n in f if n.startswith('av-')}):
        mos = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
        for i in range(4):
            p = os.path.join(SAL, 'av-%s-%d.webp' % (s, i + 1))
            if os.path.exists(p): mos.alpha_composite(Image.open(p).convert('RGBA').resize((120, 120), Image.LANCZOS), ((i % 2) * 128 + 4, (i // 2) * 128 + 4))
        mos.save(os.path.join(SAL, 'mosaico-%s.webp' % s), 'WEBP', quality=86, method=6)
    json.dump(info, open(os.path.join(SAL, 'info.json'), 'w'), indent=1)
    print('listo:', len(f), 'imágenes →', SAL)


if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit(__doc__)
    main(sys.argv[1])
