import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Check, FileDown, Mail, MessageCircle, MoreHorizontal, Package, Plus, Search, Send, TrendingDown, Wifi, X } from 'lucide-react';
import { onusApi, productosApi, stockApi, tecnicosApi, sedesApi } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Card, Spinner, Btn, Input, Select, Badge, Modal as UIModal } from '../../components/ui';

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const CSS = `
  .ainv-toolbar        { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: nowrap; }
  .ainv-toolbar-search { flex: 1 1 auto; min-width: 120px; }
  .ainv-toolbar-btns   { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; flex-shrink: 0; margin-left: auto; }
  .ainv-menu-wrap      { position: relative; }
  .ainv-menu-dropdown  { position: absolute; top: calc(100% + 6px); right: 0; min-width: 230px; z-index: 50; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 12px 32px rgba(0,0,0,0.18); overflow: hidden; }
  .ainv-menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 14px;
    border: none;
    border-bottom: 1px solid var(--border);
    background: transparent;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    color: var(--txt);
    text-align: left;
    white-space: nowrap;
    transition: background .12s;
  }
  .ainv-menu-item:hover:not(:disabled) { background: var(--bg-3); }
  .ainv-menu-item:last-child { border-bottom: none; }
  .ainv-menu-item:disabled   { opacity: 0.5; cursor: not-allowed; }
  .ainv-table   { display: block; }
  .ainv-cards   { display: none; }

  @media (max-width: 1080px) {
    .ainv-toolbar        { flex-direction: column !important; align-items: stretch; }
    .ainv-toolbar-search { width: 100%; }
    .ainv-toolbar-btns   { width: 100%; }
    .ainv-toolbar-btns > * { flex: 1; justify-content: center; }
    .ainv-menu-dropdown  { left: 0; right: 0; width: 100%; min-width: 0; }
    .ainv-table { display: none !important; }
    .ainv-cards { display: flex !important; flex-direction: column; gap: 10px; padding: 10px; }
    .ainv-envio-pendiente { flex-direction: column !important; }
    .ainv-envio-pendiente > div:last-child { width: 100%; display: flex; gap: 8px; }
    .ainv-envio-pendiente > div:last-child > * { flex: 1; justify-content: center; }
  }

  .ainv-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ainv-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }
  .ainv-row-hover:hover { background: var(--bg-3); }
`;
if (typeof document !== 'undefined' && !document.getElementById('ainv-responsive-css')) {
  const s = document.createElement('style');
  s.id = 'ainv-responsive-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

const dateInputStyle = {
  width: '100%', padding: '9px 12px', background: 'var(--bg-3)',
  border: '1px solid var(--border-2)', borderRadius: 8,
  color: 'var(--txt)', fontSize: 13, outline: 'none',
};

const CATEGORIA_COLORS = {
  'rollo':           { bg: '#E6F1FB', color: '#0C447C' },
  'pasivos':         { bg: '#EEEDFE', color: '#3C3489' },
  'infraestructura': { bg: '#FAEEDA', color: '#633806' },
  'activos':         { bg: '#E1F5EE', color: '#085041' },
  'onu':             { bg: '#E1F5EE', color: '#085041' },
};
function categoriaBadgeStyle(cat) {
  const key = (cat || '').toLowerCase();
  for (const [k, v] of Object.entries(CATEGORIA_COLORS)) {
    if (key.includes(k)) return v;
  }
  return { bg: 'var(--bg-3)', color: 'var(--txt-2)' };
}

function useMiSede() {
  const usuario = useAuthStore(s => s.usuario);
  return {
    usuario,
    sedeId: usuario?.sedeId,
    sedeNombre: usuario?.sede?.nombre || 'Mi sede',
    puedeEnviarStock: usuario?.sede?.puedeEnviarStock || false,
    esPrincipal: usuario?.sede?.esPrincipal || false,
  };
}

function isOnuProduct(p) {
  return `${p.categoria || ''} ${p.producto || p.nombre || ''}`.toLowerCase().includes('onu');
}

function SedeBadge({ sedeNombre }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--txt)' }}>
      {sedeNombre}
    </div>
  );
}

function WhatsAppIcon({ size = 15, color = '#25D366' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.85.5 3.59 1.42 5.1L2 22l5.13-1.5c1.43.78 3.07 1.21 4.91 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.78 14.08c-.24.67-1.4 1.31-1.93 1.39-.5.08-1.13.11-1.82-.11-.42-.13-.95-.31-1.64-.6-2.88-1.24-4.76-4.13-4.9-4.32-.14-.19-1.18-1.57-1.18-3 0-1.42.74-2.12 1-2.41.26-.29.57-.36.76-.36.19 0 .38 0 .55.01.18.01.41-.07.64.49.24.58.81 2 .88 2.14.07.14.12.31.02.5-.1.19-.15.31-.29.48-.14.17-.3.38-.43.51-.14.14-.29.29-.12.57.17.28.76 1.25 1.63 2.02 1.12.99 2.07 1.3 2.36 1.44.29.14.46.12.63-.07.17-.19.73-.85.93-1.14.19-.29.39-.24.65-.14.27.1 1.7.8 1.99.95.29.14.48.21.55.33.07.12.07.7-.17 1.37z"/>
    </svg>
  );
}

function StockBar({ stock, minimo }) {
  if (!minimo) return <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--txt)' }}>{stock}</span>;
  const low  = stock <= minimo;
  const warn = stock <= minimo * 1.5;
  const color = low ? '#A32D2D' : warn ? '#854F0B' : '#3B6D11';
  return <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color }}>{stock}</span>;
}

function MetrosCell({ p }) {
  if (!p.es_medible || !p.metros_por_unidad) return <span style={{ color: 'var(--txt-3)', fontSize: 13 }}>—</span>;
  const metros = p.cantidad * p.metros_por_unidad;
  const minimoMetros = (p.stock_minimo || 0) * p.metros_por_unidad;
  const low  = minimoMetros > 0 && metros <= minimoMetros;
  const warn = minimoMetros > 0 && metros <= minimoMetros * 1.5;
  const color = metros === 0 ? '#A32D2D' : low ? '#A32D2D' : warn ? '#854F0B' : '#185FA5';
  return (
    <div>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color }}>
        {metros.toLocaleString()}m
      </span>
      <div style={{ fontSize: 10, color: 'var(--txt-3)', marginTop: 2 }}>
        {p.metros_por_unidad.toLocaleString()}m/{p.unidad || 'u'}
      </div>
    </div>
  );
}

