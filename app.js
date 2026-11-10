'use strict';

// ================== DATOS ==================
const CLAVE = 'gestion-negocio-v1';

const estadoInicial = () => ({
  config: { nombre: 'Mi Minisuper', margen: 30, diasVencimiento: 7 },
  productos: [],
  ventas: [],
  gastos: [],
  cajas: [],
});

let db = cargar();

function normalizar(d) {
  const x = Object.assign(estadoInicial(), d);
  x.config = Object.assign(estadoInicial().config, d.config || {});
  x.productos.forEach((p) => {
    p.unidad = p.unidad || 'u';
    p.proveedor = p.proveedor || '';
    p.vencimiento = p.vencimiento || '';
  });
  return x;
}

function cargar() {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (raw) return normalizar(JSON.parse(raw));
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
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? 0 : n; };
const r3 = (n) => Math.round(n * 1000) / 1000;
const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
const $m = (n) => fmt.format(n || 0);
const pct = (n) => (isFinite(n) ? n.toFixed(1) + '%' : '—');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtCant = (n, u) => (u === 'kg'
  ? `${r3(n).toLocaleString('es-AR', { maximumFractionDigits: 3 })} kg`
  : `${r3(n).toLocaleString('es-AR')} u.`);
const hora = (iso) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
const porId = (id) => db.productos.find((p) => p.id === id);

// Fecha local en formato AAAA-MM-DD
function diaKey(d = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
const mesKey = (d = new Date()) => diaKey(d).slice(0, 7);
const fechaLarga = (k) => new Date(k + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
const diasHasta = (k) => Math.round((new Date(k + 'T12:00:00') - new Date(diaKey() + 'T12:00:00')) / 86400000);

const CATEGORIAS_SUGERIDAS = ['Almacén', 'Bebidas', 'Lácteos', 'Fiambrería', 'Carnicería', 'Verdulería', 'Panadería',
  'Congelados', 'Limpieza', 'Perfumería', 'Golosinas', 'Cigarrillos', 'Mascotas'];

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 3000);
}

function abrirModal(sel) {
  const m = $(sel);
  m.returnValue = '';
  m.showModal();
}

// ================== NAVEGACIÓN ==================
$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (b) irA(b.dataset.tab);
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
  $('#r-cant').textContent = `${ventas.length} venta${ventas.length === 1 ? '' : 's'}` +
    (ventas.length ? ` · ticket prom. ${$m(totalVentas / ventas.length)}` : '');
  $('#r-costo').textContent = $m(totalCosto);
  $('#r-bruta').textContent = $m(bruta);
  $('#r-margen').textContent = totalVentas ? pct((bruta / totalVentas) * 100) + ' sobre lo vendido' : '';
  $('#r-gastos').textContent = $m(totalGastos);
  const rn = $('#r-neta');
  rn.textContent = $m(neta);
  rn.className = neta >= 0 ? 'pos' : 'neg';
  $('#r-stock').textContent = $m(valorStock);

  // Gráfico de ventas por día
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
    ? bajos.map((p) => `<li><span>${esc(p.nombre)}</span><strong class="${p.stock <= 0 ? 'neg' : ''}">${fmtCant(p.stock, p.unidad)}</strong></li>`).join('')
    : '<li class="vacio">Todo en orden 👍</li>';

  // Vencimientos
  const venc = db.productos
    .filter((p) => p.vencimiento && p.stock > 0 && diasHasta(p.vencimiento) <= db.config.diasVencimiento)
    .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));
  $('#lista-vencimientos').innerHTML = venc.length
    ? venc.map((p) => {
      const d = diasHasta(p.vencimiento);
      const txt = d < 0 ? `venció hace ${-d} día${d === -1 ? '' : 's'}` : d === 0 ? 'vence hoy' : `vence en ${d} día${d === 1 ? '' : 's'}`;
      return `<li><span>${esc(p.nombre)} <small class="muted">(${fmtCant(p.stock, p.unidad)})</small></span><strong class="${d <= 0 ? 'neg' : ''}">${txt}</strong></li>`;
    }).join('')
    : '<li class="vacio">Nada por vencer 👍</li>';

  // Más vendidos
  const cont = {};
  ventas.forEach((v) => v.items.forEach((i) => {
    cont[i.nombre] = cont[i.nombre] || { cant: 0, total: 0, unidad: i.unidad || 'u' };
    cont[i.nombre].cant += i.cantidad;
    cont[i.nombre].total += i.cantidad * i.precio;
  }));
  const top = Object.entries(cont).sort((a, b) => b[1].total - a[1].total).slice(0, 8);
  $('#lista-top').innerHTML = top.length
    ? top.map(([n, x]) => `<li><span>${esc(n)}</span><span>${fmtCant(x.cant, x.unidad)} · ${$m(x.total)}</span></li>`).join('')
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
let carrito = []; // {productoId, nombre, unidad, cantidad, precio, costo}

