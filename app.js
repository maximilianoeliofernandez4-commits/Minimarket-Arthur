'use strict';

// ================== DATOS ==================
const CLAVE = 'gestion-negocio-v1';

const estadoInicial = () => ({
  config: { nombre: 'Mi Negocio', margen: 50 },
  productos: [],
  ventas: [],
  gastos: [],
});

let db = cargar();

function cargar() {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (raw) return Object.assign(estadoInicial(), JSON.parse(raw));
  } catch (e) { console.warn('No se pudieron leer los datos', e); }
  return estadoInicial();
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(db));
  } catch (e) {
    toast('⚠️ No se pudo guardar. Descargá una copia de seguridad.');
  }
}

// ================== UTILIDADES ==================
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
const $m = (n) => fmt.format(n || 0);
const pct = (n) => (isFinite(n) ? n.toFixed(1) + '%' : '—');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Fecha local en formato AAAA-MM-DD
function diaKey(d = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
const mesKey = (d = new Date()) => diaKey(d).slice(0, 7);
const fechaLarga = (k) => new Date(k + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2500);
}

// ================== NAVEGACIÓN ==================
$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (!b) return;
  irA(b.dataset.tab);
});

function irA(tab) {
  $$('#tabs button').forEach((x) => x.classList.toggle('active', x.dataset.tab === tab));
  $$('.tab').forEach((x) => x.classList.toggle('active', x.id === 'tab-' + tab));
  render();
  if (tab === 'venta') $('#buscar-venta').focus();
}

// ================== RESUMEN ==================
function rangoPeriodo(p) {
  const hoy = new Date();
  const k = diaKey(hoy);
  if (p === 'hoy') return [k, k];
  if (p === 'ayer') { const a = new Date(hoy); a.setDate(a.getDate() - 1); const ka = diaKey(a); return [ka, ka]; }
  if (p === 'semana') { const a = new Date(hoy); a.setDate(a.getDate() - 6); return [diaKey(a), k]; }
  if (p === 'mes') return [mesKey(hoy) + '-01', k];
  if (p === 'mesAnterior') {
    const ini = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    return [diaKey(ini), diaKey(fin)];
  }
  return ['0000-00-00', '9999-99-99'];
}

