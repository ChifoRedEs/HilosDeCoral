/* Hilos de Coral · lógica de la tienda */
(function () {
  'use strict';
  const { esc, num, precio, ESTADOS, estadoProducto, paginaHTML, cargarJSON, listaEntregas } = window.HDC;
  const $ = (s, el) => (el || document).querySelector(s);
  const CLAVE_CESTA = 'hdc-cesta';
  const IMG_TODO = 'img/cat-todo.webp';

  const E = { cfg: {}, cats: [], prods: [], cat: 'todo', q: '', orden: 'novedad', cesta: [], vista: 'lineas', pedido: null };

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

  function precioHTML(p) {
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
  function pintarPestanas() {
    const cats = E.cats.filter((c) => c.visible !== false);
    const items = [{ id: 'todo', nombre: 'Todo', icono: IMG_TODO }].concat(cats);
    $('#pestanas').innerHTML = items.map((c) =>
      '<button type="button" class="pestana" role="tab" data-cat="' + esc(c.id) + '" aria-selected="' + (E.cat === c.id) + '">' +
      '<img src="' + esc(c.icono || IMG_TODO) + '" alt="">' + esc(c.nombre) + '</button>').join('');
    const cab = $('#cabecera-categoria');
    const cat = catDe(E.cat);
    if (cat && (cat.banner || cat.descripcion)) {
      cab.hidden = false;
      cab.style.backgroundImage = cat.banner ? 'url("' + cat.banner.replace(/"/g, '') + '")' : '';
      cab.innerHTML = cat.descripcion ? '<p>' + esc(cat.descripcion) + '</p>' : '';
    } else cab.hidden = true;
  }

  function filtrados() {
    const q = E.q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let lista = visibles().filter((p) => E.cat === 'todo' || p.categoria === E.cat);
    if (q) lista = lista.filter((p) => (p.nombre + ' ' + (p.descripcion || '') + ' ' + (p.materiales || '')).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q));
    const peso = (p) => ({ disponible: 0, reservado: 1, vendido: 2 })[estadoProducto(p)];
    const orden = {
      'novedad': (a, b) => peso(a) - peso(b) || (b.novedad ? 1 : 0) - (a.novedad ? 1 : 0) || String(b.creado || '').localeCompare(String(a.creado || '')),
      'precio-asc': (a, b) => num(a.precio) - num(b.precio),
      'precio-desc': (a, b) => num(b.precio) - num(a.precio),
      'nombre': (a, b) => a.nombre.localeCompare(b.nombre, 'es')
    }[E.orden];
    return lista.slice().sort(orden);
  }

  function pintarRejilla() {
    const lista = filtrados();
    const hayProductos = visibles().length > 0;
    $('#rejilla').innerHTML = lista.map(tarjetaHTML).join('');
    $('#vacio').hidden = lista.length > 0;
    $('#vacio-titulo').textContent = hayProductos ? 'No hay piezas con esos filtros' : 'Muy pronto, nuevas piezas';
    $('#vacio-texto').textContent = hayProductos ? 'Prueba con otra categoría o con otra búsqueda.' : 'Estamos terminando las primeras creaciones. ¡Vuelve en unos días!';
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
        ? '<button type="button" class="boton boton-coral" data-anadir="' + esc(p.id) + '" data-y-cesta="1">Añadir a la cesta</button>'
        : '<button type="button" class="boton" disabled>' + ESTADOS[estadoProducto(p)].txt + '</button>') +
      '<button type="button" class="boton boton-borde" data-cerrar>Seguir viendo</button>' +
      '</div></div></div>';
    cerrarTodo(); abrir($('#ventana-producto'));
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
  }

  /* ---------- Cesta ---------- */
  function guardarCesta() {
    try { localStorage.setItem(CLAVE_CESTA, JSON.stringify(E.cesta)); } catch (e) { /* sin almacenamiento */ }
    const n = E.cesta.reduce((s, l) => s + l.cant, 0);
    const cont = $('#contador-cesta');
    cont.textContent = n; cont.classList.remove('salta'); void cont.offsetWidth; cont.classList.add('salta');
  }

  function leerCesta() {
    let c = [];
    try { c = JSON.parse(localStorage.getItem(CLAVE_CESTA) || '[]'); } catch (e) { c = []; }
    E.cesta = (Array.isArray(c) ? c : []).map((l) => ({ id: String(l.id), cant: Math.max(1, Math.floor(num(l.cant, 1))) }))
      .filter((l) => comprable(prodDe(l.id)))
      .map((l) => ({ id: l.id, cant: Math.min(l.cant, maxUnidades(prodDe(l.id))) }));
    guardarCesta();
  }

  function anadir(id, abrirLuego) {
    const p = prodDe(id);
    if (!comprable(p)) { aviso('Esta pieza ya no está disponible'); return; }
    const l = E.cesta.find((x) => x.id === id);
    if (l) {
      if (l.cant >= maxUnidades(p)) { aviso(maxUnidades(p) === 1 ? 'Es una pieza única y ya está en tu cesta' : 'No quedan más unidades'); return; }
      l.cant++;
    } else E.cesta.push({ id, cant: 1 });
    E.vista = 'lineas';
    guardarCesta();
    aviso('«' + p.nombre + '» añadido a la cesta');
    if (abrirLuego) { cerrarTodo(); limpiarHash(); abrirCesta(); }
  }

  function subtotal() { return E.cesta.reduce((s, l) => s + num(prodDe(l.id).precio) * l.cant, 0); }

  function abrirCesta() { if (E.vista !== 'pedido' && E.vista !== 'enviado') E.vista = 'lineas'; pintarCesta(); cerrarTodo(); abrir($('#cesta')); }

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
      const p = prodDe(l.id), max = maxUnidades(p);
      return '<div class="linea">' + imgProducto(p) +
        '<div><div class="linea-nombre">' + esc(p.nombre) + '</div><div class="linea-precio">' + esc(pr(p.precio)) + ' / ud.</div>' +
        '<div class="cantidad"><button type="button" data-menos="' + esc(p.id) + '" aria-label="Quitar una unidad"' + (l.cant <= 1 ? ' disabled' : '') + '>−</button>' +
        '<span aria-label="Cantidad">' + l.cant + '</span>' +
        '<button type="button" data-mas="' + esc(p.id) + '" aria-label="Añadir una unidad"' + (l.cant >= max ? ' disabled' : '') + '>+</button></div></div>' +
        '<div><div class="linea-total">' + esc(pr(num(p.precio) * l.cant)) + '</div><button type="button" class="quitar" data-quitar="' + esc(p.id) + '">Quitar</button></div></div>';
    }).join('') +
      '<div class="resumen"><div><span>Subtotal</span><strong>' + esc(pr(st)) + '</strong></div>' +
      '<div><span>Entrega y pago</span><span>Se eligen en el siguiente paso</span></div></div>' +
      (minimo > st ? '<p class="aviso">El pedido mínimo es de ' + esc(pr(minimo)) + '. Te faltan ' + esc(pr(minimo - st)) + '.</p>' : '') +
      '<button type="button" class="boton boton-coral" data-tramitar' + (minimo > st ? ' disabled' : '') + '>Tramitar pedido</button>' +
      '<button type="button" class="boton boton-borde" data-cerrar>Seguir comprando</button>';
  }

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
      '<div class="total"><span>Total</span><span>' + esc(pr(total)) + '</span></div></div>' +
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
    const cats = (id) => { const c = catDe(id); return c ? ' (' + c.nombre + ')' : ''; };
    const lineas = [];
    lineas.push((E.cfg.pedido || {}).saludo || 'Hola, quiero hacer este pedido:');
    lineas.push('*Pedido ' + ref + '*', '');
    E.cesta.forEach((l) => { const p = prodDe(l.id); lineas.push('• ' + l.cant + ' × ' + p.nombre + cats(p.categoria) + ' — ' + pr(num(p.precio) * l.cant)); });
    lineas.push('', 'Subtotal: ' + pr(st));
    lineas.push('Entrega: ' + (entrega ? entrega.nombre + ' — ' + (ce > 0 ? pr(ce) : 'gratis') : 'a acordar'));
    lineas.push('Pago: ' + (pago ? pago.nombre + (rp > 0 ? ' — recargo ' + pr(rp) : '') : 'a acordar'));
    lineas.push('*TOTAL: ' + pr(st + ce + rp) + '*', '');
    lineas.push('*Mis datos*', 'Nombre: ' + d.nombre.trim(), 'Teléfono: ' + d.telefono.trim());
    if (entrega && entrega.pideDireccion) lineas.push('Dirección: ' + d.direccion.trim() + ', ' + d.cp.trim() + ' ' + d.localidad.trim() + (d.provincia ? ' (' + d.provincia.trim() + ')' : ''));
    if (String(d.notas || '').trim()) lineas.push('Notas: ' + d.notas.trim());
    const desp = (E.cfg.pedido || {}).despedida; if (desp) lineas.push('', desp);

    const url = 'https://wa.me/' + num_ + '?text=' + encodeURIComponent(lineas.join('\n'));
    E.ultimaUrl = url; E.ultimaRef = ref;
    E.vista = 'enviado'; pintarCesta();
    const w = window.open(url, '_blank', 'noopener');
    if (!w) location.href = url;
  }

  function pintarEnviado() {
    $('#cesta-cuerpo').innerHTML = '<div class="cesta-vacia"><img src="img/avatar.webp" alt="" style="width:180px">' +
      '<p style="font-size:22px;font-weight:800">¡Pedido preparado!</p>' +
      '<p>Referencia <strong>' + esc(E.ultimaRef) + '</strong>. Envía el mensaje en WhatsApp y te responderemos para confirmarlo.</p>' +
      '<a class="boton boton-marino" href="' + esc(E.ultimaUrl) + '" target="_blank" rel="noopener"><img src="img/ic-mensaje.webp" alt="">Abrir WhatsApp de nuevo</a>' +
      '<button type="button" class="boton boton-coral" data-vaciar>He enviado el pedido: vaciar cesta</button>' +
      '<button type="button" class="volver" data-volver>Volver a la cesta</button></div>';
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
      if (ds.cat) { E.cat = ds.cat; pintarPestanas(); pintarRejilla(); return; }
      if (ds.ver) { location.hash = '#/producto/' + encodeURIComponent(ds.ver); return; }
      if (ds.anadir) { anadir(ds.anadir, !!ds.yCesta); return; }
      if (ds.foto) {
        const g = $('#galeria-principal img'); g.src = ds.foto; g.classList.remove('sin-foto');
        t.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(b === t)));
        return;
      }
      if (ds.mas || ds.menos) {
        const id = ds.mas || ds.menos, l = E.cesta.find((x) => x.id === id);
        if (l) { l.cant = Math.max(1, Math.min(maxUnidades(prodDe(id)), l.cant + (ds.mas ? 1 : -1))); guardarCesta(); pintarCesta(); }
        return;
      }
      if (ds.quitar) { E.cesta = E.cesta.filter((x) => x.id !== ds.quitar); guardarCesta(); pintarCesta(); return; }
      if (ds.tramitar !== undefined) { E.vista = 'pedido'; pintarCesta(); $('#cesta-cuerpo').scrollTop = 0; return; }
      if (ds.volver !== undefined) { leerForm(); E.vista = 'lineas'; pintarCesta(); return; }
      if (ds.vaciar !== undefined) { E.cesta = []; E.pedido = null; guardarCesta(); E.vista = 'lineas'; pintarCesta(); return; }
      if (ds.cerrar !== undefined) {
        const dlg = t.closest('dialog'); if (dlg) dlg.close();
        if (ds.irTienda !== undefined) $('#tienda').scrollIntoView();
        return;
      }
      if (t.id === 'abrir-cesta') { abrirCesta(); return; }
      if (t.getAttribute('href') === location.hash && location.hash.startsWith('#/')) { ev.preventDefault(); ruta(); }
    });

    document.addEventListener('change', (ev) => {
      if (ev.target.closest('#form-pedido') && (ev.target.name === 'entrega' || ev.target.name === 'pago')) { leerForm(); pintarPedido(); }
    });
    document.addEventListener('submit', (ev) => { if (ev.target.id === 'form-pedido') { ev.preventDefault(); enviarPedido(); } });

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
