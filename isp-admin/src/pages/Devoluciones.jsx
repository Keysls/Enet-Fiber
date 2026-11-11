import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, RefreshCw, Package, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { stockApi } from '../services/api';
import * as XLSX from 'xlsx';
import { hoyLocal } from '../utils/helpers';

// ── Helpers ───────────────────────────────────────────────────
const fmtFecha = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return iso; }
};

// ── Estilos ───────────────────────────────────────────────────
const S = {
  page:    { padding: 24 },
  header:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 },
  title:   { fontSize: 20, fontWeight: 700, color: 'var(--txt)', margin: 0 },
  tabs:    { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  tab:     (active) => ({
    padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', border: '1px solid',
    background:  active ? 'var(--accent)' : 'transparent',
    color:       active ? '#fff' : 'var(--txt-3)',
    borderColor: active ? 'var(--accent)' : 'var(--border-2)',
  }),
  btn: (v) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8,
    cursor: 'pointer', fontSize: 12, fontWeight: 600, border: 'none',
    background: v === 'green' ? '#16a34a' : v === 'red' ? '#dc2626'
              : v === 'blue'  ? '#2563EB' : v === 'orange' ? '#D97706'
              : 'var(--bg-3)',
    color: ['green','red','blue','orange'].includes(v) ? '#fff' : 'var(--txt-2)',
    ...(v === 'ghost' && { background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--txt-2)' }),
  }),
  badge: (e) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
    ...(e === 'pendiente' && { background: '#FEF3C7', color: '#92400E' }),
    ...(e === 'aprobado'  && { background: '#DCFCE7', color: '#166534' }),
    ...(e === 'rechazado' && { background: '#FEE2E2', color: '#991B1B' }),
  }),
  empty: { textAlign: 'center', padding: 48, color: 'var(--txt-3)', fontSize: 14 },
  modal: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    padding: 16,
  },
  modalBox: {
    background: 'var(--bg)', borderRadius: 14, padding: 24,
    width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,.2)',
  },
  input: {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--bg-2)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '9px 12px', fontSize: 14, color: 'var(--txt)',
    outline: 'none', marginTop: 8, marginBottom: 14,
  },
  // tabla
  table:  { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:     { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700,
            color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '.04em',
            borderBottom: '1px solid var(--border)', background: 'var(--bg-2)', whiteSpace: 'nowrap' },
  td:     { padding: '10px 12px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' },
  wrap:   { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 },
};

// ── Badge de estado de recojo ─────────────────────────────────
function EstadoBadge({ estado }) {
  const map = {
    en_revision: { bg: '#FEF3C7', color: '#92400E', label: 'Pendiente' },
    entregado:   { bg: '#DCFCE7', color: '#166534', label: 'Bueno → Stock' },
    malogrado:   { bg: '#FEE2E2', color: '#991B1B', label: 'Malogrado' },
    en_mano:     { bg: '#EFF6FF', color: '#1D4ED8', label: 'En mano' },
  };
  const m = map[estado] || { bg: 'var(--bg-3)', color: 'var(--txt-3)', label: estado };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: m.bg, color: m.color }}>
      {m.label}
    </span>
  );
}