function renderResumen() {
  const [desde, hasta] = rangoPeriodo($('#periodo').value);
  const enRango = (k) => k >= desde && k <= hasta;
  const ventas = db.ventas.filter((v) => enRango(diaKey(v.fecha)));
  const gastos = db.gastos.filter((g) => enRango(g.fecha));

  const totalVentas = ventas.reduce((a, v) => a + v.total, 0);
  const totalCosto = ventas.reduce((a, v) => a + v.costoTotal, 0);
  const bruta = totalVentas - totalCosto;
  const totalGastos = gastos.reduce((a, g) => a + g.monto, 0);
  const neta = bruta - totalGastos;
  const valorStock = db.productos.reduce((a, p) => a + Math.max(p.stock, 0) * p.costo, 0);

  $('#r-ventas').textContent = $m(totalVentas);
  $('#r-cant').textContent = `${ventas.length} venta${ventas.length === 1 ? '' : 's'}`;
  $('#r-costo').textContent = $m(totalCosto);
  $('#r-bruta').textContent = $m(bruta);
  $('#r-margen').textContent = totalVentas ? pct((bruta / totalVentas) * 100) + ' sobre lo vendido' : '';
  $('#r-gastos').textContent = $m(totalGastos);
  const rn = $('#r-neta');
  rn.textContent = $m(neta);
  rn.className = neta >= 0 ? 'pos' : 'neg';
  $('#r-stock').textContent = $m(valorStock);

  // Gráfico: últimos 14 días (o el rango si es más corto)
  const dias = [];
  const fin = new Date(hasta === '9999-99-99' ? new Date() : hasta + 'T12:00:00');
  let ini = new Date(desde === '0000-00-00' ? fin : desde + 'T12:00:00');
  const minIni = new Date(fin); minIni.setDate(minIni.getDate() - 30);
  if (desde === '0000-00-00' || ini < minIni) { ini = new Date(fin); ini.setDate(ini.getDate() - 13); }
  if (ini.getTime() === fin.getTime()) ini.setDate(ini.getDate() - 6);
  for (let d = new Date(ini); d <= fin; d.setDate(d.getDate() + 1)) dias.push(diaKey(d));
  const porDia = {};
  db.ventas.forEach((v) => { const k = diaKey(v.fecha); porDia[k] = (porDia[k] || 0) + v.total; });
  const max = Math.max(1, ...dias.map((k) => porDia[k] || 0));
  $('#grafico').innerHTML = dias.map((k) => {
    const v = porDia[k] || 0;
    return `<div class="barra" title="${fechaLarga(k)}: ${$m(v)}"><div style="height:${(v / max) * 100}%"></div><span>${k.slice(8)}</span></div>`;
  }).join('');

  // Stock bajo
  const bajos = db.productos.filter((p) => p.stock <= p.minimo).sort((a, b) => a.stock - b.stock);
  $('#lista-stock-bajo').innerHTML = bajos.length
    ? bajos.map((p) => `<li><span>${esc(p.nombre)}</span><strong class="${p.stock <= 0 ? 'neg' : ''}">${p.stock} u.</strong></li>`).join('')
    : '<li class="vacio">Todo en orden 👍</li>';

  // Más vendidos
  const cont = {};
  ventas.forEach((v) => v.items.forEach((i) => {
    cont[i.nombre] = cont[i.nombre] || { cant: 0, total: 0 };
    cont[i.nombre].cant += i.cantidad;
    cont[i.nombre].total += i.cantidad * i.precio;
  }));
  const top = Object.entries(cont).sort((a, b) => b[1].cant - a[1].cant).slice(0, 8);
  $('#lista-top').innerHTML = top.length
    ? top.map(([n, x]) => `<li><span>${esc(n)}</span><span>${x.cant} u. · ${$m(x.total)}</span></li>`).join('')
    : '<li class="vacio">Sin ventas en el período</li>';

  // Medios de pago
  const pagos = {};
  ventas.forEach((v) => { pagos[v.pago] = (pagos[v.pago] || 0) + v.total; });
  const lp = Object.entries(pagos).sort((a, b) => b[1] - a[1]);
  $('#lista-pagos').innerHTML = lp.length
    ? lp.map(([n, t]) => `<li><span>${esc(n)}</span><strong>${$m(t)}</strong></li>`).join('')
    : '<li class="vacio">Sin ventas en el período</li>';
}
$('#periodo').addEventListener('change', renderResumen);

// ================== VENTA ==================
let carrito = []; // {productoId, cantidad, precio}

function buscarProductos(q) {
  q = q.trim().toLowerCase();
  if (!q) return [];
  return db.productos
    .filter((p) => p.nombre.toLowerCase().includes(q) || (p.codigo || '').toLowerCase() === q || (p.codigo || '').toLowerCase().includes(q))
    .slice(0, 10);
}

function renderResultadosVenta() {
  const res = buscarProductos($('#buscar-venta').value);
  $('#resultados-venta').innerHTML = res.map((p) => `
    <li data-id="${p.id}" class="${p.stock <= 0 ? 'sin-stock' : ''}">
      <span>${esc(p.nombre)} <small class="muted">${esc(p.codigo || '')}</small></span>
      <span>${$m(p.precio)} · <small>${p.stock} en stock</small></span>
    </li>`).join('');
}

$('#buscar-venta').addEventListener('input', renderResultadosVenta);
$('#buscar-venta').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const q = e.target.value.trim().toLowerCase();
  const exacto = db.productos.find((p) => (p.codigo || '').toLowerCase() === q);
  const res = exacto ? [exacto] : buscarProductos(q);
  if (res.length === 1) agregarAlCarrito(res[0].id);
});
$('#resultados-venta').addEventListener('click', (e) => {
  const li = e.target.closest('li[data-id]');
  if (li) agregarAlCarrito(li.dataset.id);
});

function agregarAlCarrito(id) {
  const p = db.productos.find((x) => x.id === id);
  if (!p) return;
  const item = carrito.find((i) => i.productoId === id);
  const enCarrito = item ? item.cantidad : 0;
  if (enCarrito + 1 > p.stock && !confirm(`"${p.nombre}" tiene ${p.stock} en stock. ¿Agregar igual?`)) return;
  if (item) item.cantidad++;
  else carrito.push({ productoId: id, cantidad: 1, precio: p.precio });
  $('#buscar-venta').value = '';
  renderResultadosVenta();
  renderCarrito();
  $('#buscar-venta').focus();
}