function buscarProductos(q) {
  q = q.trim().toLowerCase();
  if (!q) return [];
  return db.productos
    .filter((p) => p.nombre.toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q))
    .slice(0, 10);
}

function renderResultadosVenta() {
  const res = buscarProductos($('#buscar-venta').value);
  $('#resultados-venta').innerHTML = res.map((p) => `
    <li data-id="${p.id}" class="${p.stock <= 0 ? 'sin-stock' : ''}">
      <span>${esc(p.nombre)} <small class="muted">${esc(p.codigo || '')}</small></span>
      <span>${$m(p.precio)}${p.unidad === 'kg' ? '/kg' : ''} · <small>${fmtCant(p.stock, p.unidad)}</small></span>
    </li>`).join('');
}

$('#buscar-venta').addEventListener('input', renderResultadosVenta);
$('#buscar-venta').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const texto = e.target.value.trim();
  const q = texto.toLowerCase();
  if (!q) return;
  const exacto = db.productos.find((p) => (p.codigo || '').toLowerCase() === q);
  const res = exacto ? [exacto] : buscarProductos(q);
  if (res.length === 1) return agregarAlCarrito(res[0].id);
  if (!res.length && /^\d{4,}$/.test(texto) && confirm(`El código ${texto} no está cargado. ¿Querés cargar el producto ahora?`)) {
    e.target.value = '';
    renderResultadosVenta();
    abrirProducto(null, { codigo: texto });
  }
});
$('#resultados-venta').addEventListener('click', (e) => {
  const li = e.target.closest('li[data-id]');
  if (li) agregarAlCarrito(li.dataset.id);
});

function pedirPeso(nombre) {
  const r = prompt(`Peso de "${nombre}" en kg (ej: 0,250)\nTambién podés escribirlo en gramos (ej: 250)`);
  if (r === null) return null;
  let kg = num(r);
  if (kg >= 50) kg = kg / 1000; // lo escribieron en gramos
  return kg > 0 ? r3(kg) : null;
}

function agregarAlCarrito(id) {
  const p = porId(id);
  if (!p) return;
  let cantidad = 1;
  if (p.unidad === 'kg') {
    cantidad = pedirPeso(p.nombre);
    if (!cantidad) return;
  }
  const item = p.unidad === 'u' && carrito.find((i) => i.productoId === id);
  const enCarrito = carrito.filter((i) => i.productoId === id).reduce((a, i) => a + i.cantidad, 0);
  if (enCarrito + cantidad > p.stock &&
      !confirm(`"${p.nombre}" tiene ${fmtCant(p.stock, p.unidad)} en stock. ¿Agregar igual?`)) return;
  if (item) item.cantidad++;
  else carrito.push({ productoId: id, nombre: p.nombre, unidad: p.unidad, cantidad, precio: p.precio, costo: p.costo });
  $('#buscar-venta').value = '';
  renderResultadosVenta();
  renderCarrito();
  $('#buscar-venta').focus();
}

$('#btn-monto-libre').addEventListener('click', () => {
  const monto = num(prompt('Monto a cobrar ($)'));
  if (monto <= 0) return;
  const nombre = (prompt('Descripción', 'Varios') || 'Varios').trim();
  // Sin costo conocido: se estima con el % de ganancia por defecto
  const costo = r3(monto / (1 + db.config.margen / 100));
  carrito.push({ productoId: null, nombre, unidad: 'u', cantidad: 1, precio: monto, costo });
  renderCarrito();
  $('#buscar-venta').focus();
});

function totalesCarrito() {
  let subtotal = 0, costo = 0;
  carrito.forEach((i) => { subtotal += i.cantidad * i.precio; costo += i.cantidad * i.costo; });
  const desc = Math.min(num($('#venta-descuento').value), subtotal);
  return { subtotal, costo, desc, total: Math.round((subtotal - desc) * 100) / 100 };
}

