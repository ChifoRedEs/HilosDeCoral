# Cómo añadir un juego

1. Copia `js/games/_plantilla` a `js/games/<id>` (por ejemplo `conecta4`).
2. En `index.js` exporta `mount`, `unmount`, `validar`, `migrarV1`, `resumen` (la plantilla explica cada una y la `api` que recibes).
3. Da de alta el juego en `js/registry.js` (id, nombre, icono, color, categoría, descripción y el `import()`), y quítalo de `PROXIMAMENTE`.
4. Pon la lógica sin DOM en `reglas.js` (o `generador.js`, `ia.js`) para poder probarla con Node; añade pruebas en `tests/motores.mjs`.
5. Estilos del juego en `<id>.css`, cargados con `await api.css(new URL('./<id>.css', import.meta.url))`. Usa las variables de `base.css` (`--ink`, `--card`, `--blue`…) para que funcione el tema oscuro.
6. Ejecuta `node tests/motores.mjs` y `python tools/generar_sw.py`.

## Buenas prácticas del proyecto
- Guarda tras cada cambio con `api.guardar(...)`; `validar` debe rechazar cualquier dato raro (usa `Object.hasOwn`, comprueba tipos y rangos).
- No reescribas todo el `innerHTML` en cada acción: reutiliza los elementos para conservar el foco del teclado.
- Confirma (`api.confirmar`) antes de descartar una partida con progreso.
- Casillas tocables ≥ 44 px cuando sea posible, `aria-label` en los controles y `touch-action: manipulation`.
- Limpia temporizadores y listeners en `unmount`.
- Para IA de tablero usa `core/ia/minimax.js`; para cartas, `core/cartas.js` + `css/cartas.css`.

## Juegos de dos jugadores por turnos (CPU o persona)
Si tu juego es de tablero y por turnos (Reversi, Cuatro en línea, Batalla Naval con dos jugadores…), no escribas el controlador: usa `core/duelo.js`.
Mira `js/games/tresenraya/` y `js/games/conecta4/` como modelo. Solo aportas:
- `reglas.js`: `VARIANTES`, `estadoInicial`, `jugadas`, `aplicar`, `validarEstado`, `ia` (con `core/ia/minimax.js`) y `reglasHTML`. Sin DOM, así se prueba con Node.
- `index.js`: la vista (`montar` / `pintar`) y la llamada `crearDuelo({...})`.
Con eso tienes gratis: varios tableros, contra CPU (3 niveles) o 2 jugadores, quién empieza, marcador, deshacer, pista, estadísticas y guardado.

## Apariencia personalizable
Cualquier juego puede ofrecer 🎨 Apariencia con una línea: `asp = api.aspecto(defs, alCambiar)`.
- `defs` = grupos `{ clave, titulo, def, opciones:[{ id, nombre, sw? }] }`. `core/aspectos.js` trae `grupoTablero()` con 4 paletas comunes.
- El valor elegido de cada grupo se escribe como `data-<clave>` en el contenedor del juego (`.juego-<id>`), así que el estilo se hace en CSS: `.juego-miJuego[data-forma="estrella"] ...`. En JS lees `asp.valores.<clave>`.
- Añade en tu menú `{ texto: '🎨 Apariencia', accion: () => asp.abrir() }`. En juegos hechos con `core/duelo.js` basta con pasar `aspecto: [...]` en la definición.

## Teclado emergente para juegos de letras
Si tu juego necesita escribir letras en casillas, no pongas un teclado fijo bajo el tablero: usa `core/teclado.js`.
`const tk = crearTeclado({ filas: ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'], borrar: true, alPulsar: l => …, titulo: '…' })`.
Ábrelo con `tk.abrir()` al tocar una casilla; se arrastra desde su barra y se cierra con ✕. Con `tk.actualizar((letra, boton) => …)` marcas teclas usadas o desactivadas, `tk.titulo(texto)` cambia el rótulo y `tk.destruir()` va en `unmount`. Modelos: Crucigrama, El Ahorcado y Ruleta Millonaria.