function totalesCarrito() {
  let subtotal = 0, costo = 0;
  carrito.forEach((i) => {
    const p = db.productos.find((x) => x.id === i.productoId);
    subtotal += i.cantidad * i.precio;
    costo += i.cantidad * (p ? p.costo : 0);
  });
  const desc = Math.min(num($('#venta-descuento').value), subtotal);
  return { subtotal, costo, desc, total: subtotal - desc };
}

function renderCarrito() {
  $('#carrito').innerHTML = carrito.map((i, idx) => {
    const p = db.productos.find((x) => x.id === i.productoId);
    return `<tr>
      <td>${esc(p ? p.nombre : '(eliminado)')}</td>
      <td><input type="number" min="1" step="1" value="${i.cantidad}" data-idx="${idx}" data-campo="cantidad"></td>
      <td><input type="number" min="0" step="0.01" value="${i.precio}" data-idx="${idx}" data-campo="precio"></td>
      <td>${$m(i.cantidad * i.precio)}</td>
      <td><button class="btn mini" data-quitar="${idx}">✕</button></td>
    </tr>`;
  }).join('');
  $('#carrito-vacio').style.display = carrito.length ? 'none' : '';
  const t = totalesCarrito();
  $('#venta-total').textContent = $m(t.total);
  $('#venta-ganancia').textContent = carrito.length ? `Ganancia estimada: ${$m(t.total - t.costo)}` : '';
}

$('#carrito').addEventListener('change', (e) => {
  const inp = e.target.closest('input[data-idx]');
  if (!inp) return;
  const it = carrito[+inp.dataset.idx];
  if (inp.dataset.campo === 'cantidad') it.cantidad = Math.max(1, Math.round(num(inp.value)));
  else it.precio = Math.max(0, num(inp.value));
  renderCarrito();
});
$('#carrito').addEventListener('click', (e) => {
  const b = e.target.closest('[data-quitar]');
  if (!b) return;
  carrito.splice(+b.dataset.quitar, 1);
  renderCarrito();
});
$('#venta-descuento').addEventListener('input', renderCarrito);
$('#btn-vaciar').addEventListener('click', () => { carrito = []; $('#venta-descuento').value = 0; renderCarrito(); });

$('#btn-cobrar').addEventListener('click', () => {
  if (!carrito.length) return toast('Agregá productos a la venta');
  const t = totalesCarrito();
  const items = carrito.map((i) => {
    const p = db.productos.find((x) => x.id === i.productoId);
    if (p) p.stock -= i.cantidad;
    return { productoId: i.productoId, nombre: p ? p.nombre : '?', cantidad: i.cantidad, precio: i.precio, costo: p ? p.costo : 0 };
  });
  db.ventas.push({
    id: uid(),
    fecha: new Date().toISOString(),
    items,
    descuento: t.desc,
    total: t.total,
    costoTotal: t.costo,
    pago: $('#venta-pago').value,
    nota: $('#venta-nota').value.trim(),
  });
  guardar();
  carrito = [];
  $('#venta-descuento').value = 0;
  $('#venta-nota').value = '';
  renderCarrito();
  toast(`✅ Venta registrada: ${$m(t.total)}`);
});

// ================== PRODUCTOS ==================
let editandoId = null;

function renderProductos() {
  const q = $('#buscar-producto').value.trim().toLowerCase();
  const cat = $('#filtro-categoria').value;
  const soloBajo = $('#solo-bajo').checked;

  const cats = [...new Set(db.productos.map((p) => p.categoria).filter(Boolean))].sort();
  $('#filtro-categoria').innerHTML = '<option value="">Todas las categorías</option>' +
    cats.map((c) => `<option ${c === cat ? 'selected' : ''}>${esc(c)}</option>`).join('');
  $('#categorias-producto').innerHTML = cats.map((c) => `<option value="${esc(c)}">`).join('');

  const lista = db.productos
    .filter((p) => !q || p.nombre.toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q))
    .filter((p) => !cat || p.categoria === cat)
    .filter((p) => !soloBajo || p.stock <= p.minimo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  $('#tabla-productos').innerHTML = lista.map((p) => {
    const margen = p.costo ? ((p.precio - p.costo) / p.costo) * 100 : NaN;
    return `<tr class="${p.stock <= p.minimo ? 'bajo' : ''}">
      <td><strong>${esc(p.nombre)}</strong><br><small class="muted">${esc(p.codigo || '')}</small></td>
      <td>${esc(p.categoria || '')}</td>
      <td>${$m(p.costo)}</td>
      <td>${$m(p.precio)}</td>
      <td>${pct(margen)}<br><small class="muted">${$m(p.precio - p.costo)}</small></td>
      <td><strong>${p.stock}</strong> <small class="muted">(mín ${p.minimo})</small></td>
      <td>
        <button class="btn mini" data-reponer="${p.id}" title="Ingresar mercadería">＋ Stock</button>
        <button class="btn mini" data-editar="${p.id}" title="Editar">✏️</button>
        <button class="btn mini" data-borrar="${p.id}" title="Eliminar">🗑️</button>
      </td>
    </tr>`;
  }).join('');
  $('#productos-vacio').style.display = lista.length ? 'none' : '';
}

