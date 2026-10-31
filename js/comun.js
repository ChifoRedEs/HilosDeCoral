/* Hilos de Coral · utilidades compartidas por la tienda y el panel admin */
(function (global) {
  'use strict';

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ESC[c]); }

  function num(v, def) { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : (def == null ? 0 : def); }

  function precio(v, moneda) {
    const n = num(v);
    const txt = n.toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
    return txt + ' ' + (moneda || '€');
  }

  function slug(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'item';
  }

  function uid(prefix) { return (prefix || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* Enlaces seguros: solo http(s), mailto, tel y anclas internas */
  function urlSegura(u) {
    u = String(u || '').trim();
    return /^(https?:\/\/|mailto:|tel:|#)/i.test(u) ? u : '#';
  }

  /* Formato sencillo para los textos de las páginas:
     ## Título · - lista · **negrita** · [texto](enlace) · línea en blanco = párrafo nuevo */
  function inline(t) {
    return esc(t)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) => {
        const u = urlSegura(url.replace(/&amp;/g, '&'));
        const ext = /^https?:/i.test(u) ? ' target="_blank" rel="noopener"' : '';
        return '<a href="' + esc(u) + '"' + ext + '>' + txt + '</a>';
      });
  }

  function textoRico(src, bloques) {
    bloques = bloques || {};
    const out = [];
    let lista = null, parrafo = [];
    const cerrarP = () => { if (parrafo.length) { out.push('<p>' + parrafo.map(inline).join('<br>') + '</p>'); parrafo = []; } };
    const cerrarL = () => { if (lista) { out.push('<ul>' + lista.map((l) => '<li>' + inline(l) + '</li>').join('') + '</ul>'); lista = null; } };
    String(src || '').split(/\r?\n/).forEach((linea) => {
      const l = linea.trim();
      const bloque = l.match(/^\{(\w+)\}$/);
      if (bloque && bloques[bloque[1]] != null) { cerrarP(); cerrarL(); out.push(bloques[bloque[1]]); return; }
      if (!l) { cerrarP(); cerrarL(); return; }
      if (/^#{2,3}\s+/.test(l)) { cerrarP(); cerrarL(); out.push('<h3>' + inline(l.replace(/^#+\s+/, '')) + '</h3>'); return; }
      if (/^[-*]\s+/.test(l)) { cerrarP(); (lista = lista || []).push(l.replace(/^[-*]\s+/, '')); return; }
      cerrarL(); parrafo.push(l);
    });
    cerrarP(); cerrarL();
    return out.join('\n');
  }

  /* Sustituye {variables} dentro del texto */
  function variables(texto, vars) {
    return String(texto || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null && typeof vars[k] !== 'object' ? String(vars[k]) : m));
  }

  function variablesTienda(cfg) {
    const c = cfg || {};
    const p = c.politicas || {};
    return {
      nombreTienda: (c.tienda || {}).nombre || '',
      email: (c.contacto || {}).email || '[correo electrónico]',
      whatsapp: (c.contacto || {}).whatsapp || '[WhatsApp]',
      instagram: (c.contacto || {}).instagram || '',
      devolucionesDias: p.devolucionesDias != null ? p.devolucionesDias : 14,
      garantiaAnios: p.garantiaAnios != null ? p.garantiaAnios : 3,
      titular: p.titular || '[Titular]',
      nif: p.nif || '[NIF]',
      domicilio: p.domicilio || '[Domicilio]',
      horasReserva: (c.pedido || {}).horasReserva || 48
    };
  }

  function listaEntregas(cfg) {
    const m = (cfg.pedido || {}).moneda;
    const act = (cfg.entregas || []).filter((e) => e.activo);
    if (!act.length) return '<p>Consúltanos por WhatsApp.</p>';
    return '<ul class="lista-metodos">' + act.map((e) => {
      const coste = num(e.precio) > 0 ? precio(e.precio, m) : 'Gratis';
      const gratis = e.gratisDesde ? ' · gratis desde ' + precio(e.gratisDesde, m) : '';
      return '<li><strong>' + esc(e.nombre) + '</strong> · ' + esc(coste) + esc(gratis) +
        (e.plazo ? ' · ' + esc(e.plazo) : '') + (e.descripcion ? '<br><span>' + esc(e.descripcion) + '</span>' : '') + '</li>';
    }).join('') + '</ul>';
  }

  function listaPagos(cfg) {
    const m = (cfg.pedido || {}).moneda;
    const act = (cfg.pagos || []).filter((p) => p.activo);
    if (!act.length) return '<p>Consúltanos por WhatsApp.</p>';
    return '<ul class="lista-metodos">' + act.map((p) =>
      '<li><strong>' + esc(p.nombre) + '</strong>' + (num(p.recargo) > 0 ? ' · recargo de ' + esc(precio(p.recargo, m)) : '') +
      (p.descripcion ? '<br><span>' + esc(p.descripcion) + '</span>' : '') + '</li>').join('') + '</ul>';
  }

  function paginaHTML(pagina, cfg) {
    const texto = variables(pagina.texto, variablesTienda(cfg));
    return textoRico(texto, { entregas: listaEntregas(cfg), pagos: listaPagos(cfg) });
  }

  async function cargarJSON(ruta) {
    const r = await fetch(ruta + (ruta.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('No se pudo cargar ' + ruta + ' (' + r.status + ')');
    return r.json();
  }

  const ESTADOS = {
    disponible: { txt: 'Disponible', clase: 'disponible' },
    reservado: { txt: 'Reservado', clase: 'reservado' },
    vendido: { txt: 'Vendido', clase: 'vendido' }
  };

  /* Estado real: si no quedan unidades, se considera vendido */
  function estadoProducto(p) {
    if (p.estado === 'reservado' || p.estado === 'vendido') return p.estado;
    if (p.unidades != null && p.unidades !== '' && num(p.unidades) <= 0) return 'vendido';
    return 'disponible';
  }

  /* Opciones de personalización de texto */
  const PERS = {
    fuentes: [
      { id: 'manuscrita', nombre: 'Manuscrita', css: "'Dancing Script', cursive", peso: 700 },
      { id: 'retro', nombre: 'Retro', css: "'Pacifico', cursive", peso: 400 },
      { id: 'a-mano', nombre: 'A mano', css: "'Caveat', cursive", peso: 700 },
      { id: 'redondeada', nombre: 'Redondeada', css: "'Fredoka', sans-serif", peso: 600 },
      { id: 'alta', nombre: 'Alta y fina', css: "'Amatic SC', cursive", peso: 700 }
    ],
    tamanos: [
      { id: 'pequeno', nombre: 'Pequeño', escala: 5 },
      { id: 'mediano', nombre: 'Mediano', escala: 7.5 },
      { id: 'grande', nombre: 'Grande', escala: 10.5 }
    ],
    posiciones: [
      { id: 'arriba', nombre: 'Arriba' },
      { id: 'centro', nombre: 'Centro' },
      { id: 'abajo', nombre: 'Abajo' },
      { id: 'esquina', nombre: 'Esquina (pequeño)' }
    ],
    colores: [
      { id: 'marino', nombre: 'Azul marino', hex: '#1B3F66' },
      { id: 'coral', nombre: 'Coral', hex: '#D9714F' },
      { id: 'aguamarina', nombre: 'Aguamarina', hex: '#3E8E9B' },
      { id: 'mostaza', nombre: 'Mostaza', hex: '#D99A2B' },
      { id: 'negro', nombre: 'Negro', hex: '#2B2B2B' }
    ],
    /* Dónde cae el texto en la foto de cada tipo de prenda (en % de la imagen): x central, ancho máximo y altura de cada posición */
    zonas: {
      totebag: { x: 50, w: 50, arriba: 41, centro: 62, abajo: 87, esquina: [64, 42] },
      bodies: { x: 50, w: 34, arriba: 27, centro: 47, abajo: 70, esquina: [61, 27] },
      baberos: { x: 50, w: 42, arriba: 31, centro: 55, abajo: 78, esquina: [62, 34] },
      camisetas: { x: 50, w: 38, arriba: 26, centro: 50, abajo: 74, esquina: [61, 27] },
      defecto: { x: 50, w: 46, arriba: 28, centro: 52, abajo: 76, esquina: [63, 30] }
    },
    defecto: { fuente: 'manuscrita', tamano: 'mediano', posicion: 'abajo', color: 'marino' }
  };

  /* Calcula dónde y cómo se dibuja el texto sobre la foto */
  function estiloPersonalizacion(pers, subcategoria) {
    const z = PERS.zonas[subcategoria] || PERS.zonas.defecto;
    const f = PERS.fuentes.find((x) => x.id === pers.fuente) || PERS.fuentes[0];
    const t = PERS.tamanos.find((x) => x.id === pers.tamano) || PERS.tamanos[1];
    const c = PERS.colores.find((x) => x.id === pers.color) || PERS.colores[0];
    let x = z.x, y = z[pers.posicion] != null ? z[pers.posicion] : z.abajo, escala = t.escala, ancho = z.w;
    if (pers.posicion === 'esquina') { x = z.esquina[0]; y = z.esquina[1]; escala = t.escala * 0.55; ancho = z.w * 0.45; }
    return 'left:' + x.toFixed(1) + '%;top:' + y.toFixed(1) + '%;max-width:' + ancho.toFixed(1) + '%;font-family:' + f.css + ';font-weight:' + f.peso +
      ';font-size:' + escala.toFixed(2) + 'cqw;color:' + c.hex;
  }

  function describirPersonalizacion(pers) {
    const nom = (lista, id) => (PERS[lista].find((x) => x.id === id) || {}).nombre || id;
    return ['Texto: «' + pers.texto + '»', 'Letra: ' + nom('fuentes', pers.fuente) + ' · Tamaño: ' + nom('tamanos', pers.tamano),
      'Posición: ' + nom('posiciones', pers.posicion) + ' · Color: ' + nom('colores', pers.color)];
  }

  const VERSION = '1.5.0';
  const FECHA_VERSION = '31/10/2026';

  global.HDC = { VERSION, FECHA_VERSION, PERS, estiloPersonalizacion, describirPersonalizacion, esc, num, precio, slug, uid, urlSegura, textoRico, variables, variablesTienda, listaEntregas, listaPagos, paginaHTML, cargarJSON, ESTADOS, estadoProducto };
})(window);
