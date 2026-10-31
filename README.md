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