['#buscar-producto', '#filtro-categoria', '#solo-bajo'].forEach((s) => $(s).addEventListener('input', renderProductos));

function abrirProducto(p) {
  editandoId = p ? p.id : null;
  $('#modal-producto-titulo').textContent = p ? 'Editar producto' : 'Nuevo producto';
  $('#p-nombre').value = p ? p.nombre : '';
  $('#p-codigo').value = p ? p.codigo || '' : '';
  $('#p-categoria').value = p ? p.categoria || '' : '';
  $('#p-costo').value = p ? p.costo : '';
  $('#p-precio').value = p ? p.precio : '';
  $('#p-margen').value = p && p.costo ? (((p.precio - p.costo) / p.costo) * 100).toFixed(1) : db.config.margen;
  $('#p-stock').value = p ? p.stock : 0;
  $('#p-minimo').value = p ? p.minimo : 2;
  $('#modal-producto').returnValue = '';
  $('#modal-producto').showModal();
  $('#p-nombre').focus();
}

// Costo + margen => precio ; precio => margen
function precioDesdeMargen() {
  const c = num($('#p-costo').value);
  if ($('#p-margen').value !== '' && c) $('#p-precio').value = (c * (1 + num($('#p-margen').value) / 100)).toFixed(2);
}
$('#p-costo').addEventListener('input', precioDesdeMargen);
$('#p-margen').addEventListener('input', precioDesdeMargen);
$('#p-precio').addEventListener('input', () => {
  const c = num($('#p-costo').value);
  if (c) $('#p-margen').value = (((num($('#p-precio').value) - c) / c) * 100).toFixed(1);
});

$('#btn-nuevo-producto').addEventListener('click', () => abrirProducto(null));

$('#modal-producto').addEventListener('close', () => {
  if ($('#modal-producto').returnValue !== 'ok') return;
  const datos = {
    nombre: $('#p-nombre').value.trim(),
    codigo: $('#p-codigo').value.trim(),
    categoria: $('#p-categoria').value.trim(),
    costo: num($('#p-costo').value),
    precio: num($('#p-precio').value),
    stock: Math.round(num($('#p-stock').value)),
    minimo: Math.round(num($('#p-minimo').value)),
  };
  if (!datos.nombre) return;
  if (datos.codigo && db.productos.some((p) => p.codigo === datos.codigo && p.id !== editandoId)) {
    toast('⚠️ Ya existe un producto con ese código');
  }
  if (editandoId) Object.assign(db.productos.find((p) => p.id === editandoId), datos);
  else db.productos.push({ id: uid(), ...datos });
  guardar();
  render();
  toast('Producto guardado');
});

let reponiendoId = null;
$('#tabla-productos').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.editar) abrirProducto(db.productos.find((p) => p.id === b.dataset.editar));
  if (b.dataset.borrar) {
    const p = db.productos.find((x) => x.id === b.dataset.borrar);
    if (confirm(`¿Eliminar "${p.nombre}"? Las ventas pasadas se conservan.`)) {
      db.productos = db.productos.filter((x) => x.id !== p.id);
      guardar(); render();
    }
  }
  if (b.dataset.reponer) {
    const p = db.productos.find((x) => x.id === b.dataset.reponer);
    reponiendoId = p.id;
    $('#stock-producto-nombre').textContent = `${p.nombre} — stock actual: ${p.stock}`;
    $('#s-cantidad').value = '';
    $('#s-costo').value = p.costo;
    $('#s-gasto').checked = false;
    $('#modal-stock').returnValue = '';
    $('#modal-stock').showModal();
    $('#s-cantidad').focus();
  }
});

