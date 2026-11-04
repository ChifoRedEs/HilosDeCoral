# Hilos de Coral

Tienda online de artesanía hippie (textil, cerámica y bisutería). Los pedidos se envían por WhatsApp y el pago es por Bizum o contra reembolso. Incluye un **panel de administración** para gestionar productos, categorías, entregas, pagos y textos sin tocar código.

- **Tienda:** `https://TU-USUARIO.github.io/HilosDeCoral/`
- **Panel admin:** `https://TU-USUARIO.github.io/HilosDeCoral/admin/`

---

## 1. Publicar la tienda en GitHub Pages (una sola vez)

1. Entra en GitHub y crea un repositorio nuevo llamado **HilosDeCoral**. Tiene que ser **público** para usar GitHub Pages gratis.
2. En el repositorio vacío pulsa **"uploading an existing file"**. Arrastra **todo el contenido** de la carpeta `HilosDeCoral` (las carpetas `admin`, `css`, `data`, `img`, `js` y los archivos `index.html`, `manifest.webmanifest`, `README.md`…). Pulsa **Commit changes**.
3. Ve a **Settings → Pages**. En *Build and deployment* elige **Deploy from a branch**, rama **main** y carpeta **/ (root)**. Pulsa **Save**.
4. En 1 o 2 minutos la tienda estará en `https://TU-USUARIO.github.io/HilosDeCoral/`.

## 2. Conectar el panel admin (una vez por dispositivo)

1. Crea un token en GitHub: **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
   - *Repository access:* **Only select repositories** → `HilosDeCoral`.
   - *Permissions → Repository permissions → Contents:* **Read and write**.
   - Pulsa *Generate token* y copia el token (empieza por `github_pat_`).
2. Abre `https://TU-USUARIO.github.io/HilosDeCoral/admin/`. Ve a **Conexión con GitHub**, pega el token y pulsa **Guardar y conectar**. El usuario y el repositorio se detectan solos.

El token solo se guarda en el navegador de ese dispositivo. No lo compartas: quien lo tenga puede modificar la tienda.

## 3. Primeros pasos en el panel

1. **Datos de la tienda:** el número de **WhatsApp** donde llegan los pedidos, Instagram, correo y los datos legales (titular, NIF y domicilio).
2. **Entregas y envíos:** precios, envío gratis a partir de cierto importe, plazos y zonas.
3. **Formas de pago:** Bizum, contra reembolso (con recargo) o efectivo en mano, y con qué entregas se ofrece cada uno.
4. **Páginas y políticas:** revisa los textos de envíos, devoluciones, garantía, aviso legal, privacidad y "Sobre mí".
5. **Productos:** añade tus piezas con fotos. Las fotos se reducen y optimizan solas.
6. Pulsa **Guardar y publicar**. Todos los cambios se suben en un único paso y la tienda se actualiza en 1 o 2 minutos.

## Cómo funciona un pedido

1. El cliente añade piezas a la cesta y pulsa **Tramitar pedido**.
2. Rellena sus datos y elige la entrega y el pago. La web calcula el total (envío gratis, recargos…).
3. Al pulsar **Enviar pedido por WhatsApp** se abre WhatsApp con el pedido ya escrito y una referencia (`HC-AAMMDD-XXXX`).
4. Tú confirmas por WhatsApp y, cuando se reserve o venda, cambias el estado de la pieza en el panel (**Disponible / Reservado / Vendido**).

## Estructura

```
index.html            Tienda
admin/index.html      Panel de administración
css/                  Estilos (tienda.css, admin.css)
js/comun.js           Funciones compartidas
js/tienda.js          Lógica de la tienda (catálogo, cesta, pedido)
js/admin.js           Lógica del panel
js/github.js          Publicación en GitHub (un commit por publicación)
data/config.json      Datos de la tienda, entregas, pagos y páginas
data/categorias.json  Categorías
data/productos.json   Productos
img/                  Ilustraciones, iconos y logos
img/productos/        Fotos de productos (las sube el panel)
```

## Sin conexión (publicación manual)