function renderCarrito() {
  $('#carrito').innerHTML = carrito.map((i, idx) => `<tr>
      <td>${esc(i.nombre)}</td>
      <td><input type="number" min="0" step="${i.unidad === 'kg' ? '0.001' : '1'}" value="${i.cantidad}" data-idx="${idx}" data-campo="cantidad"> <small class="muted">${i.unidad}</small></td>
      <td><input type="number" min="0" step="0.01" value="${i.precio}" data-idx="${idx}" data-campo="precio"></td>
      <td>${$m(i.cantidad * i.precio)}</td>
      <td><button class="btn mini" data-quitar="${idx}">✕</button></td>
    </tr>`).join('');
  $('#carrito-vacio').style.display = carrito.length ? 'none' : '';
  const t = totalesCarrito();
  $('#venta-total').textContent = $m(t.total);
  $('#venta-ganancia').textContent = carrito.length ? `Ganancia estimada: ${$m(t.total - t.costo)}` : '';
  const efectivo = $('#venta-pago').value === 'Efectivo';
  $('#box-paga-con').style.display = efectivo ? '' : 'none';
  const pagaCon = num($('#venta-paga-con').value);
  const vuelto = pagaCon - t.total;
  $('#venta-vuelto').textContent = efectivo && pagaCon > 0
    ? (vuelto >= 0 ? `Vuelto: ${$m(vuelto)}` : `Faltan ${$m(-vuelto)}`) : '';
  $('#venta-vuelto').className = vuelto >= 0 ? 'vuelto' : 'vuelto neg';
}

$('#carrito').addEventListener('change', (e) => {
  const inp = e.target.closest('input[data-idx]');
  if (!inp) return;
  const it = carrito[+inp.dataset.idx];
  if (inp.dataset.campo === 'cantidad') {
    it.cantidad = it.unidad === 'kg' ? Math.max(0.001, r3(num(inp.value))) : Math.max(1, Math.round(num(inp.value)));
  } else it.precio = Math.max(0, num(inp.value));
  renderCarrito();
});
$('#carrito').addEventListener('click', (e) => {
  const b = e.target.closest('[data-quitar]');
  if (!b) return;
  carrito.splice(+b.dataset.quitar, 1);
  renderCarrito();
});
['#venta-descuento', '#venta-paga-con', '#venta-pago'].forEach((s) => $(s).addEventListener('input', renderCarrito));

function limpiarVenta() {
  carrito = [];
  $('#venta-descuento').value = 0;
  $('#venta-paga-con').value = '';
  $('#venta-nota').value = '';
  renderCarrito();
}
$('#btn-vaciar').addEventListener('click', limpiarVenta);

$('#btn-cobrar').addEventListener('click', () => {
  if (!carrito.length) return toast('Agregá productos a la venta');
  const t = totalesCarrito();
  const pago = $('#venta-pago').value;
  const pagaCon = num($('#venta-paga-con').value);
  if (pago === 'Efectivo' && pagaCon > 0 && pagaCon < t.total &&
      !confirm(`El cliente paga ${$m(pagaCon)} y el total es ${$m(t.total)}. ¿Registrar igual?`)) return;
  carrito.forEach((i) => { const p = porId(i.productoId); if (p) p.stock = r3(p.stock - i.cantidad); });
  db.ventas.push({
    id: uid(),
    fecha: new Date().toISOString(),
    items: carrito.map((i) => ({ ...i })),
    descuento: t.desc,
    total: t.total,
    costoTotal: t.costo,
    pago,
    nota: $('#venta-nota').value.trim(),
  });
  guardar();
  const vuelto = pago === 'Efectivo' && pagaCon > t.total ? ` · Vuelto ${$m(pagaCon - t.total)}` : '';
  limpiarVenta();
  toast(`✅ Venta registrada: ${$m(t.total)}${vuelto}`);
  if (!cajaAbierta()) setTimeout(() => toast('💡 Tip: abrí la caja en la pestaña "Caja" para controlar el efectivo'), 3200);
});

// ================== PRODUCTOS ==================
let editandoId = null;