$('#modal-stock').addEventListener('close', () => {
  if ($('#modal-stock').returnValue !== 'ok') return;
  const p = db.productos.find((x) => x.id === reponiendoId);
  if (!p) return;
  const cant = Math.round(num($('#s-cantidad').value));
  const costo = $('#s-costo').value === '' ? p.costo : num($('#s-costo').value);
  if (costo !== p.costo && p.costo > 0 && confirm(`El costo cambió de ${$m(p.costo)} a ${$m(costo)}. ¿Actualizar el precio de venta manteniendo el mismo margen?`)) {
    p.precio = +(p.precio * (costo / p.costo)).toFixed(2);
  }
  p.costo = costo;
  p.stock += cant;
  if ($('#s-gasto').checked && cant > 0) {
    db.gastos.push({ id: uid(), fecha: diaKey(), categoria: 'Mercadería', descripcion: `${cant} × ${p.nombre}`, monto: cant * costo });
  }
  guardar(); render();
  toast(`Stock de ${p.nombre}: ${p.stock}`);
});

// ================== HISTORIAL DE VENTAS ==================
function renderVentas() {
  const f = $('#fecha-ventas').value || diaKey();
  const ventas = db.ventas.filter((v) => diaKey(v.fecha) === f).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const total = ventas.reduce((a, v) => a + v.total, 0);
  const gan = ventas.reduce((a, v) => a + v.total - v.costoTotal, 0);
  $('#dv-total').textContent = $m(total);
  $('#dv-ganancia').textContent = $m(gan);
  $('#dv-cant').textContent = ventas.length;
  $('#lista-ventas').innerHTML = ventas.length ? ventas.map((v) => `
    <li>
      <div class="venta-cab">
        <span>🕒 ${new Date(v.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} · ${esc(v.pago)}${v.nota ? ' · ' + esc(v.nota) : ''}</span>
        <span><strong>${$m(v.total)}</strong> <button class="btn mini" data-anular="${v.id}" title="Anular venta">Anular</button></span>
      </div>
      <div class="venta-items">${v.items.map((i) => `${i.cantidad} × ${esc(i.nombre)} (${$m(i.precio)})`).join(' · ')}${v.descuento ? ` · Descuento ${$m(v.descuento)}` : ''}</div>
    </li>`).join('') : '<li class="vacio">No hay ventas este día</li>';
}
$('#fecha-ventas').addEventListener('change', renderVentas);
$('#lista-ventas').addEventListener('click', (e) => {
  const b = e.target.closest('[data-anular]');
  if (!b) return;
  const v = db.ventas.find((x) => x.id === b.dataset.anular);
  if (!confirm(`¿Anular la venta de ${$m(v.total)}? El stock se devuelve.`)) return;
  v.items.forEach((i) => { const p = db.productos.find((x) => x.id === i.productoId); if (p) p.stock += i.cantidad; });
  db.ventas = db.ventas.filter((x) => x.id !== v.id);
  guardar(); render();
  toast('Venta anulada');
});

