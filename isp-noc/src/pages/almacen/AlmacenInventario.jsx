import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Search, Send, Wifi, X, Download, FileSpreadsheet, FileText } from 'lucide-react';
import XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { activosApi, productosApi, stockApi, onusInventarioApi } from '../../services/api';
import { Btn, Badge, Input, Modal, Select, Table, Tr, Td } from '../../components/ui';
import { useSedeSeleccionada } from './hooks';

const CSS = `
  .inv-table-wrap   { display: block; }
  .inv-cards        { display: none; }
  .inv-modal-grid   { grid-template-columns: 1fr 1fr !important; }

  @media (max-width: 1080px) {
    .inv-toolbar { flex-direction: column !important; }
    .inv-toolbar > div:first-child { width: 100% !important; }
    .inv-toolbar-modo { width: 100% !important; }
    .inv-toolbar-modo > button { flex: 1 !important; justify-content: center; }
    .inv-toolbar > div:last-child { width: 100% !important; min-width: unset !important; }
    .inv-actions { flex-direction: column !important; }
    .inv-actions > button { width: 100%; justify-content: center; }
    .inv-actions > div { width: 100%; flex-direction: column !important; }
    .inv-actions > div > button { width: 100% !important; justify-content: center; white-space: nowrap; }
    .inv-table-wrap   { display: none; }
    .inv-cards        { display: flex; flex-direction: column; gap: 10px; }
    .inv-modal-grid   { grid-template-columns: 1fr !important; }
  }

  .inv-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .inv-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }
`;

if (typeof document !== 'undefined' && !document.getElementById('inv-responsive-css')) {
  const s = document.createElement('style');
  s.id = 'inv-responsive-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

function Paginacion({ page, totalPages, total, limit, onChange }) {
  if (totalPages <= 1) return null;
  const desde = (page - 1) * limit + 1;
  const hasta = Math.min(page * limit, total);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>
        {desde}–{hasta} de <strong>{total}</strong> productos
      </span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button onClick={() => onChange(page - 1)} disabled={page <= 1}
          style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--txt)', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1, fontSize: 14 }}>‹</button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p;
          if (totalPages <= 5)             p = i + 1;
          else if (page <= 3)              p = i + 1;
          else if (page >= totalPages - 2) p = totalPages - 4 + i;
          else                             p = page - 2 + i;
          return (
            <button key={p} onClick={() => onChange(p)} style={{
              width: 30, height: 30, borderRadius: 6,
              border: page === p ? 'none' : '1px solid var(--border)',
              background: page === p ? 'var(--accent)' : 'transparent',
              color: page === p ? '#fff' : 'var(--txt)',
              cursor: 'pointer', fontSize: 12, fontWeight: page === p ? 700 : 400,
            }}>{p}</button>
          );
        })}
        <button onClick={() => onChange(page + 1)} disabled={page >= totalPages}
          style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--txt)', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1, fontSize: 14 }}>›</button>
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', height: 36, padding: '0 12px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--txt)', fontSize: 13, outline: 'none' };

function SedeSelect({ sedes, sedeId, setSedeId }) {
  return (
    <select value={sedeId} onChange={e => setSedeId(e.target.value)} style={{ ...inputStyle }}>
      <option value="">Seleccionar sede...</option>
      {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre} - {s.ciudad}</option>)}
    </select>
  );
}