## Juegos de cartas: baraja y dorso de imagen
Si el juego usa `core/cartas.js`, añade a su `api.aspecto([...])` `grupoBarajaEs()` (baraja española, `cartaEsHTML`) o `grupoBarajaFr()` (francesa, `cartaHTML`), junto a `grupoMesa()` y `grupoDorso()` (este ya incluye los dorsos de `img/cartas/dorsos`). No hace falta tocar el HTML de las cartas: cada carta lleva `data-k` y el CSS de imagen se genera desde `img/cartas/barajas.json`.

## Solitarios con baraja francesa o española
Klondike, Spider y Carta Blanca usan `grupoBarajaSolitarios()` (clave `barajasol`: Fr 01, Fr 02, Esp 01, Esp 02) y `core/barajasol.js`: el estado de la partida guarda `baraja: 'fr' | 'es'` y los motores leen `de(S)` (rangos, palos, colores, símbolos y `html`). El callback de Apariencia puede devolver `{ volver: { clave: valor } }` para deshacer una elección (p. ej. si el jugador no confirma perder la partida) y `asp.elegir(clave, valor)` / `asp.elegida(clave)` permiten fijarla desde el juego.

## Funciones nuevas de la API (versión con logros y retos)
- `api.reto`: Reto del día. `api.reto.generar(fn)` ejecuta tu generador con una semilla fija por día y juego (mismo tablero para todos); `generarAsync(fn)` si el generador es asíncrono. `api.reto.hecho()`, `api.reto.completar()` (cuenta para los 🏅 logros), `api.reto.fecha()` y `api.reto.texto(fecha)`. Guarda `reto: fecha` con la partida. La tarjeta visual usa las clases `.reto` / `.reto.hecho` de base.css.
- `api.podio`: tabla local de los 10 mejores (arcade). `api.podio.entra(variante, valor, menos)`, `await api.podio.anotar(variante, valor, menos)` (pide el nombre) y `api.podio.html(variante)`. `menos = true` cuando gana el tiempo más bajo.
- `api.pedirTexto(titulo, { valor, max, nota, tipo, placeholder })` → Promise con el texto o `null`. `tipo: 'password'` oculta lo que se escribe; `tipo: 'area'` da un cuadro de varias líneas.
- `api.compartir(texto)`: hoja de compartir del sistema o portapapeles. `api.menu([...])` ya no pinta un botón ⋯ en la cabecera: la entrada cuyo texto empieza por «Reglas», «Reglamento» o «Cómo se juega» sale como botón **📖 Reglas** de la barra inferior (`api.barraHtml()`); «Nueva…», «Apariencia» y «⏸️ Pausa» ya están en esa barra; el resto de entradas (Historial, Pista, Podio…) y «📤 Compartir resultado» (automática) se abren desde **Pausa / Salir → ⋯ Más opciones del juego**.
- `api.modal(titulo, html)` devuelve `{ cuerpo, cerrar }` para añadir eventos al contenido.
- `core/historial.js`: `anotarPartida(api, { res, texto })` + `htmlPartidas(api)` para el historial de partidas; `seguir(H, finDeMano, puntos)` + `htmlTabla(nombres, H.filas)` para la tabla mano a mano.
- `core/ia/remoto.js`: `await enSegundoPlano(urlModulo, 'funcion', [args], funcionLocal)` ejecuta una IA en un Worker (con respaldo en el hilo principal). En `crearDuelo` basta con pasar `iaModulo: new URL('./reglas.js', import.meta.url).href`.
- Hojas de estilo: las de cada juego solo están activas mientras el juego está abierto; las de `/css/` (cartas.css) son comunes.
- Bucles de animación: no leas `api.record()` ni reescribas el HTML del marcador en cada fotograma (léelo una vez y escribe solo si cambia).
- `core/diccionario.js`: diccionario español para juegos de palabras (~590.000 formas sin tildes). `await cargar()` una vez (descarga ~1,5 MB la primera vez y queda guardado sin conexión); después `existe(palabra)`, `formables(letras, { min, max })`, `palabras(n)` y `normalizar(palabra)`. Se regenera con `python tools/generar_diccionario.py`; las palabras que falten se añaden en `tools/diccionario/extra.txt`.
- Palabras base (sin conjugar, con tildes): `await cargarLemas()` y después `lemas('n' | 'v' | 'todos', { min, max })`. Sirven para juegos que muestran palabras (no están ordenadas por frecuencia, así que hay muchas poco corrientes).