function valoresUnicos(campo) {
  return [...new Set(db.productos.map((p) => p[campo]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function renderProductos() {
  const q = $('#buscar-producto').value.trim().toLowerCase();
  const cat = $('#filtro-categoria').value;
  const filtro = $('#filtro-estado').value;

  const cats = valoresUnicos('categoria');
  $('#filtro-categoria').innerHTML = '<option value="">Todas las categorías</option>' +
    cats.map((c) => `<option ${c === cat ? 'selected' : ''}>${esc(c)}</option>`).join('');
  $('#categorias-producto').innerHTML = [...new Set([...CATEGORIAS_SUGERIDAS, ...cats])].map((c) => `<option value="${esc(c)}">`).join('');
  $('#proveedores-lista').innerHTML = valoresUnicos('proveedor').map((c) => `<option value="${esc(c)}">`).join('');

  const lista = db.productos
    .filter((p) => !q || p.nombre.toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q) || (p.proveedor || '').toLowerCase().includes(q))
    .filter((p) => !cat || p.categoria === cat)
    .filter((p) => filtro !== 'bajo' || p.stock <= p.minimo)
    .filter((p) => filtro !== 'vence' || (p.vencimiento && diasHasta(p.vencimiento) <= db.config.diasVencimiento))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  $('#tabla-productos').innerHTML = lista.map((p) => {
    const margen = p.costo ? ((p.precio - p.costo) / p.costo) * 100 : NaN;
    const dv = p.vencimiento ? diasHasta(p.vencimiento) : null;
    const porKg = p.unidad === 'kg' ? '<small class="muted">/kg</small>' : '';
    return `<tr class="${p.stock <= p.minimo ? 'bajo' : ''}">
      <td><strong>${esc(p.nombre)}</strong><br><small class="muted">${esc(p.codigo || '')}${p.proveedor ? ' · ' + esc(p.proveedor) : ''}</small></td>
      <td>${esc(p.categoria || '')}</td>
      <td>${$m(p.costo)}${porKg}</td>
      <td>${$m(p.precio)}${porKg}</td>
      <td>${pct(margen)}<br><small class="muted">${$m(p.precio - p.costo)}</small></td>
      <td><strong>${fmtCant(p.stock, p.unidad)}</strong><br><small class="muted">mín ${fmtCant(p.minimo, p.unidad)}</small></td>
      <td class="${dv !== null && dv <= db.config.diasVencimiento ? 'neg' : ''}">${p.vencimiento ? fechaLarga(p.vencimiento) : '—'}</td>
      <td>
        <button class="btn mini" data-reponer="${p.id}" title="Ingresar mercadería">＋ Stock</button>
        <button class="btn mini" data-editar="${p.id}" title="Editar">✏️</button>
        <button class="btn mini" data-borrar="${p.id}" title="Eliminar">🗑️</button>
      </td>
    </tr>`;
  }).join('');
  $('#productos-vacio').style.display = lista.length ? 'none' : '';
}

['#buscar-producto', '#filtro-categoria', '#filtro-estado'].forEach((s) => $(s).addEventListener('input', renderProductos));

function abrirProducto(p, previo = {}) {
  editandoId = p ? p.id : null;
  $('#modal-producto-titulo').textContent = p ? 'Editar producto' : 'Nuevo producto';
  $('#p-nombre').value = p ? p.nombre : '';
  $('#p-codigo').value = p ? p.codigo || '' : previo.codigo || '';
  $('#p-categoria').value = p ? p.categoria || '' : '';
  $('#p-proveedor').value = p ? p.proveedor || '' : '';
  $('#p-unidad').value = p ? p.unidad : 'u';
  $('#p-costo').value = p ? p.costo : '';
  $('#p-precio').value = p ? p.precio : '';
  $('#p-margen').value = p && p.costo ? (((p.precio - p.costo) / p.costo) * 100).toFixed(1) : db.config.margen;
  $('#p-stock').value = p ? p.stock : 0;
  $('#p-minimo').value = p ? p.minimo : 3;
  $('#p-vencimiento').value = p ? p.vencimiento || '' : '';
  actualizarEtiquetasUnidad();
  abrirModal('#modal-producto');
  $('#p-nombre').focus();
}

function actualizarEtiquetasUnidad() {
  const kg = $('#p-unidad').value === 'kg';
  $$('.por-unidad').forEach((s) => { s.textContent = kg ? 'por kg' : 'por unidad'; });
  $$('.en-unidad').forEach((s) => { s.textContent = kg ? '(kg)' : '(unidades)'; });
  $('#p-stock').step = kg ? '0.001' : '1';
  $('#p-minimo').step = kg ? '0.001' : '1';
}
$('#p-unidad').addEventListener('change', actualizarEtiquetasUnidad);

// Costo + % => precio ; precio => %
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
  const unidad = $('#p-unidad').value;
  const cant = (v) => (unidad === 'kg' ? r3(num(v)) : Math.round(num(v)));
  const datos = {
    nombre: $('#p-nombre').value.trim(),
    codigo: $('#p-codigo').value.trim(),
    categoria: $('#p-categoria').value.trim(),
    proveedor: $('#p-proveedor').value.trim(),
    unidad,
    costo: num($('#p-costo').value),
    precio: num($('#p-precio').value),
    stock: cant($('#p-stock').value),
    minimo: cant($('#p-minimo').value),
    vencimiento: $('#p-vencimiento').value,
  };
  if (!datos.nombre) return;
  if (datos.codigo && db.productos.some((p) => p.codigo === datos.codigo && p.id !== editandoId)) {
    toast('⚠️ Ojo: ya hay otro producto con ese código');
  }
  if (editandoId) Object.assign(porId(editandoId), datos);
  else db.productos.push({ id: uid(), ...datos });
  guardar();
  render();
  toast('Producto guardado');
});

let reponiendoId = null;
$('#tabla-productos').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.editar) abrirProducto(porId(b.dataset.editar));
  if (b.dataset.borrar) {
    const p = porId(b.dataset.borrar);
    if (confirm(`¿Eliminar "${p.nombre}"? Las ventas pasadas se conservan.`)) {
      db.productos = db.productos.filter((x) => x.id !== p.id);
      guardar(); render();
    }
  }
  if (b.dataset.reponer) {
    const p = porId(b.dataset.reponer);
    reponiendoId = p.id;
    $('#stock-producto-nombre').textContent = `${p.nombre} — stock actual: ${fmtCant(p.stock, p.unidad)}`;
    $('#s-cantidad').value = '';
    $('#s-cantidad').step = p.unidad === 'kg' ? '0.001' : '1';
    $('#s-costo').value = p.costo;
    $('#s-vencimiento').value = p.vencimiento || '';
    $('#s-gasto').checked = false;
    $('#s-caja').checked = false;
    abrirModal('#modal-stock');
    $('#s-cantidad').focus();
  }
});