function StockBar({ stock, minimo }) {
  if (!minimo) return <strong style={{ fontFamily: 'var(--font-mono)' }}>{stock}</strong>;
  const pct   = Math.min(100, Math.round((stock / (minimo * 3)) * 100));
  const low   = stock <= minimo;
  const warn  = stock <= minimo * 1.5;
  const color = low ? 'var(--red)' : warn ? 'var(--yellow)' : 'var(--green)';
  return (
    <div>
      <div style={{ fontWeight: 800, color, fontFamily: 'var(--font-mono)', fontSize: 13 }}>{stock}</div>
      <div style={{ width: 64, height: 4, background: 'var(--bg-3)', borderRadius: 999, marginTop: 5 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

/** Muestra metros disponibles solo para productos medibles */
function MetrosCell({ p }) {
  if (!p.es_medible || !p.metros_por_unidad) return <span style={{ color: 'var(--txt-3)', fontSize: 12 }}>—</span>;
  const metros = p.cantidad * p.metros_por_unidad;
  const minimoMetros = (p.stock_minimo || 0) * p.metros_por_unidad;
  const low   = minimoMetros > 0 && metros <= minimoMetros;
  const warn  = minimoMetros > 0 && metros <= minimoMetros * 1.5;
  const color = metros === 0 ? 'var(--red)' : low ? 'var(--red)' : warn ? 'var(--yellow)' : 'var(--green)';
  return (
    <div>
      <span style={{ fontWeight: 700, color, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
        {metros.toLocaleString()}
      </span>
      <span style={{ fontSize: 11, color: 'var(--txt-3)', marginLeft: 3 }}>m</span>
      <div style={{ fontSize: 10, color: 'var(--txt-3)', marginTop: 2 }}>
        × {p.metros_por_unidad.toLocaleString()} m/u
      </div>
    </div>
  );
}

function ProductoAutocomplete({ productos, value, onChange, placeholder, disabled = false }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return productos;
    const q = query.toLowerCase();
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      (p.codigo && p.codigo.toLowerCase().includes(q))
    );
  }, [productos, query]);

  const selected = productos.find(p => p.id === value);

  const handleSelect = (producto) => {
    onChange(producto.id);
    setQuery(producto.nombre);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        style={inputStyle}
        placeholder={placeholder || 'Buscar producto por nombre o código...'}
        value={isOpen ? query : (selected?.nombre || '')}
        onChange={e => { setQuery(e.target.value); setIsOpen(true); if (!e.target.value) onChange(''); }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        disabled={disabled}
      />
      {isOpen && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 6, maxHeight: 250, overflowY: 'auto',
          zIndex: 1000, marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {filtered.map(p => (
            <div key={p.id} onMouseDown={() => handleSelect(p)} style={{
              padding: '8px 12px', cursor: 'pointer',
              borderBottom: '1px solid var(--border-2)', fontSize: 13,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>
                <strong>{p.nombre}</strong>
                {p.codigo && <span style={{ color: 'var(--txt-3)', marginLeft: 8, fontSize: 11 }}>{p.codigo}</span>}
              </span>
              {p.cantidad != null && <span style={{ color: 'var(--txt-3)', fontSize: 11 }}>disp: <strong>{p.cantidad}</strong></span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Detecta si un producto es ONU/ONT por nombre o categoría. */
function isOnuProduct(p) {
  return `${p.categoria || ''} ${p.nombre || p.producto || ''}`.toLowerCase().includes('onu');
}

/**
 * Panel de selección de ONUs por código PON — usado dentro de ItemsEditorEnvio
 * cuando la cantidad ingresada para un producto ONU supera las unidades sin
 * código disponibles. Permite elegir EXACTAMENTE cuáles códigos completan
 * la diferencia, en vez de que el backend decida automáticamente cuáles mover.
 */
function OnuPanelInline({ sedeId, productoId, selectedIds, onChange, faltantes }) {
  const [filter, setFilter] = useState('');
  const onusQ = useQuery({
    queryKey: ['onus-panel-inline-noc', sedeId, productoId],
    enabled: Boolean(sedeId && productoId),
    queryFn: () => onusInventarioApi.disponibles({ sedeId, producto_id: productoId }).then(r => r.data),
  });
  const onus = (onusQ.data || []).filter(o => !filter || (o.codigo_pon || '').toLowerCase().includes(filter.toLowerCase()));
  const selected = selectedIds.map(String);
  const completo = selected.length === faltantes;
  const excedido = selected.length > faltantes;
  const toggle = (id) => {
    const s = String(id);
    if (selected.includes(s)) { onChange(selected.filter(v => v !== s)); return; }
    if (selected.length >= faltantes) return; // no permitir elegir más de lo necesario
    onChange([...selected, s]);
  };
  return (
    <div style={{ marginTop: 6, padding: '10px 12px', border: `1px solid ${completo ? 'var(--green)' : 'var(--border)'}`, borderRadius: 8, background: 'var(--bg-2)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: completo ? 'var(--green)' : 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
        {completo ? '✓ ' : ''}Selecciona {faltantes} código{faltantes !== 1 ? 's' : ''} PON para completar la cantidad ({selected.length}/{faltantes})
      </div>
      <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar por código PON..."
        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-3)', color: 'var(--txt)', fontSize: 12, marginBottom: 8 }} />
      {onusQ.isLoading && <div style={{ fontSize: 12, color: 'var(--txt-3)' }}>Cargando...</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {onus.map(onu => {
          const isSel = selected.includes(String(onu.id));
          const disabledByLimit = !isSel && selected.length >= faltantes;
          return (
            <button key={onu.id} type="button" onClick={() => toggle(onu.id)} disabled={disabledByLimit}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                cursor: disabledByLimit ? 'not-allowed' : 'pointer',
                border: isSel ? 'none' : '1px solid var(--border)',
                background: isSel ? 'var(--accent)' : 'var(--bg-3)',
                color: isSel ? '#fff' : (disabledByLimit ? 'var(--txt-3)' : 'var(--txt)'),
                opacity: disabledByLimit ? 0.5 : 1,
                transition: 'all 0.12s',
              }}>
              {onu.codigo_pon}
            </button>
          );
        })}
        {!onusQ.isLoading && onus.length === 0 && <div style={{ fontSize: 12, color: 'var(--txt-3)' }}>Sin ONUs con código disponibles.</div>}
      </div>
      {excedido && (
        <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6, fontWeight: 600 }}>
          ⚠ Seleccionaste más códigos de los necesarios
        </div>
      )}
    </div>
  );
}

/**
 * Panel de selección de ONUs por código PON — modo "Por código PON" directo,
 * sin límite de cantidad. El operador elige libremente cuántas y cuáles
 * unidades codificadas quiere mover, sin pasar por un número de cantidad.
 */
function OnuPanelDirecto({ sedeId, productoId, selectedIds, onChange }) {
  const [filter, setFilter] = useState('');
  const onusQ = useQuery({
    queryKey: ['onus-panel-inline-noc', sedeId, productoId],
    enabled: Boolean(sedeId && productoId),
    queryFn: () => onusInventarioApi.disponibles({ sedeId, producto_id: productoId }).then(r => r.data),
  });
  const onus = (onusQ.data || []).filter(o => !filter || (o.codigo_pon || '').toLowerCase().includes(filter.toLowerCase()));
  const selected = selectedIds.map(String);
  const toggle = (id) => {
    const s = String(id);
    onChange(selected.includes(s) ? selected.filter(v => v !== s) : [...selected, s]);
  };
  return (
    <div style={{ marginTop: 6, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-2)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
        Seleccionar ONUs ({selected.length} seleccionadas)
      </div>
      <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar por código PON..."
        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-3)', color: 'var(--txt)', fontSize: 12, marginBottom: 8 }} />
      {onusQ.isLoading && <div style={{ fontSize: 12, color: 'var(--txt-3)' }}>Cargando...</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {onus.map(onu => {
          const isSel = selected.includes(String(onu.id));
          return (
            <button key={onu.id} type="button" onClick={() => toggle(onu.id)}
              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', cursor: 'pointer', border: isSel ? 'none' : '1px solid var(--border)', background: isSel ? 'var(--accent)' : 'var(--bg-3)', color: isSel ? '#fff' : 'var(--txt)', transition: 'all 0.12s' }}>
              {onu.codigo_pon}
            </button>
          );
        })}
        {!onusQ.isLoading && onus.length === 0 && <div style={{ fontSize: 12, color: 'var(--txt-3)' }}>Sin ONUs disponibles.</div>}
      </div>
    </div>
  );
}


/**
 * Calcula cuántas unidades sin código hay disponibles para completar una
 * cantidad. FUENTE DE VERDAD: StockSede.cantidad (stockTotalDisp, pasado por
 * el padre) menos las filas Onu CON código que ya existen para ese producto
 * en esa sede. No se puede inferir "sin código" contando filas Onu con
 * codigoPon: null, porque el stock que entra por cantidad (entradaStock,
 * asignarItems genéricos) NUNCA crea una fila Onu — solo incrementa el
 * número. Las filas Onu solo existen para unidades que en algún momento
 * se codificaron explícitamente (retiro con código, o registro manual).
 */
function OnuCantidadConCodigos({ sedeId, productoId, cantidad, stockTotalDisp, onuIds, onChangeOnuIds }) {
  const conCodigoQ = useQuery({
    queryKey: ['onus-con-codigo-noc', sedeId, productoId],
    enabled: Boolean(sedeId && productoId),
    queryFn: () => onusInventarioApi.disponibles({ sedeId, producto_id: productoId }).then(r => r.data),
  });
  const conCodigo = (conCodigoQ.data || []).length;
  const sinCodigo = Math.max(0, (Number(stockTotalDisp) || 0) - conCodigo);
  const cant = Number(cantidad) || 0;
  const faltantes = Math.max(0, cant - sinCodigo);

  // Si la cantidad ingresada ya no requiere códigos (cabe en las sin código),
  // limpiar cualquier selección previa de onu_ids para ese item.
  useEffect(() => {
    if (faltantes === 0 && (onuIds || []).length > 0) onChangeOnuIds([]);
  }, [faltantes]); // eslint-disable-line react-hooks/exhaustive-deps

  if (conCodigoQ.isLoading) {
    return <div style={{ fontSize: 11, color: 'var(--txt-3)', paddingLeft: 2 }}>Verificando disponibilidad de códigos...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 2, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>
          Sin código disponibles: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--txt)' }}>{sinCodigo}</strong>
        </span>
        <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>·</span>
        <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>
          Con código disponibles: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--txt)' }}>{conCodigo}</strong>
        </span>
      </div>
      {faltantes > 0 && (
        <OnuPanelInline
          sedeId={sedeId}
          productoId={productoId}
          selectedIds={onuIds || []}
          onChange={onChangeOnuIds}
          faltantes={faltantes}
        />
      )}
    </div>
  );
}

/**
 * Variante de ItemsEditor exclusiva para "Enviar productos a sede". Para
 * productos ONU el operador elige el modo:
 *  - "Por cantidad": tipea un número total. Si supera las unidades sin código
 *    disponibles, debe completar la diferencia eligiendo códigos específicos
 *    (OnuCantidadConCodigos) — evita que una ONU con código quede huérfana en
 *    origen mientras el número de stock viaja solo.
 *  - "Por código PON": elige directamente códigos específicos sin pasar por
 *    cantidad — útil cuando se quiere mover exactamente ciertas unidades ya
 *    codificadas, sin importar el resto del stock sin código.
 */
function ItemsEditorEnvio({ stock, items, setItems, productosList, sedeId }) {
  const [errorDuplicado, setErrorDuplicado] = useState('');

  const add    = () => setItems([...items, { producto_id: '', cantidad: '', onu_ids: [] }]);
  const remove = idx => { setItems(items.filter((_, i) => i !== idx)); setErrorDuplicado(''); };

  const update = (idx, key, value) => {
    if (key === 'producto_id' && value) {
      const yaExiste = items.some((it, i) => i !== idx && String(it.producto_id) === String(value));
      if (yaExiste) {
        setErrorDuplicado('Este producto ya fue agregado. Cambia la cantidad en la fila existente.');
        setItems(items.map((it, i) => i === idx ? { ...it, producto_id: '', cantidad: '', onu_ids: [] } : it));
        return;
      }
    }
    setErrorDuplicado('');
    setItems(items.map((it, i) => i === idx ? { ...it, [key]: value } : it));
  };

  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Productos</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, idx) => {
          const prod = stock.find(s => String(s.producto_id) === String(item.producto_id));
          const esOnu = isOnuProduct(prod || {});
          // Por defecto 'cantidad' al agregar el producto.
          const modoOnu = item.modo_onu || 'cantidad';
          const usaPon = esOnu && modoOnu === 'pon';
          const cantIngresada = Number(item.cantidad) || 0;
          const stockDisp = prod?.cantidad || 0;
          const excede = !usaPon && cantIngresada > stockDisp && stockDisp > 0;
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px auto', gap: 8, alignItems: 'center' }}>
                <ProductoAutocomplete
                  productos={productosList}
                  value={item.producto_id}
                  onChange={val => update(idx, 'producto_id', val)}
                  placeholder="Buscar producto..."
                />
                {usaPon
                  ? <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: 6, padding: '0 8px', background: 'var(--bg-3)', fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                      {(item.onu_ids || []).length} ONU{(item.onu_ids || []).length !== 1 ? 's' : ''}
                    </div>
                  : <input
                      style={{ ...inputStyle, borderColor: excede ? 'var(--red)' : undefined }}
                      type="number" min="1"
                      max={stockDisp || 9999} placeholder="Cantidad"
                      value={item.cantidad} onChange={e => update(idx, 'cantidad', e.target.value)}
                    />
                }
                <Btn variant="danger" onClick={() => remove(idx)}>✕</Btn>
              </div>
              {esOnu && sedeId && (
                <div style={{ display: 'flex', gap: 6, paddingLeft: 2 }}>
                  <button type="button" onClick={() => update(idx, 'modo_onu', 'cantidad')}
                    style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: !usaPon ? 'none' : '1px solid var(--border)', background: !usaPon ? 'var(--accent)' : 'var(--bg-3)', color: !usaPon ? '#fff' : 'var(--txt-3)' }}>
                    Por cantidad
                  </button>
                  <button type="button" onClick={() => update(idx, 'modo_onu', 'pon')}
                    style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: usaPon ? 'none' : '1px solid var(--border)', background: usaPon ? 'var(--accent)' : 'var(--bg-3)', color: usaPon ? '#fff' : 'var(--txt-3)' }}>
                    Por código PON
                  </button>
                </div>
              )}

              {/* Modo "Por código PON": selección directa, sin cantidad */}
              {usaPon && sedeId && item.producto_id && (
                <OnuPanelDirecto sedeId={sedeId} productoId={item.producto_id} selectedIds={item.onu_ids || []} onChange={ids => update(idx, 'onu_ids', ids)} />
              )}

              {/* Modo "Por cantidad" en producto ONU: si la cantidad supera las
                  unidades sin código, pide completar la diferencia con códigos */}
              {!usaPon && esOnu && sedeId && item.producto_id && cantIngresada > 0 && (
                <OnuCantidadConCodigos
                  sedeId={sedeId}
                  productoId={item.producto_id}
                  cantidad={cantIngresada}
                  stockTotalDisp={stockDisp}
                  onuIds={item.onu_ids}
                  onChangeOnuIds={ids => update(idx, 'onu_ids', ids)}
                />
              )}

              {prod && !usaPon && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 2 }}>
                  <span style={{ fontSize: 11, color: excede ? 'var(--red)' : 'var(--txt-3)' }}>
                    Stock actual:
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                    color: stockDisp === 0 ? 'var(--txt-3)' : excede ? 'var(--red)' : stockDisp <= (prod.stock_minimo || 0) ? 'var(--yellow)' : 'var(--green)',
                  }}>
                    {stockDisp} unidad{stockDisp !== 1 ? 'es' : ''}
                    {prod.es_medible && prod.metros_por_unidad
                      ? ` · ${(stockDisp * prod.metros_por_unidad).toLocaleString()} m`
                      : ''}
                  </span>
                  {excede && (
                    <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>
                      ⚠ Excede el stock
                    </span>
                  )}
                  {stockDisp === 0 && (
                    <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>
                      Sin stock
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {errorDuplicado && (
          <div style={{
            padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)',
            color: 'var(--red)',
          }}>
            ⚠ {errorDuplicado}
          </div>
        )}
        <Btn variant="ghost" onClick={add}>+ Agregar producto</Btn>
      </div>
    </div>
  );
}

function ItemsEditor({ stock, items, setItems, productosList, esEntrada = false }) {
  const [errorDuplicado, setErrorDuplicado] = useState('');

  const add    = () => setItems([...items, { producto_id: '', cantidad: '' }]);
  const remove = idx => { setItems(items.filter((_, i) => i !== idx)); setErrorDuplicado(''); };

  const update = (idx, key, value) => {
    if (key === 'producto_id' && value) {
      const yaExiste = items.some((it, i) => i !== idx && String(it.producto_id) === String(value));
      if (yaExiste) {
        setErrorDuplicado('Este producto ya fue agregado. Cambia la cantidad en la fila existente.');
        setItems(items.map((it, i) => i === idx ? { ...it, producto_id: '', cantidad: '' } : it));
        return;
      }
    }
    setErrorDuplicado('');
    setItems(items.map((it, i) => i === idx ? { ...it, [key]: value } : it));
  };

  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Productos</label>
      
      
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, idx) => {
          const prod = stock.find(s => String(s.producto_id) === String(item.producto_id));
          const cantIngresada = Number(item.cantidad) || 0;
          const stockDisp = prod?.cantidad || 0;
          // En entradas no hay límite — el usuario puede ingresar cualquier cantidad
          const excede = !esEntrada && cantIngresada > stockDisp && stockDisp > 0;
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px auto', gap: 8, alignItems: 'center' }}>
                <ProductoAutocomplete
                  productos={productosList}
                  value={item.producto_id}
                  onChange={val => update(idx, 'producto_id', val)}
                  placeholder="Buscar producto..."
                />
                <input
                  style={{ ...inputStyle, borderColor: excede ? 'var(--red)' : undefined }}
                  type="number" min="1"
                  max={esEntrada ? undefined : (stockDisp || 9999)} placeholder="Cantidad"
                  value={item.cantidad} onChange={e => update(idx, 'cantidad', e.target.value)}
                />
                <Btn variant="danger" onClick={() => remove(idx)}>✕</Btn>
              </div>
              {prod && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 2 }}>
                  <span style={{ fontSize: 11, color: excede ? 'var(--red)' : 'var(--txt-3)' }}>
                    Stock actual:
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                    color: stockDisp === 0 ? 'var(--txt-3)' : excede ? 'var(--red)' : stockDisp <= (prod.stock_minimo || 0) ? 'var(--yellow)' : 'var(--green)',
                  }}>
                    {stockDisp} unidad{stockDisp !== 1 ? 'es' : ''}
                    {prod.es_medible && prod.metros_por_unidad
                      ? ` · ${(stockDisp * prod.metros_por_unidad).toLocaleString()} m`
                      : ''}
                  </span>
                  {excede && (
                    <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>
                      ⚠ Excede el stock
                    </span>
                  )}
                  {!esEntrada && stockDisp === 0 && (
                    <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>
                      Sin stock
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
{errorDuplicado && (
          <div style={{
            padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)',
            color: 'var(--red)',
          }}>
            ⚠ {errorDuplicado}
          </div>
        )}
        <Btn variant="ghost" onClick={add}>+ Agregar producto</Btn>      </div>
    </div>
  );
}

