# Gestión del Negocio

App web simple para controlar **stock, precios, ganancias, gastos y ventas diarias**.
No necesita instalación ni servidor: son 3 archivos (`index.html`, `styles.css`, `app.js`).

## Cómo usarla

- **En la computadora:** abrí `index.html` con el navegador (Chrome, Edge, Firefox).
- **En el celular / desde cualquier lado:** activá GitHub Pages en el repositorio
  (Settings → Pages → Branch: `main`, carpeta `/root`) y entrá al link que te da.
  Desde el celular podés usar "Agregar a pantalla de inicio" para tenerla como app.

El nombre del negocio se cambia en **⚙️ Ajustes**.

## Secciones

| Pestaña | Qué hace |
|---|---|
| 📊 Resumen | Ventas, costo, ganancia bruta, gastos y **ganancia neta** por período (hoy, ayer, 7 días, mes, mes anterior). Gráfico de ventas por día, productos con stock bajo, más vendidos y medios de pago. |
| 🛒 Vender | Buscás productos por nombre o código (sirve con lector de código de barras + Enter), ajustás cantidad/precio, descuento y medio de pago. Al cobrar se descuenta el stock. |
| 📦 Stock | Alta/edición de productos con costo, % de ganancia y precio (se calculan entre sí), stock y stock mínimo. Botón **＋ Stock** para ingresar mercadería (actualiza costo y opcionalmente lo registra como gasto). |
| 🧾 Ventas | Ventas de un día con total, ganancia y detalle. Se pueden anular (devuelve el stock). |
| 💸 Gastos | Alquiler, luz, sueldos, mercadería, etc. Totales por mes y por categoría. |
| ⚙️ Ajustes | Nombre del negocio, % de ganancia por defecto, copia de seguridad (JSON) y exportación a Excel (CSV). |

## Importante: dónde se guardan los datos

Los datos quedan guardados **en el navegador del dispositivo** donde usás la app.
Si usás otro celular/computadora, o borrás los datos del navegador, no van a aparecer.
Por eso: **descargá una copia de seguridad seguido** (Ajustes → Descargar copia) y
usá "Importar copia" para pasarla a otro dispositivo.

## Cálculos

- **Ganancia bruta** = ventas − costo de lo vendido (con el costo del momento de la venta).
- **Ganancia neta** = ganancia bruta − gastos del período.
- **Ganancia s/costo** (en productos) = (precio − costo) / costo.