$('#modal-stock').addEventListener('close', () => {
  if ($('#modal-stock').returnValue !== 'ok') return;
  const p = porId(reponiendoId);
  if (!p) return;
  const cant = p.unidad === 'kg' ? r3(num($('#s-cantidad').value)) : Math.round(num($('#s-cantidad').value));
  const costo = $('#s-costo').value === '' ? p.costo : num($('#s-costo').value);
  if (costo !== p.costo && p.costo > 0 && confirm(`El costo cambió de ${$m(p.costo)} a ${$m(costo)}. ¿Actualizar el precio de venta manteniendo el mismo % de ganancia?`)) {
    p.precio = +(p.precio * (costo / p.costo)).toFixed(2);
  }
  p.costo = costo;
  p.stock = r3(p.stock + cant);
  if ($('#s-vencimiento').value) p.vencimiento = $('#s-vencimiento').value;
  if (($('#s-gasto').checked || $('#s-caja').checked) && cant > 0) {
    registrarGasto({
      fecha: diaKey(), categoria: 'Mercadería', descripcion: `${fmtCant(cant, p.unidad)} × ${p.nombre}${p.proveedor ? ' (' + p.proveedor + ')' : ''}`,
      monto: r3(cant * costo), deCaja: $('#s-caja').checked,
    });
  }
  guardar(); render();
  toast(`Stock de ${p.nombre}: ${fmtCant(p.stock, p.unidad)}`);
});

// ---- Lista de pedido a proveedores ----
function cantidadAPedir(p) {
  const objetivo = Math.max(p.minimo * 2, p.unidad === 'kg' ? 1 : 1);
  const falta = objetivo - Math.max(p.stock, 0);
  return p.unidad === 'kg' ? r3(Math.max(falta, 0)) : Math.max(Math.ceil(falta), 1);
}

$('#btn-pedido').addEventListener('click', () => {
  const bajos = db.productos.filter((p) => p.stock <= p.minimo);
  if (!bajos.length) return toast('No hay productos con stock bajo 👍');
  const grupos = {};
  bajos.forEach((p) => { (grupos[p.proveedor || 'Sin proveedor'] ||= []).push(p); });
  const texto = Object.keys(grupos).sort().map((prov) =>
    `*${prov}*\n` + grupos[prov].sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((p) => `- ${p.nombre}: ${fmtCant(cantidadAPedir(p), p.unidad)} (hay ${fmtCant(Math.max(p.stock, 0), p.unidad)})`).join('\n'),
  ).join('\n\n');
  $('#pedido-texto').value = `Pedido ${db.config.nombre} — ${new Date().toLocaleDateString('es-AR')}\n\n${texto}`;
  abrirModal('#modal-pedido');
});
$('#btn-copiar-pedido').addEventListener('click', async () => {
  const t = $('#pedido-texto');
  try { await navigator.clipboard.writeText(t.value); } catch { t.select(); document.execCommand('copy'); }
  toast('Pedido copiado');
});
$('#btn-whatsapp-pedido').addEventListener('click', () => {
  window.open('https://wa.me/?text=' + encodeURIComponent($('#pedido-texto').value), '_blank');
});