function ProductSearch({ label, search, setSearch, products, selected, onAdd }) {
  const selectedIds = selected.map(i => String(i.producto_id));
  const results = search
    ? products.filter(p => !selectedIds.includes(String(p.producto_id)) && `${p.producto} ${p.codigo || ''} ${p.categoria || ''}`.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : [];
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 11px', height: 38, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-2)' }}>
        <Search size={16} color="var(--txt-3)" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre o código..." style={{ border: 0, outline: 0, flex: 1, fontSize: 13, background: 'transparent', color: 'var(--txt)' }} />
      </div>
      {results.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginTop: 6, maxHeight: 220, overflowY: 'auto', background: 'var(--bg-card)' }}>
          {results.map(p => (
            <button key={p.producto_id} type="button" onClick={() => { onAdd(p); setSearch(''); }}
              style={{ width: '100%', border: 0, background: 'transparent', padding: '9px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', borderBottom: '1px solid var(--border)', transition: 'background .12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span><strong>{p.producto}</strong>{p.codigo && <span style={{ marginLeft: 8, color: 'var(--txt-3)', fontSize: 12 }}>{p.codigo}</span>}</span>
              {p.cantidad != null && <span style={{ color: 'var(--txt-3)', fontSize: 12 }}>disp: <strong>{p.cantidad}</strong></span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemsList({ stock, items, setItems, showDisponible = true, sedeId, allowOnu = true }) {
  const update = (idx, key, value) => setItems(items.map((it, i) => i === idx ? { ...it, [key]: value } : it));
  const remove = idx => setItems(items.filter((_, i) => i !== idx));
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Productos seleccionados ({items.length})</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.length === 0 && <div style={{ color: 'var(--txt-3)', fontSize: 13, padding: '8px 0' }}>Busca y selecciona productos.</div>}
        {items.map((item, idx) => {
          const prod = stock.find(s => String(s.producto_id) === String(item.producto_id));
          const esOnu = allowOnu && isOnuProduct(prod || {});
          return (
            <div key={idx}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 8, alignItems: 'center', padding: 8, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-3)' }}>
                <div>
                  <strong style={{ fontSize: 13 }}>{prod?.producto || 'Producto'}</strong>
                  <div style={{ color: 'var(--txt-3)', fontSize: 11 }}>{prod?.codigo || '—'}{showDisponible && prod?.cantidad != null ? ` · disp. ${prod.cantidad}` : ''}</div>
                </div>
                {esOnu
                  ? <div style={{ height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', background: 'var(--bg-2)', fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)', minWidth: 120 }}>
                      {(item.onu_ids || []).length} ONU{(item.onu_ids || []).length !== 1 ? 's' : ''}
                    </div>
                  : <input style={{ height: 34, border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', background: 'var(--bg-2)', color: 'var(--txt)', fontSize: 13 }} type="number" min="1" max={prod?.cantidad || undefined} placeholder="Cantidad" value={item.cantidad} onChange={e => update(idx, 'cantidad', e.target.value)} />
                }
                <Btn variant="danger" size="sm" onClick={() => remove(idx)}><X size={15} /></Btn>
              </div>
              {esOnu && sedeId && (
                <OnuPanelInline sedeId={sedeId} productoId={item.producto_id} selectedIds={item.onu_ids || []} onChange={ids => update(idx, 'onu_ids', ids)} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ItemsListRequerimiento({ stock, items, setItems, productos = [] }) {
  const update = (idx, key, value) => setItems(items.map((it, i) => i === idx ? { ...it, [key]: value } : it));
  const remove = idx => setItems(items.filter((_, i) => i !== idx));
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Productos solicitados ({items.length})</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.length === 0 && <div style={{ color: 'var(--txt-3)', fontSize: 13, padding: '8px 0' }}>Busca y selecciona productos.</div>}
        {items.map((item, idx) => {
          const prodStock = stock.find(s => String(s.producto_id) === String(item.producto_id));
          const prodCat   = productos.find(p => String(p.id) === String(item.producto_id));
          const prod = prodStock || (prodCat ? { producto_id: prodCat.id, producto: prodCat.nombre, codigo: prodCat.codigo, cantidad: 0 } : null);          return (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 110px auto', gap: 8, alignItems: 'center', padding: 8, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-3)' }}>
              <div>
                <strong style={{ fontSize: 13 }}>{prod?.producto || 'Producto'}</strong>
                <div style={{ color: 'var(--txt-3)', fontSize: 11 }}>
                  {prod?.codigo || '—'} · stock actual: <strong style={{ color: prod?.cantidad > 0 ? 'var(--txt-2)' : '#A32D2D' }}>{prod?.cantidad ?? 0}</strong>
                </div>
              </div>
              <input
                style={{ height: 34, border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', background: 'var(--bg-2)', color: 'var(--txt)', fontSize: 13 }}
                type="number" min="1" placeholder="Cantidad"
                value={item.cantidad} onChange={e => update(idx, 'cantidad', e.target.value)}
              />
              <Btn variant="danger" size="sm" onClick={() => remove(idx)}><X size={15} /></Btn>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OnuPanelInline({ sedeId, productoId, selectedIds, onChange }) {
  const [filter, setFilter] = useState('');
  const onusQ = useQuery({
    queryKey: ['onus-panel-inline', sedeId, productoId],
    enabled: Boolean(sedeId && productoId),
    queryFn: () => onusApi.disponibles({ sedeId, producto_id: productoId }).then(r => r.data),
  });
  const onus = (onusQ.data || []).filter(o => !filter || o.codigo_pon.toLowerCase().includes(filter.toLowerCase()));
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

function OnuEditRow({ onu, onSave, codigosExistentes = [] }) {
  const [editando, setEditando] = React.useState(false);
  const [valor,    setValor]    = React.useState(onu.codigo_pon || '');
  const [loading,  setLoading]  = React.useState(false);

  const valorLimpio = valor.trim().toUpperCase();
  // Duplicado = coincide con otro código ya registrado (no cuenta el propio valor actual)
  const esDuplicado = valorLimpio !== '' && valorLimpio !== onu.codigo_pon &&
    codigosExistentes.some(c => c === valorLimpio);

  const guardar = async () => {
    if (!valorLimpio || valorLimpio === onu.codigo_pon) { setEditando(false); return; }
    if (esDuplicado) return; // el botón ya queda deshabilitado, doble seguro
    setLoading(true);
    try {
      await onSave(onu.id, valorLimpio);
      setEditando(false);
    } catch (e) {
      // Se queda abierto en edición si falla (ej. duplicado detectado en el
      // servidor) — antes se cerraba igual y parecía que había funcionado.
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: esDuplicado ? '1px solid var(--red)' : editando ? '0.5px solid #1D9E75' : '0.5px solid var(--border)', background: esDuplicado ? 'var(--red-bg)' : editando ? '#E1F5EE' : 'var(--bg-card)', transition: 'all .15s' }}>
      <Wifi size={15} style={{ color: esDuplicado ? 'var(--red)' : editando ? '#0F6E56' : 'var(--txt-3)', flexShrink: 0 }} />
      {editando ? (
        <>
          <input autoFocus value={valor} onChange={e => setValor(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') setEditando(false); }} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: 'var(--font-mono)', color: esDuplicado ? 'var(--red)' : '#085041' }} />
          <button onClick={guardar} disabled={loading || esDuplicado} style={{ fontSize: 12, color: '#0F6E56', display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, cursor: (loading || esDuplicado) ? 'not-allowed' : 'pointer', background: esDuplicado ? 'var(--bg-3)' : '#9FE1CB', border: 'none', fontWeight: 600, opacity: esDuplicado ? 0.6 : 1 }}>
            <Check size={13} /> {loading ? '...' : 'Guardar'}
          </button>
          <button onClick={() => { setValor(onu.codigo_pon); setEditando(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0F6E56', padding: 4 }}>
            <X size={13} />
          </button>
        </>
      ) : (
        <>
          <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{onu.codigo_pon}</span>
          <span style={{ fontSize: 11, color: onu.salida_directa ? '#991B1B' : 'var(--txt-3)', background: onu.salida_directa ? '#FEE2E2' : 'var(--bg-3)', padding: '2px 8px', borderRadius: 6 }}>
            {onu.salida_directa ? 'Malogrado' : onu.tecnico_id ? (onu.tecnico || 'Técnico') : onu.cliente ? 'Instalada' : 'En sede'}
          </span>
          <button onClick={() => setEditando(true)} style={{ fontSize: 12, color: 'var(--txt-3)', display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, cursor: 'pointer', background: 'none', border: '0.5px solid var(--border)' }}>✏ Editar</button>
        </>
      )}
    </div>
    {esDuplicado && (
      <span style={{ fontSize: 11, color: 'var(--red)', paddingLeft: 4 }}>
        Ese código ya está registrado en otra ONU.
      </span>
    )}
    </div>
  );
}

export default function AdminAlmacenInventario() {
  const qc = useQueryClient();
  const { sedeId, sedeNombre, puedeEnviarStock, esPrincipal } = useMiSede();
  const [q, setQ] = useState('');
  const qDebounced = useDebounce(q);
  const [modal, setModal] = useState(null);
  const [envioSeleccionado, setEnvioSeleccionado] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuAbierto) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(false);
    };
    const handleKey = (e) => { if (e.key === 'Escape') setMenuAbierto(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuAbierto]);

  const hoy = new Date().toISOString().split('T')[0];

  const [entrada,    setEntrada]    = useState({ comentario: '', items: [], fecha: hoy });
  const [asignacion, setAsignacion] = useState({ tecnico_id: '', comentario: '', items: [], onu_ids: [] });
  const [directa,    setDirecta]    = useState({ comentario: '', items: [], onu_ids: [], fecha: hoy });
  const [onuForm,    setOnuForm]    = useState({ producto_id: '', codigos_pon: [''] });
  const [entradaSearch,    setEntradaSearch]    = useState('');
  const [asignacionSearch, setAsignacionSearch] = useState('');
  const [directaSearch,    setDirectaSearch]    = useState('');
  const [envio,      setEnvio]      = useState({ sede_destino_id: '', guia: '', comentario: '', items: [], fecha: hoy });
  const [envioSearch, setEnvioSearch] = useState('');
  const [requerimiento, setRequerimiento] = useState({ items: [], nota: '' });
  const [requerimientoSearch, setRequerimientoSearch] = useState('');

  const stockQ = useQuery({
    queryKey: ['admin-stock-sede', sedeId, qDebounced],
    enabled: Boolean(sedeId),
    queryFn: () =>
      stockApi.listar({ q: qDebounced || undefined }).then(r => r.data),

    placeholderData: (previousData) => previousData,
  });
  const productosQ      = useQuery({ queryKey: ['admin-productos-visibles'], queryFn: () => productosApi.listar().then(r => r.data) });
  const tecnicosQ       = useQuery({ queryKey: ['admin-tecnicos-almacen'], queryFn: () => tecnicosApi.listar().then(r => r.data) });
  const onusExistentesQ = useQuery({ queryKey: ['onus-existentes', sedeId, onuForm.producto_id], enabled: Boolean(sedeId && onuForm.producto_id), queryFn: () => onusApi.listar({ sedeId, producto_id: onuForm.producto_id, solo_disponibles: false }).then(r => r.data) });
  const enviosPendientesQ = useQuery({ queryKey: ['envios-pendientes', sedeId], enabled: Boolean(sedeId), queryFn: () => stockApi.listarEnviosPendientes({ sedeId }).then(r => r.data) });
  // BUG 3 FIX: historial de envíos enviados DESDE esta sede (incluye CANCELADOS)
  const enviosOrigenQ   = useQuery({ queryKey: ['envios-origen', sedeId], enabled: Boolean(sedeId), queryFn: () => stockApi.listarEnviosOrigen({ sedeId }).then(r => r.data) });
  const sedesQ          = useQuery({ queryKey: ['sedes-para-envio'], queryFn: () => sedesApi.listarParaEnvio().then(r => r.data) });

  const refresh = () => {
  qc.invalidateQueries({ queryKey: ['admin-stock-sede'] });
  qc.invalidateQueries({ queryKey: ['admin-stock-stats'] });
  qc.invalidateQueries({ queryKey: ['admin-stock-auditoria'] });
  qc.invalidateQueries({ queryKey: ['onus-panel-inline'] });
  qc.invalidateQueries({ queryKey: ['onus-existentes'] });
  qc.invalidateQueries({ queryKey: ['inventario-tecnico'] });
};

  const entradaItemsValidos = entrada.items.filter(i => i.producto_id && Number(i.cantidad) > 0);

  const entradaM = useMutation({
    mutationFn: () => {
      const ahora = new Date();
      const horaActual = `T${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}:${String(ahora.getSeconds()).padStart(2,'0')}`;
      return stockApi.entrada({
        sedeId,
        comentario: entrada.comentario,
        fechaEntrada: entrada.fecha ? entrada.fecha + horaActual : null,
        items: entradaItemsValidos,
      });
    },
    onSuccess: () => { toast.success('Entrada registrada'); setEntrada({ comentario: '', items: [], fecha: hoy }); setEntradaSearch(''); setModal(null); refresh(); },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo registrar la entrada'),
  });

  const asignarM = useMutation({
  mutationFn: () => {
    const itemsValidos = asignacion.items.filter(i => {
      const prod = stock.find(s => String(s.producto_id) === String(i.producto_id));
      const esOnu = isOnuProduct(prod || {});
      return i.producto_id && (esOnu ? (i.onu_ids || []).length > 0 : Number(i.cantidad) > 0);
    });
    const onuIds = itemsValidos.flatMap(i => i.onu_ids || []);
    const itemsSoloNormales = itemsValidos
      .filter(i => !isOnuProduct(stock.find(s => String(s.producto_id) === String(i.producto_id)) || {}))
      .map(({ onu_ids, ...rest }) => rest);
    return stockApi.asignarCompleto({ ...asignacion, items: itemsSoloNormales, onu_ids: onuIds });
  },
  onSuccess: () => { toast.success('Asignación registrada'); setAsignacion({ tecnico_id: '', comentario: '', items: [], onu_ids: [] }); setModal(null); refresh(); },
  onError: e => toast.error(e.response?.data?.error || 'No se pudo registrar la asignación'),
});

  const directaM = useMutation({
    mutationFn: () => {
      const itemsValidos = directa.items.filter(i => { const prod = stock.find(s => String(s.producto_id) === String(i.producto_id)); const esOnu = isOnuProduct(prod || {}); return i.producto_id && (esOnu ? (i.onu_ids || []).length > 0 : Number(i.cantidad) > 0); });
      const onuIds = itemsValidos.flatMap(i => i.onu_ids || []);
      const itemsSoloNormales = itemsValidos.filter(i => !isOnuProduct(stock.find(s => String(s.producto_id) === String(i.producto_id)) || {})).map(({ onu_ids, ...rest }) => rest);
      const ahora = new Date();
      const horaActual = `T${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}:${String(ahora.getSeconds()).padStart(2,'0')}`;
      return stockApi.salidaDirecta({
        ...directa,
        fechaSalida: directa.fecha ? directa.fecha + horaActual : null,
        items: itemsSoloNormales,
        onu_ids: onuIds,
      });
    },
    onSuccess: () => { toast.success('Salida directa registrada'); setDirecta({ comentario: '', items: [], onu_ids: [], fecha: hoy }); setModal(null); refresh(); },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo registrar la salida'),
  });

  const registrarOnuM = useMutation({
    // Promise.allSettled en vez de Promise.all: si un código falla (ej. duplicado),
    // los demás igual se registran y NO se pierden — antes, con Promise.all, un solo
    // fallo hacía que se rechazara todo el lote y el contador nunca se actualizaba,
    // aunque el resto ya se hubiera guardado en la base de datos.
    mutationFn: async () => {
      const codigos = (onuForm.codigos_pon || []).map(c => c.trim()).filter(Boolean);
      const resultados = await Promise.allSettled(
        codigos.map(codigo_pon => onusApi.crear({ sedeId, producto_id: onuForm.producto_id, codigo_pon }))
      );
      const exitosos = codigos.filter((_, i) => resultados[i].status === 'fulfilled');
      const fallidos = codigos
        .map((codigo, i) => ({ codigo, resultado: resultados[i] }))
        .filter(({ resultado }) => resultado.status === 'rejected');
      return { exitosos, fallidos };
    },
    onSuccess: ({ exitosos, fallidos }) => {
      if (exitosos.length > 0) refresh();
      if (fallidos.length === 0) {
        toast.success(`${exitosos.length} ONU${exitosos.length !== 1 ? 's' : ''} registrada${exitosos.length !== 1 ? 's' : ''}`);
        setOnuForm({ producto_id: '', codigos_pon: [''] });
        setModal(null);
      } else {
        toast.error(
          `${exitosos.length} registrada${exitosos.length !== 1 ? 's' : ''}, ${fallidos.length} con error (código repetido o inválido). Corrige y vuelve a intentar.`
        );
        // Solo dejar en el formulario los que fallaron — los que sí se
        // registraron no se vuelven a mandar en el siguiente intento.
        setOnuForm(prev => ({ ...prev, codigos_pon: fallidos.map(f => f.codigo) }));
      }
    },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo registrar la ONU'),
  });

  const onusSalidaDirectaQ = useQuery({
    queryKey: ['onus-salida-directa', sedeId],
    enabled: Boolean(sedeId) && modal === 'reingresar-onu',
    queryFn: () => stockApi.listarOnusSalidaDirecta({ sedeId }).then(r => r.data),
  });

  const reingresarSalidaDirectaM = useMutation({
    mutationFn: (id) => stockApi.reingresarOnuSalidaDirecta(id),
    onSuccess: () => {
      toast.success('ONU reingresada al stock');
      qc.invalidateQueries({ queryKey: ['onus-salida-directa'] });
      refresh();
    },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo reingresar la ONU'),
  });

  const confirmarEnvioM = useMutation({
    mutationFn: (id) => stockApi.confirmarEnvio(id),
    onSuccess: () => { toast.success('Envío confirmado'); setEnvioSeleccionado(null); setModal(null); refresh(); qc.invalidateQueries({ queryKey: ['envios-pendientes'] }); },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo confirmar'),
  });

  const cancelarEnvioM = useMutation({
    mutationFn: ({ id, motivo }) => stockApi.cancelarEnvio(id, { motivo }),
    onSuccess: () => { toast.success('Envío cancelado'); setEnvioSeleccionado(null); setMotivoCancelacion(''); setModal(null); refresh(); qc.invalidateQueries({ queryKey: ['envios-pendientes'] }); },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo cancelar'),
  });

  const enviarStockM = useMutation({
    mutationFn: () => {
      const itemsNormales = envio.items.filter(i => {
        const prod = stock.find(s => String(s.producto_id) === String(i.producto_id));
        const esOnu = isOnuProduct(prod || {});
        return i.producto_id && (esOnu ? (i.onu_ids || []).length > 0 : Number(i.cantidad) > 0);
      });
      const onuIds = itemsNormales.flatMap(i => i.onu_ids || []);
      const itemsSoloNormales = itemsNormales
        .filter(i => !(isOnuProduct(stock.find(s => String(s.producto_id) === String(i.producto_id)) || {})))
        .map(({ onu_ids, ...rest }) => rest);
      return stockApi.enviarSede({
        sedeId,
        sedeDestinoId: envio.sede_destino_id,
        guia: envio.guia,
        comentario: envio.comentario,
        fechaEnvio: (() => {
          if (!envio.fecha) return null;
          const ahora = new Date();
          const horaActual = `T${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}:${String(ahora.getSeconds()).padStart(2,'0')}`;
          return envio.fecha + horaActual;
        })(),
        items: itemsSoloNormales,
        onu_ids: onuIds,
      });
    },
    onSuccess: () => { toast.success('Envío registrado'); setEnvio({ sede_destino_id: '', guia: '', comentario: '', items: [], fecha: hoy }); setEnvioSearch(''); setModal(null); refresh(); qc.invalidateQueries({ queryKey: ['envios-pendientes'] }); },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo registrar el envío'),
  });

  const requerimientoCorreoM = useMutation({
    mutationFn: () => stockApi.enviarRequerimientoCorreo({
      sedeId,
      items: requerimiento.items.filter(i => i.producto_id && Number(i.cantidad) > 0),
      nota: requerimiento.nota,
    }),
    onSuccess: (res) => {
      toast.success(res?.data?.message || 'Correo enviado');
    },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo enviar el correo'),
  });

  const enviarRequerimientoWhatsapp = () => {
    const validos = requerimiento.items.filter(i => i.producto_id && Number(i.cantidad) > 0);
    if (validos.length === 0) return;

    const lineas = validos.map(i => {
      const prod = stock.find(s => String(s.producto_id) === String(i.producto_id));
      const prodCat = productos.find(p => String(p.id) === String(i.producto_id));
      const nombre = prod?.producto || prodCat?.nombre || 'Producto';
      const stockActual = prod?.cantidad ?? 0;
      return `• ${nombre} — solicito: *${i.cantidad}* (stock actual: ${stockActual})`;
    });

    const partes = [
      ` _*Requerimiento de stock — ${sedeNombre}*_`,
      '',
      ...lineas,
    ];
    if (requerimiento.nota.trim()) {
      partes.push('', `Nota: ${requerimiento.nota.trim()}`);
    }

    const mensaje = encodeURIComponent(partes.join('\n'));
    window.open(`https://wa.me/?text=${mensaje}`, '_blank');

    toast.success('Mensaje de WhatsApp abierto');
  };

  const rows       = stockQ.data || [];
  const productos  = productosQ.data || [];
  const stock      = stockQ.data || [];
  const productosOnu = stock.filter(s => s.cantidad > 0 && isOnuProduct(s));
  const hayMedibles  = rows.some(p => p.es_medible);

  const exportarExcel = () => {
    const datos = rows.map(p => {
      const metros = p.es_medible && p.metros_por_unidad ? p.cantidad * p.metros_por_unidad : null;
      const low = p.stock_minimo > 0 && p.cantidad <= p.stock_minimo;
      return {
        'Código': p.codigo || '—', 'Producto': p.producto, 'Categoría': p.categoria || '—',
        'Unidad': p.unidad || '—', 'Stock': p.cantidad,
        'Metros disponibles': metros !== null ? metros : '—',
        'Estado': low ? 'Bajo stock' : 'Disponible',
      };
    });
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(datos);
      ws['!cols'] = [{ wch: 14 }, { wch: 32 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 14 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
      XLSX.writeFile(wb, `inventario_${sedeNombre.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.xlsx`);
    });
  };

  if (stockQ.isLoading && !stockQ.data)   return (
    <div style={{ padding: 28, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <Spinner size={28} />
    </div>
  );

  return (
    <div style={{ padding: 28 }} className="animate-fade">

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--txt)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Inventario</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--txt-2)' }}>Stock local de {sedeNombre}</p>
        </div>
        <SedeBadge sedeNombre={sedeNombre} />
      </div>

      {/* ── Buscador + acciones principales ── */}
      <div className="ainv-toolbar">
        <div className="ainv-toolbar-search" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-2)' }}>
          <Search size={14} color="var(--txt-3)" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar ítem..." style={{ border: 0, outline: 0, flex: 1, fontSize: 13, background: 'transparent', color: 'var(--txt)' }} />
        </div>

        <div className="ainv-toolbar-btns">
          <Btn
            variant="ghost"
            disabled={!sedeId}
            onClick={() => { setEntrada({ comentario: '', items: [], fecha: hoy }); setEntradaSearch(''); setModal('entrada'); }}
            icon={<Plus size={15} />}
            style={{
              background: '#fff',
              color: '#000',
              borderColor: 'var(--border-2)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F2F2F2'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
          >
            Registrar entrada
          </Btn>

          <Btn
            onClick={() => { setAsignacion({ tecnico_id: '', comentario: '', items: [], onu_ids: [] }); setAsignacionSearch(''); setModal('asignar'); }}
            icon={<Send size={15} />}
            style={{ background: '#185FA5', color: '#fff', border: 'none' }}
          >
            Asignar a técnico
          </Btn>

          <div className="ainv-menu-wrap" ref={menuRef}>
            <Btn
              variant="ghost"
              onClick={() => setMenuAbierto(v => !v)}
              icon={<MoreHorizontal size={15} />}
              style={{
                background: '#fff',
                color: '#000',
                borderColor: 'var(--border-2)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F2F2F2'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
            >
              Más
            </Btn>

            {menuAbierto && (
              <div className="ainv-menu-dropdown">
                <button className="ainv-menu-item" onClick={() => { setMenuAbierto(false); setDirecta({ comentario: '', items: [], onu_ids: [], fecha: hoy }); setDirectaSearch(''); setModal('directa'); }}>
                  <TrendingDown size={15} style={{ color: '#A32D2D' }} /> Salida directa
                </button>
                <button className="ainv-menu-item" disabled={rows.length === 0} onClick={() => { setMenuAbierto(false); exportarExcel(); }}>
                  <FileDown size={15} /> Exportar Excel
                </button>
                {puedeEnviarStock && (
                  <button className="ainv-menu-item" onClick={() => { setMenuAbierto(false); setModal('envio'); }}>
                    <Send size={15} /> Enviar a sede
                  </button>
                )}
                <button className="ainv-menu-item" onClick={() => { setMenuAbierto(false); setRequerimiento({ items: [], nota: '' }); setRequerimientoSearch(''); setModal('requerimiento'); }}>
                  <WhatsAppIcon size={15} color="#128C7E" /> Solicitar requerimiento
                </button>
                <button className="ainv-menu-item" onClick={() => { setMenuAbierto(false); setModal('reingresar-onu'); }}>
                  <Wifi size={15} /> Reingresar ONU
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Envíos pendientes ── */}
      {(enviosPendientesQ.data || []).length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(enviosPendientesQ.data || []).map(env => (
            <div key={env.id} className="ainv-envio-pendiente" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid #D97706', borderRadius: 8, gap: 12 }}>
              <div style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 700 }}>📦 Envío pendiente</span>
                <span style={{ color: 'var(--txt-3)', marginLeft: 8 }}>Guía: <strong>{env.guia}</strong></span>
                <span style={{ color: 'var(--txt-3)', marginLeft: 8 }}>desde <strong>{env.sedeOrigen}</strong></span>
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--txt-3)' }}>{env.detalles?.map(d => `${d.cantidad}x ${d.producto}`).join(', ')}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="ghost" onClick={() => { setEnvioSeleccionado(env); setMotivoCancelacion(''); setModal('cancelar-envio'); }}>Cancelar</Btn>
                <Btn onClick={() => { setEnvioSeleccionado(env); setModal('confirmar-envio'); }}>Confirmar recepción</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabla ── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div className="ainv-table" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}>
                {[
                  { label: 'CÓDIGO',    w: '110px', align: 'left'   },
                  { label: 'PRODUCTO',  w: undefined, align: 'left' },
                  { label: 'CATEGORÍA', w: '140px', align: 'left'   },
                  { label: 'UNIDAD',    w: '90px',  align: 'center' },
                  { label: 'STOCK',     w: '80px',  align: 'right'  },
                  ...(hayMedibles ? [{ label: 'METROS DISP.', w: '130px', align: 'right' }] : []),
                  { label: 'ESTADO',    w: '110px', align: 'center' },
                ].map(h => (
                  <th key={h.label} style={{ padding: '10px 14px', textAlign: h.align, fontSize: 11, fontWeight: 600, color: 'var(--txt-3)', letterSpacing: '0.05em', width: h.w, whiteSpace: 'nowrap' }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={hayMedibles ? 7 : 6} style={{ padding: 32, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>
                    Sin stock en tu sede
                  </td>
                </tr>
              ) : rows.map(p => {
                const low = p.stock_minimo > 0 && p.cantidad <= p.stock_minimo;
                const badgeStyle = categoriaBadgeStyle(p.categoria);
                return (
                  <tr key={p.producto_id} className="ainv-row-hover" style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--txt-3)', whiteSpace: 'nowrap' }}>{p.codigo || '—'}</td>
                    <td style={{ padding: '12px 14px' }}><div style={{ fontWeight: 600, fontSize: 13, color: 'var(--txt)' }}>{p.producto}</div></td>
                    <td style={{ padding: '12px 14px' }}>
                      {p.categoria
                        ? <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: badgeStyle.bg, color: badgeStyle.color }}>{p.categoria}</span>
                        : <span style={{ color: 'var(--txt-3)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, color: 'var(--txt-2)' }}>{p.unidad || '—'}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}><StockBar stock={p.cantidad} minimo={p.stock_minimo} /></td>
                    {hayMedibles && <td style={{ padding: '12px 14px', textAlign: 'right' }}><MetrosCell p={p} /></td>}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {low
                          ? <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#FCEBEB', color: '#A32D2D' }}>Bajo stock</span>
                          : <span style={{ fontSize: 12, fontWeight: 600, color: '#3B6D11' }}>OK</span>
                        }
                        {isOnuProduct(p) && (
                          <button title="Registrar ONU" onClick={() => { setOnuForm({ producto_id: String(p.producto_id), codigos_pon: [''] }); setModal('onu'); }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--txt-3)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--accent)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--txt-3)'; }}>
                            <Wifi size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Móvil: cards */}
        <div className="ainv-cards">
          {rows.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin stock en tu sede</div>
          ) : rows.map(p => {
            const low = p.stock_minimo > 0 && p.cantidad <= p.stock_minimo;
            const badgeStyle = categoriaBadgeStyle(p.categoria);
            return (
              <div key={p.producto_id} className="ainv-card">
                <div className="ainv-card-top">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>{p.producto}</div>
                    {p.codigo && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt-3)' }}>{p.codigo}</span>}
                  </div>
                  {low
                    ? <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#FCEBEB', color: '#A32D2D' }}>Bajo stock</span>
                    : <span style={{ fontSize: 12, fontWeight: 600, color: '#3B6D11' }}>OK</span>
                  }
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {p.categoria && <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: badgeStyle.bg, color: badgeStyle.color }}>{p.categoria}</span>}
                  {p.unidad && <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>{p.unidad}</span>}
                  <StockBar stock={p.cantidad} minimo={p.stock_minimo} />
                  {p.es_medible && p.metros_por_unidad && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: p.cantidad * p.metros_por_unidad === 0 ? '#A32D2D' : '#185FA5', fontFamily: 'var(--font-mono)' }}>
                      {(p.cantidad * p.metros_por_unidad).toLocaleString()}m
                    </span>
                  )}
                </div>
                {isOnuProduct(p) && (
                  <Btn variant="ghost" size="sm" icon={<Wifi size={13} />} onClick={() => { setOnuForm({ producto_id: String(p.producto_id), codigos_pon: [''] }); setModal('onu'); }}>
                    Registrar ONU
                  </Btn>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ MODALES ══════════════════════════════════════════ */}

      {/* Modal: Registrar entrada */}
      {modal === 'entrada' && (
        <UIModal open={true} onClose={() => setModal(null)} title="Registrar entrada">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ProductSearch label="Buscar producto del catálogo" search={entradaSearch} setSearch={setEntradaSearch}
              products={productos.map(p => ({ producto_id: p.id, producto: p.nombre, codigo: p.codigo, categoria: p.categoria, unidad: p.unidad }))}
              selected={entrada.items} onAdd={p => setEntrada({ ...entrada, items: [...entrada.items, { producto_id: String(p.producto_id), cantidad: '' }] })} />
            <ItemsList stock={productos.map(p => ({ producto_id: p.id, producto: p.nombre, codigo: p.codigo, cantidad: null }))}
              items={entrada.items} setItems={items => setEntrada({ ...entrada, items })} showDisponible={false} allowOnu={false} />
            <div>
              <label style={{ display: 'block', marginBottom: 5, fontSize: 12, color: 'var(--txt-2)', fontWeight: 500 }}>Fecha de entrada</label>
              <input type="date" value={entrada.fecha} onChange={e => setEntrada({ ...entrada, fecha: e.target.value })} style={dateInputStyle} />
            </div>
            <Input label="Comentario" value={entrada.comentario} onChange={e => setEntrada({ ...entrada, comentario: e.target.value })} />
            <Btn onClick={() => entradaM.mutate()} disabled={!sedeId || entradaItemsValidos.length === 0 || entradaM.isPending} icon={<Check size={15} />}>
              Registrar ({entradaItemsValidos.length})
            </Btn>
          </div>
        </UIModal>
      )}

      {/* Modal: ONUs */}
      {modal === 'onu' && (() => {
        const productoActual = productosOnu.find(p => String(p.producto_id) === String(onuForm.producto_id));
        const onusData     = onusExistentesQ.data || [];
        const stockTotal   = productoActual?.cantidad || 0;
        const conCodigo    = onusData.filter(o => o.codigo_pon && !o.tecnico_id && !o.cliente && !o.salida_directa);
        const sinCodigo    = Math.max(0, stockTotal - conCodigo.length);
        const codigosLimpios = (onuForm.codigos_pon || []).map(c => c.trim()).filter(Boolean);
        const nuevosListos = codigosLimpios.length;
        // Validación de duplicados antes de enviar: contra los que ya están
        // registrados (onusData) y contra repetidos dentro del propio formulario.
        const codigosExistentesSet = new Set(onusData.map(o => o.codigo_pon).filter(Boolean));
        const codigosDuplicados = [...new Set(codigosLimpios.filter(
          (c, i) => codigosExistentesSet.has(c) || codigosLimpios.indexOf(c) !== i
        ))];
        return (
          <UIModal open={true} onClose={() => setModal(null)} title={productoActual ? `ONUs — ${productoActual.producto}` : 'Registrar ONU con PON-SN'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {!onuForm.producto_id && (
                <div style={{ padding: '0 0 14px' }}>
                  {productosOnu.length === 0 && <div style={{ padding: '10px 12px', border: '1px solid var(--red)', borderRadius: 8, color: 'var(--red)', background: 'var(--red-bg)', fontSize: 13, marginBottom: 12 }}>No hay productos ONU con stock en esta sede.</div>}
                  <Select label="Modelo / producto ONU" value={onuForm.producto_id} onChange={e => setOnuForm({ ...onuForm, producto_id: e.target.value, codigos_pon: [''] })}>
                    <option value="">Seleccionar...</option>
                    {productosOnu.map(p => <option key={p.producto_id} value={p.producto_id}>{p.codigo || '—'} — {p.producto} (stock {p.cantidad})</option>)}
                  </Select>
                </div>
              )}
              {onuForm.producto_id && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '10px 14px', marginBottom: 14, background: 'var(--bg-3)', borderRadius: 8, border: '0.5px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75' }}/><span style={{ fontSize: 12, color: 'var(--txt-3)' }}>Con código</span><span style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt)' }}>{conCodigo.length}</span>
                    </div>
                    <div style={{ width: 1, height: 18, background: 'var(--border)' }}/>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px dashed var(--txt-3)' }}/><span style={{ fontSize: 12, color: 'var(--txt-3)' }}>Sin código</span><span style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt)' }}>{sinCodigo}</span>
                    </div>
                    <div style={{ width: 1, height: 18, background: 'var(--border)' }}/>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>Total</span><span style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt)' }}>{stockTotal}</span>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <button onClick={() => setOnuForm({ producto_id: '', codigos_pon: [''] })} style={{ fontSize: 12, color: 'var(--txt-3)', background: 'none', border: 'none', cursor: 'pointer' }}>cambiar</button>
                    </div>
                  </div>
                  {onusExistentesQ.isLoading ? <div style={{ padding: 24, textAlign: 'center' }}><Spinner size={20} /></div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {conCodigo.length > 0 && (
                        <div>
                          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Con código — editar ({conCodigo.length})</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {conCodigo.map(onu => (
                              <OnuEditRow key={onu.id} onu={onu}
                                codigosExistentes={onusData.map(o => o.codigo_pon).filter(Boolean)}
                                onSave={(id, nuevoCodigo) => onusApi.actualizarCodigo(id, { codigo_pon: nuevoCodigo })
                                  .then(() => { toast.success('Código actualizado'); qc.invalidateQueries({ queryKey: ['onus-existentes'] }); })
                                  .catch(e => { toast.error(e.response?.data?.error || 'Error al actualizar'); throw e; })}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      {sinCodigo > 0 && (
                        <div style={{ borderTop: conCodigo.length > 0 ? '0.5px solid var(--border)' : 'none', paddingTop: conCodigo.length > 0 ? 16 : 0 }}>
                          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sin código — ingresar ({sinCodigo} pendientes)</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {(onuForm.codigos_pon || ['']).map((cod, idx) => {
                              const codLimpio = cod.trim().toUpperCase();
                              const esDup = codLimpio !== '' && codigosDuplicados.includes(codLimpio);
                              return (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 12, color: 'var(--txt-3)', fontFamily: 'var(--font-mono)', width: 20, textAlign: 'right', flexShrink: 0 }}>{idx + 1}</span>
                                <input value={cod} onChange={e => { const next = [...(onuForm.codigos_pon || [''])]; next[idx] = e.target.value.toUpperCase(); setOnuForm({ ...onuForm, codigos_pon: next }); }} placeholder="PON-SN" style={{ flex: 1, height: 36, border: esDup ? '1px solid var(--red)' : '0.5px solid var(--border)', borderRadius: 8, padding: '0 10px', background: esDup ? 'var(--red-bg)' : 'var(--bg-2)', color: esDup ? 'var(--red)' : 'var(--txt)', fontSize: 13, fontFamily: 'var(--font-mono)', outline: 'none' }} />
                                {esDup && <span style={{ fontSize: 10, color: 'var(--red)', flexShrink: 0 }}>duplicado</span>}
                                {(onuForm.codigos_pon?.length || 1) > 1 && <button onClick={() => setOnuForm({ ...onuForm, codigos_pon: (onuForm.codigos_pon || ['']).filter((_, i) => i !== idx) })} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-3)', flexShrink: 0 }}><X size={15} /></button>}
                              </div>
                              );
                            })}
                          </div>
                          {(onuForm.codigos_pon || []).length < sinCodigo && (
                            <button onClick={() => setOnuForm({ ...onuForm, codigos_pon: [...(onuForm.codigos_pon || ['']), ''] })} style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--txt-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}>
                              <Plus size={14} /> Agregar otro código
                            </button>
                          )}
                        </div>
                      )}
                      {sinCodigo === 0 && conCodigo.length > 0 && <div style={{ fontSize: 13, color: 'var(--txt-3)', textAlign: 'center', padding: '8px 0' }}>✅ Todas las ONUs tienen código PON registrado.</div>}
                    </div>
                  )}
                  {sinCodigo > 0 && (
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '0.5px solid var(--border)' }}>
                      {codigosDuplicados.length > 0 && (
                        <div style={{ marginBottom: 10, padding: '8px 12px', border: '1px solid var(--red)', borderRadius: 8, color: 'var(--red)', background: 'var(--red-bg)', fontSize: 12 }}>
                          Código{codigosDuplicados.length !== 1 ? 's' : ''} repetido{codigosDuplicados.length !== 1 ? 's' : ''}: <strong style={{ fontFamily: 'var(--font-mono)' }}>{codigosDuplicados.join(', ')}</strong> — corrígelos antes de registrar.
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>{nuevosListos > 0 ? `${nuevosListos} código${nuevosListos !== 1 ? 's' : ''} listo${nuevosListos !== 1 ? 's' : ''}` : 'Completa al menos un código'}</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setModal(null)} style={{ padding: '0 16px', height: 36, fontSize: 13, cursor: 'pointer', borderRadius: 8, background: 'none', border: '0.5px solid var(--border)', color: 'var(--txt-3)' }}>Cancelar</button>
                          <button onClick={() => registrarOnuM.mutate()} disabled={nuevosListos === 0 || codigosDuplicados.length > 0 || registrarOnuM.isPending} style={{ padding: '0 16px', height: 36, fontSize: 13, cursor: (nuevosListos === 0 || codigosDuplicados.length > 0) ? 'not-allowed' : 'pointer', borderRadius: 8, background: (nuevosListos > 0 && codigosDuplicados.length === 0) ? 'var(--txt)' : 'var(--bg-3)', color: (nuevosListos > 0 && codigosDuplicados.length === 0) ? 'var(--bg)' : 'var(--txt-3)', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, opacity: registrarOnuM.isPending ? 0.6 : 1 }}>
                            <Check size={14} /> Registrar {nuevosListos > 0 ? `${nuevosListos} ONU${nuevosListos !== 1 ? 's' : ''}` : 'ONUs'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </UIModal>
        );
      })()}

      {/* Modal: Asignar a técnico */}
      {modal === 'asignar' && (
        <UIModal open={true} onClose={() => setModal(null)} title="Asignar stock a técnico">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Select label="Técnico" value={asignacion.tecnico_id} onChange={e => setAsignacion({ ...asignacion, tecnico_id: e.target.value })}>
              <option value="">Seleccionar...</option>
              {(tecnicosQ.data || []).map(t => <option key={t.id} value={t.id}>{`${t.usuario?.nombre || t.nombre} ${t.usuario?.apellido || ''}`.trim()}</option>)}
            </Select>
            <ProductSearch label="Buscar item" search={asignacionSearch} setSearch={setAsignacionSearch} products={stock.filter(s => s.cantidad > 0)} selected={asignacion.items} onAdd={p => setAsignacion({ ...asignacion, items: [...asignacion.items, { producto_id: String(p.producto_id), cantidad: '' }] })} />
            <ItemsList stock={stock} items={asignacion.items} setItems={items => setAsignacion({ ...asignacion, items })} sedeId={sedeId} />
            <Input label="Comentario" value={asignacion.comentario} onChange={e => setAsignacion({ ...asignacion, comentario: e.target.value })} />
            <Btn onClick={() => asignarM.mutate()} disabled={!asignacion.tecnico_id || asignacion.items.length === 0 || asignarM.isPending} icon={<Check size={15} />}>Confirmar asignación</Btn>
          </div>
        </UIModal>
      )}

      {/* Modal: Salida directa */}
      {modal === 'directa' && (
        <UIModal open={true} onClose={() => setModal(null)} title="Salida directa de stock">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ProductSearch label="Buscar producto" search={directaSearch} setSearch={setDirectaSearch} products={stock.filter(s => s.cantidad > 0)} selected={directa.items} onAdd={p => setDirecta({ ...directa, items: [...directa.items, { producto_id: String(p.producto_id), cantidad: '', onu_ids: [] }] })} />
            <ItemsList stock={stock} items={directa.items} setItems={items => setDirecta({ ...directa, items })} sedeId={sedeId} />
            <div>
              <label style={{ display: 'block', marginBottom: 5, fontSize: 12, color: 'var(--txt-2)', fontWeight: 500 }}>Fecha de salida</label>
              <input type="date" value={directa.fecha} onChange={e => setDirecta({ ...directa, fecha: e.target.value })} style={dateInputStyle} />
            </div>
            <Input label="Motivo / comentario" value={directa.comentario} onChange={e => setDirecta({ ...directa, comentario: e.target.value })} />
            <Btn onClick={() => directaM.mutate()} disabled={!directa.comentario || directa.items.length === 0 || directaM.isPending} icon={<Check size={15} />}>Confirmar salida</Btn>
          </div>
        </UIModal>
      )}

      {/* Modal: Reingresar ONU (salida directa) */}
      {modal === 'reingresar-onu' && (
        <UIModal open={true} onClose={() => setModal(null)} title="Reingresar ONU al stock">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--txt-3)' }}>
              ONUs que salieron por "Salida directa" y pueden volver al stock disponible de tu sede.
            </p>
            {onusSalidaDirectaQ.isLoading ? (
              <div style={{ padding: 24, textAlign: 'center' }}><Spinner size={20} /></div>
            ) : (onusSalidaDirectaQ.data || []).length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>
                No hay ONUs en salida directa para reingresar.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(onusSalidaDirectaQ.data || []).map(onu => (
                  <div key={onu.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--bg-card)' }}>
                    <Wifi size={15} style={{ color: 'var(--txt-3)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{onu.codigoPon}</div>
                      <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>{onu.producto}{onu.codigo ? ` · ${onu.codigo}` : ''}</div>
                    </div>
                    <button
                      onClick={() => reingresarSalidaDirectaM.mutate(onu.id)}
                      disabled={reingresarSalidaDirectaM.isPending}
                      style={{ fontSize: 12, color: '#0F6E56', display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, cursor: 'pointer', background: '#9FE1CB', border: 'none', fontWeight: 600 }}>
                      <Check size={13} /> Reingresar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </UIModal>
      )}

      {/* Modal: Confirmar recepción */}
      {modal === 'confirmar-envio' && (
        <UIModal open={true} onClose={() => setModal(null)} title="Confirmar recepción">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '10px 12px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
              <div>Guía: <strong>{envioSeleccionado?.guia}</strong></div>
              <div style={{ marginTop: 6, color: 'var(--txt-3)' }}>Productos:</div>
              {envioSeleccionado?.detalles?.map((d, i) => <div key={i} style={{ marginLeft: 8, fontSize: 12, color: 'var(--txt-3)' }}>· {d.cantidad}x {d.producto}</div>)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--txt-2)' }}>Al confirmar, el stock se sumará a tu sede.</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn onClick={() => confirmarEnvioM.mutate(envioSeleccionado.id)} disabled={confirmarEnvioM.isPending} icon={<Check size={15} />}>Confirmar recepción</Btn>
            </div>
          </div>
        </UIModal>
      )}

      {/* Modal: Cancelar envío */}
      {modal === 'cancelar-envio' && (
        <UIModal open={true} onClose={() => setModal(null)} title="Cancelar envío">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '10px 12px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
              <div>Guía: <strong>{envioSeleccionado?.guia}</strong></div>
              {envioSeleccionado?.detalles?.map((d, i) => <div key={i} style={{ marginLeft: 8, fontSize: 12, color: 'var(--txt-3)' }}>· {d.cantidad}x {d.producto}</div>)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--txt-2)' }}>Al cancelar, el stock será devuelto a la sede origen.</div>
            <Input label="Motivo de cancelación (obligatorio)" value={motivoCancelacion} onChange={e => setMotivoCancelacion(e.target.value)} placeholder="Ej: los productos no llegaron..." />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Volver</Btn>
              <Btn variant="danger" onClick={() => cancelarEnvioM.mutate({ id: envioSeleccionado.id, motivo: motivoCancelacion })} disabled={!motivoCancelacion.trim() || cancelarEnvioM.isPending} icon={<X size={15} />}>Confirmar cancelación</Btn>
            </div>
          </div>
        </UIModal>
      )}

      {/* Modal: Enviar a sede */}
      {modal === 'envio' && (
        <UIModal open={true} onClose={() => setModal(null)} title="Enviar stock a otra sede">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ padding: '4px 0 16px', borderBottom: '1px solid var(--border)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Destino</div>
              <Select label="Sede destino" value={envio.sede_destino_id} onChange={e => setEnvio({ ...envio, sede_destino_id: e.target.value })}>
                <option value="">Seleccionar sede...</option>
                {(sedesQ.data || []).filter(s => String(s.id) !== String(sedeId)).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </Select>
              <Input label="Número de guía / tracking" value={envio.guia} onChange={e => setEnvio({ ...envio, guia: e.target.value })} placeholder="Ej: GU-2024-001" />
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 12, color: 'var(--txt-2)', fontWeight: 500 }}>Fecha de envío</label>
                <input type="date" value={envio.fecha} onChange={e => setEnvio({ ...envio, fecha: e.target.value })} style={dateInputStyle} />
              </div>
            </div>
            <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 16, paddingBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Productos a enviar</div>
              <ProductSearch label="Buscar producto" search={envioSearch} setSearch={setEnvioSearch} products={stock.filter(s => s.cantidad > 0)} selected={envio.items} onAdd={p => setEnvio({ ...envio, items: [...envio.items, { producto_id: String(p.producto_id), cantidad: '' }] })} />
              <ItemsList
                stock={stock}
                items={envio.items}
                setItems={items => setEnvio({ ...envio, items })}
                showDisponible={true}
                sedeId={sedeId}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <Input label="Comentario (opcional)" value={envio.comentario} onChange={e => setEnvio({ ...envio, comentario: e.target.value })} placeholder="Instrucciones, observaciones..." />
            </div>
            {envio.items.some(i => {
                const prod = stock.find(s => String(s.producto_id) === String(i.producto_id));
                const esOnu = isOnuProduct(prod || {});
                return i.producto_id && (esOnu ? (i.onu_ids || []).length > 0 : Number(i.cantidad) > 0);
              }) && (
              <div style={{ padding: '10px 14px', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Package size={15} style={{ color: '#2563EB', marginTop: 1, flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: 'var(--txt-2)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--txt)', display: 'block', marginBottom: 2 }}>Resumen del envío</strong>
                  {envio.items.map((i, idx) => {
                    const prod = stock.find(s => String(s.producto_id) === String(i.producto_id));
                    const esOnu = isOnuProduct(prod || {});
                    const cant = esOnu ? (i.onu_ids || []).length : Number(i.cantidad);
                    if (cant <= 0) return null;
                    return <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 10 }}>
                      <span style={{ fontWeight: 700, color: '#2563EB', fontFamily: 'var(--font-mono)' }}>{cant}×</span>{prod?.producto || '?'}
                    </span>;
                  })}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn onClick={() => enviarStockM.mutate()} disabled={
                !envio.sede_destino_id ||
                !envio.guia.trim() ||
                !envio.items.some(i => {
                  const prod = stock.find(s => String(s.producto_id) === String(i.producto_id));
                  const esOnu = isOnuProduct(prod || {});
                  return i.producto_id && (esOnu ? (i.onu_ids || []).length > 0 : Number(i.cantidad) > 0);
                }) ||
                enviarStockM.isPending
              } icon={<Send size={15} />} style={{ fontWeight: 700, background: '#185FA5', color: '#fff', border: 'none' }}>
                Confirmar envío ({envio.items.reduce((total, i) => {
                  const prod = stock.find(s => String(s.producto_id) === String(i.producto_id));
                  const esOnu = isOnuProduct(prod || {});
                  const cant = esOnu ? (i.onu_ids || []).length : Number(i.cantidad) || 0;
                  return total + cant;
                }, 0)} productos)
              </Btn>
            </div>
          </div>
        </UIModal>
      )}

      {/* Modal: Solicitar requerimiento (WhatsApp / Correo) */}
      {modal === 'requerimiento' && (
        <UIModal open={true} onClose={() => setModal(null)} title="Solicitar requerimiento de stock">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ProductSearch label="Buscar producto" search={requerimientoSearch} setSearch={setRequerimientoSearch}
              products={productos.map(p => ({ producto_id: p.id, producto: p.nombre, codigo: p.codigo, categoria: p.categoria, cantidad: (stock.find(s => s.producto_id === p.id) || {}).cantidad ?? null }))} selected={requerimiento.items}
              onAdd={p => setRequerimiento({ ...requerimiento, items: [...requerimiento.items, { producto_id: String(p.producto_id), cantidad: '' }] })} />
            <ItemsListRequerimiento stock={stock} productos={productos} items={requerimiento.items} setItems={items => setRequerimiento({ ...requerimiento, items })} />
            <Input label="Nota (opcional)" value={requerimiento.nota} onChange={e => setRequerimiento({ ...requerimiento, nota: e.target.value })} placeholder="Ej: urgente, para instalaciones de esta semana..." />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Btn onClick={enviarRequerimientoWhatsapp}
                disabled={requerimiento.items.filter(i => i.producto_id && Number(i.cantidad) > 0).length === 0}
                icon={<WhatsAppIcon size={15} color="#fff" />} style={{ flex: 1, minWidth: 160, background: '#25D366', color: '#fff', border: 'none' }}>
                Enviar por WhatsApp
              </Btn>
              <Btn onClick={() => requerimientoCorreoM.mutate()}
                disabled={requerimiento.items.filter(i => i.producto_id && Number(i.cantidad) > 0).length === 0 || requerimientoCorreoM.isPending}
                icon={<Mail size={15} />} style={{ flex: 1, minWidth: 160, background: '#185FA5', color: '#fff', border: 'none' }}>
                Enviar por correo
              </Btn>
            </div>
            <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>
              WhatsApp abre el chat para que elijas el contacto. El correo se envía directo al correo configurado para tu sede.
            </div>
          </div>
        </UIModal>
      )}

    </div>
  );
}