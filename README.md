# Gestión Minisuper

App web simple para manejar un **minisúper**: ventas, caja, stock, precios, vencimientos,
gastos y ganancias. No necesita instalación ni servidor: son 3 archivos (`index.html`, `styles.css`, `app.js`).

## Cómo usarla

- **En la computadora:** abrí `index.html` con el navegador (Chrome, Edge, Firefox).
- **En el celular / desde cualquier lado:** activá GitHub Pages en el repositorio
  (Settings → Pages → Branch, carpeta `/root`) y entrá al link que te da.
  Desde el celular podés usar "Agregar a pantalla de inicio" para tenerla como app.
- **Lector de código de barras:** cualquier lector USB funciona. En "Vender" escaneás y el
  producto se agrega solo. Si el código no está cargado, te ofrece cargarlo en el momento.

El nombre del negocio se cambia en **⚙️ Ajustes**.

## Secciones

| Pestaña | Qué hace |
|---|---|
| 📊 Resumen | Ventas, ticket promedio, costo, ganancia bruta, gastos y **ganancia neta** por período. Gráfico de ventas por día, stock bajo, **vencimientos**, más vendidos y medios de pago. |
| 🛒 Vender | Escaneo o búsqueda por nombre. Los productos **por kilo** piden el peso (en kg o gramos). **Monto libre** para cobrar algo no cargado. Medio de pago (incluye Fiado), **cálculo de vuelto**, descuento. Descuenta stock al cobrar. |
| 💵 Caja | Apertura con efectivo inicial, retiros/ingresos (pago a proveedores, etc.) y **cierre con arqueo**: te dice si sobra o falta plata. Historial de cierres. |
| 📦 Stock | Productos con código de barras, categoría, proveedor, unidad o kilo, costo, % de ganancia, precio, stock mínimo y vencimiento. **＋ Stock** para ingresar mercadería. **Lista de pedido** por proveedor (copiar o mandar por WhatsApp). **Aumentar precios** por % a todo, una categoría o un proveedor, con redondeo. |
| 🧾 Ventas | Ventas de un día con total, ganancia y detalle. Se pueden anular (devuelve el stock). |
| 💸 Gastos | Alquiler, luz, sueldos, mercadería, comisiones, etc. Opción de descontarlo del efectivo de la caja. Totales por mes y categoría. |
| ⚙️ Ajustes | Nombre, % de ganancia por defecto, días de aviso de vencimiento, copia de seguridad (JSON) y exportación a Excel (CSV). |

## Importante: dónde se guardan los datos

Los datos quedan guardados **en el navegador del dispositivo** donde usás la app.
Si usás otro celular/computadora, o borrás los datos del navegador, no van a aparecer.
Por eso: **descargá una copia de seguridad seguido** (Ajustes → Descargar copia) y
usá "Importar copia" para pasarla a otro dispositivo.

## Cálculos

- **Ganancia bruta** = ventas − costo de lo vendido (con el costo del momento de la venta).
- **Ganancia neta** = ganancia bruta − gastos del período.
- **% de ganancia** (en productos) = (precio − costo) / costo.
- **Monto libre:** como no se sabe el costo, se estima con el % de ganancia por defecto.
- **Caja:** efectivo esperado = inicial + ventas en efectivo + ingresos − retiros.