// ---- Aumento de precios por categoría / proveedor ----
function filtroAumento() {
  const v = $('#au-aplicar').value;
  if (!v) return () => true;
  const [tipo, val] = [v.slice(0, 4), v.slice(5)];
  return tipo === 'cat:' ? (p) => p.categoria === val : (p) => p.proveedor === val;
}
function previewAumento() {
  const n = db.productos.filter(filtroAumento()).length;
  $('#au-preview').textContent = `Se van a modificar ${n} producto${n === 1 ? '' : 's'}.`;
}
$('#btn-aumento').addEventListener('click', () => {
  $('#au-aplicar').innerHTML = '<option value="">Todos los productos</option>' +
    valoresUnicos('categoria').map((c) => `<option value="cat::${esc(c)}">Categoría: ${esc(c)}</option>`).join('') +
    valoresUnicos('proveedor').map((c) => `<option value="prv::${esc(c)}">Proveedor: ${esc(c)}</option>`).join('');
  $('#au-porcentaje').value = '';
  previewAumento();
  abrirModal('#modal-aumento');
});
$('#au-aplicar').addEventListener('change', previewAumento);
$('#modal-aumento').addEventListener('close', () => {
  if ($('#modal-aumento').returnValue !== 'ok') return;
  const f = 1 + num($('#au-porcentaje').value) / 100;
  if (f === 1) return;
  const redondeo = num($('#au-redondeo').value);
  const tambienCosto = $('#au-costo').checked;
  const lista = db.productos.filter(filtroAumento());
  lista.forEach((p) => {
    let precio = p.precio * f;
    precio = redondeo ? Math.ceil(precio / redondeo) * redondeo : Math.round(precio * 100) / 100;
    p.precio = precio;
    if (tambienCosto) p.costo = Math.round(p.costo * f * 100) / 100;
  });
  guardar(); render();
  toast(`Precios actualizados en ${lista.length} productos`);
});

// ================== CAJA ==================
const cajaAbierta = () => db.cajas.find((c) => !c.cierre);

function calcularCaja(c) {
  const hasta = c.cierre || '9999';
  const ventas = db.ventas.filter((v) => v.fecha >= c.apertura && v.fecha <= hasta);
  const efectivo = ventas.filter((v) => v.pago === 'Efectivo').reduce((a, v) => a + v.total, 0);
  const otros = ventas.filter((v) => v.pago !== 'Efectivo').reduce((a, v) => a + v.total, 0);
  const ingresos = c.movimientos.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + m.monto, 0);
  const retiros = c.movimientos.filter((m) => m.tipo === 'retiro').reduce((a, m) => a + m.monto, 0);
  return { cantVentas: ventas.length, efectivo, otros, ingresos, retiros, esperado: c.inicial + efectivo + ingresos - retiros };
}

function renderCaja() {
  const c = cajaAbierta();
  $('#caja-cerrada').style.display = c ? 'none' : '';
  $('#caja-abierta').style.display = c ? '' : 'none';
  if (c) {
    const r = calcularCaja(c);
    $('#caja-desde').textContent = `Abierta el ${fechaLarga(diaKey(c.apertura))} a las ${hora(c.apertura)}`;
    $('#cj-inicial').textContent = $m(c.inicial);
    $('#cj-efectivo').textContent = $m(r.efectivo);
    $('#cj-otros').textContent = $m(r.otros);
    $('#cj-ingresos').textContent = $m(r.ingresos);
    $('#cj-retiros').textContent = $m(r.retiros);
    $('#cj-esperado').textContent = $m(r.esperado);
    $('#cj-ventas').textContent = `${r.cantVentas} venta${r.cantVentas === 1 ? '' : 's'}`;
    $('#lista-movimientos').innerHTML = c.movimientos.length
      ? c.movimientos.slice().reverse().map((m) => `<li><span>${hora(m.fecha)} · ${m.tipo === 'retiro' ? '➖ Retiro' : '➕ Ingreso'} · ${esc(m.motivo || '')}</span>
          <strong class="${m.tipo === 'retiro' ? 'neg' : 'pos'}">${$m(m.monto)}</strong></li>`).join('')
      : '<li class="vacio">Sin movimientos</li>';
  }
  const cerradas = db.cajas.filter((x) => x.cierre).sort((a, b) => b.cierre.localeCompare(a.cierre)).slice(0, 30);
  $('#tabla-cierres').innerHTML = cerradas.map((x) => {
    const dif = x.contado - x.esperado;
    return `<tr><td>${fechaLarga(diaKey(x.cierre))} ${hora(x.apertura)}–${hora(x.cierre)}</td>
      <td>${$m(x.ventasEfectivo)}</td><td>${$m(x.ventasOtros)}</td><td>${$m(x.esperado)}</td><td>${$m(x.contado)}</td>
      <td class="${Math.abs(dif) < 0.01 ? '' : dif > 0 ? 'pos' : 'neg'}">${Math.abs(dif) < 0.01 ? 'OK ✔' : (dif > 0 ? 'Sobran ' : 'Faltan ') + $m(Math.abs(dif))}</td></tr>`;
  }).join('') || '<tr><td colspan="6" class="muted">Todavía no cerraste ninguna caja</td></tr>';
}

