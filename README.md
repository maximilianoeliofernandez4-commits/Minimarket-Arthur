# Gestión Minisuper

App web simple para manejar un **minisúper**: ventas, caja, stock, precios, vencimientos,
gastos y ganancias. No necesita instalación ni servidor: es **un solo archivo**, `index.html`, que podés copiar a cualquier lado.

## Cómo usarla

Pensada para usar en la **PC del mostrador**:

1. Descargá el repositorio (botón verde **Code → Download ZIP**) y descomprimilo en una carpeta fija
   (por ejemplo `Documentos\Minisuper`).
2. Abrí `index.html` con **Chrome o Edge**. Guardala en favoritos o creá un acceso directo en el escritorio.
3. Usá siempre **el mismo navegador y la misma carpeta**: los datos quedan guardados ahí.
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
| 👥 Fiados | **Cuenta corriente por cliente**: al vender con medio de pago *Fiado* elegís el cliente (o lo creás en el momento) y se le suma a la cuenta. Registrás entregas/pagos (si son en efectivo se suman a la caja), ves el saldo y el historial con saldo acumulado, límite de fiado con aviso, carga de deuda manual (ej: saldo anterior) y recordatorio por WhatsApp. |
| 🧾 Ventas | Ventas de un día con total, ganancia y detalle. Se pueden anular (devuelve el stock). |
| 💸 Gastos | Alquiler, luz, sueldos, mercadería, comisiones, etc. Opción de descontarlo del efectivo de la caja. Totales por mes y categoría. |
| ⚙️ Ajustes | Nombre, % de ganancia por defecto, días de aviso de vencimiento, copia de seguridad (JSON) y exportación a Excel (CSV). |

## Atajos de teclado

| Tecla | Acción |
|---|---|
| F2 | Ir a vender / buscar producto |
| F4 | Monto libre |
| F7 | Pago en efectivo (va al campo "Paga con"; Enter cobra) |
| F8 | Fiado (elegir cliente) |
| F9 | Cobrar |
| Esc | Vaciar la venta |

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
  Los cobros de fiados en efectivo entran como ingreso de caja.
- **Fiados:** la venta fiada cuenta como venta (y ganancia) el día que se entrega la mercadería;
  el saldo del cliente = compras fiadas − pagos.