En **Copias de seguridad** puedes descargar `productos.json`, `categorias.json` o `config.json` y subirlos a mano a la carpeta `data/` del repositorio. También puedes descargar una copia completa y restaurarla cuando quieras.

> Los textos legales son una plantilla orientativa. Revísalos y adáptalos a tu caso; si tienes dudas, consulta a un profesional.

## Historial de versiones

La versión aparece en el pie de la tienda (sin fecha) y en el menú del panel. Está definida en `js/comun.js` (`VERSION` y `FECHA_VERSION`).

- **1.10.2** · 04/11/2026: el enlace de correo del pie se llama «Correo».
- **1.10.1** · 01/11/2026: iconos de Instagram, WhatsApp y correo en el pie. El correo muestra solo el nombre (sin @dominio), con el enlace completo.
- **1.10.0** · 01/11/2026: acabados a elegir por producto (gancho plateado o dorado, cadena o cordón…), con su foto y suplemento opcional, editables desde el panel. Catálogo de Cerámica: 10 pendientes, 12 colgantes y 6 piezas de vajilla.
- **1.9.0** · 31/10/2026: dirección de entrega con desplegables de comunidad autónoma, provincia y municipio, buscador de calles (o calle libre si no aparece) y comprobación de la dirección: el código postal debe ser de la provincia y la distancia se vuelve a medir con la dirección real, ajustando la entrega si cambia de tramo. Nuevos iconos de la app con fondo azul. Pie sin fecha.
- **1.8.0** · 31/10/2026: entregas según la distancia. El cliente indica su ubicación o código postal y ve solo sus opciones: entrega en mano (hasta 10 km, Bizum o +2 € en efectivo) y entrega en domicilio (hasta 25 km, 5,40 €; más de 25 km, 7,90 €; solo Bizum). Punto de referencia y tramos editables en el panel.
- **1.7.3** · 31/10/2026: logo más grande dentro del icono de la app (un 80 % menos de espacio libre en el disco interior).
- **1.7.2** · 31/10/2026: icono de la app más pequeño, sobre disco crema con anillo blanco exterior (y fondo azul marino en los iconos recortables).
- **1.7.1** · 31/10/2026: el logo completo de Hilos de Coral como icono al instalar la tienda o crear el acceso directo (Android e iPhone).
- **1.7.0** · 31/10/2026: la entrega en mano exige comprobar que el cliente está dentro del radio (por ubicación o código postal), configurable desde el panel. Recargo de 2 € por pagar en la entrega y aviso «Ahorras 2 €» con Bizum.
- **1.6.1** · 31/10/2026: icono propio para el panel admin (favicon, acceso directo en el móvil y manifiesto «Admin HC»).
- **1.6.0** · 31/10/2026: selector de talla de bebé (de 1 a 24 meses) en bodies y camisetas, con guía de tallas. Se activa por subcategoría desde el panel.
- **1.5.1** · 31/10/2026: todas las fichas con el mismo diseño y el botón «Añadir». En Textil, un botón «Personalizar» abre una ventana emergente con las opciones y la vista previa.
- **1.5.0** · 31/10/2026: todos los productos textiles son personalizables con texto. El cliente elige tipo de letra (5), tamaño, color y posición, y lo ve en directo sobre la foto y en una vista previa grande.
- **1.4.1** · 31/10/2026: imágenes propias para las 12 subcategorías.
- **1.4.0** · 31/10/2026: subcategorías (Textil: totebags, bodies, baberos y camisetas; Cerámica: pendientes, colgantes, broches y vajilla; Bisutería: pulseras, anillos, pendientes y colgantes). Nueva navegación: tres categorías con desplegable de subcategorías y novedades en la portada.
- **1.3.0** · 31/10/2026: versión en el pie de página y en el panel. Productos sin precio como "Consultar precio". Archivos con `?v=` para que el navegador cargue siempre la última versión.
- **1.2.0** · 31/10/2026: productos personalizables (nombre o texto) y encargo de diseño propio del cliente, activables por categoría (de momento, solo Textil).
- **1.1.0** · 31/10/2026: corregido el borde punteado de las ventanas (Cómo comprar, Envíos, Cambios…).
- **1.0.0** · 31/10/2026: primera versión de la tienda y del panel admin.