## Estilo de marca y menú de partida
Los juegos nuevos deben seguir `docs/MARCA.md`: pantalla de partida con `<p class="note">` + filas `.bar > .lbl + .seg` + barra de acciones (botón principal `.btn.on` seguido de `data-ac="aspecto"` y «Reglas»). No uses colores, radios ni sombras propios para los botones: ya los pone `css/marca.css`.

## Agrupar juegos
Para que dos juegos salgan como una sola ficha en Inicio, añade un grupo a `GRUPOS` en `js/registry.js`:
`{ id: 'parchis-oca', nombre: 'Partxis & Oca', icono: '🎲', color: '#2E9E5B', categoria: 'tablero', descripcion: '…', juegos: ['parchis', 'oca'] }`.
Cada juego conserva su id, su partida guardada y sus estadísticas.

## Juegos en 3D (Three.js)
`js/vendor/three.module.min.js` (Three.js r160, licencia MIT en `js/vendor/three.LICENSE`) es un único archivo sin dependencias. Impórtalo **solo desde el juego que lo necesite** y de forma dinámica (`await import('...')`), para que el resto de la app no lo descargue; el service worker lo guarda al primer uso.

**Módulos comunes (`js/core/`)**
- `escena3d.js`: `crearEscena(contenedor, opciones)` (renderer transparente, luz, sombras, cámara orbital con arrastre/pellizco/rueda, toques con `E.alTocar(ev)` y `E.raycast`, `E.alArrastrar` para que el juego se quede con el arrastre, `E.alFrame`, `E.tween`, `E.camara(modo)`), `botonesCamara(host, E)` (⟳ girar, ⤒ cenital, ⌖ reencuadrar), `hayWebGL()`, `emojiTextura`, `textura`, `lienzo`.
- `mesa3d.js`: tableros cuadrados (Ajedrez y Damas): `crearMesa3D(cont, { n, juego, alTocar(r, c) })` → `pintar({ piezas, ult, sel, dest, jaque, pista, flip })`.
- `mesacartas3d.js`: mesa de póker (Hold'em y Póker cubierto): `crearMesaCartas3D(cont)` → `pintar({ bote, tablero, bots, yo, nCartas, mostrarTablero })`, `alCarta(k)` y `recolor()`.
- `anillo3d.js`: tableros de 40 casillas en anillo (Magnate): `crearVista(cont, { estilo, grupos, titulo, ... })`. Hotel tiene su propia escena (`hotel/vista3d.js`) y respaldo SVG (`hotel/vista2d.js`).

**Vistas propias** (junto al juego): `sokoban/vista3d.js`, `rummy/vista3d.js`, `parchis/vista3d.js`, `oca/vista3d.js`, `flota/vista3d.js`, `billar/vista3d.js`, `ruleta/vista3d.js`. Todas siguen el mismo patrón: la vista **solo dibuja** (recibe el estado y devuelve toques) y el juego conserva sus reglas.

**Cómo se integra en un juego existente (patrón usado en los 9 juegos)**
1. Grupo de Apariencia `{ clave: 'vista', titulo: 'Vista del tablero', icono: '🧊', def: '2d', opciones: [{ id: '3d', nombre: '🧊 3D' }, { id: '2d', nombre: '🔲 2D clásica' }] }`.
2. En `mount`: `hay3d = (await import('../../core/escena3d.js')).hayWebGL()` y `quiere3D = () => hay3d && !forzar2d && asp.valores.vista === '3d'`.
3. Un contenedor `<div class="e3d" id="…">` (estilos en `css/marca.css`) con el canvas dentro; el «Fondo de Tablero» (`grupoFondo('#id')`) se ve detrás porque el canvas es transparente.
4. `activar3D()/iniciar3D()` asíncrono con un `token` para ignorar respuestas tardías; si falla (sin WebGL, error), `forzar2d = true` y se vuelve a montar la vista 2D de siempre.
5. Al cambiar «Vista» en Apariencia se vuelve a montar la pantalla; al cambiar colores solo se recolorea.
6. `unmount()` y cualquier pantalla que sustituya el contenedor llaman a `destruir()` (libera geometrías, texturas y el contexto WebGL).

**Buenas prácticas**: renderizar solo cuando algo cambia (bandera «sucio»); animaciones con promesas y temporizador de respaldo; `hidden` necesita CSS explícito si el elemento tiene `display:grid/flex` (`.xxx[hidden]{display:none}`); los colores se leen de variables CSS con `getComputedStyle` **con el elemento ya dentro del DOM**; ejecutar `python3 tools/generar_sw.py` tras añadir ficheros.


## Barra de partida (botones genéricos)

Todo juego debe ofrecer, bajo el tablero y durante la partida, la barra unificada **Nuevo panel/Nueva partida · Configurar partida · Apariencia · Pausa/Salir**. No pongas esos botones a mano ni barras de nivel arriba: declara la barra en `mount` y añade `${api.barraHtml()}` al final de la plantilla de partida.

```js
api.barra({
  nueva: () => empezar(),                    // botón 1 (la etiqueta es «Nuevo panel» en Lógica/Palabras y «Nueva partida» en el resto; `etiqueta` la cambia)
  salir: () => { pausar(); location.hash = '#/cat/<categoría>'; },   // «Sí» al preguntar «¿Salir de la partida?»: SIEMPRE a la pantalla de su categoría (nunca a la de creación)
  crono: () => crono,                        // opcional: Cronometro que la app pausa y reanuda sola
  pausar: () => {}, reanudar: origen => {},  // opcional: para bucles propios (origen 'salir' = pulsó «No»)
  config: {
    valores: () => ({ nivel, tam }),                         // valores actuales
    grupos: v => [{ clave: 'nivel', titulo: 'Nivel', opciones: [['facil', 'Fácil'], ['dificil', 'Difícil']], visible: true }],
    alCambiar: (v, clave) => {},                             // opcional: dependencias entre grupos
    aplicar: v => { /* guarda y crea una partida nueva */ },
  },
});
```

Los botones propios de cada juego (Pista, Deshacer, Reiniciar…) siguen en su fila habitual. La Apariencia se define con `api.aspecto(...)`: se muestra siempre como acordeón. Usa `grupoFondo` (**Tapete**) en todos los juegos y `grupoPantalla` (**Fondo de Pantalla**) solo en Arcade y Ahorcado.


## Celebración al ganar

No hace falta código extra: cuando tu juego anota el final con `api.registrar({ res: 'victoria', ... })`, la app muestra sola la ventana de celebración (mensaje y animación al azar + botón «Nueva partida», que llama al `nueva` de `api.barra`). Si el juego acaba con ganador pero no puntúa (p. ej. 2 jugadores sin CPU), llama a `api.victoria()`. El usuario puede desactivarla en Ajustes → Victorias.

Las animaciones están en `img/victoria/*.webp` y se declaran en `ANIMACIONES` de `js/core/victoria.js` (imagen, fondo de la ventana y efecto opcional a pantalla completa: confeti o lluvia de emojis). Para añadir una: copia el .webp (animado, con transparencia si quieres) y añade una línea.

## Bancos de imágenes (Match-Up)
Las imágenes viven en `img/memorama/<tema>/<id>.webp` con un `nombres.json` (`{id: "Nombre"}`) por tema. Tras añadir/quitar imágenes o un tema nuevo (añádelo al dict `TEMAS` del script) ejecuta `python3 tools/generar_memorama.py`, que regenera `js/games/memorama/bancos.js`.

## Apariencia de las fichas (js/core/fichas.js)
Color (más de 45), textura (8), forma (5) y tamaño de las piezas, común a varios juegos. Todo es «Original» por defecto, así que el juego no cambia hasta que el jugador elige algo.
1. En `api.aspecto([...])` añade `...gruposFichas({ titulo: 'Cajas', icono: '📦', formas: true, tamano: true })` (se pueden quitar `formas`, `tamano`, `textura` o `color`, o limitar `tamano: ['pequeno','normal']`). Claves resultantes: `fcolor`, `ftex`, `fforma`, `ftam`.
2. Lee la elección con `const est = estilo(asp.valores)` → `{ hex|null, tex|null, forma|null, esc, hay, clave }` (`clave` sirve para invalidar cachés).
3. Según cómo se dibuje la pieza:
   - **HTML/CSS**: carga `css/fichas.css` (`api.css(new URL('../../../css/fichas.css', import.meta.url))`), pon la clase `.fx` en la pieza (o `.fxb` si el dibujo está en su `::before`) y llama a `aplicarVars(elemento, est)`; el color llega en `--fx-c` / `--fx-c2`. Si la textura tapa el color de fondo, añade `background-color` en el CSS del juego.
   - **Canvas 2D**: `spriteFicha(colorBase, est, w, h, radio)` devuelve un lienzo con color, textura y forma (con caché) para `drawImage`; `variantes(est.hex, n)` reparte un color en n tonos si las piezas deben distinguirse. Para terrenos pintados píxel a píxel: `pixelTextura(est.tex, x, y)`.
   - **Three.js**: `geoCaja(T, w, h, d, est.forma)` (caja redondeada/biselada con UV) y `capaTextura(ctx, 0, 0, w, h, est.tex)` sobre el lienzo del mapa; `est.esc` escala la pieza.
Opciones útiles: `color:false` (si las piezas necesitan sus colores para jugar: Encajados, Deslizadas, Bloques, Rompe-Ladrillos) y `pocos:true` (paleta de 18 colores, solo muestras sin nombre: Guerra de Orugas; Dominó usa su propia lista). Juegos que ya lo usan: Encajados, Deslizadas, Bloques, Rompe-Ladrillos, Guerra de Orugas (terreno), Ajedrez, Damas, 3 en raya, Cuatro en Línea, Partxis, Oca, Rummy, Magnate, Hotel y Batalla Naval. Los juegos de dos bandos o varios jugadores usan `lados:[…]` (un color por bando) y sobrescriben sus propias variables CSS o el color que pasan a la vista 3D (ver `damas`, `parchis`, `hotel`).

## Caras de «¿Qué cara tienes?» (avatares)
`js/games/quecara/avatar.js` compone una cara como un SVG a partir de piezas por capas (`piezas.js`, generado con `python tools/generar_piezas.py` desde `tools/avatares/<pieza>/<forma>.svg`; el marcador `$fillColor` se sustituye por el color). Una cara es un objeto pequeño (`nm, sx, pi, pe, pc, …`); `caraValida(f)` la normaliza, `svgDe(f)` devuelve el SVG (con ids únicos) y `generarCaras(n, semilla, vectorDe)` crea un tablero repartido y repetible. Para añadir una pieza: dibuja el SVG en `tools/avatares/<pieza>/` (coordenadas absolutas de la cara, 4 px de contorno negro), añade la forma al catálogo de `avatar.js` y, si se puede preguntar por ella, una pregunta en `preguntas.js`. Las 30 caras por defecto se regeneran con `node tools/generar_caras_quecara.mjs`. Crédito obligatorio (licencia MIT): Vue Color Avatar, de LeoKu.

## Dado 3D común (`core/dado3d.js`)
`const D = await crearDado3D(contenedor, { n: 1|2, alClic, etiqueta })` pinta un lienzo con 1 o 2 dados; el propio dado es el botón de tirar (no pongas un botón «Tirar»). `D.activar(bool, 'Toca el dado')` lo marca como pulsable, `await D.tirar([v1, v2], ms)` lo anima hasta el valor ya decidido por el motor, `D.poner(vals|null)` muestra valores sin animar, `D.color('#hex')` tiñe el dado y `D.estilo(asp.valores)` aplica la apariencia (añade `...grupoDado()` al `api.aspecto([...])` del juego y llama a `D.estilo` al crear el dado y en la función de cambio de aspecto), `D.destruir()` lo libera (llámalo en `unmount` y al reconstruir la pantalla). Sin WebGL usa un dado plano HTML. Contenedor: `<div class="dadozona">` (estilos en `css/marca.css`). Lo usan Partxis, Oca, Magnate Urbano y Hotel.
Si `api.barra({config})` lleva `pantalla: () => …`, «Configurar partida» abre esa pantalla (p. ej. la inicial del juego) en vez de la hoja genérica.

## Apariencia: agrupar secciones
En un grupo de `api.aspecto([...])`: `tt: true` → el grupo entra en el desplegable único «Tapete y Tablero» (marca así el tapete —`grupoFondo`/`grupoMesa`— y el color del tablero); `junto: 'clave'` → se une como subgrupo al desplegable de otro grupo (p. ej. «Estilo de Edificios»); `etiqueta` = rótulo del subgrupo; `oculto: true` = no aparece (el valor se sigue guardando). `gruposFichas` agrupa solas Color (con leyenda por jugador) y «Estilos de Fichas» (textura/forma/tamaño); un grupo propio de forma se une con `enEstilos: true`. Los grupos `vista` no se muestran: el cambio 2D/3D es el botón flotante de la esquina.

## Juegos con física 2D (Matter.js)
`js/vendor/matter.min.js` (v0.20.0, MIT, licencia en `matter.LICENSE`) es un script UMD: se carga solo cuando se entra en el juego, con una etiqueta `<script>` dinámica (ver `cargarMatter()` en `games/catapulta/index.js`) y queda en `window.Matter`. El motor del juego (`motor.js`) no toca el DOM y recibe Matter como parámetro, así que `tests/catapulta.mjs` lo ejecuta en Node. Claves de Catapulta: paso fijo de 1/60 s con acumulador, `frictionAir: 0` en el pájaro para poder predecir la trayectoria, daño por impacto = `max(0, velocidad relativa − 4) · masa reducida · 6` (ignorado los primeros 70 pasos, mientras la estructura se asienta) y niveles como datos en `niveles.js`.

### Catapulta: avatares, imágenes y menú flotante con control central
- **Imágenes** (`img/catapulta/`): avatares `av-<id>-1…4` (normal, divisible, acelerador, bomba), enemigos `en-<id>`, miniaturas `mosaico-<id>`, texturas `mat-*` (repetibles), efectos `fx-*`, `lanzador-base`/`lanzador-brazo`. Los originales son JPG con fondo magenta liso: `python tools/procesar_catapulta.py CARPETA` quita el fondo (con transparencia suave) y deja los WebP; los fondos `fondo-*` van a `img/cartas/fondos/` y `python tools/generar_barajas.py` los da de alta en 🎨 Apariencia de los juegos de Arcade.
- **Avatares** (`avatares.js`): para añadir una temática basta una entrada en `AVATARES` y sus imágenes: 4 proyectiles (`av-<id>-1…4`), el enemigo (`en-<id>`) y, para el divisible, la hoja `av-<id>-2-div` (3 piezas en fila, 1536×512) que el script corta en `av-<id>-2-div-1…3`; son las que se ven al activar la habilidad. El grupo `Personaje (enemigos)` puede elegir otro distinto del avatar.
- **Menú flotante con control central**: `crearFlotante(api, { ancla, raiz, centro: true, botones: [{ id, texto, lado: 'izq' | 'der' }], alClic })` deja un hueco `fl.centro` donde el juego pinta su propio control (en Catapulta, el círculo táctil: el pointerdown del control hace `stopPropagation()` para que no arrastre el menú).
- **Nuevo grupo de Apariencia con miniaturas cuadradas**: `forma: 'cuadrada'` (CSS en `catapulta.css`).
- Los escenarios nuevos se ofrecen también en Guerra de Orugas mediante `ESCENARIOS_GUERRA` (Quantix mantiene los 8 originales).