$('#form-abrir-caja').addEventListener('submit', (e) => {
  e.preventDefault();
  if (cajaAbierta()) return;
  db.cajas.push({ id: uid(), apertura: new Date().toISOString(), inicial: num($('#caja-inicial').value), movimientos: [], cierre: null });
  guardar(); render();
  toast('Caja abierta');
});

$('#form-movimiento').addEventListener('submit', (e) => {
  e.preventDefault();
  const c = cajaAbierta();
  const monto = num($('#mov-monto').value);
  if (!c || monto <= 0) return;
  c.movimientos.push({ id: uid(), fecha: new Date().toISOString(), tipo: $('#mov-tipo').value, monto, motivo: $('#mov-motivo').value.trim() });
  $('#mov-monto').value = '';
  $('#mov-motivo').value = '';
  guardar(); render();
});

$('#form-cerrar-caja').addEventListener('submit', (e) => {
  e.preventDefault();
  const c = cajaAbierta();
  if (!c) return;
  const contado = num($('#caja-contado').value);
  c.cierre = new Date().toISOString();
  const r = calcularCaja(c);
  Object.assign(c, { contado, esperado: r.esperado, ventasEfectivo: r.efectivo, ventasOtros: r.otros });
  const dif = contado - r.esperado;
  if (!confirm(`Efectivo esperado: ${$m(r.esperado)}\nContado: ${$m(contado)}\n${Math.abs(dif) < 0.01 ? 'La caja cierra justa ✔' : (dif > 0 ? 'Sobran ' : 'Faltan ') + $m(Math.abs(dif))}\n\n¿Cerrar la caja?`)) {
    c.cierre = null;
    return;
  }
  $('#caja-contado').value = '';
  $('#caja-inicial').value = '';
  guardar(); render();
  toast('Caja cerrada');
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
        <span>🕒 ${hora(v.fecha)} · ${esc(v.pago)}${v.nota ? ' · ' + esc(v.nota) : ''}</span>
        <span><strong>${$m(v.total)}</strong> <button class="btn mini" data-anular="${v.id}" title="Anular venta">Anular</button></span>
      </div>
      <div class="venta-items">${v.items.map((i) => `${fmtCant(i.cantidad, i.unidad || 'u')} ${esc(i.nombre)} (${$m(i.precio)})`).join(' · ')}${v.descuento ? ` · Descuento ${$m(v.descuento)}` : ''}</div>
    </li>`).join('') : '<li class="vacio">No hay ventas este día</li>';
}
$('#fecha-ventas').addEventListener('change', renderVentas);
$('#lista-ventas').addEventListener('click', (e) => {
  const b = e.target.closest('[data-anular]');
  if (!b) return;
  const v = db.ventas.find((x) => x.id === b.dataset.anular);
  if (!confirm(`¿Anular la venta de ${$m(v.total)}? El stock se devuelve.`)) return;
  v.items.forEach((i) => { const p = porId(i.productoId); if (p) p.stock = r3(p.stock + i.cantidad); });
  db.ventas = db.ventas.filter((x) => x.id !== v.id);
  guardar(); render();
  toast('Venta anulada');
});

// ================== GASTOS ==================
function registrarGasto({ fecha, categoria, descripcion, monto, deCaja }) {
  const g = { id: uid(), fecha, categoria, descripcion, monto };
  db.gastos.push(g);
  const c = cajaAbierta();
  if (deCaja) {
    if (c) c.movimientos.push({ id: uid(), fecha: new Date().toISOString(), tipo: 'retiro', monto, motivo: `Gasto: ${categoria}${descripcion ? ' - ' + descripcion : ''}`, gastoId: g.id });
    else toast('⚠️ No hay caja abierta: el gasto se guardó pero no se descontó de la caja');
  }
}

function renderGastos() {
  const mes = $('#mes-gastos').value || mesKey();
  const gastos = db.gastos.filter((g) => g.fecha.startsWith(mes)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  $('#gastos-total-mes').textContent = $m(gastos.reduce((a, g) => a + g.monto, 0));

  const porCat = {};
  gastos.forEach((g) => { porCat[g.categoria] = (porCat[g.categoria] || 0) + g.monto; });
  $('#gastos-por-cat').innerHTML = Object.entries(porCat).sort((a, b) => b[1] - a[1])
    .map(([c, t]) => `<li><span>${esc(c)}</span><strong>${$m(t)}</strong></li>`).join('') || '<li class="vacio">Sin gastos este mes</li>';

  const cats = [...new Set(['Mercadería', 'Alquiler', 'Luz', 'Agua', 'Gas', 'Internet', 'Sueldos', 'Impuestos', 'Monotributo',
    'Comisiones (tarjeta/MP)', 'Bolsas y descartables', 'Mantenimiento', 'Publicidad', ...db.gastos.map((g) => g.categoria)])];
  $('#categorias-gasto').innerHTML = cats.map((c) => `<option value="${esc(c)}">`).join('');

  $('#tabla-gastos').innerHTML = gastos.map((g) => `<tr>
    <td>${fechaLarga(g.fecha)}</td><td>${esc(g.categoria)}</td><td>${esc(g.descripcion)}</td><td>${$m(g.monto)}</td>
    <td><button class="btn mini" data-borrar-gasto="${g.id}">🗑️</button></td></tr>`).join('');
}
$('#mes-gastos').addEventListener('change', renderGastos);
$('#form-gasto').addEventListener('submit', (e) => {
  e.preventDefault();
  registrarGasto({
    fecha: $('#gasto-fecha').value || diaKey(),
    categoria: $('#gasto-categoria').value.trim(),
    descripcion: $('#gasto-desc').value.trim(),
    monto: num($('#gasto-monto').value),
    deCaja: $('#gasto-caja').checked,
  });
  guardar();
  $('#gasto-desc').value = '';
  $('#gasto-monto').value = '';
  $('#gasto-caja').checked = false;
  render();
  toast('Gasto agregado');
});
$('#tabla-gastos').addEventListener('click', (e) => {
  const b = e.target.closest('[data-borrar-gasto]');
  if (!b || !confirm('¿Eliminar este gasto?')) return;
  const id = b.dataset.borrarGasto;
  db.gastos = db.gastos.filter((g) => g.id !== id);
  const c = cajaAbierta();
  if (c) c.movimientos = c.movimientos.filter((m) => m.gastoId !== id);
  guardar(); render();
});

// ================== AJUSTES ==================
$('#form-ajustes').addEventListener('submit', (e) => {
  e.preventDefault();
  db.config.nombre = $('#aj-nombre').value.trim() || 'Mi Minisuper';
  db.config.margen = num($('#aj-margen').value);
  db.config.diasVencimiento = Math.max(0, Math.round(num($('#aj-dias-venc').value)));
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
    db = normalizar(datos);
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
    filas = [['Nombre', 'Código', 'Categoría', 'Proveedor', 'Unidad', 'Costo', 'Precio', 'Stock', 'Stock mínimo', 'Vencimiento'],
      ...db.productos.map((p) => [p.nombre, p.codigo, p.categoria, p.proveedor, p.unidad, p.costo, p.precio, p.stock, p.minimo, p.vencimiento])];
  } else if (t === 'ventas') {
    filas = [['Fecha', 'Hora', 'Producto', 'Cantidad', 'Unidad', 'Precio unit.', 'Costo unit.', 'Medio de pago', 'Descuento venta', 'Total venta', 'Nota']];
    db.ventas.forEach((v) => v.items.forEach((i, idx) => filas.push([
      diaKey(v.fecha), hora(v.fecha), i.nombre, i.cantidad, i.unidad || 'u', i.precio, i.costo, v.pago,
      idx === 0 ? v.descuento : '', idx === 0 ? v.total : '', v.nota,
    ])));
  } else {
    filas = [['Fecha', 'Categoría', 'Descripción', 'Monto'], ...db.gastos.map((g) => [g.fecha, g.categoria, g.descripcion, g.monto])];
  }
  descargar(`${t}-${diaKey()}.csv`, csv(filas), 'text/csv;charset=utf-8');
}));

$('#btn-borrar-todo').addEventListener('click', () => {
  if (!confirm('¿Borrar TODOS los productos, ventas, gastos y cajas? Esto no se puede deshacer.')) return;
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
  $('#aj-dias-venc').value = db.config.diasVencimiento;
  $('#tab-caja-estado').textContent = cajaAbierta() ? '🟢' : '';
  renderResumen();
  renderProductos();
  renderCarrito();
  renderCaja();
  renderVentas();
  renderGastos();
}

$('#fecha-hoy').textContent = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
$('#fecha-ventas').value = diaKey();
$('#gasto-fecha').value = diaKey();
$('#mes-gastos').value = mesKey();
render();