function FilaMaterialRevision({ dev, fila, onRevisar, revisarPending }) {
  const [buena, setBuena] = useState(String(fila.cantidad));
  const [mala,  setMala]  = useState('0');

  const total = Number(fila.cantidad);
  const sumaOk = (Number(buena) || 0) + (Number(mala) || 0) === total;

  return (
    <tr>
      <td style={S.td}>
        <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#EFF6FF', color: '#1D4ED8' }}>
          Material
        </span>
      </td>
      <td style={S.td}>
        <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{fila.producto}</div>
        <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>{fila.cantidad} {fila.unidad}</div>
      </td>
      <td style={{ ...S.td, color: 'var(--txt-3)' }}>—</td>
      <td style={{ ...S.td, color: 'var(--txt-3)' }}>—</td>
      <td style={{ ...S.td, color: 'var(--txt-2)' }}>{fila.tecnico}</td>
      <td style={{ ...S.td, color: 'var(--txt-3)' }}>—</td>
      <td style={{ ...S.td, color: 'var(--txt-3)', whiteSpace: 'nowrap' }}>{fila.fecha}</td>
      <td style={S.td}>
        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#FEF3C7', color: '#92400E' }}>
          En revisión
        </span>
      </td>
      <td style={S.td}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              style={{ ...S.btn('green'), padding: '3px 8px', fontSize: 10 }}
              onClick={() => { setBuena(String(total)); setMala('0'); }}
            >
              Todo bueno
            </button>
            <button
              style={{ ...S.btn('red'), padding: '3px 8px', fontSize: 10 }}
              onClick={() => { setBuena('0'); setMala(String(total)); }}
            >
              Todo malo
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <label style={{ fontSize: 10, color: 'var(--txt-3)' }}>Buenas</label>
            <input
              type="number" min="0" max={total} value={buena}
              onChange={e => setBuena(e.target.value)}
              style={{ width: 50, padding: '3px 6px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 4 }}
            />
            <label style={{ fontSize: 10, color: 'var(--txt-3)' }}>Malas</label>
            <input
              type="number" min="0" max={total} value={mala}
              onChange={e => setMala(e.target.value)}
              style={{ width: 50, padding: '3px 6px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 4 }}
            />
          </div>
          {!sumaOk && (
            <span style={{ fontSize: 10, color: '#DC2626' }}>
              Buenas + Malas debe ser {total}
            </span>
          )}
          <button
            style={{ ...S.btn('blue'), padding: '4px 10px', fontSize: 11 }}
            disabled={!sumaOk || revisarPending}
            onClick={() => onRevisar(fila._detalleId, Number(buena) || 0, Number(mala) || 0)}
          >
            Confirmar revisión
          </button>
        </div>
      </td>
    </tr>
  );
}

function TablaItems({ dev, onRevisarRecojo, onRevisarDetalle, revisarPending, revisarDetallePending }) {
  // Unificar detalles de material y recojos en una sola lista de filas
  const filasMaterial = (dev.detalles || []).map(d => ({
    _tipo: 'material',
    _detalleId: d.id,
    _estadoDetalle: d.estado,
    id: `mat-${d.id ?? d.productoId}`,
    tipo: 'Material',
    producto: d.nombre,
    pon: '—',
    sn: '—',
    cliente: '—',
    tecnico: `${dev.tecnico.nombre} ${dev.tecnico.apellido}`,
    contrato: '—',
    fecha: fmtFecha(dev.fecha),
    estado: d.estado,
    cantidad: d.cantidad,
    unidad: d.unidad || 'und',
    cantidadBuena: d.cantidadBuena,
    cantidadMala:  d.cantidadMala,
    comentario:    d.comentario,
  }));

  const filasRecojo = (dev.recojos || []).map(r => ({
    _tipo: 'recojo',
    _recojoId: r.id,
    _estadoRecojo: r.estado,
    id: `rec-${r.id}`,
    tipo: r.tipoEquipo || 'Equipo',
    producto: r.nombreProducto || r.tipoEquipo || '—',
    pon: r.codigoPon || '—',
    sn: '—',
    cliente: r.abonado || '—',
    tecnico: `${dev.tecnico.nombre} ${dev.tecnico.apellido}`,
    contrato: r.contrato || '—',
    fecha: fmtFecha(dev.fecha),
    estado: r.estado,
  }));

  const filas = [...filasMaterial, ...filasRecojo];

  if (filas.length === 0) return (
    <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>
      Sin ítems en esta devolución
    </div>
  );

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={S.table}>
        <thead>
          <tr>
            {['Tipo','Producto','PON / Cód.','Cliente / Abonado','Técnico','Contrato','Fecha','Estado','Acciones'].map(h => (
              <th key={h} style={S.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map(fila => {
            // Material en_revision (devolucion ya aceptada) → fila especial con inputs
            if (fila._tipo === 'material' && fila._estadoDetalle === 'en_revision' && dev.estado === 'aprobado') {
              return (
                <FilaMaterialRevision
                  key={fila.id}
                  dev={dev}
                  fila={fila}
                  onRevisar={onRevisarDetalle}
                  revisarPending={revisarDetallePending}
                />
              );
            }

            return (
              <tr key={fila.id}>
                <td style={S.td}>
                  <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    background: fila._tipo === 'material' ? '#EFF6FF' : '#F5F3FF',
                    color:      fila._tipo === 'material' ? '#1D4ED8'  : '#6D28D9' }}>
                    {fila.tipo}
                  </span>
                </td>
                <td style={S.td}>
                  <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{fila.producto}</div>
                  {fila._tipo === 'material' && (
                    <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>
                      {fila.cantidad} {fila.unidad}
                      {fila._estadoDetalle === 'revisado' && (
                        <span style={{ marginLeft: 6, color: 'var(--txt-3)' }}>
                          ({fila.cantidadBuena} buenas / {fila.cantidadMala} malas)
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, color: fila.pon !== '—' ? 'var(--txt)' : 'var(--txt-3)' }}>
                  {fila.pon}
                </td>
                <td style={{ ...S.td, color: fila.cliente !== '—' ? 'var(--txt)' : 'var(--txt-3)' }}>
                  {fila.cliente}
                </td>
                <td style={{ ...S.td, color: 'var(--txt-2)' }}>{fila.tecnico}</td>
                <td style={{ ...S.td, color: fila.contrato !== '—' ? 'var(--txt)' : 'var(--txt-3)' }}>
                  {fila.contrato}
                </td>
                <td style={{ ...S.td, color: 'var(--txt-3)', whiteSpace: 'nowrap' }}>{fila.fecha}</td>
                <td style={S.td}>
                  {fila._tipo === 'material' ? (
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: fila._estadoDetalle === 'revisado' ? '#DCFCE7' : '#FEF3C7',
                      color:      fila._estadoDetalle === 'revisado' ? '#166534' : '#92400E' }}>
                      {fila._estadoDetalle === 'revisado' ? 'Revisado' : fila._estadoDetalle === 'en_revision' ? 'En revisión' : 'Pendiente'}
                    </span>
                  ) : (
                    <EstadoBadge estado={fila._estadoRecojo} />
                  )}
                </td>
                <td style={S.td}>
                  {fila._tipo === 'recojo' && fila._estadoRecojo === 'en_revision' && dev.estado === 'aprobado' && (
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button
                        style={{ ...S.btn('green'), padding: '4px 10px', fontSize: 11 }}
                        onClick={() => onRevisarRecojo(fila._recojoId, 'bueno')}
                        disabled={revisarPending}
                        title="Bueno — suma al stock"
                      >
                        <CheckCircle size={11} /> Bueno
                      </button>
                      <button
                        style={{ ...S.btn('red'), padding: '4px 10px', fontSize: 11 }}
                        onClick={() => onRevisarRecojo(fila._recojoId, 'malogrado')}
                        disabled={revisarPending}
                        title="Malogrado — va a lista de averiados"
                      >
                        <XCircle size={11} /> Malo
                      </button>
                    </div>
                  )}
                  {fila._tipo === 'recojo' && fila._estadoRecojo === 'en_revision' && dev.estado === 'pendiente' && (
                    <span style={{ fontSize: 11, color: 'var(--txt-3)', fontStyle: 'italic' }}>
                      Acepta primero
                    </span>
                  )}
                  {fila._tipo === 'recojo' && fila._estadoRecojo !== 'en_revision' && (
                    <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>—</span>
                  )}
                  {fila._tipo === 'material' && fila._estadoDetalle !== 'en_revision' && (
                    <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Tabla de malogrados ───────────────────────────────────────
function TablaMalogrados() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['malogrados'],
    queryFn:  () => stockApi.listarMalogrados().then(r => r.data),
  });

  const mutReingresar = useMutation({
    mutationFn: (id) => stockApi.reingresarOnuMalograda(id),
    onSuccess:  () => {
      toast.success('✅ Equipo reingresado al stock');
      qc.invalidateQueries({ queryKey: ['malogrados'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error al reingresar'),
  });

  const exportToExcel = () => {
    if (!data?.malogrados?.length) { toast.error('No hay datos'); return; }
    const rows = data.malogrados.map(m => ({
      'Tipo':       m.tipoEquipo,
      'Producto':   m.nombreProducto || '—',
      'Código PON': m.codigoPon || '—',
      'Sede':       m.sede || '—',
      'Técnico':    m.tecnico || '—',
      'Fecha':      fmtFecha(m.fecha),
      'Revisado por': m.revisadoPor || '—',
      'Comentario': m.comentario || '—',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 12 }, { wch: 20 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Malogrados');
    XLSX.writeFile(wb, `equipos_malogrados_${hoyLocal()}.xlsx`);
    toast.success('Exportado a Excel');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--txt-3)' }}>
          {data?.total ?? 0} equipo{data?.total !== 1 ? 's' : ''} malogrado{data?.total !== 1 ? 's' : ''} registrado{data?.total !== 1 ? 's' : ''}
        </div>
        <button style={S.btn('ghost')} onClick={exportToExcel}>
          <FileSpreadsheet size={14} /> Exportar
        </button>
      </div>

      {isLoading ? (
        <p style={S.empty}>Cargando...</p>
      ) : !data?.malogrados?.length ? (
        <div style={S.empty}>
          <AlertTriangle size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
          <p>No hay equipos malogrados registrados.</p>
        </div>
      ) : (
        <div style={S.wrap}>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {['Tipo','Producto','PON / Cód.','Sede','Técnico','Fecha','Revisado por','Comentario','Acciones'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.malogrados.map(m => (
                  <tr key={m.id}>
                    <td style={S.td}>
                      <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#FEE2E2', color: '#991B1B' }}>
                        {m.tipoEquipo}
                      </span>
                    </td>
                    <td style={{ ...S.td, fontWeight: 600, color: 'var(--txt)' }}>{m.nombreProducto || '—'}</td>
                    <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12 }}>{m.codigoPon || '—'}</td>
                    <td style={{ ...S.td, color: 'var(--txt-2)' }}>{m.sede || '—'}</td>
                    <td style={{ ...S.td, color: 'var(--txt-2)' }}>{m.tecnico || '—'}</td>
                    <td style={{ ...S.td, color: 'var(--txt-3)', whiteSpace: 'nowrap' }}>{fmtFecha(m.fecha)}</td>
                    <td style={{ ...S.td, color: 'var(--txt-3)' }}>{m.revisadoPor || '—'}</td>
                    <td style={{ ...S.td, color: 'var(--txt-3)', fontStyle: 'italic', fontSize: 12 }}>{m.comentario || '—'}</td>
                    <td style={S.td}>
                      <button
                        style={{ ...S.btn('blue'), padding: '5px 10px', fontSize: 11 }}
                        onClick={() => mutReingresar.mutate(m.id)}
                        disabled={mutReingresar.isPending}
                        title="Reingresar al stock disponible"
                      >
                        <CheckCircle size={11} /> Reingresar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function DevolucionesPage() {
  const qc = useQueryClient();
  const [tabEstado,    setTabEstado]    = useState('pendiente');
  const [tabSeccion,   setTabSeccion]   = useState('devoluciones'); // 'devoluciones' | 'malogrados'
  const [modalRechazo, setModalRechazo] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [spinning, setSpinning] = useState(false);

  const { data: devoluciones = [], isLoading, refetch } = useQuery({
    queryKey: ['devoluciones', tabEstado],
    queryFn:  () => stockApi.listarDevoluciones({ estado: tabEstado }).then(r => r.data),
    enabled:  tabSeccion === 'devoluciones',
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ['devoluciones'] });

  const mutAprobar = useMutation({
  mutationFn: (id) => stockApi.aprobarDevolucion(id),
  onSuccess:  () => {
    toast.success('Devolución aprobada ✅');
    invalidar();
    qc.invalidateQueries({ queryKey: ['inventario-tecnico'] });
    qc.invalidateQueries({ queryKey: ['onus-panel-inline'] });
    qc.invalidateQueries({ queryKey: ['onus-existentes'] });
  },
  onError: (e) => toast.error(e.response?.data?.error || 'Error al aprobar'),
});

  const mutRechazar = useMutation({
    mutationFn: ({ id, motivo }) => stockApi.rechazarDevolucion(id, { motivo }),
    onSuccess:  () => { toast.success('Devolución rechazada'); invalidar(); setModalRechazo(null); setMotivoRechazo(''); },
    onError:    (e) => toast.error(e.response?.data?.error || 'Error al rechazar'),
  });

  const mutRevisarRecojo = useMutation({
  mutationFn: ({ recojoId, resultado }) => stockApi.revisarRecojo(recojoId, { resultado }),
  onSuccess:  (_, v) => {
    toast.success(v.resultado === 'bueno' ? '✅ Equipo sumado al stock' : '⚠ Equipo registrado como malogrado');
    invalidar();
    qc.invalidateQueries({ queryKey: ['malogrados'] });
    qc.invalidateQueries({ queryKey: ['inventario-tecnico'] });
    qc.invalidateQueries({ queryKey: ['onus-panel-inline'] });
    qc.invalidateQueries({ queryKey: ['onus-existentes'] });
  },
  onError: (e) => toast.error(e.response?.data?.error || 'Error'),
});

  const mutRevisarDetalle = useMutation({
    mutationFn: ({ detalleId, cantidadBuena, cantidadMala }) =>
      stockApi.revisarDetalleDevolucion(detalleId, { cantidadBuena, cantidadMala }),
    onSuccess: () => {
      toast.success('✅ Material revisado');
      invalidar();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error al revisar material'),
  });

  const exportToExcel = () => {
    if (!devoluciones.length) { toast.error('No hay datos para exportar'); return; }
    const rows = devoluciones.flatMap(dev =>
      [
        ...(dev.detalles || []).map(d => ({
          'Tipo':     'Material',
          'Producto': d.nombre,
          'Cantidad': `${d.cantidad} ${d.unidad || 'und'}`,
          'PON':      '—',
          'Cliente':  '—',
          'Técnico':  `${dev.tecnico.nombre} ${dev.tecnico.apellido}`,
          'Contrato': '—',
          'Fecha':    fmtFecha(dev.fecha),
          'Estado devolución': dev.estado,
        })),
        ...(dev.recojos || []).map(r => ({
          'Tipo':     r.tipoEquipo,
          'Producto': r.nombreProducto || r.tipoEquipo,
          'Cantidad': '1',
          'PON':      r.codigoPon || '—',
          'Cliente':  r.abonado || '—',
          'Técnico':  `${dev.tecnico.nombre} ${dev.tecnico.apellido}`,
          'Contrato': r.contrato || '—',
          'Fecha':    fmtFecha(dev.fecha),
          'Estado devolución': dev.estado,
        })),
      ]
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Devoluciones');
    XLSX.writeFile(wb, `devoluciones_${tabEstado}_${hoyLocal()}.xlsx`);
    toast.success('Exportado a Excel');
  };

  const pendientesConAlerta = devoluciones.filter(d =>
    (d.recojos || []).some(r => r.estado === 'en_revision')
  ).length;

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <h1 style={S.title}>Devoluciones de técnicos</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {tabSeccion === 'devoluciones' && (
            <button style={S.btn('ghost')} onClick={exportToExcel}>
              <FileSpreadsheet size={14} /> Excel
            </button>
          )}
          <button style={S.btn('ghost')} onClick={async () => { setSpinning(true); await refetch(); setTimeout(() => setSpinning(false), 600); }}>
            <span style={{ display: 'inline-flex' }} className={spinning ? 'spin' : ''}><RefreshCw size={13} /></span> Actualizar
          </button>
        </div>
      </div>

      {/* Sección principal: Devoluciones / Malogrados */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={S.tab(tabSeccion === 'devoluciones')} onClick={() => setTabSeccion('devoluciones')}>
          📦 Devoluciones
        </button>
        <button style={S.tab(tabSeccion === 'malogrados')} onClick={() => setTabSeccion('malogrados')}>
          ⚠ Equipos malogrados
        </button>
      </div>

      {/* ── Sección Devoluciones ── */}
      {tabSeccion === 'devoluciones' && (
        <>
          {/* Sub-tabs de estado */}
          <div style={S.tabs}>
            {['pendiente', 'aprobado', 'rechazado'].map(e => (
              <button key={e} style={S.tab(tabEstado === e)} onClick={() => setTabEstado(e)}>
                {e === 'pendiente' ? `⏳ Pendientes${pendientesConAlerta > 0 && tabEstado !== 'pendiente' ? ` (${pendientesConAlerta})` : ''}` : e === 'aprobado' ? '✅ Aprobadas' : '❌ Rechazadas'}
              </button>
            ))}
          </div>

          {isLoading ? (
            <p style={S.empty}>Cargando...</p>
          ) : devoluciones.length === 0 ? (
            <div style={S.empty}>
              <Package size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
              <p>No hay devoluciones {tabEstado === 'pendiente' ? 'pendientes' : tabEstado === 'aprobado' ? 'aprobadas' : 'rechazadas'}.</p>
            </div>
          ) : devoluciones.map(dev => {
            const recojosEnRevision = (dev.recojos || []).filter(r => r.estado === 'en_revision').length;

            return (
              <div key={dev.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
                {/* Cabecera */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>
                      {dev.tecnico.nombre} {dev.tecnico.apellido}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--txt-3)', marginLeft: 12 }}>{fmtFecha(dev.fecha)}</span>
                    {dev.comentario && (
                      <span style={{ fontSize: 12, color: 'var(--txt-3)', marginLeft: 12, fontStyle: 'italic' }}>
                        "{dev.comentario}"
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {recojosEnRevision > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: 4 }}>
                        ⏳ {recojosEnRevision} equipo{recojosEnRevision !== 1 ? 's' : ''} sin revisar
                      </span>
                    )}
                    <span style={S.badge(dev.estado)}>
                      {dev.estado === 'pendiente' ? '⏳ Pendiente' : dev.estado === 'aprobado' ? '✅ Aprobada' : '❌ Rechazada'}
                    </span>
                  </div>
                </div>

                {/* Tabla de ítems */}
                <TablaItems
                  dev={dev}
                  onRevisarRecojo={(recojoId, resultado) => mutRevisarRecojo.mutate({ recojoId, resultado })}
                  revisarPending={mutRevisarRecojo.isPending}
                  onRevisarDetalle={(detalleId, cantidadBuena, cantidadMala) =>
                    mutRevisarDetalle.mutate({ detalleId, cantidadBuena, cantidadMala })}
                  revisarDetallePending={mutRevisarDetalle.isPending}
                />

                {/* Acciones globales — solo pendientes */}
                {dev.estado === 'pendiente' && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--bg-2)' }}>
                    <button
                      style={S.btn('ghost')}
                      onClick={() => { setModalRechazo({ id: dev.id }); setMotivoRechazo(''); }}
                    >
                      <XCircle size={13} /> Cancelar devolución
                    </button>
                    <button
                      style={S.btn('green')}
                      onClick={() => mutAprobar.mutate(dev.id)}
                      disabled={mutAprobar.isPending}
                    >
                      <CheckCircle size={13} />
                      {mutAprobar.isPending ? 'Aceptando...' : 'Aceptar devolución'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* ── Sección Malogrados ── */}
      {tabSeccion === 'malogrados' && <TablaMalogrados />}

      {/* Modal de cancelación */}
      {modalRechazo && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setModalRechazo(null)}>
          <div style={S.modalBox}>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: 'var(--txt)' }}>Cancelar devolución</p>
            <p style={{ fontSize: 13, color: 'var(--txt-3)', marginBottom: 12 }}>
              Todo el material y equipos vuelven al inventario del técnico. El técnico deberá hacer un nuevo ingreso correcto.
            </p>
            <label style={{ fontSize: 12, color: 'var(--txt-2)', fontWeight: 600 }}>Motivo (opcional)</label>
            <input
              style={S.input}
              placeholder="Ej: No coincide el inventario físico"
              value={motivoRechazo}
              onChange={e => setMotivoRechazo(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={S.btn('ghost')} onClick={() => setModalRechazo(null)}>Volver</button>
              <button
                style={S.btn('red')}
                onClick={() => mutRechazar.mutate({ id: modalRechazo.id, motivo: motivoRechazo })}
                disabled={mutRechazar.isPending}
              >
                {mutRechazar.isPending ? 'Cancelando...' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}