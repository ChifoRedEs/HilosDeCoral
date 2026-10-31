/* Hilos de Coral · panel de administración */
(function () {
  'use strict';
  const { esc, num, precio, slug, uid, ESTADOS, estadoProducto, paginaHTML, cargarJSON } = window.HDC;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const CLAVE_GH = 'hdc-admin-github';
  const ARCHIVOS = { config: 'data/config.json', categorias: 'data/categorias.json', productos: 'data/productos.json' };
  const IMAGENES_TIENDA = [
    ['img/cat-textil.webp', 'Totebag'], ['img/cat-ceramica.webp', 'Pendiente de cerámica'], ['img/cat-bisuteria.webp', 'Pulsera'],
    ['img/cat-todo.webp', 'Caracola'], ['img/icono-coral.webp', 'Coral (icono)'], ['img/ic-favorito.webp', 'Corazón'],
    ['img/ic-envio.webp', 'Caja'], ['img/ic-monedero.webp', 'Monedero'], ['img/avatar.webp', 'Tortuga y coral'],
    ['img/sub-textil-totebags.webp', 'Totebag (sub)'], ['img/sub-textil-bodies.webp', 'Body (sub)'], ['img/sub-textil-baberos.webp', 'Babero (sub)'], ['img/sub-textil-camisetas.webp', 'Camiseta (sub)'], ['img/sub-ceramica-pendientes.webp', 'Pendientes cerámica (sub)'], ['img/sub-ceramica-colgantes.webp', 'Colgante cerámica (sub)'], ['img/sub-ceramica-broches.webp', 'Broche estrella (sub)'], ['img/sub-ceramica-vajilla.webp', 'Vajilla (sub)'], ['img/sub-bisuteria-pulseras.webp', 'Pulsera (sub)'], ['img/sub-bisuteria-anillos.webp', 'Anillo (sub)'], ['img/sub-bisuteria-pendientes.webp', 'Pendientes abalorios (sub)'], ['img/sub-bisuteria-colgantes.webp', 'Collar (sub)']
  ];
  const BANNERS = [['', 'Sin banner'], ['img/banner-textil.webp', 'Banner textil'], ['img/banner-ceramica.webp', 'Banner cerámica'], ['img/banner-bisuteria.webp', 'Banner bisutería'], ['img/banner-principal.webp', 'Banner principal']];
  const TITULOS = { inicio: 'Inicio', productos: 'Productos', categorias: 'Categorías', entregas: 'Entregas y envíos', pagos: 'Formas de pago', paginas: 'Páginas y políticas', tienda: 'Datos de la tienda', conexion: 'Conexión con GitHub', copias: 'Copias de seguridad' };

  const R = { config: {}, categorias: [], productos: [], edit: null };
  const base = { config: '', categorias: '', productos: '' };
  const pendientes = new Map();   // ruta -> { blob, url } imágenes nuevas sin publicar
  const recientes = new Map();    // ruta -> url (imágenes ya publicadas que GitHub Pages aún no sirve)
  const E = { seccion: 'inicio', gh: null, lectura: true, publicando: false, filtro: { q: '', cat: '', sub: '', estado: '' }, paginaAbierta: null };

  /* ---------- Utilidades ---------- */
  const moneda = () => (R.config.pedido || {}).moneda || '€';
  const pr = (v) => precio(v, moneda());
  const copia = (o) => JSON.parse(JSON.stringify(o));
  const src = (ruta) => !ruta ? '' : pendientes.has(ruta) ? pendientes.get(ruta).url : recientes.has(ruta) ? recientes.get(ruta) : (/^(https?:|data:|blob:)/.test(ruta) ? ruta : '../' + ruta);
  const catDe = (id) => R.categorias.find((c) => c.id === id);

  let tToast;
  function toast(txt, error) {
    const t = $('#toast');
    t.textContent = txt; t.className = 'toast visible' + (error ? ' error' : '');
    clearTimeout(tToast); tToast = setTimeout(() => { t.className = 'toast' + (error ? ' error' : ''); }, error ? 5000 : 2800);
  }

  function obtener(ruta) { return ruta.split('.').reduce((o, k) => (o == null ? undefined : o[k]), R); }
  function fijar(ruta, valor) {
    const partes = ruta.split('.'); const ult = partes.pop();
    let o = R;
    partes.forEach((k, i) => { if (o[k] == null) o[k] = /^\d+$/.test(partes[i + 1] || ult) ? [] : {}; o = o[k]; });
    o[ult] = valor;
  }

  /* Campos enlazados: data-bind="config.tienda.nombre" */
  function campo(etiqueta, ruta, opc) {
    const o = opc || {};
    const v = obtener(ruta);
    const attrs = ' data-bind="' + esc(ruta) + '"' + (o.tipo ? ' data-tipo="' + o.tipo + '"' : '') + (o.repinta ? ' data-repinta="1"' : '') +
      (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + (o.requerido ? ' required' : '') + (o.extra || '');
    let control;
    if (o.tipo === 'bool') {
      return '<label class="interruptor' + (o.ancho ? ' ancho' : '') + '"><input type="checkbox"' + attrs + (v ? ' checked' : '') + '>' + esc(etiqueta) + '</label>';
    } else if (o.opciones) {
      control = '<select' + attrs + '>' + o.opciones.map((op) => '<option value="' + esc(op[0]) + '"' + (String(v == null ? '' : v) === String(op[0]) ? ' selected' : '') + '>' + esc(op[1]) + '</option>').join('') + '</select>';
    } else if (o.area) {
      control = '<textarea rows="' + (o.filas || 4) + '"' + attrs + '>' + esc(v == null ? '' : v) + '</textarea>';
    } else {
      const tipo = o.tipo === 'num' ? 'text" inputmode="' + (o.paso === '1' ? 'numeric' : 'decimal') : (o.input || 'text');
      control = '<input type="' + tipo + '"' + attrs + ' value="' + esc(v == null ? '' : v) + '"' + (o.auto ? ' autocomplete="' + o.auto + '"' : '') + '>';
    }
    return '<label class="campo' + (o.ancho ? ' ancho' : '') + '">' + esc(etiqueta) + (o.ayuda ? ' <small>' + esc(o.ayuda) + '</small>' : '') + control + '</label>';
  }

  /* ---------- Estado de cambios ---------- */
  function rutasImagenes(datos) {
    const s = new Set();
    const mira = (v) => { if (typeof v === 'string' && /^img\//.test(v)) s.add(v); else if (v && typeof v === 'object') Object.values(v).forEach(mira); };
    mira(datos);
    return s;
  }
  function cambiados() { return Object.keys(ARCHIVOS).filter((k) => JSON.stringify(R[k]) !== base[k]); }
  function imagenesNuevas() { const usadas = rutasImagenes([R.config, R.categorias, R.productos]); return Array.from(pendientes.keys()).filter((r) => usadas.has(r)); }
  function hayCambios() { return cambiados().length > 0 || imagenesNuevas().length > 0; }

  function marcar() {
    const n = cambiados().length + imagenesNuevas().length;
    const est = $('#barra-estado'), btn = $('#publicar');
    if (E.publicando) return;
    if (n) { est.textContent = 'Cambios sin publicar'; est.className = 'barra-estado pendiente'; }
    else { est.textContent = E.lectura ? 'Modo solo lectura' : 'Todo publicado'; est.className = 'barra-estado'; }
    btn.disabled = !n;
    btn.textContent = E.lectura && n ? 'Publicar…' : 'Guardar y publicar';
  }

  /* ---------- Carga de datos ---------- */
  function leerConexion() {
    let c = {};
    try { c = JSON.parse(localStorage.getItem(CLAVE_GH) || '{}'); } catch (e) { c = {}; }
    const d = window.GitHub.detectar();
    return { owner: c.owner || d.owner || '', repo: c.repo || d.repo || '', branch: c.branch || 'main', token: c.token || '' };
  }

  async function cargar() {
    const con = leerConexion();
    const gh = new window.GitHub(con);
    let datos = null;
    if (gh.listo) {
      try {
        const [config, categorias, productos] = await Promise.all(Object.values(ARCHIVOS).map((r) => gh.leerJSON(r)));
        datos = { config, categorias, productos };
        E.gh = gh; E.lectura = false;
      } catch (e) {
        toast('No se pudo conectar con GitHub: ' + e.message, true);
      }
    }
    if (!datos) {
      try {
        const [config, categorias, productos] = await Promise.all(Object.values(ARCHIVOS).map((r) => cargarJSON('../' + r)));
        datos = { config, categorias, productos };
      } catch (e) {
        $('#contenido').innerHTML = '<div class="alerta error">No se han podido cargar los datos de la tienda. Abre el panel desde la web publicada (…github.io/HilosDeCoral/admin/) o desde un servidor local.</div>';
        return false;
      }
      E.lectura = true;
    }
    R.config = datos.config || {}; R.categorias = datos.categorias || []; R.productos = datos.productos || [];
    Object.keys(ARCHIVOS).forEach((k) => { base[k] = JSON.stringify(R[k]); });
    return true;
  }

  /* ---------- Navegación ---------- */
  function ir(seccion) {
    E.seccion = TITULOS[seccion] ? seccion : 'inicio';
    $$('#nav button').forEach((b) => b.setAttribute('aria-current', b.dataset.seccion === E.seccion ? 'page' : 'false'));
    $('#barra-titulo').textContent = TITULOS[E.seccion];
    $('#lateral').classList.remove('abierto'); $('#boton-menu').setAttribute('aria-expanded', 'false');
    if (location.hash !== '#' + E.seccion) history.replaceState(null, '', '#' + E.seccion);
    pintar();
    $('#contenido').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function pintar() {
    const f = VISTAS[E.seccion];
    $('#contenido').innerHTML = f();
    $('#lateral-nombre').textContent = (R.config.tienda || {}).nombre || 'Mi tienda';
    $('#lateral-version').textContent = 'v' + window.HDC.VERSION + ' · ' + window.HDC.FECHA_VERSION;
    marcar();
  }

  /* ---------- Vistas ---------- */
  const VISTAS = {};

  VISTAS.inicio = function () {
    const p = R.productos;
    const cuenta = (e) => p.filter((x) => x.visible !== false && estadoProducto(x) === e).length;
    const c = R.config, ct = c.contacto || {}, pol = c.politicas || {};
    const sobre = (c.paginas || []).find((x) => x.id === 'sobre-mi');
    const tareas = [
      [!!ct.whatsapp, 'Número de WhatsApp para recibir pedidos', 'tienda'],
      [!E.lectura, 'Conexión con GitHub para publicar', 'conexion'],
      [p.length > 0, 'Al menos un producto en la tienda', 'productos'],
      [!!pol.titular && !/^\[/.test(pol.titular) && !!pol.nif && !/^\[/.test(pol.nif), 'Datos del titular para el aviso legal', 'tienda'],
      [!!ct.email, 'Correo electrónico de contacto', 'tienda'],
      [!!sobre && !/\[tu nombre\]/.test(sobre.texto || ''), 'Texto de la página "Sobre mí"', 'paginas']
    ];
    const sinFoto = p.filter((x) => !(x.fotos || []).length).length;
    return '<p class="seccion-intro">Desde aquí gestionas todo: productos, categorías, entregas, pagos y textos. Los cambios se guardan en el navegador hasta que pulsas <strong>Guardar y publicar</strong>; entonces se suben a GitHub y la tienda se actualiza en 1 o 2 minutos.</p>' +
      (E.lectura ? '<div class="alerta">Estás en <strong>modo solo lectura</strong>: puedes probar cambios, pero para publicarlos tienes que <a href="#conexion" data-ir="conexion">conectar el panel con GitHub</a>.</div><p></p>' : '') +
      '<div class="resumen">' +
      '<div class="dato"><strong>' + p.length + '</strong><span>Productos</span></div>' +
      '<div class="dato"><strong>' + cuenta('disponible') + '</strong><span>Disponibles</span></div>' +
      '<div class="dato"><strong>' + cuenta('reservado') + '</strong><span>Reservados</span></div>' +
      '<div class="dato"><strong>' + cuenta('vendido') + '</strong><span>Vendidos</span></div>' +
      '<div class="dato"><strong>' + p.filter((x) => x.visible === false).length + '</strong><span>Ocultos</span></div>' +
      '</div>' +
      '<div class="caja"><h2>Antes de abrir la tienda</h2><p class="caja-ayuda">Lo que falta por configurar.</p><ul class="lista-tareas">' +
      tareas.map((t) => '<li><span class="' + (t[0] ? 'ok">✓' : 'mal">✗') + '</span> ' + esc(t[1]) + (t[0] ? '' : ' · <a href="#' + t[2] + '" data-ir="' + t[2] + '">configurar</a>') + '</li>').join('') +
      (sinFoto ? '<li><span class="mal">!</span> ' + sinFoto + ' producto(s) sin foto · <a href="#productos" data-ir="productos">revisar</a></li>' : '') +
      '</ul></div>' +
      '<div class="fila"><button type="button" class="btn btn-coral" data-nuevo-producto>Añadir producto</button><a class="btn" href="../" target="_blank" rel="noopener">Ver la tienda ↗</a></div>';
  };

  /* --- Productos --- */
  VISTAS.productos = function () {
    const f = E.filtro;
    const q = f.q.trim().toLowerCase();
    const lista = R.productos.map((p, i) => ({ p, i })).filter(({ p }) =>
      (!q || (p.nombre || '').toLowerCase().includes(q)) && (!f.cat || p.categoria === f.cat) &&
      (!f.sub || p.subcategoria === f.sub) &&
      (!f.estado || (f.estado === 'oculto' ? p.visible === false : estadoProducto(p) === f.estado)));
    return '<div class="fila-entre" style="margin-bottom:14px"><p class="seccion-intro" style="margin:0">Añade piezas nuevas, edítalas o cambia su estado cuando se reserven o se vendan.</p>' +
      '<button type="button" class="btn btn-coral" data-nuevo-producto>Añadir producto</button></div>' +
      '<div class="filtros">' +
      '<input type="search" id="f-q" placeholder="Buscar por nombre…" value="' + esc(f.q) + '" aria-label="Buscar">' +
      '<select id="f-cat" aria-label="Categoría"><option value="">Todas las categorías</option>' + R.categorias.map((c) => '<option value="' + esc(c.id) + '"' + (f.cat === c.id ? ' selected' : '') + '>' + esc(c.nombre) + '</option>').join('') + '</select>' +
      (catDe(f.cat) && subsDe(catDe(f.cat)).length ? '<select id="f-sub" aria-label="Subcategoría"><option value="">Todas las subcategorías</option>' + subsDe(catDe(f.cat)).map((x) => '<option value="' + esc(x.id) + '"' + (f.sub === x.id ? ' selected' : '') + '>' + esc(x.nombre) + '</option>').join('') + '</select>' : '') +
      '<select id="f-estado" aria-label="Estado"><option value="">Todos los estados</option>' + ['disponible', 'reservado', 'vendido', 'oculto'].map((e) => '<option value="' + e + '"' + (f.estado === e ? ' selected' : '') + '>' + (ESTADOS[e] ? ESTADOS[e].txt : 'Ocultos') + '</option>').join('') + '</select>' +
      '</div>' +
      (lista.length ? '<div class="productos">' + lista.map(({ p, i }) => filaProducto(p, i)).join('') + '</div>'
        : '<div class="vacio">' + (R.productos.length ? 'No hay productos con esos filtros.' : 'Todavía no hay productos. Pulsa <strong>Añadir producto</strong> para crear el primero.') + '</div>');
  };

  function filaProducto(p, i) {
    const cat = catDe(p.categoria), est = estadoProducto(p), foto = (p.fotos || [])[0];
    return '<div class="prod' + (p.visible === false ? ' oculto' : '') + '">' +
      (foto ? '<img src="' + esc(src(foto)) + '" alt="">' : '<img class="sin-foto" src="' + esc(src(cat ? cat.icono : 'img/cat-todo.webp')) + '" alt="">') +
      '<div><div class="prod-nombre">' + esc(p.nombre || '(sin nombre)') + '</div><div class="prod-meta">' +
      '<span>' + (num(p.precio) > 0 ? esc(pr(p.precio)) : 'Consultar precio') + '</span><span>' + esc(cat ? cat.nombre + (subDe(cat, p.subcategoria) ? ' › ' + subDe(cat, p.subcategoria).nombre : '') : 'Sin categoría') + '</span>' +
      (p.unidades !== '' && p.unidades != null ? '<span>' + num(p.unidades) + ' ud.</span>' : '') +
      '<span class="chip ' + est + '">' + ESTADOS[est].txt + '</span>' +
      (p.novedad ? '<span class="chip novedad">Novedad</span>' : '') + (p.personalizable !== false && cat && cat.personalizable ? '<span class="chip personalizable">Personalizable</span>' : '') + (p.visible === false ? '<span class="chip oculto">Oculto</span>' : '') +
      '</div></div>' +
      '<div class="prod-acciones">' +
      '<select data-estado-prod="' + i + '" aria-label="Estado de ' + esc(p.nombre) + '">' + Object.keys(ESTADOS).map((k) => '<option value="' + k + '"' + ((p.estado || 'disponible') === k ? ' selected' : '') + '>' + ESTADOS[k].txt + '</option>').join('') + '</select>' +
      '<button type="button" class="btn btn-peq" data-editar="' + i + '">Editar</button>' +
      '<button type="button" class="btn btn-peq" data-visible="' + i + '">' + (p.visible === false ? 'Mostrar' : 'Ocultar') + '</button>' +
      '<button type="button" class="btn btn-peq" data-duplicar="' + i + '">Duplicar</button>' +
      '<button type="button" class="btn btn-peq btn-peligro" data-borrar-prod="' + i + '">Eliminar</button>' +
      '</div></div>';
  }

  function nuevoProducto() {
    return { id: '', nombre: '', categoria: (R.categorias[0] || {}).id || '', precio: '', precioAnterior: '', unidades: 1, estado: 'disponible', novedad: true, visible: true, descripcion: '', materiales: '', medidas: '', cuidados: '', fotos: [] };
  }

  function abrirProducto(indice) {
    R.edit = indice == null ? nuevoProducto() : copia(R.productos[indice]);
    R.edit.fotos = R.edit.fotos || [];
    E.editIndice = indice;
    const ed = R.edit;
    $('#modal-caja').innerHTML =
      '<div class="modal-cab"><h2 id="modal-titulo">' + (indice == null ? 'Nuevo producto' : 'Editar producto') + '</h2>' +
      '<button type="button" class="btn btn-icono" data-modal-cerrar aria-label="Cerrar">✕</button></div>' +
      '<div class="modal-cuerpo">' +
      '<div><h3 style="margin:0 0 8px">Fotos</h3><p class="caja-ayuda">La primera es la principal. Se reducen y optimizan automáticamente.</p><div class="fotos" id="fotos-edit">' + fotosHTML() + '</div></div>' +
      '<div class="rejilla-campos">' +
      campo('Nombre *', 'edit.nombre', { requerido: true, ancho: true, placeholder: 'Ej.: Totebag ballena azul' }) +
      campo('Categoría', 'edit.categoria', { opciones: [['', 'Sin categoría']].concat(R.categorias.map((c) => [c.id, c.nombre])) }) +
      '<div id="sub-edit">' + subEditHTML() + '</div>' +
      campo('Precio (' + moneda() + ')', 'edit.precio', { tipo: 'num', ayuda: '(0 o vacío = consultar precio)' }) +
      campo('Precio anterior', 'edit.precioAnterior', { tipo: 'num', ayuda: '(opcional, para mostrar una oferta)' }) +
      campo('Unidades', 'edit.unidades', { tipo: 'num', paso: '1', ayuda: '(vacío = sin límite)' }) +
      campo('Estado', 'edit.estado', { opciones: Object.keys(ESTADOS).map((k) => [k, ESTADOS[k].txt]) }) +
      '</div>' +
      '<div class="fila">' + campo('Marcar como novedad', 'edit.novedad', { tipo: 'bool' }) + campo('Visible en la tienda', 'edit.visible', { tipo: 'bool' }) + '</div>' +
      '<div id="pers-edit">' + persHTML() + '</div>' +
      '<div class="rejilla-campos">' +
      campo('Descripción', 'edit.descripcion', { area: true, filas: 4, ancho: true }) +
      campo('Materiales', 'edit.materiales', { placeholder: 'Ej.: algodón orgánico, pintura textil' }) +
      campo('Medidas', 'edit.medidas', { placeholder: 'Ej.: 38 × 42 cm' }) +
      campo('Cuidados', 'edit.cuidados', { ancho: true, placeholder: 'Ej.: lavar a mano en frío, no usar secadora' }) +
      '</div><p class="alerta error" id="error-producto" hidden></p></div>' +
      '<div class="modal-pie"><button type="button" class="btn" data-modal-cerrar>Cancelar</button><button type="button" class="btn btn-coral" data-guardar-producto>Guardar producto</button></div>';
    abrirModal();
    if (indice == null) setTimeout(() => { const n = $('[data-bind="edit.nombre"]'); if (n) n.focus(); }, 50);
  }

  function fotosHTML() {
    const f = R.edit.fotos;
    return f.map((ruta, i) => '<div class="foto' + (i === 0 ? ' principal' : '') + '"><img src="' + esc(src(ruta)) + '" alt="Foto ' + (i + 1) + '">' +
      (i === 0 ? '<span class="foto-etiqueta">Principal</span>' : '') +
      '<div class="foto-barra">' +
      '<button type="button" data-foto-mover="' + i + '" data-dir="-1" aria-label="Mover a la izquierda"' + (i === 0 ? ' disabled' : '') + '>‹</button>' +
      '<button type="button" data-foto-quitar="' + i + '" aria-label="Quitar foto">✕</button>' +
      '<button type="button" data-foto-mover="' + i + '" data-dir="1" aria-label="Mover a la derecha"' + (i === f.length - 1 ? ' disabled' : '') + '>›</button>' +
      '</div></div>').join('') +
      '<label class="foto-nueva"><input type="file" accept="image/*" multiple data-subir-fotos><span style="font-size:28px">+</span>Añadir fotos</label>';
  }

  function guardarProducto() {
    const ed = R.edit, err = $('#error-producto');
    const faltan = [];
    if (!String(ed.nombre || '').trim()) faltan.push('el nombre');
    if (faltan.length) { err.textContent = 'Falta ' + faltan.join(' y ') + '.'; err.hidden = false; return; }
    ed.nombre = ed.nombre.trim();
    ed.precio = ed.precio === '' || ed.precio == null ? 0 : Math.max(0, num(ed.precio));
    ed.precioAnterior = ed.precioAnterior === '' || ed.precioAnterior == null ? '' : num(ed.precioAnterior);
    ed.unidades = ed.unidades === '' || ed.unidades == null ? '' : Math.max(0, Math.floor(num(ed.unidades)));
    if (E.editIndice == null) {
      ed.id = slug(ed.nombre) + '-' + Math.random().toString(36).slice(2, 6);
      ed.creado = new Date().toISOString();
      R.productos.unshift(ed);
    } else {
      ed.modificado = new Date().toISOString();
      R.productos[E.editIndice] = ed;
    }
    R.edit = null;
    cerrarModal();
    toast('Producto guardado. Recuerda publicar los cambios.');
    if (E.seccion !== 'productos') ir('productos'); else pintar();
  }

  /* --- Imágenes --- */
  async function procesarImagen(archivo, maxLado, calidad) {
    let bmp;
    try { bmp = await createImageBitmap(archivo, { imageOrientation: 'from-image' }); }
    catch (e) { bmp = await new Promise((ok, mal) => { const im = new Image(); im.onload = () => ok(im); im.onerror = mal; im.src = URL.createObjectURL(archivo); }); }
    const w0 = bmp.width, h0 = bmp.height;
    const k = Math.min(1, maxLado / Math.max(w0, h0));
    const w = Math.round(w0 * k), h = Math.round(h0 * k);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(bmp, 0, 0, w, h);
    let blob = await new Promise((ok) => cv.toBlob(ok, 'image/webp', calidad || 0.85));
    if (!blob || blob.type !== 'image/webp') blob = await new Promise((ok) => cv.toBlob(ok, 'image/jpeg', calidad || 0.85));
    return { blob, ext: blob.type === 'image/webp' ? 'webp' : 'jpg' };
  }

  async function subirFotos(files) {
    const base_ = slug(R.edit.nombre || 'producto');
    toast('Preparando ' + files.length + ' foto(s)…');
    for (const f of files) {
      if (!/^image\//.test(f.type)) continue;
      try {
        const { blob, ext } = await procesarImagen(f, 1600, 0.84);
        const ruta = 'img/productos/' + base_ + '-' + uid() + '.' + ext;
        pendientes.set(ruta, { blob, url: URL.createObjectURL(blob) });
        R.edit.fotos.push(ruta);
      } catch (e) { toast('No se pudo leer la imagen ' + f.name, true); }
    }
    $('#fotos-edit').innerHTML = fotosHTML();
    marcar();
  }

  async function subirImagenSuelta(input) {
    const f = input.files && input.files[0]; if (!f) return;
    const ruta0 = input.dataset.subirImg, max = num(input.dataset.max, 1200);
    try {
      const { blob, ext } = await procesarImagen(f, max, 0.86);
      const ruta = 'img/subidas/' + slug(ruta0.split('.').slice(-2).join('-')) + '-' + uid() + '.' + ext;
      pendientes.set(ruta, { blob, url: URL.createObjectURL(blob) });
      fijar(ruta0, ruta);
      pintar(); toast('Imagen preparada. Se subirá al publicar.');
    } catch (e) { toast('No se pudo leer la imagen', true); }
  }

  function selectorImagen(etiqueta, ruta, opciones, max, ancha) {
    const v = obtener(ruta) || '';
    const ops = opciones.slice();
    if (v && !ops.some((o) => o[0] === v)) ops.push([v, 'Imagen subida']);
    return '<div class="campo ancho">' + esc(etiqueta) + '<div class="selector-img">' +
      '<span class="vista' + (ancha ? ' ancha' : '') + '" style="background-image:url(&quot;' + esc(src(v)) + '&quot;)"></span>' +
      '<select data-bind="' + esc(ruta) + '" data-repinta="1" aria-label="' + esc(etiqueta) + '" style="max-width:240px">' + ops.map((o) => '<option value="' + esc(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>' +
      '<label class="btn btn-peq" style="position:relative">Subir imagen<input type="file" accept="image/*" data-subir-img="' + esc(ruta) + '" data-max="' + (max || 1200) + '" style="position:absolute;opacity:0;width:1px;height:1px"></label>' +
      '</div></div>';
  }

  /* --- Subcategorías --- */
  function subsDe(c) { return (c && c.subcategorias) || []; }
  function subDe(c, id) { return subsDe(c).find((x) => x.id === id); }

  function subEditHTML() {
    const ed = R.edit; if (!ed) return '';
    const subs = subsDe(catDe(ed.categoria));
    if (!subs.length) return '';
    return campo('Subcategoría', 'edit.subcategoria', { opciones: [['', 'Sin subcategoría']].concat(subs.map((x) => [x.id, x.nombre])) });
  }

  function subcatsHTML(c, i) {
    const subs = c.subcategorias = c.subcategorias || [];
    const r = 'categorias.' + i + '.subcategorias';
    return '<div class="separa caja caja-sub"><div class="fila-entre"><div><h3>Subcategorías</h3><p class="caja-ayuda" style="margin:0">Aparecen en el desplegable al pulsar la categoría en la tienda.</p></div>' +
      '<button type="button" class="btn btn-peq" data-nueva-sub="' + i + '">Añadir subcategoría</button></div>' +
      subs.map((x, j) => {
        const n = R.productos.filter((p) => p.categoria === c.id && p.subcategoria === x.id).length;
        return '<div class="sub-fila' + (x.visible === false ? ' inactivo' : '') + '">' +
          campo('Nombre · ' + n + ' producto(s)', r + '.' + j + '.nombre') +
          selectorImagen('Imagen', r + '.' + j + '.icono', IMAGENES_TIENDA, 400) +
          '<div class="fila sub-acciones">' + campo('Visible', r + '.' + j + '.visible', { tipo: 'bool' }) +
          '<button type="button" class="btn btn-peq btn-icono" data-mover="' + r + '" data-i="' + j + '" data-dir="-1" aria-label="Subir"' + (j === 0 ? ' disabled' : '') + '>↑</button>' +
          '<button type="button" class="btn btn-peq btn-icono" data-mover="' + r + '" data-i="' + j + '" data-dir="1" aria-label="Bajar"' + (j === subs.length - 1 ? ' disabled' : '') + '>↓</button>' +
          '<button type="button" class="btn btn-peq btn-peligro" data-borrar-sub="' + i + '" data-j="' + j + '">Quitar</button></div>' +
          '</div>';
      }).join('') +
      (subs.length ? '' : '<p class="caja-ayuda separa">Sin subcategorías: al pulsar la categoría se mostrarán todas sus piezas.</p>') + '</div>';
  }

  /* --- Personalización (solo en categorías que lo permiten) --- */
  function persHTML() {
    const ed = R.edit; if (!ed) return '';
    const cat = catDe(ed.categoria);
    if (!cat || !cat.personalizable) return '';
    if (ed.personalizable == null) ed.personalizable = true;
    if (ed.persEtiqueta == null) ed.persEtiqueta = 'Texto personalizado';
    if (ed.persMax == null || ed.persMax === '') ed.persMax = 20;
    if (ed.persObligatorio == null) ed.persObligatorio = false;
    return '<div class="caja caja-pers"><h3>Personalizable / por encargo</h3><p class="caja-ayuda">El cliente escribe un nombre o texto, elige tipo de letra, tamaño, color y posición, y lo ve en una vista previa sobre la foto. Lo recibes todo en el pedido de WhatsApp.</p>' +
      campo('Producto personalizable', 'edit.personalizable', { tipo: 'bool' }) +
      (ed.personalizable ? '<div class="rejilla-campos separa">' +
        campo('Qué se le pide al cliente', 'edit.persEtiqueta', { placeholder: 'Ej.: Nombre del bebé' }) +
        campo('Máximo de caracteres', 'edit.persMax', { tipo: 'num', paso: '1' }) +
        campo('Suplemento (' + moneda() + ')', 'edit.persExtra', { tipo: 'num', ayuda: '(vacío = sin suplemento)' }) +
        '<div class="campo" style="justify-content:flex-end">' + campo('Texto obligatorio', 'edit.persObligatorio', { tipo: 'bool' }) + '</div>' +
        '</div>' : '') + '</div>';
  }

  function opcionesEncargo(c, i) {
    const enc = c.encargos || {};
    const bases = enc.bases || [];
    const r = 'categorias.' + i + '.encargos';
    return '<div class="separa caja-pers caja"><h3>Personalización y encargos</h3><p class="caja-ayuda">Opciones extra para esta categoría.</p>' +
      '<div class="fila">' + campo('Productos personalizables con texto (todos, salvo los que desactives en su ficha)', 'categorias.' + i + '.personalizable', { tipo: 'bool' }) + '</div>' +
      '<div class="fila separa">' + campo('Permite encargar un diseño propio del cliente', r + '.activo', { tipo: 'bool', repinta: true }) + '</div>' +
      (enc.activo ? '<div class="rejilla-campos separa">' +
        campo('Título del bloque', r + '.titulo', { placeholder: '¿Tienes tu propio diseño?' }) +
        campo('Texto', r + '.texto', { area: true, filas: 2, ancho: true }) + '</div>' +
        '<div class="fila-entre separa"><strong>Modelos que se pueden encargar</strong><button type="button" class="btn btn-peq" data-nueva-base="' + i + '">Añadir modelo</button></div>' +
        bases.map((b, j) => '<div class="base-encargo">' +
          campo('Modelo', r + '.bases.' + j + '.nombre') +
          campo('Precio desde (' + moneda() + ')', r + '.bases.' + j + '.precio', { tipo: 'num', ayuda: '(vacío = a consultar)' }) +
          campo('Detalle', r + '.bases.' + j + '.descripcion', { placeholder: 'Ej.: algodón natural' }) +
          '<div class="campo" style="justify-content:flex-end">' + campo('Pedir talla', r + '.bases.' + j + '.pideTalla', { tipo: 'bool' }) + '</div>' +
          '<div class="campo" style="justify-content:flex-end"><button type="button" class="btn btn-peq btn-peligro" data-borrar="' + r + '.bases" data-i="' + j + '">Quitar</button></div>' +
          '</div>').join('') +
        (bases.length ? '' : '<p class="caja-ayuda separa">Añade al menos un modelo para que el bloque aparezca en la tienda.</p>')
        : '') + '</div>';
  }

  /* --- Categorías --- */
  VISTAS.categorias = function () {
    return '<div class="fila-entre" style="margin-bottom:14px"><p class="seccion-intro" style="margin:0">Las categorías aparecen como pestañas en la tienda, en este orden.</p>' +
      '<button type="button" class="btn btn-coral" data-nueva-cat>Añadir categoría</button></div>' +
      R.categorias.map((c, i) => {
        const usados = R.productos.filter((p) => p.categoria === c.id).length;
        return '<div class="elemento' + (c.visible === false ? ' inactivo' : '') + '"><div class="elemento-cab"><h3>' + esc(c.nombre || 'Nueva categoría') + ' <small style="font-weight:600;color:var(--texto-suave)">· ' + usados + ' producto(s)</small></h3>' +
          '<div class="fila">' + campo('Visible', 'categorias.' + i + '.visible', { tipo: 'bool' }) +
          '<button type="button" class="btn btn-peq btn-icono" data-mover="categorias" data-i="' + i + '" data-dir="-1" aria-label="Subir"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
          '<button type="button" class="btn btn-peq btn-icono" data-mover="categorias" data-i="' + i + '" data-dir="1" aria-label="Bajar"' + (i === R.categorias.length - 1 ? ' disabled' : '') + '>↓</button>' +
          '<button type="button" class="btn btn-peq btn-peligro" data-borrar-cat="' + i + '">Eliminar</button></div></div>' +
          '<div class="rejilla-campos">' + campo('Nombre', 'categorias.' + i + '.nombre') + campo('Descripción', 'categorias.' + i + '.descripcion', { ayuda: '(se muestra al elegir la categoría)' }) +
          selectorImagen('Icono de la pestaña', 'categorias.' + i + '.icono', IMAGENES_TIENDA, 400) +
          selectorImagen('Banner de la categoría', 'categorias.' + i + '.banner', BANNERS, 1920, true) +
          '</div>' + subcatsHTML(c, i) + opcionesEncargo(c, i) + '</div>';
      }).join('');
  };

  /* --- Entregas --- */
  VISTAS.entregas = function () {
    const ents = R.config.entregas = R.config.entregas || [];
    return '<div class="fila-entre" style="margin-bottom:14px"><p class="seccion-intro" style="margin:0">Formas de entrega que el cliente puede elegir al hacer el pedido. Solo se muestran las activas.</p>' +
      '<button type="button" class="btn btn-coral" data-nueva-entrega>Añadir forma de entrega</button></div>' +
      ents.map((e, i) => '<div class="elemento' + (e.activo ? '' : ' inactivo') + '"><div class="elemento-cab"><h3>' + esc(e.nombre || 'Nueva forma de entrega') + '</h3>' +
        '<div class="fila">' + campo('Activa', 'config.entregas.' + i + '.activo', { tipo: 'bool', repinta: true }) +
        '<button type="button" class="btn btn-peq btn-icono" data-mover="config.entregas" data-i="' + i + '" data-dir="-1" aria-label="Subir"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" class="btn btn-peq btn-icono" data-mover="config.entregas" data-i="' + i + '" data-dir="1" aria-label="Bajar"' + (i === ents.length - 1 ? ' disabled' : '') + '>↓</button>' +
        '<button type="button" class="btn btn-peq btn-peligro" data-borrar="config.entregas" data-i="' + i + '">Eliminar</button></div></div>' +
        '<div class="rejilla-campos">' +
        campo('Nombre', 'config.entregas.' + i + '.nombre', { placeholder: 'Ej.: Envío por mensajería' }) +
        campo('Precio (' + moneda() + ')', 'config.entregas.' + i + '.precio', { tipo: 'num', ayuda: '(0 = gratis)' }) +
        campo('Gratis a partir de (' + moneda() + ')', 'config.entregas.' + i + '.gratisDesde', { tipo: 'num', ayuda: '(vacío = nunca)' }) +
        campo('Plazo', 'config.entregas.' + i + '.plazo', { placeholder: 'Ej.: 2 a 4 días laborables' }) +
        campo('Descripción', 'config.entregas.' + i + '.descripcion', { ancho: true, placeholder: 'Zona, condiciones, cómo se acuerda…' }) +
        '</div><div class="separa">' + campo('Pedir la dirección de envío al cliente', 'config.entregas.' + i + '.pideDireccion', { tipo: 'bool' }) + '</div></div>').join('') +
      (ents.length ? '' : '<div class="vacio">No hay formas de entrega. Los pedidos dirán "entrega a acordar".</div>');
  };

  /* --- Pagos --- */
  VISTAS.pagos = function () {
    const pagos = R.config.pagos = R.config.pagos || [];
    const ents = R.config.entregas || [];
    return '<div class="fila-entre" style="margin-bottom:14px"><p class="seccion-intro" style="margin:0">Formas de pago que se ofrecen en el pedido. Puedes limitar cada una a ciertas formas de entrega (por ejemplo, contra reembolso solo con mensajería).</p>' +
      '<button type="button" class="btn btn-coral" data-nuevo-pago>Añadir forma de pago</button></div>' +
      pagos.map((p, i) => '<div class="elemento' + (p.activo ? '' : ' inactivo') + '"><div class="elemento-cab"><h3>' + esc(p.nombre || 'Nueva forma de pago') + '</h3>' +
        '<div class="fila">' + campo('Activa', 'config.pagos.' + i + '.activo', { tipo: 'bool', repinta: true }) +
        '<button type="button" class="btn btn-peq btn-icono" data-mover="config.pagos" data-i="' + i + '" data-dir="-1" aria-label="Subir"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" class="btn btn-peq btn-icono" data-mover="config.pagos" data-i="' + i + '" data-dir="1" aria-label="Bajar"' + (i === pagos.length - 1 ? ' disabled' : '') + '>↓</button>' +
        '<button type="button" class="btn btn-peq btn-peligro" data-borrar="config.pagos" data-i="' + i + '">Eliminar</button></div></div>' +
        '<div class="rejilla-campos">' +
        campo('Nombre', 'config.pagos.' + i + '.nombre', { placeholder: 'Ej.: Bizum (pago anticipado)' }) +
        campo('Recargo (' + moneda() + ')', 'config.pagos.' + i + '.recargo', { tipo: 'num', ayuda: '(0 = sin recargo)' }) +
        campo('Instrucciones para el cliente', 'config.pagos.' + i + '.descripcion', { area: true, filas: 2, ancho: true }) +
        '</div><div class="separa campo">Disponible con <small>(si no marcas ninguna, con todas)</small><div class="casillas">' +
        ents.map((e) => '<label><input type="checkbox" data-pago-entrega="' + i + '" value="' + esc(e.id) + '"' + ((p.entregas || []).includes(e.id) ? ' checked' : '') + '>' + esc(e.nombre) + '</label>').join('') +
        '</div></div></div>').join('') +
      (pagos.length ? '' : '<div class="vacio">No hay formas de pago. Los pedidos dirán "pago a acordar".</div>');
  };

  /* --- Páginas --- */
  VISTAS.paginas = function () {
    const pags = R.config.paginas = R.config.paginas || [];
    return '<div class="fila-entre" style="margin-bottom:14px"><p class="seccion-intro" style="margin:0">Textos de información: cómo comprar, envíos, devoluciones, garantía, aviso legal… Revísalos y adáptalos a tu caso.</p>' +
      '<button type="button" class="btn btn-coral" data-nueva-pagina>Añadir página</button></div>' +
      '<div class="caja"><h2>Datos que usan los textos</h2><p class="caja-ayuda">Se insertan automáticamente donde escribas la variable entre llaves.</p><div class="rejilla-campos">' +
      campo('Días para devoluciones', 'config.politicas.devolucionesDias', { tipo: 'num', paso: '1', ayuda: '{devolucionesDias}' }) +
      campo('Años de garantía', 'config.politicas.garantiaAnios', { tipo: 'num', paso: '1', ayuda: '{garantiaAnios}' }) +
      campo('Horas de reserva del pedido', 'config.pedido.horasReserva', { tipo: 'num', paso: '1', ayuda: '{horasReserva}' }) +
      '</div></div>' +
      pags.map((p, i) => {
        const abierta = E.paginaAbierta === i;
        return '<div class="elemento' + (p.visible === false ? ' inactivo' : '') + '"><div class="elemento-cab"><h3>' + esc(p.titulo || 'Nueva página') + '</h3>' +
          '<div class="fila"><button type="button" class="btn btn-peq" data-abrir-pagina="' + i + '">' + (abierta ? 'Cerrar' : 'Editar texto') + '</button>' +
          '<button type="button" class="btn btn-peq btn-peligro" data-borrar="config.paginas" data-i="' + i + '">Eliminar</button></div></div>' +
          '<div class="rejilla-campos">' + campo('Título', 'config.paginas.' + i + '.titulo') +
          campo('Dónde aparece el enlace', 'config.paginas.' + i + '.menu', { opciones: [['cabecera', 'Menú superior y pie'], ['pie', 'Solo en el pie'], ['ninguno', 'En ningún menú']] }) +
          '<div class="campo" style="justify-content:flex-end">' + campo('Visible', 'config.paginas.' + i + '.visible', { tipo: 'bool' }) + '</div></div>' +
          (abierta ? '<div class="editor-pagina separa">' +
            campo('Texto', 'config.paginas.' + i + '.texto', { area: true, filas: 16, extra: ' data-vista-previa="' + i + '"' }) +
            '<div class="campo">Vista previa<div class="vista-previa" id="vista-previa-' + i + '">' + paginaHTML(p, R.config) + '</div></div>' +
            '<p class="ayuda-formato">Formato: <code>## Título</code> · <code>- elemento de lista</code> · <code>**negrita**</code> · <code>[texto](https://enlace)</code> · línea en blanco = párrafo nuevo. ' +
            'Variables: <code>{nombreTienda}</code> <code>{email}</code> <code>{whatsapp}</code> <code>{devolucionesDias}</code> <code>{garantiaAnios}</code> <code>{horasReserva}</code> <code>{titular}</code> <code>{nif}</code> <code>{domicilio}</code>. ' +
            'En una línea sola: <code>{entregas}</code> y <code>{pagos}</code> muestran la lista de formas activas.</p></div>' : '') +
          '</div>';
      }).join('');
  };

  /* --- Datos de la tienda --- */
  VISTAS.tienda = function () {
    const wa = String((R.config.contacto || {}).whatsapp || '').replace(/\D/g, '');
    return '<div class="caja"><h2>Identidad</h2><p class="caja-ayuda">Nombre, lema y logos que se ven en la tienda.</p><div class="rejilla-campos">' +
      campo('Nombre de la tienda', 'config.tienda.nombre') + campo('Lema', 'config.tienda.lema') +
      campo('Descripción corta', 'config.tienda.descripcion', { ancho: true, ayuda: '(aparece en Google y al compartir el enlace)' }) +
      selectorImagen('Logo completo (portada)', 'config.tienda.logo', [['img/logo.webp', 'Logo Hilos de Coral']], 1000) +
      selectorImagen('Logo simplificado (cabecera)', 'config.tienda.logoSimple', [['img/logo-simple.webp', 'Coral con hilo y aguja']], 400) +
      '</div></div>' +
      '<div class="caja"><h2>Contacto</h2><p class="caja-ayuda">El WhatsApp es donde llegan los pedidos. Escríbelo con o sin prefijo: 600 000 000 o +34 600 000 000.</p><div class="rejilla-campos">' +
      campo('WhatsApp de pedidos', 'config.contacto.whatsapp', { input: 'tel', placeholder: '600 000 000', repinta: false }) +
      campo('Instagram', 'config.contacto.instagram', { placeholder: '@hilosdecoral' }) +
      campo('Correo electrónico', 'config.contacto.email', { input: 'email', placeholder: 'hola@ejemplo.com' }) +
      '</div>' + (wa ? '<p class="separa"><a href="https://wa.me/' + (wa.length === 9 ? '34' + wa : wa) + '?text=' + encodeURIComponent('Prueba del panel de la tienda') + '" target="_blank" rel="noopener">Probar el enlace de WhatsApp ↗</a></p>' : '') + '</div>' +
      '<div class="caja"><h2>Portada</h2><div class="rejilla-campos">' +
      campo('Barra superior', 'config.portada.barraSuperior', { ancho: true, ayuda: '(vacío = no se muestra)' }) +
      campo('Título', 'config.portada.titulo') + campo('Subtítulo', 'config.portada.subtitulo') +
      selectorImagen('Banner de la portada', 'config.portada.banner', [['img/banner-principal.webp', 'Banner principal (olas y coral)'], ['img/banner-textil.webp', 'Banner textil']], 1920, true) +
      '</div></div>' +
      '<div class="caja"><h2>Pedidos</h2><div class="rejilla-campos">' +
      campo('Pedido mínimo (' + moneda() + ')', 'config.pedido.pedidoMinimo', { tipo: 'num', ayuda: '(0 = sin mínimo)' }) +
      campo('Moneda', 'config.pedido.moneda') +
      campo('Saludo del mensaje de WhatsApp', 'config.pedido.saludo', { ancho: true }) +
      campo('Despedida del mensaje', 'config.pedido.despedida', { ancho: true }) +
      '</div></div>' +
      '<div class="caja"><h2>Datos legales</h2><p class="caja-ayuda">Se usan en el aviso legal y la privacidad. La ley exige que aparezcan si vendes por internet.</p><div class="rejilla-campos">' +
      campo('Titular', 'config.politicas.titular', { placeholder: 'Nombre y apellidos' }) + campo('NIF', 'config.politicas.nif') +
      campo('Domicilio', 'config.politicas.domicilio', { ancho: true }) +
      '</div></div>' +
      '<div class="caja"><h2>Vacaciones o cierre temporal</h2><p class="caja-ayuda">Muestra un aviso en la parte superior de la tienda.</p>' +
      campo('Mostrar aviso', 'config.avisos.vacaciones', { tipo: 'bool' }) + '<div class="separa">' + campo('Mensaje', 'config.avisos.mensajeVacaciones', { area: true, filas: 2 }) + '</div></div>';
  };

  /* --- Conexión --- */
  VISTAS.conexion = function () {
    const c = leerConexion();
    return '<p class="seccion-intro">El panel publica los cambios directamente en tu repositorio de GitHub. Para ello necesita un <strong>token</strong> (una contraseña especial solo para este repositorio). Se guarda únicamente en este navegador.</p>' +
      (E.lectura ? '<div class="alerta">Ahora mismo el panel está en modo solo lectura.</div>' : '<div class="alerta bien">Conectado a <strong>' + esc(E.gh.owner + '/' + E.gh.repo) + '</strong> (rama ' + esc(E.gh.branch) + '). La tienda se publica en <a href="' + esc(E.gh.urlWeb()) + '" target="_blank" rel="noopener">' + esc(E.gh.urlWeb()) + '</a>.</div>') +
      '<form class="caja separa" id="form-conexion" autocomplete="off"><h2>Datos de conexión</h2><div class="rejilla-campos">' +
      '<label class="campo">Usuario de GitHub<input name="owner" value="' + esc(c.owner) + '" required></label>' +
      '<label class="campo">Repositorio<input name="repo" value="' + esc(c.repo) + '" placeholder="HilosDeCoral" required></label>' +
      '<label class="campo">Rama<input name="branch" value="' + esc(c.branch) + '" required></label>' +
      '<label class="campo ancho">Token <small>(empieza por github_pat_…)</small><input name="token" type="password" value="' + esc(c.token) + '" autocomplete="off" spellcheck="false"></label>' +
      '</div><div class="fila separa"><button type="submit" class="btn btn-marino">Guardar y conectar</button>' +
      (c.token ? '<button type="button" class="btn btn-peligro" data-olvidar>Olvidar token en este dispositivo</button>' : '') + '</div>' +
      '<p class="alerta error separa" id="error-conexion" hidden></p></form>' +
      '<div class="caja"><h2>Cómo crear el token (una sola vez)</h2><ol class="pasos-ayuda">' +
      '<li>Entra en GitHub y ve a <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Settings → Developer settings → Fine-grained tokens → Generate new token</a>.</li>' +
      '<li><strong>Token name</strong>: por ejemplo "Panel Hilos de Coral". <strong>Expiration</strong>: 1 año (o lo que prefieras).</li>' +
      '<li><strong>Repository access</strong>: "Only select repositories" y elige <strong>HilosDeCoral</strong>.</li>' +
      '<li><strong>Permissions → Repository permissions → Contents</strong>: "Read and write". No hace falta ningún otro permiso.</li>' +
      '<li>Pulsa <strong>Generate token</strong>, cópialo y pégalo aquí arriba. GitHub no te lo volverá a mostrar.</li>' +
      '</ol><p class="caja-ayuda">Si usas el panel desde otro dispositivo (por ejemplo el móvil), tendrás que pegar el token también allí. No lo compartas con nadie: quien lo tenga puede modificar la tienda.</p></div>';
  };

  async function conectar(form) {
    const d = Object.fromEntries(new FormData(form).entries());
    const err = $('#error-conexion');
    const gh = new window.GitHub(d);
    if (!gh.listo) { err.textContent = 'Rellena usuario, repositorio y token.'; err.hidden = false; return; }
    err.hidden = true;
    toast('Comprobando la conexión…');
    try {
      await gh.probar();
      localStorage.setItem(CLAVE_GH, JSON.stringify({ owner: gh.owner, repo: gh.repo, branch: gh.branch, token: gh.token }));
      if (hayCambios() && !confirm('Conexión correcta. Tienes cambios sin publicar: ¿quieres conservarlos? (Cancelar = cargar los datos de GitHub y descartar tus cambios)')) {
        await cargar(); toast('Conectado. Datos cargados desde GitHub.'); ir('inicio'); return;
      }
      if (!hayCambios()) await cargar(); else { E.gh = gh; E.lectura = false; }
      toast('Conectado con GitHub');
      ir('conexion');
    } catch (e) { err.textContent = e.message; err.hidden = false; }
  }

  /* --- Copias --- */
  VISTAS.copias = function () {
    return '<p class="seccion-intro">Guarda una copia de todos los datos de la tienda en tu ordenador, o recupera una copia anterior.</p>' +
      '<div class="caja"><h2>Copia completa</h2><p class="caja-ayuda">Un archivo con productos, categorías y configuración. Las fotos ya están guardadas en GitHub.</p>' +
      '<div class="fila"><button type="button" class="btn btn-marino" data-exportar>Descargar copia</button>' +
      '<label class="btn" style="position:relative">Restaurar una copia…<input type="file" accept="application/json,.json" data-importar style="position:absolute;opacity:0;width:1px;height:1px"></label></div></div>' +
      '<div class="caja"><h2>Archivos sueltos (publicación manual)</h2><p class="caja-ayuda">Si prefieres subirlos tú a GitHub: descarga el archivo y súbelo a la carpeta <code>data/</code> del repositorio, reemplazando el anterior. Las fotos nuevas solo se suben publicando desde el panel.</p>' +
      '<div class="fila">' + Object.keys(ARCHIVOS).map((k) => '<button type="button" class="btn" data-descargar="' + k + '">' + ARCHIVOS[k].replace('data/', '') + '</button>').join('') + '</div></div>';
  };

  function descargar(nombre, texto) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
    a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function importar(input) {
    const f = input.files && input.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!d || typeof d.config !== 'object' || !Array.isArray(d.categorias) || !Array.isArray(d.productos)) throw new Error('formato');
      if (!confirm('Se reemplazarán los datos actuales del panel por los de la copia (' + d.productos.length + ' productos). ¿Continuar?')) return;
      R.config = d.config; R.categorias = d.categorias; R.productos = d.productos;
      toast('Copia restaurada. Revisa y pulsa Guardar y publicar.');
      pintar();
    } catch (e) { toast('El archivo no es una copia válida de la tienda', true); }
  }

  /* ---------- Publicar ---------- */
  function blobABase64(blob) {
    return new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = mal; r.readAsDataURL(blob); });
  }

  async function publicar() {
    if (E.publicando || !hayCambios()) return;
    if (E.lectura || !E.gh) { toast('Primero conecta el panel con GitHub'); ir('conexion'); return; }
    const cambios = cambiados(), nuevas = imagenesNuevas();
    const antes = rutasImagenes(Object.keys(ARCHIVOS).map((k) => JSON.parse(base[k] || 'null')));
    const ahora = rutasImagenes([R.config, R.categorias, R.productos]);
    const borrar = Array.from(antes).filter((r) => !ahora.has(r) && /^img\/(productos|subidas)\//.test(r));
    const archivos = cambios.map((k) => ({ ruta: ARCHIVOS[k], texto: JSON.stringify(R[k], null, 2) + '\n' }));
    const est = $('#barra-estado'), btn = $('#publicar');
    E.publicando = true; btn.disabled = true; btn.textContent = 'Publicando…';
    try {
      for (const r of nuevas) archivos.push({ ruta: r, base64: await blobABase64(pendientes.get(r).blob) });
      const partes = [];
      if (cambios.includes('productos')) partes.push('productos');
      if (cambios.includes('categorias')) partes.push('categorías');
      if (cambios.includes('config')) partes.push('configuración');
      if (nuevas.length) partes.push(nuevas.length + ' imagen(es)');
      await E.gh.publicar(archivos, borrar, 'Panel: actualizar ' + partes.join(', '), (t) => { est.textContent = t; est.className = 'barra-estado pendiente'; });
      Object.keys(ARCHIVOS).forEach((k) => { base[k] = JSON.stringify(R[k]); });
      nuevas.forEach((r) => { recientes.set(r, pendientes.get(r).url); pendientes.delete(r); });
      toast('¡Publicado! La tienda se actualizará en 1 o 2 minutos.');
    } catch (e) {
      toast('No se pudo publicar: ' + e.message, true);
    } finally {
      E.publicando = false; btn.textContent = 'Guardar y publicar'; marcar();
    }
  }

  /* ---------- Ventana modal ---------- */
  function abrirModal() { const m = $('#modal'); if (!m.open) m.showModal(); }
  function cerrarModal() { const m = $('#modal'); if (m.open) m.close(); }

  /* ---------- Eventos ---------- */
  function convertir(el) {
    const t = el.dataset.tipo;
    if (t === 'bool') return el.checked;
    if (t === 'num') return el.value === '' ? '' : num(el.value);
    return el.value;
  }

  function eventos() {
    document.addEventListener('input', (ev) => {
      const el = ev.target;
      if (el.dataset.bind && el.type !== 'checkbox' && el.tagName !== 'SELECT') {
        fijar(el.dataset.bind, convertir(el));
        if (el.dataset.vistaPrevia != null) {
          const i = num(el.dataset.vistaPrevia);
          const vp = $('#vista-previa-' + i); if (vp) vp.innerHTML = paginaHTML(R.config.paginas[i], R.config);
        }
        marcar();
      }
      if (el.id === 'f-q') { E.filtro.q = el.value; const pos = el.selectionStart; pintar(); const n = $('#f-q'); n.focus(); n.setSelectionRange(pos, pos); }
    });

    document.addEventListener('change', (ev) => {
      const el = ev.target;
      if (el.dataset.bind && (el.type === 'checkbox' || el.tagName === 'SELECT')) {
        fijar(el.dataset.bind, convertir(el));
        if (el.dataset.bind === 'edit.categoria' || el.dataset.bind === 'edit.personalizable') {
          if (el.dataset.bind === 'edit.categoria' && !subsDe(catDe(R.edit.categoria)).some((x) => x.id === R.edit.subcategoria)) R.edit.subcategoria = '';
          $('#pers-edit').innerHTML = persHTML(); $('#sub-edit').innerHTML = subEditHTML(); marcar(); return;
        }
        if (el.dataset.repinta) pintar(); else marcar();
        return;
      }
      if (el.dataset.bind) return;
      if (el.id === 'f-cat') { E.filtro.cat = el.value; E.filtro.sub = ''; pintar(); return; }
      if (el.id === 'f-sub') { E.filtro.sub = el.value; pintar(); return; }
      if (el.id === 'f-estado') { E.filtro.estado = el.value; pintar(); return; }
      if (el.dataset.estadoProd != null) { const p = R.productos[num(el.dataset.estadoProd)]; p.estado = el.value; if (el.value === 'disponible' && p.unidades === 0) p.unidades = 1; pintar(); return; }
      if (el.dataset.pagoEntrega != null) {
        const p = R.config.pagos[num(el.dataset.pagoEntrega)];
        p.entregas = $$('[data-pago-entrega="' + el.dataset.pagoEntrega + '"]:checked').map((c) => c.value);
        marcar(); return;
      }
      if (el.dataset.subirFotos != null) { subirFotos(Array.from(el.files || [])); el.value = ''; return; }
      if (el.dataset.subirImg) { subirImagenSuelta(el); return; }
      if (el.dataset.importar != null) { importar(el); el.value = ''; }
    });

    document.addEventListener('submit', (ev) => {
      if (ev.target.id === 'form-conexion') { ev.preventDefault(); conectar(ev.target); }
      if (ev.target.id === 'modal-caja') ev.preventDefault();
    });

    document.addEventListener('click', (ev) => {
      const t = ev.target.closest('button, a');
      if (!t) return;
      const d = t.dataset;
      if (d.seccion) { ir(d.seccion); return; }
      if (d.ir) { ev.preventDefault(); ir(d.ir); return; }
      if (t.id === 'publicar') { publicar(); return; }
      if (t.id === 'boton-menu') { const l = $('#lateral'); l.classList.toggle('abierto'); t.setAttribute('aria-expanded', String(l.classList.contains('abierto'))); return; }
      if (d.nuevoProducto != null) { abrirProducto(null); return; }
      if (d.editar != null) { abrirProducto(num(d.editar)); return; }
      if (d.guardarProducto != null) { guardarProducto(); return; }
      if (d.modalCerrar != null) { R.edit = null; cerrarModal(); marcar(); return; }
      if (d.visible != null) { const p = R.productos[num(d.visible)]; p.visible = p.visible === false; pintar(); return; }
      if (d.duplicar != null) {
        const p = copia(R.productos[num(d.duplicar)]);
        p.nombre = p.nombre + ' (copia)'; p.id = slug(p.nombre) + '-' + Math.random().toString(36).slice(2, 6); p.creado = new Date().toISOString();
        R.productos.splice(num(d.duplicar) + 1, 0, p); pintar(); toast('Producto duplicado'); return;
      }
      if (d.borrarProd != null) {
        const p = R.productos[num(d.borrarProd)];
        if (confirm('¿Eliminar «' + p.nombre + '»? Si solo se ha vendido, mejor márcalo como Vendido.')) { R.productos.splice(num(d.borrarProd), 1); pintar(); }
        return;
      }
      if (d.fotoQuitar != null) { R.edit.fotos.splice(num(d.fotoQuitar), 1); $('#fotos-edit').innerHTML = fotosHTML(); marcar(); return; }
      if (d.fotoMover != null) {
        const i = num(d.fotoMover), j = i + num(d.dir), f = R.edit.fotos;
        if (j >= 0 && j < f.length) { [f[i], f[j]] = [f[j], f[i]]; $('#fotos-edit').innerHTML = fotosHTML(); }
        return;
      }
      if (d.mover) {
        const arr = obtener(d.mover), i = num(d.i), j = i + num(d.dir);
        if (j >= 0 && j < arr.length) { [arr[i], arr[j]] = [arr[j], arr[i]]; pintar(); }
        return;
      }
      if (d.borrar) {
        const arr = obtener(d.borrar), i = num(d.i);
        if (confirm('¿Eliminar «' + (arr[i].nombre || arr[i].titulo || 'elemento') + '»?')) {
          const quitado = arr.splice(i, 1)[0];
          if (d.borrar === 'config.entregas') (R.config.pagos || []).forEach((p) => { p.entregas = (p.entregas || []).filter((x) => x !== quitado.id); });
          E.paginaAbierta = null; pintar();
        }
        return;
      }
      if (d.borrarCat != null) {
        const c = R.categorias[num(d.borrarCat)], n = R.productos.filter((p) => p.categoria === c.id).length;
        if (n) { alert('La categoría «' + c.nombre + '» tiene ' + n + ' producto(s). Cámbialos de categoría antes de eliminarla, u ocúltala.'); return; }
        if (confirm('¿Eliminar la categoría «' + c.nombre + '»?')) { R.categorias.splice(num(d.borrarCat), 1); pintar(); }
        return;
      }
      if (d.nuevaCat != null) {
        const nombre = prompt('Nombre de la nueva categoría:'); if (!nombre || !nombre.trim()) return;
        let id = slug(nombre); while (catDe(id)) id += '-2';
        R.categorias.push({ id, nombre: nombre.trim(), descripcion: '', icono: 'img/cat-todo.webp', banner: '', visible: true, subcategorias: [], personalizable: false, encargos: { activo: false, titulo: '', texto: '', bases: [] } }); pintar(); return;
      }
      if (d.nuevaSub != null) {
        const c = R.categorias[num(d.nuevaSub)];
        const nombre = prompt('Nombre de la nueva subcategoría de ' + c.nombre + ':'); if (!nombre || !nombre.trim()) return;
        c.subcategorias = c.subcategorias || [];
        let id = slug(nombre); while (c.subcategorias.some((x) => x.id === id)) id += '-2';
        c.subcategorias.push({ id, nombre: nombre.trim(), icono: c.icono || 'img/cat-todo.webp', visible: true }); pintar(); return;
      }
      if (d.borrarSub != null) {
        const c = R.categorias[num(d.borrarSub)], x = c.subcategorias[num(d.j)];
        const n = R.productos.filter((p) => p.categoria === c.id && p.subcategoria === x.id).length;
        if (n) { alert('La subcategoría «' + x.nombre + '» tiene ' + n + ' producto(s). Cámbialos de subcategoría antes de quitarla, u ocúltala.'); return; }
        if (confirm('¿Quitar la subcategoría «' + x.nombre + '»?')) { c.subcategorias.splice(num(d.j), 1); pintar(); }
        return;
      }
      if (d.nuevaBase != null) {
        const c = R.categorias[num(d.nuevaBase)];
        c.encargos = c.encargos || { activo: true, titulo: '', texto: '', bases: [] }; c.encargos.bases = c.encargos.bases || [];
        c.encargos.bases.push({ id: uid('base-'), nombre: 'Nuevo modelo', precio: '', pideTalla: false, descripcion: '' }); pintar(); return;
      }
      if (d.nuevaEntrega != null) {
        R.config.entregas.push({ id: uid('entrega-'), nombre: 'Nueva forma de entrega', descripcion: '', precio: 0, gratisDesde: '', plazo: '', pideDireccion: true, activo: false }); pintar(); return;
      }
      if (d.nuevoPago != null) {
        R.config.pagos.push({ id: uid('pago-'), nombre: 'Nueva forma de pago', descripcion: '', recargo: 0, entregas: [], activo: false }); pintar(); return;
      }
      if (d.nuevaPagina != null) {
        const titulo = prompt('Título de la nueva página:'); if (!titulo || !titulo.trim()) return;
        let id = slug(titulo); while (R.config.paginas.some((p) => p.id === id)) id += '-2';
        R.config.paginas.push({ id, titulo: titulo.trim(), menu: 'pie', visible: true, texto: '## ' + titulo.trim() + '\nEscribe aquí el contenido.' });
        E.paginaAbierta = R.config.paginas.length - 1; pintar(); return;
      }
      if (d.abrirPagina != null) { const i = num(d.abrirPagina); E.paginaAbierta = E.paginaAbierta === i ? null : i; pintar(); return; }
      if (d.olvidar != null) {
        if (confirm('¿Olvidar el token en este dispositivo? Tendrás que pegarlo de nuevo para publicar.')) {
          const c = leerConexion(); delete c.token; localStorage.setItem(CLAVE_GH, JSON.stringify(c));
          E.gh = null; E.lectura = true; ir('conexion');
        }
        return;
      }
      if (d.exportar != null) {
        const f = new Date().toISOString().slice(0, 10);
        descargar('hilos-de-coral-copia-' + f + '.json', JSON.stringify({ version: 1, fecha: new Date().toISOString(), config: R.config, categorias: R.categorias, productos: R.productos }, null, 2));
        return;
      }
      if (d.descargar) { descargar(ARCHIVOS[d.descargar].replace('data/', ''), JSON.stringify(R[d.descargar], null, 2) + '\n'); }
    });

    $('#modal').addEventListener('cancel', () => { R.edit = null; });
    window.addEventListener('hashchange', () => { const s = location.hash.slice(1); if (s && s !== E.seccion && TITULOS[s]) ir(s); });
    window.addEventListener('beforeunload', (ev) => { if (hayCambios()) { ev.preventDefault(); ev.returnValue = ''; } });
  }

  async function iniciar() {
    eventos();
    if (!(await cargar())) return;
    ir(location.hash.slice(1) || (E.lectura ? 'conexion' : 'inicio'));
  }

  iniciar();
})();