/** Sufijo de fecha (YYYYMMDD) usado en los nombres de archivo exportados. */
function sufijoFechaExport() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/** Carga /logo-e.png como dataURL para embeberlo en el PDF. */
async function cargarLogoDataURL() {
  try {
    const resp = await fetch('/logo-e.png');
    const blob = await resp.blob();
    return await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Exporta filas de stock a un archivo Excel (.xlsx) con diseño para gerencia. */
function exportarStockExcel(rows, sedeNombre) {
  const wb = XLSX.utils.book_new();

  const fecha = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
  const totalUnidades = rows.reduce((s, p) => s + (Number(p.cantidad) || 0), 0);
  const bajoStock = rows.filter(p => p.stock_minimo > 0 && p.cantidad <= p.stock_minimo).length;

  // Filas de encabezado + datos
  const aoa = [
    ['Enet Fiber Perú'],
    ['Reporte de Inventario'],
    [`Sede: ${sedeNombre}`],
    [`Generado: ${fecha}`],
    [`Total productos: ${rows.length}   ·   Total unidades: ${totalUnidades}   ·   Bajo stock: ${bajoStock}`],
    [],
    ['Código', 'Producto', 'Categoría', 'Unidad', 'Stock', 'Stock mínimo', 'Estado'],
    ...rows.map(p => [
      p.codigo || '',
      p.producto,
      p.categoria || '',
      p.unidad || '',
      Number(p.cantidad) || 0,
      p.stock_minimo ?? '',
      (p.stock_minimo > 0 && p.cantidad <= p.stock_minimo) ? 'Bajo stock' : 'Disponible',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 14 }, { wch: 36 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];

  // Merges para los títulos
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 6 } },
  ];

  const azul = '2563EB';
  const headerRow = 6; // fila 0-indexed de los headers de columna

  // Estilo título principal
  if (ws['A1']) ws['A1'].s = { font: { bold: true, sz: 20, color: { rgb: azul } } };
  if (ws['A2']) ws['A2'].s = { font: { bold: true, sz: 13, color: { rgb: '111827' } } };
  ['A3', 'A4', 'A5'].forEach(c => { if (ws[c]) ws[c].s = { font: { sz: 10, color: { rgb: '6B7280' } } }; });

  // Estilo header de tabla
  for (let c = 0; c <= 6; c++) {
    const ref = XLSX.utils.encode_cell({ r: headerRow, c });
    if (ws[ref]) ws[ref].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
      fill: { fgColor: { rgb: azul } },
      alignment: { vertical: 'center', horizontal: c >= 4 ? 'center' : 'left' },
    };
  }

  // Estilo filas de datos (zebra + estado coloreado)
  for (let i = 0; i < rows.length; i++) {
    const r = headerRow + 1 + i;
    const zebra = i % 2 === 1;
    const low = rows[i].stock_minimo > 0 && rows[i].cantidad <= rows[i].stock_minimo;
    for (let c = 0; c <= 6; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) continue;
      ws[ref].s = {
        font: { sz: 9, color: { rgb: c === 6 ? (low ? 'DC2626' : '16A34A') : '111827' }, bold: c === 6 },
        fill: zebra ? { fgColor: { rgb: 'F5F7FA' } } : undefined,
        alignment: { vertical: 'center', horizontal: c >= 4 ? 'center' : 'left' },
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
  XLSX.writeFile(wb, `inventario_${sedeNombre.replace(/\s+/g, '_')}_${sufijoFechaExport()}.xlsx`);
}

/** Exporta filas de stock a un PDF vertical con logo y diseño para gerencia. */
async function exportarStockPDF(rows, sedeNombre) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const azul = [37, 99, 235];

  const logo = await cargarLogoDataURL();
  const fecha = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
  const totalUnidades = rows.reduce((s, p) => s + (Number(p.cantidad) || 0), 0);
  const bajoStock = rows.filter(p => p.stock_minimo > 0 && p.cantidad <= p.stock_minimo).length;

  // ── Encabezado ──
  let logoW = 0;
  if (logo) {
    try {
      const props = doc.getImageProperties(logo);
      const h = 14;
      logoW = (props.width / props.height) * h;
      doc.addImage(logo, 'PNG', 14, 12, logoW, h);
    } catch { logoW = 0; }
  }

  const textX = logo && logoW ? 14 + logoW + 6 : 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...azul);
  doc.text('Enet Fiber Perú', textX, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text('Reporte de Inventario', textX, 26);

  // Línea separadora
  doc.setDrawColor(...azul);
  doc.setLineWidth(0.6);
  doc.line(14, 31, pageW - 14, 31);

  // Meta info
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(`Sede: ${sedeNombre}`, 14, 38);
  doc.text(`Generado: ${fecha}`, pageW - 14, 38, { align: 'right' });
  doc.setTextColor(40, 40, 40);
  doc.text(
    `Total productos: ${rows.length}     Total unidades: ${totalUnidades}     Bajo stock: ${bajoStock}`,
    14, 44
  );

  // ── Tabla ──
  autoTable(doc, {
    startY: 49,
    head: [['Código', 'Producto', 'Categoría', 'Unidad', 'Stock', 'Estado']],
    body: rows.map(p => [
      p.codigo || '—',
      p.producto,
      p.categoria || '—',
      p.unidad || '—',
      String(p.cantidad),
      (p.stock_minimo > 0 && p.cantidad <= p.stock_minimo) ? 'Bajo stock' : 'Disponible',
    ]),
    styles: { fontSize: 8, cellPadding: 2.5, valign: 'middle' },
    headStyles: { fillColor: azul, textColor: 255, fontStyle: 'bold', halign: 'left' },
    columnStyles: {
      0: { cellWidth: 26 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', cellWidth: 24 },
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    // Colorea la celda "Estado" según corresponda
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const low = data.cell.raw === 'Bajo stock';
        data.cell.styles.textColor = low ? [220, 38, 38] : [22, 163, 74];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    // Pie de página con numeración
    didDrawPage: () => {
      const page = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${page}`, pageW - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
      doc.text('Enet Fiber Perú — Documento interno', 14, doc.internal.pageSize.getHeight() - 8);
    },
  });

  doc.save(`inventario_${sedeNombre.replace(/\s+/g, '_')}_${sufijoFechaExport()}.pdf`);
}


export default function AlmacenInventario() {
  const qc       = useQueryClient();
  const navigate = useNavigate();
  const { sedes, sedePrincipal, sedeId, setSedeId } = useSedeSeleccionada();

  const [q,         setQ]         = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [modoSede,  setModoSede]  = useState('central');
  const [modal,     setModal]     = useState(null);
  const [envioSeleccionado,  setEnvioSeleccionado]  = useState(null);
  const [motivoCancelacion,  setMotivoCancelacion]  = useState('');
  const [page,      setPage]      = useState(1);
  const [exportForm, setExportForm] = useState({ sede_id: '', categoria: 'todas', formato: 'excel' });

  const hoy = new Date().toISOString().split('T')[0];
  const [entrada, setEntrada] = useState({ items: [{ producto_id: '', cantidad: 1 }], comentario: '', fechaEntrada: '' }); 
 const [activoForm, setActivoForm] = useState({ sede_destino_id: '', area: 'NOC', descripcion: '', items: [{ producto_id: '', cantidad: 1 }] });
  const [envio, setEnvio] = useState({ sede_destino_id: '', guia: '', comentario: '', items: [], fechaEnvio: '' });
  const sedeOrigenId     = modoSede === 'central' ? sedePrincipal?.id : sedeId;
  const sedeOrigenNombre = modoSede === 'central' ? sedePrincipal?.nombre : sedes.find(s => s.id === sedeId)?.nombre;

  React.useEffect(() => { setPage(1); }, [sedeOrigenId, q, categoria]);

  const stockQ      = useQuery({ queryKey: ['stock-sede', sedeOrigenId, q], enabled: Boolean(sedeOrigenId), queryFn: () => stockApi.listar({ sedeId: sedeOrigenId, q: q || undefined }).then(r => r.data) });
  const productosQ  = useQuery({ queryKey: ['productos'], queryFn: () => productosApi.listar().then(r => r.data) });
  const categoriasQ = useQuery({ queryKey: ['categorias-catalogo'], queryFn: () => productosApi.categorias().then(r => r.data) });
  const enviosPendientesQ = useQuery({ queryKey: ['envios-pendientes', sedeOrigenId], enabled: Boolean(sedeOrigenId), queryFn: () => stockApi.listarEnviosPendientes({ sedeId: sedeOrigenId }).then(r => r.data) });

  // Datos de stock para la sede elegida en el modal de exportación (puede
  // ser distinta a la sede que se está viendo en la tabla principal).
  const exportStockQ = useQuery({
    queryKey: ['stock-export', exportForm.sede_id],
    enabled: Boolean(exportForm.sede_id) && modal === 'exportar',
    queryFn: () => stockApi.listar({ sedeId: exportForm.sede_id }).then(r => r.data),
  });
  const exportRows = useMemo(() => (exportStockQ.data || []).filter(p =>
    exportForm.categoria === 'todas' || p.categoria === exportForm.categoria
  ), [exportStockQ.data, exportForm.categoria]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['stock-sede'] });
    qc.invalidateQueries({ queryKey: ['stock-stats'] });
    qc.invalidateQueries({ queryKey: ['stock-auditoria'] });
  };

  const entradaM = useMutation({
    mutationFn: () => {
      const itemsValidos = entrada.items.filter(i => i.producto_id && Number(i.cantidad) > 0);
        const ahora = new Date();
        const horaActual = `T${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}:${String(ahora.getSeconds()).padStart(2,'0')}`;
        return stockApi.entrada({ sedeId: sedeOrigenId, comentario: entrada.comentario, fechaEntrada: entrada.fechaEntrada ? entrada.fechaEntrada + horaActual : null, items: itemsValidos });   },
        onSuccess: () => { toast.success('Entrada registrada'); setEntrada({ items: [{ producto_id: '', cantidad: 1 }], comentario: '', fechaEntrada: '' }); setModal(null); refresh(); },    onError: e => toast.error(e.response?.data?.error || 'No se pudo registrar la entrada'),
  });

  const activosM = useMutation({
    mutationFn: () => activosApi.enviarDesdeAlmacen({
      area: activoForm.area,
      sedeId: sedeOrigenId,
      sedeDestinoId: activoForm.sede_destino_id || sedeOrigenId,
      descripcion: activoForm.descripcion?.trim() || undefined,
      items: activoForm.items
        .filter(i => i.producto_id && Number(i.cantidad) > 0)
        .map(i => ({ producto_id: i.producto_id, cantidad: Number(i.cantidad), descripcion: activoForm.descripcion?.trim() || undefined })),
    }),
    onSuccess: () => { toast.success('Activos creados'); setActivoForm({ sede_destino_id: '', area: 'NOC', descripcion: '', items: [{ producto_id: '', cantidad: 1 }] }); setModal(null); refresh(); },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo enviar a activos'),
  });

const envioM = useMutation({
    mutationFn: () => {
      // Modo "pon" puro: el item no lleva cantidad, solo onu_ids específicos.
      // Modo "cantidad": el item lleva cantidad, y puede traer onu_ids
      // adicionales para completar la diferencia cuando la cantidad pedida
      // superó las unidades sin código disponibles — el backend resta esos
      // onu_ids de la cantidad total automáticamente (cantidadTotal - yaExplicitas).
      const usaPonItem = (i) => {
        const prod = (stockQ.data || []).find(s => String(s.producto_id) === String(i.producto_id));
        return isOnuProduct(prod || {}) && (i.modo_onu || 'cantidad') === 'pon';
      };
      const itemsValidos = envio.items.filter(i =>
        i.producto_id && (usaPonItem(i) ? (i.onu_ids || []).length > 0 : Number(i.cantidad) > 0)
      );
      const onuIdsPuros   = itemsValidos.filter(i => usaPonItem(i)).flatMap(i => i.onu_ids || []);
      const onuIdsCompletando = itemsValidos.filter(i => !usaPonItem(i)).flatMap(i => i.onu_ids || []);
      const onuIds = [...onuIdsPuros, ...onuIdsCompletando];
      const itemsSoloNormales = itemsValidos
        .filter(i => !usaPonItem(i))
        .map(({ onu_ids, modo_onu, ...rest }) => rest);
      return stockApi.enviarSede({
        ...envio,
        sedeId: sedeOrigenId,
        fechaEnvio: (() => {
          if (!envio.fechaEnvio) return null;
          const ahora = new Date();
          const horaActual = `T${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}:${String(ahora.getSeconds()).padStart(2,'0')}`;
          return envio.fechaEnvio + horaActual;
        })(),
        items: itemsSoloNormales,
        onu_ids: onuIds,
      });
    },
    onSuccess: () => { toast.success('Envío registrado'); setEnvio({ sede_destino_id: '', guia: '', comentario: '', items: [], fechaEnvio: '' }); setModal(null); refresh(); },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo registrar el envío'),
  });

  const confirmarEnvioM = useMutation({
    mutationFn: (id) => stockApi.confirmarEnvio(id),
    onSuccess: () => {
      toast.success('Envío confirmado — stock sumado');
      setEnvioSeleccionado(null);
      setModal(null);
      refresh();
      qc.invalidateQueries({ queryKey: ['envios-pendientes'] });
    },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo confirmar'),
  });

  const cancelarEnvioM = useMutation({
    mutationFn: ({ id, motivo }) => stockApi.cancelarEnvio(id, { motivo }),
    onSuccess: () => {
      toast.success('Envío cancelado — stock devuelto al origen');
      setEnvioSeleccionado(null);
      setMotivoCancelacion('');
      setModal(null);
      refresh();
      qc.invalidateQueries({ queryKey: ['envios-pendientes'] });
    },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo cancelar'),
  });

const handleExportar = async () => {
  if (exportRows.length === 0) { toast.error('No hay productos para exportar con estos filtros'); return; }
  const sedeNombre = sedes.find(s => String(s.id) === String(exportForm.sede_id))?.nombre
    || (String(sedePrincipal?.id) === String(exportForm.sede_id) ? sedePrincipal.nombre : 'Sede');
  if (exportForm.formato === 'excel') exportarStockExcel(exportRows, sedeNombre);
  else await exportarStockPDF(exportRows, sedeNombre);
  toast.success('Exportación generada');
  setModal(null);
};

  const LIMIT = 25;
  const rowsFiltrados = useMemo(() => (stockQ.data || []).filter(p =>
    categoria === 'todas' || p.categoria === categoria
  ), [stockQ.data, categoria]);
  const totalRows  = rowsFiltrados.length;
  const totalPages = Math.ceil(totalRows / LIMIT);
  const rows       = rowsFiltrados.slice((page - 1) * LIMIT, page * LIMIT);

  const productos      = productosQ.data  || [];
  const categorias     = categoriasQ.data || [];
  const productosStock = (stockQ.data || []).filter(p => p.cantidad > 0).map(p => ({
    id: p.producto_id, nombre: p.producto, codigo: p.codigo, categoria: p.categoria, cantidad: p.cantidad,
  }));

  const itemsActivosNormalizados = activoForm.items
    .filter(i => i.producto_id && Number(i.cantidad) > 0)
    .map(i => ({ producto_id: i.producto_id, cantidad: Number(i.cantidad) }));
  const totalPorProductoActivo = itemsActivosNormalizados.reduce((acc, item) => {
    acc[item.producto_id] = (acc[item.producto_id] || 0) + item.cantidad;
    return acc;
  }, {});
  const itemsActivosValidos = activoForm.items.length > 0
    && itemsActivosNormalizados.length === activoForm.items.length
    && Object.entries(totalPorProductoActivo).every(([productoId, cantidad]) => {
      const disponible = (stockQ.data || []).find(p => String(p.producto_id) === String(productoId))?.cantidad || 0;
      return cantidad <= disponible;
    });
  const totalActivosCrear = itemsActivosNormalizados.reduce((sum, item) => sum + item.cantidad, 0);

  const mensajeSinSede = modoSede === 'central'
    ? 'Define una sede principal para ver stock central'
    : 'Selecciona una sede para ver stock';

  // ¿Hay algún producto medible en los resultados?
  const hayMedibles = rows.some(p => p.es_medible);

  return (
    <div style={{ padding: 24 }} className="animate-fade">

      {/* ── Toolbar ── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '10px 14px',
        display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14,
      }}>
        <div className="inv-toolbar" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)' }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o código..."
              style={{ ...inputStyle, paddingLeft: 32 }} />
          </div>
          <div className="inv-toolbar-modo" style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <Btn variant={modoSede === 'central' ? 'blue' : 'ghost'} onClick={() => setModoSede('central')}>Central</Btn>
            <Btn variant={modoSede === 'sede' ? 'blue' : 'ghost'} onClick={() => setModoSede('sede')}>Por sede</Btn>
          </div>
          <div style={{ minWidth: 0 }}>
            {modoSede === 'sede' ? (
              <SedeSelect sedes={sedes} sedeId={sedeId} setSedeId={setSedeId} />
            ) : (
              <select value={categoria} onChange={e => setCategoria(e.target.value)} style={inputStyle}>
                <option value="todas">Todas las categorías</option>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        </div>
        <div className="inv-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Btn variant="ghost" icon={<Plus size={14} />} disabled={!sedeOrigenId} onClick={() => setModal('entrada')}>
            Registrar entrada
          </Btn>
          <Btn variant="primary" icon={<Plus size={14} />} onClick={() => navigate('/almacen/catalogo')}>
            Nuevo producto
          </Btn>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Btn variant="ghost" icon={<Download size={14} />}
              onClick={() => { setExportForm({ sede_id: sedeOrigenId || '', categoria, formato: 'excel' }); setModal('exportar'); }}>
              Exportar
            </Btn>
            <Btn variant="ghost" icon={<Send size={14} />} disabled={!sedeOrigenId}
              onClick={() => { setEnvio({ sede_destino_id: '', guia: '', comentario: '', items: [] }); setModal('envio'); }}>
              Enviar productos
            </Btn>
            <Btn variant="ghost" disabled={!sedeOrigenId}
              onClick={() => { setActivoForm({ sede_destino_id: sedeOrigenId || '', area: 'NOC', descripcion: '', items: [{ producto_id: '', cantidad: 1 }] }); setModal('activo'); }}>
              Enviar activos
            </Btn>
          </div>
        </div>
      </div>

      {/* ── Envíos pendientes de recepción ── */}
      {(enviosPendientesQ.data || []).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {(enviosPendientesQ.data || []).map(env => (
            <div key={env.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', marginBottom: 8,
              background: 'var(--bg-card)', border: '2px solid #D97706',
              borderRadius: 10, gap: 12, flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span>📦 Envío pendiente</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#92400E', background: '#FEF3C7', padding: '1px 7px', borderRadius: 4 }}>
                    {env.guia}
                  </span>
                  <span style={{ color: 'var(--txt-3)', fontWeight: 400 }}>desde <strong>{env.sedeOrigen}</strong></span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--txt-3)', marginTop: 4 }}>
                  {env.detalles?.map(d => `${d.cantidad}× ${d.producto}`).join(' · ')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <Btn variant="ghost" onClick={() => { setEnvioSeleccionado(env); setMotivoCancelacion(''); setModal('cancelar-envio'); }}>
                  Cancelar
                </Btn>
                <Btn onClick={() => { setEnvioSeleccionado(env); setModal('confirmar-envio'); }}>
                  Confirmar recepción
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Vista MÓVIL: cards ── */}
      <div className="inv-cards">
        {!sedeOrigenId ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--txt-3)', fontSize: 13,
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
            {mensajeSinSede}
          </div>
        ) : stockQ.isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--txt-3)' }}>Cargando...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--txt-3)', fontSize: 13,
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
            Sin stock en esta sede
          </div>
        ) : rows.map(p => {
          const low = p.stock_minimo > 0 && p.cantidad <= p.stock_minimo;
          return (
            <div key={p.producto_id} className="inv-card">
              <div className="inv-card-top">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>{p.producto}</div>
                  {p.codigo && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt-3)' }}>{p.codigo}</span>}
                </div>
                <Badge color={low ? 'red' : 'green'}>{low ? 'Bajo stock' : 'Disponible'}</Badge>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                {p.categoria && <Badge color="blue">{p.categoria}</Badge>}
                {p.unidad && <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>{p.unidad}</span>}
                <StockBar stock={p.cantidad} minimo={p.stock_minimo} />
                {p.es_medible && p.metros_por_unidad && (
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: p.cantidad * p.metros_por_unidad === 0 ? 'var(--red)' : 'var(--green)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {(p.cantidad * p.metros_por_unidad).toLocaleString()} m
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <Paginacion page={page} totalPages={totalPages} total={totalRows} limit={LIMIT} onChange={setPage} />
      </div>

      {/* ── Vista DESKTOP: tabla ── */}
      <div className="inv-table-wrap" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <Table loading={stockQ.isLoading}
          headers={['Código', 'Producto', 'Categoría', 'Unidad', 'Stock', ...(hayMedibles ? ['Metros disp.'] : []), 'Estado']}>
          {!sedeOrigenId ? (
            <tr><td colSpan={hayMedibles ? 7 : 6} style={{ padding: 32, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>{mensajeSinSede}</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={hayMedibles ? 7 : 6} style={{ padding: 32, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin stock en esta sede</td></tr>
          ) : rows.map(p => {
            const low = p.stock_minimo > 0 && p.cantidad <= p.stock_minimo;
            return (
              <Tr key={p.producto_id}>
                <Td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--txt-3)' }}>{p.codigo || '—'}</Td>
                <Td><span style={{ fontWeight: 600 }}>{p.producto}</span></Td>
                <Td>{p.categoria || '—'}</Td>
                <Td style={{ color: 'var(--txt-3)', fontSize: 12 }}>{p.unidad || '—'}</Td>
                <Td><StockBar stock={p.cantidad} minimo={p.stock_minimo} /></Td>
                {hayMedibles && <Td><MetrosCell p={p} /></Td>}
                <Td><Badge color={low ? 'red' : 'green'}>{low ? 'Bajo stock' : 'Disponible'}</Badge></Td>
              </Tr>
            );
          })}
        </Table>
        <Paginacion page={page} totalPages={totalPages} total={totalRows} limit={LIMIT} onChange={setPage} />
      </div>

      {/* ── Modal entrada ── */}
      <Modal open={modal === 'entrada'} onClose={() => setModal(null)} title="Registrar entrada de stock" width={560}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ItemsEditor stock={stockQ.data || []} items={entrada.items}
            setItems={items => setEntrada({ ...entrada, items })} productosList={productos} esEntrada />
<div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase' }}>Fecha de entrada</label>
            <input
              type="date"
              value={entrada.fechaEntrada || ''}
              onChange={e => setEntrada({ ...entrada, fechaEntrada: e.target.value })}
              style={{ ...inputStyle }}
            />
          </div>
          <Input label="Comentario (opcional)" value={entrada.comentario} onChange={e => setEntrada({ ...entrada, comentario: e.target.value })} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn variant="primary"
              disabled={!sedeOrigenId || entrada.items.filter(i => i.producto_id && Number(i.cantidad) > 0).length === 0 || entradaM.isPending}
              loading={entradaM.isPending} onClick={() => entradaM.mutate()}>
              Registrar {entrada.items.filter(i => i.producto_id).length || ''} items
            </Btn>
          </div>
        </div>
      </Modal>
      {/* ── Modal envío sede ── */}
      <Modal open={modal === 'envio'} onClose={() => setModal(null)} title="Enviar productos a sede" width={560}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Fila 1: Sede destino + Fecha */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase' }}>Sede destino *</label>
              <select value={envio.sede_destino_id} onChange={e => setEnvio({ ...envio, sede_destino_id: e.target.value })} style={{ ...inputStyle }}>
                <option value="">Seleccionar sede...</option>
                {sedes.filter(s => s.id !== sedeOrigenId).map(s => (
                  <option key={s.id} value={s.id}>{s.nombre} - {s.ciudad}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase' }}>Fecha de envío *</label>
              <input
                type="date"
                value={envio.fechaEnvio || ''}
                onChange={e => setEnvio({ ...envio, fechaEnvio: e.target.value })}
                style={{ ...inputStyle }}
              />
            </div>
          </div>

          {/* Fila 2: Número de guía */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase' }}>Número de guía *</label>
            <input
              value={envio.guia}
              onChange={e => setEnvio({ ...envio, guia: e.target.value })}
              placeholder="Ej: GU-2024-001"
              style={{ ...inputStyle }}
            />
          </div>

          {/* Fila 3: Comentario */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase' }}>Comentario</label>
            <input
              value={envio.comentario}
              onChange={e => setEnvio({ ...envio, comentario: e.target.value })}
              placeholder="Opcional..."
              style={{ ...inputStyle }}
            />
          </div>

          {/* Fila 4: Productos */}
          <ItemsEditorEnvio stock={stockQ.data || []} items={envio.items}
            setItems={items => setEnvio({ ...envio, items })} productosList={productosStock} sedeId={sedeOrigenId} />

          {/* Botones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn variant="primary"
              disabled={!sedeOrigenId || !envio.sede_destino_id || !envio.guia?.trim() || !envio.items.some(i => {
                const prod = (stockQ.data || []).find(s => String(s.producto_id) === String(i.producto_id));
                const usaPon = isOnuProduct(prod || {}) && (i.modo_onu || 'cantidad') === 'pon';
                return i.producto_id && (usaPon ? (i.onu_ids || []).length > 0 : Number(i.cantidad) > 0);
              }) || envioM.isPending}
              loading={envioM.isPending} onClick={() => envioM.mutate()}>
              Confirmar envío
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ── Modal activos ── */}
      <Modal open={modal === 'activo'} onClose={() => setModal(null)} title="Enviar stock a activos" width={520}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sedeOrigenNombre && (
            <div style={{ fontSize: 12, color: 'var(--txt-3)', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-3)' }}>
              Stock origen: <strong style={{ color: 'var(--txt)' }}>{sedeOrigenNombre}</strong>
            </div>
          )}
          <Select label="Sede destino" value={activoForm.sede_destino_id} onChange={e => setActivoForm({ ...activoForm, sede_destino_id: e.target.value })}>
            <option value="">Seleccionar...</option>
            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre} - {s.ciudad}</option>)}
          </Select>
          <Select label="Área" value={activoForm.area} onChange={e => setActivoForm({ ...activoForm, area: e.target.value })}>
            <option value="NOC">NOC</option>
            <option value="ADMINISTRACION">Administración</option>
          </Select>
          <ItemsEditor stock={stockQ.data || []} items={activoForm.items}
            setItems={items => setActivoForm({ ...activoForm, items })} productosList={productosStock} />
          <Input label="Descripción (opcional)" value={activoForm.descripcion}
            onChange={e => setActivoForm({ ...activoForm, descripcion: e.target.value })}
            placeholder="Ej: equipos enviados al área NOC" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn variant="primary"
              disabled={!sedeOrigenId || !activoForm.sede_destino_id || !itemsActivosValidos || activosM.isPending}
              loading={activosM.isPending} onClick={() => activosM.mutate()}>
              Crear activos ({totalActivosCrear})
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ── Modal exportar ── */}
      <Modal open={modal === 'exportar'} onClose={() => setModal(null)} title="Exportar inventario" width={440}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase' }}>Sede *</label>
            <select value={exportForm.sede_id} onChange={e => setExportForm({ ...exportForm, sede_id: e.target.value })} style={{ ...inputStyle }}>
              <option value="">Seleccionar sede...</option>
              {sedePrincipal && (
                <option value={sedePrincipal.id}>{sedePrincipal.nombre} (Central)</option>
              )}
              {sedes.filter(s => !sedePrincipal || s.id !== sedePrincipal.id).map(s => (
                <option key={s.id} value={s.id}>{s.nombre} - {s.ciudad}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase' }}>Categoría</label>
            <select value={exportForm.categoria} onChange={e => setExportForm({ ...exportForm, categoria: e.target.value })} style={{ ...inputStyle }}>
              <option value="todas">Todas las categorías</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase' }}>Formato</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setExportForm({ ...exportForm, formato: 'excel' })}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  height: 36, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: exportForm.formato === 'excel' ? 'none' : '1px solid var(--border)',
                  background: exportForm.formato === 'excel' ? 'var(--accent)' : 'var(--bg-3)',
                  color: exportForm.formato === 'excel' ? '#fff' : 'var(--txt-3)',
                }}>
                <FileSpreadsheet size={14} /> Excel
              </button>
              <button type="button" onClick={() => setExportForm({ ...exportForm, formato: 'pdf' })}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  height: 36, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: exportForm.formato === 'pdf' ? 'none' : '1px solid var(--border)',
                  background: exportForm.formato === 'pdf' ? 'var(--accent)' : 'var(--bg-3)',
                  color: exportForm.formato === 'pdf' ? '#fff' : 'var(--txt-3)',
                }}>
                <FileText size={14} /> PDF
              </button>
            </div>
          </div>

          {exportForm.sede_id && (
            <div style={{ fontSize: 12, color: 'var(--txt-3)', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-3)' }}>
              {exportStockQ.isLoading ? 'Cargando productos...' : (
                <>Se exportarán <strong style={{ color: 'var(--txt)' }}>{exportRows.length}</strong> producto{exportRows.length !== 1 ? 's' : ''}</>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn variant="primary"
              disabled={!exportForm.sede_id || exportStockQ.isLoading || exportRows.length === 0}
              onClick={handleExportar}>
              Exportar
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ── Modal confirmar recepción ── */}
      <Modal open={modal === 'confirmar-envio'} onClose={() => { setModal(null); setEnvioSeleccionado(null); }} title="Confirmar recepción" width={420}>
        {envioSeleccionado && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', fontSize: 13 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Guía: {envioSeleccionado.guia}</div>
              <div style={{ color: 'var(--txt-3)', marginBottom: 4 }}>Desde: <strong>{envioSeleccionado.sedeOrigen}</strong></div>
              <div style={{ color: 'var(--txt-3)' }}>
                {envioSeleccionado.detalles?.map((d, i) => (
                  <div key={i}>{d.cantidad}× {d.producto}</div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--txt-2)' }}>
              Al confirmar, el stock se sumará a esta sede.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="ghost" onClick={() => { setModal(null); setEnvioSeleccionado(null); }}>Cancelar</Btn>
              <Btn
                onClick={() => confirmarEnvioM.mutate(envioSeleccionado.id)}
                disabled={confirmarEnvioM.isPending}
                loading={confirmarEnvioM.isPending}
              >
                Confirmar recepción
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal cancelar envío ── */}
      <Modal open={modal === 'cancelar-envio'} onClose={() => { setModal(null); setEnvioSeleccionado(null); setMotivoCancelacion(''); }} title="Cancelar envío" width={420}>
        {envioSeleccionado && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', fontSize: 13 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Guía: {envioSeleccionado.guia}</div>
              <div style={{ color: 'var(--txt-3)', marginBottom: 4 }}>Desde: <strong>{envioSeleccionado.sedeOrigen}</strong></div>
              <div style={{ color: 'var(--txt-3)' }}>
                {envioSeleccionado.detalles?.map(d => `${d.cantidad}× ${d.producto}`).join(' · ')}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase' }}>
                Motivo de cancelación *
              </label>
              <input
                value={motivoCancelacion}
                onChange={e => setMotivoCancelacion(e.target.value)}
                placeholder="Ej: productos incorrectos, guía equivocada..."
                style={{ width: '100%', height: 36, padding: '0 12px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--txt)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ fontSize: 13, color: 'var(--txt-2)' }}>
              Al cancelar, el stock será devuelto a la sede origen.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="ghost" onClick={() => { setModal(null); setEnvioSeleccionado(null); setMotivoCancelacion(''); }}>Volver</Btn>
              <Btn
                variant="danger"
                disabled={!motivoCancelacion.trim() || cancelarEnvioM.isPending}
                loading={cancelarEnvioM.isPending}
                onClick={() => cancelarEnvioM.mutate({ id: envioSeleccionado.id, motivo: motivoCancelacion })}
              >
                Confirmar cancelación
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}