// ================== GASTOS ==================
function renderGastos() {
  const mes = $('#mes-gastos').value || mesKey();
  const gastos = db.gastos.filter((g) => g.fecha.startsWith(mes)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  $('#gastos-total-mes').textContent = $m(gastos.reduce((a, g) => a + g.monto, 0));

  const porCat = {};
  gastos.forEach((g) => { porCat[g.categoria] = (porCat[g.categoria] || 0) + g.monto; });
  $('#gastos-por-cat').innerHTML = Object.entries(porCat).sort((a, b) => b[1] - a[1])
    .map(([c, t]) => `<li><span>${esc(c)}</span><strong>${$m(t)}</strong></li>`).join('') || '<li class="vacio">Sin gastos este mes</li>';

  const cats = [...new Set(['Alquiler', 'Luz', 'Agua', 'Internet', 'Sueldos', 'Mercadería', 'Impuestos', 'Publicidad', ...db.gastos.map((g) => g.categoria)])];
  $('#categorias-gasto').innerHTML = cats.map((c) => `<option value="${esc(c)}">`).join('');

  $('#tabla-gastos').innerHTML = gastos.map((g) => `<tr>
    <td>${fechaLarga(g.fecha)}</td><td>${esc(g.categoria)}</td><td>${esc(g.descripcion)}</td><td>${$m(g.monto)}</td>
    <td><button class="btn mini" data-borrar-gasto="${g.id}">🗑️</button></td></tr>`).join('');
}
$('#mes-gastos').addEventListener('change', renderGastos);
$('#form-gasto').addEventListener('submit', (e) => {
  e.preventDefault();
  db.gastos.push({
    id: uid(),
    fecha: $('#gasto-fecha').value || diaKey(),
    categoria: $('#gasto-categoria').value.trim(),
    descripcion: $('#gasto-desc').value.trim(),
    monto: num($('#gasto-monto').value),
  });
  guardar();
  $('#gasto-desc').value = '';
  $('#gasto-monto').value = '';
  render();
  toast('Gasto agregado');
});
$('#tabla-gastos').addEventListener('click', (e) => {
  const b = e.target.closest('[data-borrar-gasto]');
  if (!b || !confirm('¿Eliminar este gasto?')) return;
  db.gastos = db.gastos.filter((g) => g.id !== b.dataset.borrarGasto);
  guardar(); render();
});

// ================== AJUSTES ==================
$('#form-ajustes').addEventListener('submit', (e) => {
  e.preventDefault();
  db.config.nombre = $('#aj-nombre').value.trim() || 'Mi Negocio';
  db.config.margen = num($('#aj-margen').value);
  guardar(); render();
  toast('Ajustes guardados');
});

function descargar(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$('#btn-exportar').addEventListener('click', () => {
  descargar(`copia-${diaKey()}.json`, JSON.stringify(db, null, 2), 'application/json');
});

$('#input-importar').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const datos = JSON.parse(await f.text());
    if (!Array.isArray(datos.productos) || !Array.isArray(datos.ventas)) throw new Error('formato');
    if (!confirm('Esto reemplaza todos los datos actuales por los de la copia. ¿Continuar?')) return;
    db = Object.assign(estadoInicial(), datos);
    guardar(); render();
    toast('Copia importada');
  } catch {
    toast('⚠️ El archivo no es una copia válida');
  } finally {
    e.target.value = '';
  }
});

function csv(filas) {
  const c = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return '﻿' + filas.map((f) => f.map(c).join(';')).join('\n');
}
$$('[data-csv]').forEach((b) => b.addEventListener('click', () => {
  const t = b.dataset.csv;
  let filas;
  if (t === 'productos') {
    filas = [['Nombre', 'Código', 'Categoría', 'Costo', 'Precio', 'Stock', 'Stock mínimo'],
      ...db.productos.map((p) => [p.nombre, p.codigo, p.categoria, p.costo, p.precio, p.stock, p.minimo])];
  } else if (t === 'ventas') {
    filas = [['Fecha', 'Hora', 'Producto', 'Cantidad', 'Precio unit.', 'Costo unit.', 'Medio de pago', 'Descuento venta', 'Total venta', 'Nota']];
    db.ventas.forEach((v) => v.items.forEach((i, idx) => filas.push([
      diaKey(v.fecha), new Date(v.fecha).toLocaleTimeString('es-AR'), i.nombre, i.cantidad, i.precio, i.costo, v.pago,
      idx === 0 ? v.descuento : '', idx === 0 ? v.total : '', v.nota,
    ])));
  } else {
    filas = [['Fecha', 'Categoría', 'Descripción', 'Monto'], ...db.gastos.map((g) => [g.fecha, g.categoria, g.descripcion, g.monto])];
  }
  descargar(`${t}-${diaKey()}.csv`, csv(filas), 'text/csv;charset=utf-8');
}));

$('#btn-borrar-todo').addEventListener('click', () => {
  if (!confirm('¿Borrar TODOS los productos, ventas y gastos? Esto no se puede deshacer.')) return;
  if (prompt('Escribí BORRAR para confirmar') !== 'BORRAR') return;
  db = estadoInicial();
  guardar(); render();
  toast('Datos borrados');
});

// ================== RENDER GENERAL ==================
function render() {
  document.title = db.config.nombre;
  $('#nombre-negocio').textContent = db.config.nombre;
  $('#aj-nombre').value = db.config.nombre;
  $('#aj-margen').value = db.config.margen;
  renderResumen();
  renderProductos();
  renderCarrito();
  renderVentas();
  renderGastos();
}

$('#fecha-hoy').textContent = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
$('#fecha-ventas').value = diaKey();
$('#gasto-fecha').value = diaKey();
$('#mes-gastos').value = mesKey();
render();
