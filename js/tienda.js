/* Hilos de Coral · lógica de la tienda */
(function () {
  'use strict';
  const { esc, num, precio, ESTADOS, estadoProducto, paginaHTML, cargarJSON, listaEntregas, VERSION, FECHA_VERSION, PERS, estiloPersonalizacion, describirPersonalizacion } = window.HDC;
  const $ = (s, el) => (el || document).querySelector(s);
  const CLAVE_CESTA = 'hdc-cesta';
  const IMG_TODO = 'img/cat-todo.webp';

  const E = { cfg: {}, cats: [], prods: [], cat: '', sub: '', abierto: '', q: '', orden: 'novedad', cesta: [], vista: 'lineas', pedido: null };

  /* ---------- Utilidades ---------- */
  const moneda = () => (E.cfg.pedido || {}).moneda || '€';
  const pr = (v) => precio(v, moneda());
  const catDe = (id) => E.cats.find((c) => c.id === id);
  const prodDe = (id) => E.prods.find((p) => p.id === id);
  const visibles = () => E.prods.filter((p) => p.visible !== false && (!p.categoria || !catDe(p.categoria) || catDe(p.categoria).visible !== false));
  const fotoDe = (p) => (p.fotos && p.fotos[0]) || null;
  const iconoCat = (p) => { const c = catDe(p.categoria); return (c && c.icono) || IMG_TODO; };
  const maxUnidades = (p) => (p.unidades === '' || p.unidades == null ? 99 : Math.max(0, Math.floor(num(p.unidades))));
  const comprable = (p) => p && p.visible !== false && estadoProducto(p) === 'disponible' && maxUnidades(p) > 0;
  const persActiva = (p) => !!(p && p.personalizable !== false && catDe(p.categoria) && catDe(p.categoria).personalizable);
  const encargosDe = (c) => (c && c.visible !== false && c.encargos && c.encargos.activo && (c.encargos.bases || []).length ? c.encargos : null);
  const extraPers = (p) => (persActiva(p) ? num(p.persExtra) : 0);

  function imgProducto(p, clase) {
    const f = fotoDe(p);
    return f
      ? '<img src="' + esc(f) + '" alt="' + esc(p.nombre) + '" loading="lazy"' + (clase ? ' class="' + clase + '"' : '') + '>'
      : '<img src="' + esc(iconoCat(p)) + '" alt="" class="sin-foto' + (clase ? ' ' + clase : '') + '" loading="lazy">';
  }

  function etiquetasHTML(p) {
    const est = estadoProducto(p);
    let h = '';
    if (p.novedad && est === 'disponible') h += '<span class="etiqueta novedad">Novedad</span>';
    if (num(p.precioAnterior) > num(p.precio) && est === 'disponible') h += '<span class="etiqueta oferta">Oferta</span>';
    if (est !== 'disponible' || !p.novedad) h += '<span class="etiqueta ' + ESTADOS[est].clase + '">' + ESTADOS[est].txt + '</span>';
    return h;
  }

  const sinPrecio = (p) => !(num(p.precio) > 0);

  function precioHTML(p) {
    if (sinPrecio(p)) return '<span class="precio precio-consultar">Consultar precio</span>';
    return '<span class="precio">' + esc(pr(p.precio)) +
      (num(p.precioAnterior) > num(p.precio) ? '<s>' + esc(pr(p.precioAnterior)) + '</s>' : '') + '</span>';
  }

  let tAviso;
  function aviso(txt) {
    const el = $('#aviso-flotante');
    el.textContent = txt; el.classList.add('visible');
    clearTimeout(tAviso); tAviso = setTimeout(() => el.classList.remove('visible'), 2600);
  }

  /* ---------- Configuración general ---------- */
  function aplicarConfig() {
    const c = E.cfg, t = c.tienda || {}, po = c.portada || {}, av = c.avisos || {};
    document.title = (t.nombre || 'Tienda') + (po.titulo ? ' · ' + po.titulo : '');
    const setTxt = (sel, v) => { const el = $(sel); if (el && v != null) el.textContent = v; };
    setTxt('#marca-nombre', t.nombre); setTxt('#marca-lema', t.lema);
    setTxt('#pie-nombre', t.nombre); setTxt('#pie-lema', po.titulo || t.descripcion); setTxt('#pie-copy', t.nombre);
    setTxt('#portada-titulo', po.titulo); setTxt('#portada-subtitulo', po.subtitulo);
    if (t.logoSimple) $('#marca-logo').src = t.logoSimple;
    if (t.logo) { $('#portada-logo').src = t.logo; $('#portada-logo').alt = t.nombre || ''; }
    if (po.banner) $('#portada').style.backgroundImage = 'url("' + po.banner.replace(/"/g, '') + '")';
    const meta = document.querySelector('meta[name="description"]'); if (meta && t.descripcion) meta.content = t.descripcion;
    $('#anio').textContent = new Date().getFullYear();
    $('#version-web').textContent = 'v' + VERSION + ' · ' + FECHA_VERSION;

    const barra = $('#barra-superior');
    barra.textContent = po.barraSuperior || ''; barra.hidden = !po.barraSuperior;
    const vac = $('#aviso-vacaciones');
    vac.textContent = av.mensajeVacaciones || ''; vac.hidden = !(av.vacaciones && av.mensajeVacaciones);

    const paginas = (c.paginas || []).filter((p) => p.visible !== false);
    $('#menu-cabecera').innerHTML = '<a href="#tienda">Tienda</a>' + paginas.filter((p) => p.menu === 'cabecera')
      .map((p) => '<a href="#/pagina/' + esc(p.id) + '">' + esc(p.titulo) + '</a>').join('');
    $('#menu-pie').innerHTML = paginas.filter((p) => p.menu === 'pie' || p.menu === 'cabecera')
      .map((p) => '<a href="#/pagina/' + esc(p.id) + '">' + esc(p.titulo) + '</a>').join('');

    const ct = c.contacto || {};
    const redes = [];
    if (ct.instagram) redes.push('<a href="https://instagram.com/' + esc(ct.instagram.replace(/^@/, '')) + '" target="_blank" rel="noopener">Instagram</a>');
    if (numeroWhatsApp()) redes.push('<a href="https://wa.me/' + numeroWhatsApp() + '" target="_blank" rel="noopener">WhatsApp</a>');
    if (ct.email) redes.push('<a href="mailto:' + esc(ct.email) + '">' + esc(ct.email) + '</a>');
    $('#pie-redes').innerHTML = redes.join('');

    const pagos = (c.pagos || []).filter((p) => p.activo).map((p) => p.nombre.replace(/\s*\(.*\)$/, ''));
    const entregas = (c.entregas || []).filter((e) => e.activo).map((e) => e.nombre);
    if (pagos.length) $('#paso-pagos').textContent = unirLista(pagos) + '.';
    if (entregas.length) $('#paso-entregas').textContent = unirLista(entregas) + '.';
  }

  function unirLista(a) {
    a = a.map((x, i) => (i ? x.charAt(0).toLowerCase() + x.slice(1) : x));
    return a.length > 1 ? a.slice(0, -1).join(', ') + ' o ' + a[a.length - 1] : a[0];
  }

  /* ---------- Catálogo ---------- */
  function subsDe(cat) { return ((cat && cat.subcategorias) || []).filter((s) => s.visible !== false); }
  function subDe(cat, id) { return subsDe(cat).find((s) => s.id === id); }
  const flecha = '<svg class="flecha" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function pintarPestanas() {
    const cats = E.cats.filter((c) => c.visible !== false);
    $('#pestanas').innerHTML = cats.map((c) => {
      const n = visibles().filter((p) => p.categoria === c.id).length;
      return '<button type="button" class="pestana-cat" data-cat="' + esc(c.id) + '" aria-expanded="' + (E.abierto === c.id) + '" aria-controls="subcategorias" aria-pressed="' + (E.cat === c.id) + '">' +
        '<img src="' + esc(c.icono || IMG_TODO) + '" alt="">' +
        '<span class="pestana-textos"><span class="pestana-nombre">' + esc(c.nombre) + '</span><span class="pestana-num">' + (n ? n + (n === 1 ? ' pieza' : ' piezas') : 'Muy pronto') + '</span></span>' + flecha + '</button>';
    }).join('');

    const panel = $('#subcategorias');
    const abierta = catDe(E.abierto);
    if (abierta) {
      const subs = subsDe(abierta);
      const cuenta = (s) => visibles().filter((p) => p.categoria === abierta.id && (!s || p.subcategoria === s)).length;
      panel.hidden = false;
      panel.innerHTML = '<div class="sub-rejilla">' +
        '<button type="button" class="sub" data-sub="" data-de="' + esc(abierta.id) + '" aria-pressed="' + (E.cat === abierta.id && !E.sub) + '">' +
        '<span class="sub-img"><img src="' + esc(abierta.icono || IMG_TODO) + '" alt=""></span><span class="sub-nombre">Todo ' + esc(abierta.nombre.toLowerCase()) + '</span><span class="sub-num">' + cuenta('') + '</span></button>' +
        subs.map((s) => '<button type="button" class="sub" data-sub="' + esc(s.id) + '" data-de="' + esc(abierta.id) + '" aria-pressed="' + (E.cat === abierta.id && E.sub === s.id) + '">' +
          '<span class="sub-img"><img src="' + esc(s.icono || abierta.icono || IMG_TODO) + '" alt=""></span><span class="sub-nombre">' + esc(s.nombre) + '</span><span class="sub-num">' + cuenta(s.id) + '</span></button>').join('') +
        '</div>';
    } else { panel.hidden = true; panel.innerHTML = ''; }

    const cab = $('#cabecera-categoria');
    const cat = catDe(E.cat);
    if (cat && !E.sub && (cat.banner || cat.descripcion)) {
      cab.hidden = false;
      cab.style.backgroundImage = cat.banner ? 'url("' + cat.banner.replace(/"/g, '') + '")' : '';
      cab.innerHTML = cat.descripcion ? '<p>' + esc(cat.descripcion) + '</p>' : '';
    } else cab.hidden = true;
    const enc = encargosDe(cat), bl = $('#bloque-encargo');
    bl.hidden = !enc;
    if (enc) bl.innerHTML = '<img src="img/ic-favorito.webp" alt="" width="88" height="84">' +
      '<div class="bloque-encargo-texto"><h3>' + esc(enc.titulo || '¿Tienes tu propio diseño?') + '</h3><p>' + esc(enc.texto || '') + '</p></div>' +
      '<button type="button" class="boton boton-agua" data-encargo="' + esc(cat.id) + '">Encargar mi diseño</button>';
  }

  const normal = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  function filtrados() {
    const q = normal(E.q.trim());
    let lista;
    if (q) lista = visibles().filter((p) => normal(p.nombre + ' ' + (p.descripcion || '') + ' ' + (p.materiales || '')).includes(q));
    else if (E.cat) lista = visibles().filter((p) => p.categoria === E.cat && (!E.sub || p.subcategoria === E.sub));
    else {
      lista = visibles().filter((p) => p.novedad && estadoProducto(p) === 'disponible');
      if (!lista.length) lista = visibles().filter((p) => estadoProducto(p) === 'disponible').sort((a, b) => String(b.creado || '').localeCompare(String(a.creado || ''))).slice(0, 8);
    }
    const peso = (p) => ({ disponible: 0, reservado: 1, vendido: 2 })[estadoProducto(p)];
    const orden = {
      'novedad': (a, b) => peso(a) - peso(b) || (b.novedad ? 1 : 0) - (a.novedad ? 1 : 0) || String(b.creado || '').localeCompare(String(a.creado || '')),
      'precio-asc': (a, b) => (sinPrecio(a) - sinPrecio(b)) || num(a.precio) - num(b.precio),
      'precio-desc': (a, b) => num(b.precio) - num(a.precio),
      'nombre': (a, b) => a.nombre.localeCompare(b.nombre, 'es')
    }[E.orden];
    return lista.slice().sort(orden);
  }

  function pintarRejilla() {
    const lista = filtrados();
    const hayProductos = visibles().length > 0;
    const cat = catDe(E.cat), sub = subDe(cat, E.sub);
    let titulo;
    if (E.q.trim()) titulo = 'Resultados para «' + E.q.trim() + '»';
    else if (cat) titulo = cat.nombre + (sub ? ' · ' + sub.nombre : '');
    else titulo = visibles().some((p) => p.novedad) ? 'Novedades' : 'Últimas piezas';
    $('#titulo-listado').innerHTML = esc(titulo) + ' <span>' + lista.length + (lista.length === 1 ? ' pieza' : ' piezas') + '</span>';
    $('#ayuda-listado').hidden = !!(cat || E.q.trim());
    $('#rejilla').innerHTML = lista.map(tarjetaHTML).join('');
    $('#vacio').hidden = lista.length > 0;
    $('#vacio-titulo').textContent = hayProductos ? (sub ? 'Muy pronto, nuevas piezas de ' + sub.nombre.toLowerCase() : 'No hay piezas aquí todavía') : 'Muy pronto, nuevas piezas';
    $('#vacio-texto').textContent = hayProductos ? (E.q.trim() ? 'Prueba con otra búsqueda.' : 'Estamos preparando nuevas creaciones. Mientras tanto, echa un vistazo a las otras categorías.') : 'Estamos terminando las primeras creaciones. ¡Vuelve en unos días!';
  }

  function tarjetaHTML(p) {
    const est = estadoProducto(p), cat = catDe(p.categoria);
    const boton = comprable(p)
      ? '<button type="button" class="boton boton-coral boton-pequeno" data-anadir="' + esc(p.id) + '">Añadir</button>'
      : '<button type="button" class="boton boton-pequeno" disabled>' + ESTADOS[est].txt + '</button>';
    return '<article class="tarjeta' + (est === 'vendido' ? ' vendida' : '') + '">' +
      '<div class="tarjeta-marco">' +
      '<button type="button" class="tarjeta-foto" data-ver="' + esc(p.id) + '" aria-label="Ver ' + esc(p.nombre) + '">' + imgProducto(p) +
      '<span class="etiquetas">' + etiquetasHTML(p) + '</span></button>' +
      (cat ? '<span class="tarjeta-cat">' + esc(cat.nombre) + '</span>' : '') +
      '<h3><button type="button" data-ver="' + esc(p.id) + '">' + esc(p.nombre) + '</button></h3>' +
      '<div class="tarjeta-pie">' + precioHTML(p) + boton + '</div></div>' +
      (p.novedad && est === 'disponible' ? '<img class="deco-hilo-tarjeta" src="img/hilo-colgante.webp" alt="">' : '') +
      '</article>';
  }

  /* ---------- Ventanas ---------- */
  function abrir(dlg) { if (!dlg.open) dlg.showModal(); }
  function cerrarTodo() { document.querySelectorAll('dialog[open]').forEach((d) => d.close()); }
  function limpiarHash() { if (location.hash.startsWith('#/')) history.replaceState(null, '', location.pathname + location.search); }

  function verProducto(id) {
    const p = prodDe(id);
    if (!p || p.visible === false) { aviso('Esta pieza ya no está disponible'); limpiarHash(); return; }
    const cat = catDe(p.categoria);
    const fotos = (p.fotos || []).length ? p.fotos : [null];
    const ficha = [['Materiales', p.materiales], ['Medidas', p.medidas], ['Cuidados', p.cuidados]].filter((f) => f[1]);
    const uds = maxUnidades(p);
    $('#vp-contenido').innerHTML =
      '<div class="producto">' +
      '<div><div class="galeria-principal" id="galeria-principal">' + imgProducto(p) + '</div>' +
      (fotos.length > 1 ? '<div class="miniaturas">' + fotos.map((f, i) =>
        '<button type="button" data-foto="' + esc(f) + '" aria-label="Foto ' + (i + 1) + '" aria-current="' + (i === 0) + '"><img src="' + esc(f) + '" alt=""></button>').join('') + '</div>' : '') +
      '</div>' +
      '<div class="producto-info">' +
      '<span class="etiquetas">' + etiquetasHTML(p) + '</span>' +
      (cat ? '<span class="tarjeta-cat">' + esc(cat.nombre) + '</span>' : '') +
      '<h2 id="vp-nombre">' + esc(p.nombre) + '</h2>' + precioHTML(p) +
      (p.descripcion ? '<p class="producto-desc">' + esc(p.descripcion) + '</p>' : '') +
      (ficha.length ? '<dl class="ficha">' + ficha.map((f) => '<dt>' + f[0] + '</dt><dd>' + esc(f[1]) + '</dd>').join('') + '</dl>' : '') +
      (comprable(p) && uds > 1 && uds < 99 ? '<span class="unidades">Quedan ' + uds + ' unidades</span>' : '') +
      (comprable(p) && uds === 1 ? '<span class="unidades">Pieza única</span>' : '') +
      '<img class="separador-cosido" src="img/borde-cosido.webp" alt="">' +
      '<div class="producto-botones">' +
      (comprable(p)
        ? '<button type="button" class="boton boton-coral" data-anadir="' + esc(p.id) + '" data-y-cesta="1">Añadir a la cesta</button>' +
          (persActiva(p) ? '<button type="button" class="boton boton-agua" data-personalizar="' + esc(p.id) + '">Personalizar</button>' : '')
        : '<button type="button" class="boton" disabled>' + ESTADOS[estadoProducto(p)].txt + '</button>') +
      '<button type="button" class="boton boton-borde" data-cerrar>Seguir viendo</button>' +
      '</div></div></div>';
    cerrarTodo(); abrir($('#ventana-producto'));
  }

  function camposPersonalizacion(p) {
    const max = Math.max(1, Math.floor(num(p.persMax, 20)) || 20);
    const extra = extraPers(p);
    const obligatorio = p.persObligatorio === true;
    const d = PERS.defecto;
    const grupo = (nombre, titulo, lista, pinta) => '<fieldset class="pers-grupo"><legend>' + titulo + '</legend><div class="pers-opciones pers-g-' + nombre + '">' +
      lista.map((o) => '<label class="pers-op"><input type="radio" name="pers-' + nombre + '" value="' + esc(o.id) + '"' + (o.id === d[{ fuente: 'fuente', tamano: 'tamano', posicion: 'posicion', color: 'color' }[nombre]] ? ' checked' : '') + '>' + pinta(o) + '</label>').join('') +
      '</div></fieldset>';
    return '<div class="pers-caja">' +
      '<label class="campo campo-pers"><span>' + esc(p.persEtiqueta || 'Texto personalizado') + (obligatorio ? ' *' : ' <small>(opcional)</small>') +
      (extra > 0 ? ' <span class="pers-extra">(+' + esc(pr(extra)) + ')</span>' : '') + '</span>' +
      '<input id="pers-texto" maxlength="' + max + '" autocomplete="off" placeholder="Ej.: Lucía">' +
      '<small>Lo pintamos a mano tal como lo escribas (máx. ' + max + ' caracteres).</small></label>' +
      grupo('fuente', 'Tipo de letra', PERS.fuentes, (o) => '<span class="pers-letra" style="font-family:' + esc(o.css) + ';font-weight:' + o.peso + '">Aa</span><span class="pers-nombre">' + esc(o.nombre) + '</span>') +
      '<div class="pers-fila">' +
      grupo('tamano', 'Tamaño', PERS.tamanos, (o) => '<span class="pers-chip">' + esc(o.nombre) + '</span>') +
      grupo('color', 'Color', PERS.colores, (o) => '<span class="pers-color" style="background:' + o.hex + '" title="' + esc(o.nombre) + '"></span><span class="visualmente-oculto">' + esc(o.nombre) + '</span>') +
      '</div>' +
      grupo('posicion', 'Dónde lo pintamos', PERS.posiciones, (o) => '<span class="pers-chip">' + esc(o.nombre) + '</span>') +
      '<p class="error-campo" id="error-pers" hidden></p></div>';
  }

  /* Dibuja el texto personalizado sobre la foto (en la ficha y en la vista previa) */
  function actualizarTextoPers() {
    const p = prodDe(E.persProd), inp = $('#pers-texto');
    if (!p || !inp) return;
    const texto = inp.value.trim().replace(/\s+/g, ' ');
    const estilo = estiloPersonalizacion(E.persSel, p.subcategoria);
    document.querySelectorAll('#ventana-pers .texto-pers').forEach((el) => {
      el.textContent = texto || 'Tu texto aquí';
      el.style.cssText = estilo;
      el.classList.toggle('ejemplo', !texto);
    });
  }

  /* Ventana emergente de personalización (solo productos personalizables) */
  function abrirPersonalizar(id) {
    const p = prodDe(id);
    if (!comprable(p) || !persActiva(p)) return;
    E.persProd = p.id; E.persSel = Object.assign({}, PERS.defecto);
    const g = $('#ventana-producto[open] #galeria-principal img');
    const foto = (g && !g.classList.contains('sin-foto') && g.getAttribute('src')) || fotoDe(p) || iconoCat(p);
    $('#pers-contenido').innerHTML =
      '<h2 id="pers-titulo">Personaliza tu pieza</h2>' +
      '<p class="pers-sub">' + esc(p.nombre) + ' · ' + (sinPrecio(p) ? 'Consultar precio' : esc(pr(p.precio))) + '</p>' +
      '<div class="pers-layout">' +
      '<div class="pers-lado-vista"><div class="vista-lienzo"><img src="' + esc(foto) + '" alt="' + esc(p.nombre) + ' con tu texto"><span class="texto-pers ejemplo" aria-hidden="true"></span></div>' +
      '<p class="vista-nota">Vista previa orientativa: el texto se pinta a mano y puede variar ligeramente.</p></div>' +
      '<div class="pers-lado-opciones">' + camposPersonalizacion(p) +
      '<div class="producto-botones"><button type="button" class="boton boton-coral" data-anadir="' + esc(p.id) + '" data-y-cesta="1" data-con-pers="1">Añadir a la cesta</button>' +
      '<button type="button" class="boton boton-borde" data-cerrar>Cancelar</button></div></div>' +
      '</div>';
    abrir($('#ventana-pers'));
    $('#ventana-pers .ventana-marco').scrollTop = 0;
    actualizarTextoPers();
    setTimeout(() => { const i = $('#pers-texto'); if (i && window.innerWidth > 640) i.focus(); }, 60);
  }

  function verPagina(id) {
    const pag = (E.cfg.paginas || []).find((p) => p.id === id && p.visible !== false);
    if (!pag) { limpiarHash(); return; }
    $('#pagina-titulo').textContent = pag.titulo;
    $('#pagina-texto').innerHTML = paginaHTML(pag, E.cfg);
    cerrarTodo(); abrir($('#ventana-pagina'));
    $('#ventana-pagina .ventana-marco').scrollTop = 0;
  }

  function ruta() {
    const h = decodeURIComponent(location.hash || '');
    let m;
    if ((m = h.match(/^#\/producto\/(.+)$/))) verProducto(m[1]);
    else if ((m = h.match(/^#\/pagina\/(.+)$/))) verPagina(m[1]);
    else if (h === '#/cesta') abrirCesta();
    else if ((m = h.match(/^#\/encargo\/(.+)$/))) abrirEncargo(m[1]);
  }

  /* ---------- Cesta ----------
     Cada línea es { k, tipo: 'producto' | 'encargo', id, cant, pers?, enc? } */
  const archivos = {};   // imágenes de diseños propios (solo en esta sesión)

  const urls = {};
  function urlArchivo(k) { return urls[k] || (urls[k] = URL.createObjectURL(archivos[k])); }

  function claveLinea(id, pers) { return 'p:' + id + '|' + (pers ? JSON.stringify([pers.texto.toLowerCase(), pers.fuente, pers.tamano, pers.posicion, pers.color]) : ''); }

  function normalPers(v) {
    if (!v) return null;
    if (typeof v === 'string') v = { texto: v };
    const ok = (lista, id) => (PERS[lista].some((x) => x.id === id) ? id : PERS.defecto[{ fuentes: 'fuente', tamanos: 'tamano', posiciones: 'posicion', colores: 'color' }[lista]]);
    const texto = String(v.texto || '').trim().slice(0, 60);
    if (!texto) return null;
    return { texto, fuente: ok('fuentes', v.fuente), tamano: ok('tamanos', v.tamano), posicion: ok('posiciones', v.posicion), color: ok('colores', v.color) };
  }

  function baseEncargo(enc) {
    const c = catDe(enc && enc.cat), e = encargosDe(c);
    return e ? (e.bases || []).find((b) => b.id === enc.base) || null : null;
  }

  /* Datos de presentación de una línea de la cesta */
  function infoLinea(l) {
    if (l.tipo === 'encargo') {
      const b = baseEncargo(l.enc) || { nombre: l.enc.nombreBase || 'Diseño propio', precio: '' };
      const cat = catDe(l.enc.cat);
      const consultar = b.precio === '' || b.precio == null || num(b.precio) <= 0;
      const detalles = [];
      if (l.enc.talla) detalles.push('Talla: ' + l.enc.talla);
      if (l.enc.color) detalles.push('Color: ' + l.enc.color);
      if (l.enc.idea) detalles.push('Idea: ' + l.enc.idea);
      detalles.push(l.enc.imagen ? 'Imagen: ' + l.enc.imagen : 'Sin imagen adjunta');
      return {
        nombre: 'Diseño propio · ' + b.nombre, cat: cat ? cat.nombre : '',
        img: archivos[l.k] ? '<img src="' + esc(urlArchivo(l.k)) + '" alt="Tu diseño">' : '<img src="' + esc((cat && cat.icono) || IMG_TODO) + '" alt="" class="sin-foto">',
        unidad: consultar ? 0 : num(b.precio), consultar, desde: !consultar, detalles, max: 20
      };
    }
    const p = prodDe(l.id), cat = catDe(p.categoria);
    return {
      nombre: p.nombre, cat: cat ? cat.nombre : '', img: imgProducto(p), unidad: sinPrecio(p) ? 0 : num(p.precio) + (l.pers ? extraPers(p) : 0),
      consultar: sinPrecio(p), desde: false, detalles: l.pers ? describirPersonalizacion(l.pers) : [], max: maxUnidades(p)
    };
  }

  function lineaValida(l) {
    if (l.tipo === 'encargo') return !!baseEncargo(l.enc);
    const p = prodDe(l.id);
    return comprable(p) && (!l.pers || persActiva(p));
  }

  function hayEncargos() { return E.cesta.some((l) => l.tipo === 'encargo' || infoLinea(l).consultar); }

  function guardarCesta() {
    try { localStorage.setItem(CLAVE_CESTA, JSON.stringify(E.cesta)); } catch (e) { /* sin almacenamiento */ }
    const n = E.cesta.reduce((s, l) => s + l.cant, 0);
    const cont = $('#contador-cesta');
    cont.textContent = n; cont.classList.remove('salta'); void cont.offsetWidth; cont.classList.add('salta');
  }

  function leerCesta() {
    let c = [];
    try { c = JSON.parse(localStorage.getItem(CLAVE_CESTA) || '[]'); } catch (e) { c = []; }
    E.cesta = (Array.isArray(c) ? c : []).map((l) => {
      const tipo = l.tipo === 'encargo' ? 'encargo' : 'producto';
      const base = { tipo, cant: Math.max(1, Math.floor(num(l.cant, 1))) };
      if (tipo === 'encargo') return Object.assign(base, { k: String(l.k || 'e:' + Date.now()), enc: l.enc || {} });
      const pers = normalPers(l.pers);
      return Object.assign(base, { id: String(l.id), pers, k: claveLinea(l.id, pers) });
    }).filter(lineaValida).map((l) => { l.cant = Math.min(l.cant, infoLinea(l).max); return l; });
    guardarCesta();
  }

  function anadir(id, abrirLuego, conPers) {
    const p = prodDe(id);
    if (!comprable(p)) { aviso('Esta pieza ya no está disponible'); return; }
    let pers = null;
    if (persActiva(p)) {
      const inp = $('#pers-texto'), err = $('#error-pers');
      if (!conPers || !inp) {
        if (p.persObligatorio === true) { abrirPersonalizar(id); return; }
      } else {
      pers = normalPers(Object.assign({}, E.persSel, { texto: inp.value.replace(/\s+/g, ' ') }));
      if (!pers && p.persObligatorio === true) { err.textContent = 'Escribe el ' + (p.persEtiqueta || 'nombre o texto').toLowerCase() + ' que quieres.'; err.hidden = false; inp.focus(); return; }
      }
    }
    const k = claveLinea(id, pers);
    const total = E.cesta.filter((x) => x.tipo === 'producto' && x.id === id).reduce((s, x) => s + x.cant, 0);
    if (total >= maxUnidades(p)) { aviso(maxUnidades(p) === 1 ? 'Es una pieza única y ya está en tu cesta' : 'No quedan más unidades'); return; }
    const l = E.cesta.find((x) => x.k === k);
    if (l) l.cant++; else E.cesta.push({ k, tipo: 'producto', id, pers, cant: 1 });
    E.vista = 'lineas';
    guardarCesta();
    aviso('«' + p.nombre + '»' + (pers ? ' (' + pers.texto + ')' : '') + ' añadido a la cesta');
    if (abrirLuego) { cerrarTodo(); limpiarHash(); abrirCesta(); }
  }

  function subtotal() { return E.cesta.reduce((s, l) => s + infoLinea(l).unidad * l.cant, 0); }

  function abrirCesta() { if (E.vista !== 'pedido' && E.vista !== 'enviado') E.vista = 'lineas'; pintarCesta(); cerrarTodo(); abrir($('#cesta')); }

  function precioLinea(i, l) {
    if (i.consultar) return 'A consultar';
    return (i.desde ? 'desde ' : '') + pr(i.unidad * l.cant);
  }

  function pintarCesta() {
    const cuerpo = $('#cesta-cuerpo');
    if (E.vista === 'enviado') return pintarEnviado();
    if (!E.cesta.length) {
      cuerpo.innerHTML = '<div class="cesta-vacia"><img src="img/carrito-vacio.webp" alt="">' +
        '<p style="font-size:20px;font-weight:800">Todavía está vacía</p><p>La tortuga sigue esperando tu primera pieza.</p>' +
        '<button type="button" class="boton boton-coral" data-cerrar data-ir-tienda>Ver productos</button></div>';
      return;
    }
    if (E.vista === 'pedido') return pintarPedido();
    const minimo = num((E.cfg.pedido || {}).pedidoMinimo);
    const st = subtotal();
    cuerpo.innerHTML = E.cesta.map((l) => {
      const i = infoLinea(l), k = esc(l.k);
      return '<div class="linea">' + i.img +
        '<div><div class="linea-nombre">' + esc(i.nombre) + '</div>' +
        i.detalles.map((d) => '<div class="linea-detalle">' + esc(d) + '</div>').join('') +
        '<div class="linea-precio">' + (i.consultar ? 'Precio a consultar' : (i.desde ? 'Desde ' : '') + esc(pr(i.unidad)) + ' / ud.') + '</div>' +
        '<div class="cantidad"><button type="button" data-menos="' + k + '" aria-label="Quitar una unidad"' + (l.cant <= 1 ? ' disabled' : '') + '>−</button>' +
        '<span aria-label="Cantidad">' + l.cant + '</span>' +
        '<button type="button" data-mas="' + k + '" aria-label="Añadir una unidad"' + (l.cant >= i.max ? ' disabled' : '') + '>+</button></div></div>' +
        '<div><div class="linea-total">' + esc(precioLinea(i, l)) + '</div><button type="button" class="quitar" data-quitar="' + k + '">Quitar</button></div></div>';
    }).join('') +
      '<div class="resumen"><div><span>Subtotal' + (hayEncargos() ? ' estimado' : '') + '</span><strong>' + esc(pr(st)) + '</strong></div>' +
      '<div><span>Entrega y pago</span><span>Se eligen en el siguiente paso</span></div></div>' +
      (hayEncargos() ? '<p class="aviso">Algunas piezas no tienen precio fijo: te confirmamos el precio final por WhatsApp antes de empezar.</p>' : '') +
      (minimo > st && !hayEncargos() ? '<p class="aviso">El pedido mínimo es de ' + esc(pr(minimo)) + '. Te faltan ' + esc(pr(minimo - st)) + '.</p>' : '') +
      '<button type="button" class="boton boton-coral" data-tramitar' + (minimo > st && !hayEncargos() ? ' disabled' : '') + '>Tramitar pedido</button>' +
      '<button type="button" class="boton boton-borde" data-cerrar>Seguir comprando</button>';
  }

  /* ---------- Encargo de diseño propio ---------- */
  function abrirEncargo(catId, previo) {
    const cat = catDe(catId), enc = encargosDe(cat);
    if (!enc) { limpiarHash(); return; }
    const d = previo || { base: (enc.bases[0] || {}).id, cant: 1 };
    const base = enc.bases.find((b) => b.id === d.base) || enc.bases[0];
    const v = (k) => esc(d[k] || '');
    $('#encargo-contenido').innerHTML =
      '<h2 id="encargo-titulo">' + esc(enc.titulo || '¿Tienes tu propio diseño?') + '</h2>' +
      (enc.texto ? '<p class="encargo-intro">' + esc(enc.texto) + '</p>' : '') +
      '<form class="formulario" id="form-encargo" data-cat="' + esc(cat.id) + '" novalidate>' +
      '<fieldset><legend>¿Dónde lo pintamos?</legend>' +
      enc.bases.map((b) => {
        const consultar = b.precio === '' || b.precio == null || num(b.precio) <= 0;
        return '<label class="opcion"><input type="radio" name="base" value="' + esc(b.id) + '"' + (b.id === base.id ? ' checked' : '') + '>' +
          '<span class="opcion-nombre">' + esc(b.nombre) + '</span><span class="opcion-precio">' + (consultar ? 'A consultar' : 'Desde ' + esc(pr(b.precio))) + '</span>' +
          (b.descripcion ? '<span class="opcion-desc">' + esc(b.descripcion) + '</span>' : '') + '</label>';
      }).join('') + '</fieldset>' +
      (base.pideTalla ? '<label class="campo">Talla *<input name="talla" required placeholder="Ej.: 6-9 meses, 4 años, M…" value="' + v('talla') + '"></label>' : '') +
      '<label class="campo">Color de la prenda <input name="color" placeholder="Ej.: blanco, crudo, azul claro…" value="' + v('color') + '"></label>' +
      '<label class="campo">Cuéntanos tu idea *<textarea name="idea" rows="4" required placeholder="Qué quieres que pintemos, colores, si lleva nombre o frase, dónde va en la prenda…">' + v('idea') + '</textarea></label>' +
      '<div class="campo">Imagen de tu diseño <small>(dibujo, foto o captura; opcional)</small>' +
      '<label class="subir-imagen"><input type="file" name="imagen" accept="image/*" id="encargo-imagen">' +
      '<span class="subir-vista" id="encargo-vista">' + (archivos.borrador ? '<img src="' + esc(URL.createObjectURL(archivos.borrador)) + '" alt="Vista previa del diseño">' : '<img src="img/ic-favorito.webp" alt="" class="sin-foto">') + '</span>' +
      '<span class="subir-texto" id="encargo-nombre">' + (archivos.borrador ? esc(archivos.borrador.name) : 'Elegir imagen') + '</span></label>' +
      '<small>La imagen no se sube a la web: al enviar el pedido te pediremos que la adjuntes en el chat de WhatsApp.</small></div>' +
      '<label class="campo campo-corto">Cantidad<input name="cant" type="number" min="1" max="20" inputmode="numeric" value="' + esc(d.cant || 1) + '"></label>' +
      '<p class="error-campo" id="error-encargo" hidden></p>' +
      '<div class="producto-botones"><button type="submit" class="boton boton-coral">Añadir a la cesta</button>' +
      '<button type="button" class="boton boton-borde" data-cerrar>Cancelar</button></div>' +
      '</form>';
    cerrarTodo(); abrir($('#ventana-encargo'));
    $('#ventana-encargo .ventana-marco').scrollTop = 0;
  }

  function leerEncargo() {
    const f = $('#form-encargo');
    return f ? Object.fromEntries(Array.from(new FormData(f).entries()).filter(([k]) => k !== 'imagen')) : {};
  }

  function guardarEncargo() {
    const f = $('#form-encargo'), err = $('#error-encargo');
    const catId = f.dataset.cat, enc = encargosDe(catDe(catId));
    const d = leerEncargo();
    const base = enc.bases.find((b) => b.id === d.base);
    const faltan = [];
    if (!base) faltan.push('dónde lo pintamos');
    if (base && base.pideTalla && !String(d.talla || '').trim()) faltan.push('la talla');
    if (!String(d.idea || '').trim()) faltan.push('tu idea');
    if (faltan.length) { err.textContent = 'Falta: ' + faltan.join(', ') + '.'; err.hidden = false; return; }
    const k = 'e:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const img = archivos.borrador || null;
    if (img) archivos[k] = img;
    delete archivos.borrador;
    E.cesta.push({
      k, tipo: 'encargo', cant: Math.min(20, Math.max(1, Math.floor(num(d.cant, 1)))),
      enc: { cat: catId, base: base.id, nombreBase: base.nombre, talla: (d.talla || '').trim(), color: (d.color || '').trim(), idea: (d.idea || '').trim(), imagen: img ? img.name : '' }
    });
    E.vista = 'lineas';
    guardarCesta();
    aviso('Tu diseño se ha añadido a la cesta');
    cerrarTodo(); limpiarHash(); abrirCesta();
  }

  /* ---------- Pedido ---------- */
  function entregasActivas() { return (E.cfg.entregas || []).filter((e) => e.activo); }
  function pagosPara(entregaId) {
    return (E.cfg.pagos || []).filter((p) => p.activo && (!p.entregas || !p.entregas.length || p.entregas.includes(entregaId)));
  }
  function costeEntrega(e, st) {
    if (!e) return 0;
    if (e.gratisDesde && st >= num(e.gratisDesde)) return 0;
    return num(e.precio);
  }

  function pintarPedido() {
    const cuerpo = $('#cesta-cuerpo');
    const prev = E.pedido || {};
    const entregas = entregasActivas();
    const st = subtotal();
    const entregaSel = entregas.find((e) => e.id === prev.entrega) || entregas[0];
    const pagos = entregaSel ? pagosPara(entregaSel.id) : [];
    const pagoSel = pagos.find((p) => p.id === prev.pago) || pagos[0];
    const ce = costeEntrega(entregaSel, st), rp = pagoSel ? num(pagoSel.recargo) : 0;
    const total = st + ce + rp;
    const politicas = (E.cfg.paginas || []).filter((p) => p.visible !== false && ['envios', 'devoluciones', 'privacidad'].includes(p.id));
    const v = (k) => esc(prev[k] || '');
    cuerpo.innerHTML =
      '<button type="button" class="volver" data-volver>← Volver a la cesta</button>' +
      '<form class="formulario" id="form-pedido" novalidate>' +
      '<fieldset><legend>Tus datos</legend>' +
      '<label class="campo">Nombre y apellidos *<input name="nombre" autocomplete="name" required value="' + v('nombre') + '"></label>' +
      '<label class="campo">Teléfono *<input name="telefono" type="tel" autocomplete="tel" required value="' + v('telefono') + '"></label>' +
      '</fieldset>' +
      '<fieldset><legend>Entrega</legend>' +
      (entregas.length ? entregas.map((e) => {
        const c = costeEntrega(e, st);
        return '<label class="opcion"><input type="radio" name="entrega" value="' + esc(e.id) + '"' + (entregaSel && e.id === entregaSel.id ? ' checked' : '') + '>' +
          '<span class="opcion-nombre">' + esc(e.nombre) + '</span><span class="opcion-precio">' + (c > 0 ? esc(pr(c)) : 'Gratis') + '</span>' +
          '<span class="opcion-desc">' + esc([e.descripcion, e.plazo ? 'Plazo: ' + e.plazo : '', e.gratisDesde && c > 0 ? 'Gratis desde ' + pr(e.gratisDesde) : ''].filter(Boolean).join(' · ')) + '</span></label>';
      }).join('') : '<p class="aviso">Acordaremos la entrega por WhatsApp.</p>') +
      '</fieldset>' +
      (entregaSel && entregaSel.pideDireccion
        ? '<fieldset><legend>Dirección de envío</legend>' +
          '<label class="campo">Dirección *<input name="direccion" autocomplete="street-address" required value="' + v('direccion') + '"></label>' +
          '<div class="campo-doble"><label class="campo">Código postal *<input name="cp" inputmode="numeric" autocomplete="postal-code" required value="' + v('cp') + '"></label>' +
          '<label class="campo">Localidad *<input name="localidad" autocomplete="address-level2" required value="' + v('localidad') + '"></label></div>' +
          '<label class="campo">Provincia<input name="provincia" autocomplete="address-level1" value="' + v('provincia') + '"></label></fieldset>'
        : '') +
      '<fieldset><legend>Pago</legend>' +
      (pagos.length ? pagos.map((p) =>
        '<label class="opcion"><input type="radio" name="pago" value="' + esc(p.id) + '"' + (pagoSel && p.id === pagoSel.id ? ' checked' : '') + '>' +
        '<span class="opcion-nombre">' + esc(p.nombre) + '</span><span class="opcion-precio">' + (num(p.recargo) > 0 ? '+' + esc(pr(p.recargo)) : '') + '</span>' +
        (p.descripcion ? '<span class="opcion-desc">' + esc(p.descripcion) + '</span>' : '') + '</label>').join('') : '<p class="aviso">Acordaremos el pago por WhatsApp.</p>') +
      '</fieldset>' +
      '<label class="campo">Notas para el pedido<textarea name="notas" rows="3" placeholder="Por ejemplo: es para regalo, horario de entrega…">' + v('notas') + '</textarea></label>' +
      '<div class="resumen"><div><span>Subtotal</span><span>' + esc(pr(st)) + '</span></div>' +
      '<div><span>Entrega</span><span>' + (ce > 0 ? esc(pr(ce)) : 'Gratis') + '</span></div>' +
      (rp > 0 ? '<div><span>Recargo de pago</span><span>' + esc(pr(rp)) + '</span></div>' : '') +
      '<div class="total"><span>Total' + (hayEncargos() ? ' estimado' : '') + '</span><span>' + esc(pr(total)) + '</span></div></div>' +
      (hayEncargos() ? '<p class="aviso">Incluye piezas con precio a consultar: te confirmaremos el precio final por WhatsApp.</p>' : '') +
      '<label class="acepto"><input type="checkbox" name="acepto" required' + (prev.acepto ? ' checked' : '') + '><span>He leído ' +
      (politicas.length ? politicas.map((p) => '<a href="#/pagina/' + esc(p.id) + '">' + esc(p.titulo.toLowerCase()) + '</a>').join(', ') : 'las condiciones') + '.</span></label>' +
      '<p class="error-campo" id="error-pedido" hidden></p>' +
      '<button type="submit" class="boton boton-marino"><img src="img/ic-mensaje.webp" alt="">Enviar pedido por WhatsApp</button>' +
      '</form>';
  }

  function leerForm() {
    const f = $('#form-pedido');
    if (!f) return;
    const d = new FormData(f);
    E.pedido = Object.assign(E.pedido || {}, Object.fromEntries(d.entries()));
    E.pedido.acepto = !!d.get('acepto');
  }

  function numeroWhatsApp() {
    let n = String((E.cfg.contacto || {}).whatsapp || '').replace(/[^\d]/g, '');
    if (n.startsWith('00')) n = n.slice(2);
    if (n.length === 9 && /^[6789]/.test(n)) n = '34' + n;
    return n;
  }

  function referencia() {
    const d = new Date();
    const f = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    return 'HC-' + f + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function enviarPedido() {
    leerForm();
    const d = E.pedido, err = $('#error-pedido');
    const entrega = entregasActivas().find((e) => e.id === d.entrega);
    const pago = (E.cfg.pagos || []).find((p) => p.id === d.pago);
    const faltan = [];
    if (!String(d.nombre || '').trim()) faltan.push('nombre');
    if (String(d.telefono || '').replace(/\D/g, '').length < 9) faltan.push('teléfono');
    if (entrega && entrega.pideDireccion && (!String(d.direccion || '').trim() || !String(d.cp || '').trim() || !String(d.localidad || '').trim())) faltan.push('dirección completa');
    if (!d.acepto) faltan.push('aceptar las condiciones');
    if (faltan.length) { err.textContent = 'Revisa: ' + faltan.join(', ') + '.'; err.hidden = false; return; }
    const num_ = numeroWhatsApp();
    if (!num_) { err.textContent = 'La tienda aún no tiene configurado su WhatsApp. Inténtalo más tarde.'; err.hidden = false; return; }

    const st = subtotal(), ce = costeEntrega(entrega, st), rp = pago ? num(pago.recargo) : 0;
    const ref = referencia();
    const lineas = [];
    lineas.push((E.cfg.pedido || {}).saludo || 'Hola, quiero hacer este pedido:');
    lineas.push('*Pedido ' + ref + '*', '');
    E.cesta.forEach((l) => {
      const i = infoLinea(l);
      lineas.push('• ' + l.cant + ' × ' + i.nombre + (i.cat ? ' (' + i.cat + ')' : '') + ' — ' + precioLinea(i, l).replace(/^desde/, 'desde'));
      i.detalles.forEach((x) => lineas.push('   ' + (l.tipo === 'encargo' && /^Imagen:/.test(x) ? 'Imagen: te la envío a continuación (' + l.enc.imagen + ')' : x)));
    });
    lineas.push('', 'Subtotal' + (hayEncargos() ? ' estimado' : '') + ': ' + pr(st));
    lineas.push('Entrega: ' + (entrega ? entrega.nombre + ' — ' + (ce > 0 ? pr(ce) : 'gratis') : 'a acordar'));
    lineas.push('Pago: ' + (pago ? pago.nombre + (rp > 0 ? ' — recargo ' + pr(rp) : '') : 'a acordar'));
    lineas.push('*TOTAL' + (hayEncargos() ? ' ESTIMADO' : '') + ': ' + pr(st + ce + rp) + '*');
    if (hayEncargos()) lineas.push('(Incluye piezas con precio a consultar: espero vuestro presupuesto final)');
    lineas.push('', '*Mis datos*', 'Nombre: ' + d.nombre.trim(), 'Teléfono: ' + d.telefono.trim());
    if (entrega && entrega.pideDireccion) lineas.push('Dirección: ' + d.direccion.trim() + ', ' + d.cp.trim() + ' ' + d.localidad.trim() + (d.provincia ? ' (' + d.provincia.trim() + ')' : ''));
    if (String(d.notas || '').trim()) lineas.push('Notas: ' + d.notas.trim());
    const desp = (E.cfg.pedido || {}).despedida; if (desp) lineas.push('', desp);

    const url = 'https://wa.me/' + num_ + '?text=' + encodeURIComponent(lineas.join('\n'));
    E.ultimaUrl = url; E.ultimaRef = ref;
    E.vista = 'enviado'; pintarCesta();
    const w = window.open(url, '_blank', 'noopener');
    if (!w) location.href = url;
  }

  function imagenesPendientes() {
    return E.cesta.filter((l) => l.tipo === 'encargo' && l.enc.imagen).map((l) => ({ l, file: archivos[l.k] || null }));
  }

  function pintarEnviado() {
    const imgs = imagenesPendientes();
    const ficheros = imgs.map((x) => x.file).filter(Boolean);
    const puedeCompartir = ficheros.length && navigator.canShare && navigator.canShare({ files: ficheros });
    $('#cesta-cuerpo').innerHTML = '<div class="cesta-vacia"><img src="img/avatar.webp" alt="" style="width:180px">' +
      '<p style="font-size:22px;font-weight:800">¡Pedido preparado!</p>' +
      '<p>Referencia <strong>' + esc(E.ultimaRef) + '</strong>. Envía el mensaje en WhatsApp y te responderemos para confirmarlo.</p>' +
      (imgs.length ? '<p class="aviso">Último paso: adjunta en el chat de WhatsApp la imagen de tu diseño' + (imgs.length > 1 ? ' (' + imgs.map((x) => x.l.enc.imagen).join(', ') + ')' : ' (' + esc(imgs[0].l.enc.imagen) + ')') + '.</p>' : '') +
      (puedeCompartir ? '<button type="button" class="boton boton-agua" data-compartir-imagen>Enviar la imagen del diseño</button>' : '') +
      '<a class="boton boton-marino" href="' + esc(E.ultimaUrl) + '" target="_blank" rel="noopener"><img src="img/ic-mensaje.webp" alt=""><span>Abrir WhatsApp de nuevo</span></a>' +
      '<button type="button" class="boton boton-coral" data-vaciar>He enviado el pedido: vaciar cesta</button>' +
      '<button type="button" class="volver" data-volver>Volver a la cesta</button></div>';
  }

  async function compartirImagenes() {
    const ficheros = imagenesPendientes().map((x) => x.file).filter(Boolean);
    try { await navigator.share({ files: ficheros, text: 'Diseño para el pedido ' + E.ultimaRef }); }
    catch (e) { if (e && e.name !== 'AbortError') aviso('No se pudo compartir. Adjunta la imagen desde WhatsApp.'); }
  }

  /* ---------- Eventos ---------- */
  function eventos() {
    document.addEventListener('click', (ev) => {
      const t = ev.target.closest('button, a');
      if (!t) {
        if (ev.target.tagName === 'DIALOG') { ev.target.close(); }
        return;
      }
      const ds = t.dataset;
      if (ds.cat) {
        if (E.abierto === ds.cat) E.abierto = '';
        else { E.abierto = ds.cat; if (E.cat !== ds.cat) { E.cat = ds.cat; E.sub = ''; } }
        if (E.q) { E.q = ''; $('#buscar').value = ''; }
        pintarPestanas(); pintarRejilla(); return;
      }
      if (ds.sub !== undefined && ds.de) {
        E.cat = ds.de; E.sub = ds.sub;
        if (E.q) { E.q = ''; $('#buscar').value = ''; }
        pintarPestanas(); pintarRejilla();
        const t = $('#titulo-listado'); if (t && t.getBoundingClientRect().top > window.innerHeight * 0.75) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (ds.verTodo !== undefined) { E.cat = ''; E.sub = ''; E.abierto = ''; pintarPestanas(); pintarRejilla(); return; }
      if (ds.ver) { location.hash = '#/producto/' + encodeURIComponent(ds.ver); return; }
      if (ds.anadir) { anadir(ds.anadir, !!ds.yCesta, !!ds.conPers); return; }
      if (ds.encargo) { delete archivos.borrador; location.hash = '#/encargo/' + encodeURIComponent(ds.encargo); return; }
      if (ds.compartirImagen !== undefined) { compartirImagenes(); return; }
      if (ds.personalizar) { abrirPersonalizar(ds.personalizar); return; }
      if (ds.foto) {
        const g = $('#galeria-principal img'); g.src = ds.foto; g.classList.remove('sin-foto');
        t.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(b === t)));
        return;
      }
      if (ds.mas || ds.menos) {
        const l = E.cesta.find((x) => x.k === (ds.mas || ds.menos));
        if (l) {
          let max = infoLinea(l).max;
          if (l.tipo === 'producto') max -= E.cesta.filter((x) => x !== l && x.tipo === 'producto' && x.id === l.id).reduce((s, x) => s + x.cant, 0);
          l.cant = Math.max(1, Math.min(max, l.cant + (ds.mas ? 1 : -1))); guardarCesta(); pintarCesta();
        }
        return;
      }
      if (ds.quitar) { E.cesta = E.cesta.filter((x) => x.k !== ds.quitar); delete archivos[ds.quitar]; guardarCesta(); pintarCesta(); return; }
      if (ds.tramitar !== undefined) { E.vista = 'pedido'; pintarCesta(); $('#cesta-cuerpo').scrollTop = 0; return; }
      if (ds.volver !== undefined) { leerForm(); E.vista = 'lineas'; pintarCesta(); return; }
      if (ds.vaciar !== undefined) { E.cesta = []; E.pedido = null; Object.keys(archivos).forEach((k) => delete archivos[k]); guardarCesta(); E.vista = 'lineas'; pintarCesta(); return; }
      if (ds.cerrar !== undefined) {
        const dlg = t.closest('dialog'); if (dlg) dlg.close();
        if (ds.irTienda !== undefined) $('#tienda').scrollIntoView();
        return;
      }
      if (t.id === 'abrir-cesta') { abrirCesta(); return; }
      if (t.getAttribute('href') === location.hash && location.hash.startsWith('#/')) { ev.preventDefault(); ruta(); }
    });

    document.addEventListener('change', (ev) => {
      const el = ev.target;
      if (el.closest('#form-pedido') && (el.name === 'entrega' || el.name === 'pago')) { leerForm(); pintarPedido(); return; }
      if (/^pers-(fuente|tamano|posicion|color)$/.test(el.name)) { E.persSel[el.name.slice(5)] = el.value; actualizarTextoPers(); return; }
      if (el.id === 'encargo-imagen') {
        const f = el.files && el.files[0];
        if (f && !/^image\//.test(f.type)) { aviso('Elige un archivo de imagen'); el.value = ''; return; }
        if (f) archivos.borrador = f;
        $('#encargo-vista').innerHTML = f ? '<img src="' + esc(URL.createObjectURL(f)) + '" alt="Vista previa del diseño">' : '';
        $('#encargo-nombre').textContent = f ? f.name : 'Elegir imagen';
        return;
      }
      if (el.closest('#form-encargo') && el.name === 'base') {
        const f = $('#form-encargo'), sc = $('#ventana-encargo .ventana-marco').scrollTop;
        abrirEncargo(f.dataset.cat, leerEncargo());
        $('#ventana-encargo .ventana-marco').scrollTop = sc;
      }
    });
    document.addEventListener('submit', (ev) => {
      if (ev.target.id === 'form-pedido') { ev.preventDefault(); enviarPedido(); }
      if (ev.target.id === 'form-encargo') { ev.preventDefault(); guardarEncargo(); }
    });
    document.addEventListener('input', (ev) => { if (ev.target.id === 'pers-texto') { const e = $('#error-pers'); if (e) e.hidden = true; actualizarTextoPers(); } });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && ev.target.id === 'pers-texto') { ev.preventDefault(); const b = $('#ventana-pers [data-anadir]'); if (b) b.click(); }
    });

    document.querySelectorAll('dialog').forEach((d) => d.addEventListener('close', () => {
      if (d.id === 'cesta') leerForm();
      if (!document.querySelector('dialog[open]')) limpiarHash();
    }));

    let tq;
    $('#buscar').addEventListener('input', (ev) => { clearTimeout(tq); tq = setTimeout(() => { E.q = ev.target.value; pintarRejilla(); }, 150); });
    $('#ordenar').addEventListener('change', (ev) => { E.orden = ev.target.value; pintarRejilla(); });
    window.addEventListener('hashchange', ruta);
    window.addEventListener('storage', (ev) => { if (ev.key === CLAVE_CESTA) { leerCesta(); if ($('#cesta').open) pintarCesta(); } });
  }

  /* ---------- Arranque ---------- */
  async function iniciar() {
    eventos();
    try {
      const [cfg, cats, prods] = await Promise.all([cargarJSON('data/config.json'), cargarJSON('data/categorias.json'), cargarJSON('data/productos.json')]);
      E.cfg = cfg || {}; E.cats = Array.isArray(cats) ? cats : []; E.prods = Array.isArray(prods) ? prods : [];
    } catch (e) {
      console.error(e);
      aviso('No se han podido cargar los productos. Recarga la página.');
    }
    aplicarConfig();
    pintarPestanas();
    pintarRejilla();
    leerCesta();
    ruta();
  }

  iniciar();
})();
