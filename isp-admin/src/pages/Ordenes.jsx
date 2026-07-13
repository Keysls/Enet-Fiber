import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Upload, Search, RefreshCw, X, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import { ordenesApi, tecnicosApi, siscadreApi } from '../services/api';
import { Card, EstadoBadge, Table, Tr, Td, Btn, Modal, Input, Select, Spinner, Empty, TimerBadge } from '../components/ui';
import { fmtFecha, fmtFechaHora, TIPO_COLOR, ESTADO_CONFIG } from '../utils/helpers';
import { useTiposOrden } from '../hooks/useTiposOrden';
import DrawerOrden from '../components/DrawerOrden';
import { useAuthStore } from '../store/auth.store';

function useIsMobile(breakpoint = 1081) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}

const MOBILE_STYLES = `
  @media (max-width: 1080px) {
    .ordenes-header        { flex-direction: column; gap: 12px; }
    .ordenes-header-btns   { display: flex; gap: 6px; width: 100%; }
    .ordenes-header-btns > * { flex: 1; justify-content: center; }
    .ordenes-tabs          { overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 2px; }
    .ordenes-tabs::-webkit-scrollbar { display: none; }
    .ordenes-filter-row    { flex-direction: column; gap: 8px; }
    .ordenes-estado-chips  { display: flex; flex-wrap: nowrap; overflow-x: auto; gap: 5px; padding-bottom: 2px; }
    .ordenes-estado-chips::-webkit-scrollbar { display: none; }
    .ordenes-table-wrap    { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .ordenes-card-list     { display: flex; flex-direction: column; gap: 0; }
    .ordenes-pagination    { flex-direction: column; align-items: stretch; gap: 8px; text-align: center; }
    .ordenes-pagination-btns { display: flex; gap: 6px; }
    .ordenes-pagination-btns > * { flex: 1; justify-content: center; }
    .ordenes-filter-row select { width: 100% !important; min-width: unset !important; }
    .ordenes-tabs-select { display: block !important; width: 100%; }
    .ordenes-tabs        { display: none !important; }
  }
  .ordenes-tabs-select { display: none; }
`;

function InjectStyles() {
  useEffect(() => {
    const id = 'ordenes-mobile-styles';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id;
      el.textContent = MOBILE_STYLES;
      document.head.appendChild(el);
    }
  }, []);
  return null;
}

// ── Tarjeta de orden para vista móvil ────────────────────────
function OrdenCard({ o, onNavigate, tipoLabel }) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        background: 'var(--bg)',
        transition: 'background .15s',
        WebkitTapHighlightColor: 'transparent',
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}
      onClick={() => onNavigate(o.id)}
      onTouchStart={e => { e.currentTarget.style.background = 'var(--bg-3)'; }}
      onTouchEnd={e => { e.currentTarget.style.background = 'var(--bg)'; }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>
            #{o.nServicio}
          </span>
          <EstadoBadge estado={o.estado} />
        </div>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{o.abonado}</div>
        {o.dni && <div style={{ fontSize: 11, color: 'var(--txt-3)', marginBottom: 4 }}>{o.dni}</div>}
        <div style={{ fontSize: 12, color: 'var(--txt-2)', marginBottom: o.referencia ? 2 : 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {o.direccion}
        </div>
        {o.referencia && (
          <div style={{ fontSize: 11, color: 'var(--txt-3)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Ref: {o.referencia}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: TIPO_COLOR[o.tipoOrden] }}>
            {tipoLabel(o.tipoOrden)}
          </span>
          <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>·</span>
          <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>{fmtFecha(o.fechaServicio)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: o.tecnico ? 'var(--txt-2)' : 'var(--txt-3)' }}>
            {o.tecnico
              ? `👷 ${o.tecnico.usuario.nombre} ${o.tecnico.usuario.apellido}`
              : 'Sin técnico'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Subir Excel ────────────────────────────────────────
function ModalSubirExcel({ open, onClose, tipoLabel }) {
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [file,      setFile]      = useState(null);
  const [dragging,  setDragging]  = useState(false);
  const [resultado, setResultado] = useState(null);
  const [step,      setStep]      = useState('upload');

  const subirMut = useMutation({
    mutationFn: (f) => {
      const fd = new FormData();
      fd.append('excel', f);
      return ordenesApi.subirExcel(fd);
    },
    onSuccess: (res) => { setResultado(res.data); setStep('review'); },
    onError:   (e)   => toast.error(e.response?.data?.error || 'Error al leer el Excel'),
  });

  const confirmarMut = useMutation({
    mutationFn: () => ordenesApi.confirmarExcel({
      ordenes: resultado.ordenes,
    }),
    onSuccess: async (res) => {
      toast.success(`✓ ${res.data.creadas} órdenes importadas`);
      if (res.data.duplicadas > 0) toast(`⚠ ${res.data.duplicadas} órdenes ya existían y fueron omitidas`, { icon: '⚠️', style: { background: 'var(--yellow-bg)', color: 'var(--yellow)' } });
      if (res.data.errores?.length > 0) toast.error(`✗ ${res.data.errores.length} órdenes con error`);
      qc.invalidateQueries(['ordenes']);
      qc.invalidateQueries(['stats']);
      handleClose();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error al confirmar'),
  });

  const handleClose = () => { setFile(null); setResultado(null); setStep('upload'); onClose(); };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xls') || f.name.endsWith('.xlsx'))) {
      setFile(f); subirMut.mutate(f);
    } else toast.error('Solo archivos .xls o .xlsx');
  };

  return (
    <Modal open={open} onClose={handleClose} title="Importar órdenes desde Excel" width={isMobile ? '100%' : 680}>
      {step === 'upload' && (
        <div>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('excel-input').click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-2)'}`,
              borderRadius: 12, padding: isMobile ? '28px 16px' : '40px 24px',
              textAlign: 'center', cursor: 'pointer',
              background: dragging ? 'var(--accent-glow)' : 'var(--bg-3)', transition: 'all .2s',
            }}>
            {subirMut.isPending ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <Spinner size={28} />
                <p style={{ fontSize: 13, color: 'var(--txt-2)' }}>Leyendo Excel...</p>
              </div>
            ) : (
              <>
                <Upload size={28} color="var(--txt-3)" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                  {file ? file.name : isMobile ? 'Toca para seleccionar archivo' : 'Arrastra el Excel o haz clic para seleccionar'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--txt-3)' }}>Archivos .xls o .xlsx</p>
              </>
            )}
          </div>
          <input id="excel-input" type="file" accept=".xls,.xlsx" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); subirMut.mutate(f); } }} />
        </div>
      )}

      {step === 'review' && resultado && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ padding: '7px 12px', background: 'var(--green-bg)', borderRadius: 8, fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
              ✓ {resultado.total} leídas
            </div>
            {resultado.errores?.length > 0 && (
              <div style={{ padding: '7px 12px', background: 'var(--red-bg)', borderRadius: 8, fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>
                ✗ {resultado.errores.length} con error
              </div>
            )}
            <div style={{ padding: '7px 12px', background: 'var(--accent-glow)', borderRadius: 8, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
              📡 {resultado.ordenes.filter(o => o.tipoOrden?.endsWith('_I')).length} Internet
            </div>
            <div style={{ padding: '7px 12px', background: 'rgba(139,92,246,0.1)', borderRadius: 8, fontSize: 12, color: '#8b5cf6', fontWeight: 600 }}>
              📺 {resultado.ordenes.filter(o => o.tipoOrden?.endsWith('_C')).length} Cable
            </div>
            <div style={{ padding: '7px 12px', background: 'rgba(249,115,22,0.1)', borderRadius: 8, fontSize: 12, color: '#f97316', fontWeight: 600 }}>
              📡📺 {resultado.ordenes.filter(o => o.tipoOrden?.endsWith('_D')).length} Dúo
            </div>
          </div>

          {resultado.errores?.length > 0 && (
            <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, marginBottom: 6 }}>Filas con error (se omitirán):</p>
              {resultado.errores.map((e, i) => (
                <p key={i} style={{ fontSize: 11, color: 'var(--red)' }}>Fila {e.fila}: {e.motivo}</p>
              ))}
            </div>
          )}

          <div style={{ maxHeight: isMobile ? 200 : 240, overflowY: 'auto', overflowX: 'auto', marginBottom: 16, border: '1px solid var(--border)', borderRadius: 8, WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: isMobile ? 480 : 'auto', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg-3)' }}>
                  {['N° Orden','Abonado','Dirección','Servicio','Sector'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--txt-3)', fontWeight: 600, fontSize: 11, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultado.ordenes.map((o, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '7px 12px', color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>{o.nServicio}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--txt)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.abonado}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--txt-2)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.direccion}</td>
                    <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: TIPO_COLOR[o.tipoOrden] }}>
                        {tipoLabel(o.tipoOrden)}
                      </span>
                    </td>
                    <td style={{ padding: '7px 12px', color: 'var(--txt-3)', whiteSpace: 'nowrap' }}>{o.sector}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Btn variant="ghost" onClick={() => setStep('upload')}>← Volver</Btn>
            <Btn variant="primary" onClick={() => confirmarMut.mutate()} loading={confirmarMut.isPending} style={{ flex: isMobile ? 1 : undefined }}>
              Importar {resultado.total} órdenes
              {resultado.total === 0 && ' (todas duplicadas)'}
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function OrdenesPage() {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const isMobile        = useIsMobile();
  const { tipoLabel, esSoloNoc: esSoloNocFn, grupos } = useTiposOrden();
  const [showExcel, setShowExcel]           = useState(false);
  const [ordenDrawer, setOrdenDrawer]       = useState(null);
  const [tab, setTab]                       = useState('todos');
  const [filters, setFilters] = useState({ estado: searchParams.get('estado') || '', search: '', tecnicoId: '', fechaDesde: '', fechaHasta: '' });
  const [page, setPage]                     = useState(1);
  const [searchOpen, setSearchOpen]         = useState(false);
  const [spinning, setSpinning]             = useState(false);

  useEffect(() => {
    const e = searchParams.get('estado');
    if (e) setFilters(p => ({ ...p, estado: e }));
  }, [searchParams]);

  const qc = useQueryClient();

  const { usuario } = useAuthStore();

  const { data: siscadreConexiones = [] } = useQuery({
    queryKey: ['siscadre-conexiones', usuario?.sedeId],
    queryFn:  () => siscadreApi.listarConexiones(usuario.sedeId).then(r => r.data),
    enabled:  !!usuario?.sedeId,
  });

  const tieneSiscadre = siscadreConexiones.length > 0;
  // Último sync = el más reciente entre todas las conexiones de la sede
  const ultimoSync = siscadreConexiones
    .map(c => c.siscadreLastSync)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0] || null;

  const sincronizarMut = useMutation({
    mutationFn: () => siscadreApi.sincronizar(usuario.sedeId),
    onSuccess: (res) => {
      const { nuevas, existentes, total } = res.data;
      toast.success(`Sincronizado: ${nuevas} nuevas, ${existentes} ya existían (${total} total)`);
      qc.invalidateQueries(['ordenes']);
      qc.invalidateQueries(['siscadre-conexiones']);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error al sincronizar'),
  });

  const fmtFechaHora = (f) => {
    if (!f) return null;
    return new Date(f).toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const { data: tecnicosData } = useQuery({
    queryKey: ['tecnicos-activos'],
    queryFn:  () => tecnicosApi.listar({ activo: true }).then(r => r.data),
  });
  const tecnicos = tecnicosData || [];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ordenes', filters, tab, page],
    queryFn:  () => ordenesApi.listar({
      ...filters,
      page, limit: 25,
      ...(tab === 'internet' && { tipos: (grupos.INTERNET || []).join(',') }),
      ...(tab === 'cable'    && { tipos: (grupos.CABLE    || []).join(',') }),
      ...(tab === 'duo'      && { tipos: (grupos.DUO      || []).join(',') }),
      ...(filters.tecnicoId  && { tecnicoId: filters.tecnicoId }),
      ...(filters.fechaDesde && { fechaDesde: filters.fechaDesde }),
      ...(filters.fechaHasta && { fechaHasta: filters.fechaHasta }),
    }).then(r => r.data),
    refetchInterval: 30000,
  });

  const ordenes = data?.data || [];
  const meta    = data?.meta;

  const ESTADOS_FILTRO = [
    { value: '',                  label: 'Todos' },
    { value: 'PENDIENTE_NOC',     label: 'Esperando NOC' },
    { value: 'PENDIENTE_TECNICO', label: 'Para técnico' },
    { value: 'ACEPTADA',          label: 'Aceptada' },
    { value: 'EN_PROCESO',        label: 'En proceso' },
    { value: 'COMPLETADA',        label: 'Completada' },
    { value: 'CANCELADA',         label: 'Cancelada' },
  ];

  return (
    <div style={{ padding: isMobile ? '16px 12px' : 28 }} className="animate-fade">
      <InjectStyles />

      {/* Header */}
      <div className="ordenes-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 18 : 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Órdenes de Servicio
          </h1>
          <p style={{ color: 'var(--txt-3)', fontSize: 12, marginTop: 3 }}>
            {meta ? `${meta.total} órdenes` : '...'}
          </p>
        </div>
        <div className="ordenes-header-btns" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {tieneSiscadre ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <Btn
                variant="primary" size="sm"
                onClick={() => sincronizarMut.mutate()}
                loading={sincronizarMut.isPending}
                icon={<Database size={13}/>}
              >
                {sincronizarMut.isPending ? 'Sincronizando...' : 'Sincronizar'}
              </Btn>
              {ultimoSync && (
                <span style={{ fontSize: 10, color: 'var(--txt-3)', marginTop: 2 }}>
                  Último: {fmtFechaHora(ultimoSync)}
                </span>
              )}
            </div>
          ) : (
            <Btn variant="primary" size="sm" onClick={() => setShowExcel(true)} icon={<Upload size={13} />}>
              {isMobile ? 'Importar' : 'Importar Excel'}
            </Btn>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="ordenes-tabs" style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[
          { key: 'todos',    label: 'Todos' },
          { key: 'internet', label: '📡 Internet' },
          { key: 'cable',    label: '📺 Cable' },
          { key: 'duo',      label: '📡📺 Dúo' },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', border: '1px solid', transition: 'all .15s',
              background:  tab === t.key ? 'var(--accent)'  : 'transparent',
              color:       tab === t.key ? '#fff'           : 'var(--txt-2)',
              borderColor: tab === t.key ? 'var(--accent)'  : 'var(--border-2)',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tabs select — solo móvil */}
      <select
        className="ordenes-tabs-select"
        value={tab}
        onChange={e => { setTab(e.target.value); setPage(1); }}
        style={{ padding: '9px 12px', marginBottom: 14, background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--txt)', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        <option value="todos">Todos</option>
        <option value="internet">📡 Internet</option>
        <option value="cable">📺 Cable</option>
        <option value="duo">📡📺 Dúo</option>
      </select>

      {/* Filtros */}
      <Card style={{ marginBottom: 14, padding: '10px 12px' }}>
        <div className="ordenes-filter-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {searchOpen ? (
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)' }} />
                    <input autoFocus placeholder="Buscar abonado, N° orden..." value={filters.search}
                      onChange={e => { setFilters(p => ({ ...p, search: e.target.value })); setPage(1); }}
                      style={{ width: '100%', padding: '8px 36px 8px 30px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--txt)', fontSize: 13, outline: 'none' }} />
                    <button onClick={() => { setSearchOpen(false); setFilters(p => ({ ...p, search: '' })); setPage(1); }}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-3)', padding: 2 }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setSearchOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8, cursor: 'pointer', color: filters.search ? 'var(--accent)' : 'var(--txt-3)', fontSize: 13, fontWeight: 500, flex: 1 }}>
                    <Search size={15} />
                    {filters.search ? `"${filters.search}"` : 'Buscar abonado, N° orden...'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)' }} />
              <input placeholder="Buscar abonado, N° orden..." value={filters.search}
                onChange={e => { setFilters(p => ({ ...p, search: e.target.value })); setPage(1); }}
                style={{ width: '100%', padding: '7px 10px 7px 30px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--txt)', fontSize: 12, outline: 'none' }} />
            </div>
          )}

          {/* Select estado */}
          <select
            value={filters.estado}
            onChange={e => { setFilters(p => ({ ...p, estado: e.target.value })); setPage(1); }}
            style={{ padding: '7px 10px', background: 'var(--bg-3)', border: `1px solid ${filters.estado ? 'var(--accent)' : 'var(--border-2)'}`, borderRadius: 8, color: filters.estado ? 'var(--accent)' : 'var(--txt-2)', fontSize: 12, fontWeight: filters.estado ? 600 : 400, outline: 'none', cursor: 'pointer', fontFamily: 'inherit', minWidth: 140 }}
          >
            {ESTADOS_FILTRO.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>

          {/* Select técnico */}
          <select
            value={filters.tecnicoId}
            onChange={e => { setFilters(p => ({ ...p, tecnicoId: e.target.value })); setPage(1); }}
            style={{ padding: '7px 10px', background: 'var(--bg-3)', border: `1px solid ${filters.tecnicoId ? 'var(--accent)' : 'var(--border-2)'}`, borderRadius: 8, color: filters.tecnicoId ? 'var(--accent)' : 'var(--txt-2)', fontSize: 12, fontWeight: filters.tecnicoId ? 600 : 400, outline: 'none', cursor: 'pointer', fontFamily: 'inherit', minWidth: 150 }}
          >
            <option value="">Todos los técnicos</option>
            {tecnicos.map(t => (
              <option key={t.id} value={t.id}>
                {t.usuario.nombre} {t.usuario.apellido}
              </option>
            ))}
          </select>

          {filters.estado === 'COMPLETADA' && (
            <div style={{ display: 'flex', gap: 10, width: isMobile ? '100%' : 'auto' }}>
              <input
                type="date"
                value={filters.fechaDesde}
                onChange={e => { setFilters(p => ({ ...p, fechaDesde: e.target.value })); setPage(1); }}
                style={{ 
                  padding: '7px 10px', background: 'var(--bg-3)', 
                  border: `1px solid ${filters.fechaDesde ? 'var(--accent)' : 'var(--border-2)'}`, 
                  borderRadius: 8, color: filters.fechaDesde ? 'var(--accent)' : 'var(--txt-2)', 
                  fontSize: 12, outline: 'none', fontFamily: 'inherit',
                  flex: isMobile ? 1 : 'none',
                  minWidth: 0,
                }}
                title="Completadas desde"
              />
              <input
                type="date"
                value={filters.fechaHasta}
                onChange={e => { setFilters(p => ({ ...p, fechaHasta: e.target.value })); setPage(1); }}
                style={{ 
                  padding: '7px 10px', background: 'var(--bg-3)', 
                  border: `1px solid ${filters.fechaHasta ? 'var(--accent)' : 'var(--border-2)'}`, 
                  borderRadius: 8, color: filters.fechaHasta ? 'var(--accent)' : 'var(--txt-2)', 
                  fontSize: 12, outline: 'none', fontFamily: 'inherit',
                  flex: isMobile ? 1 : 'none',
                  minWidth: 0,
                }}
                title="Completadas hasta"
              />
            </div>
          )}

          {(filters.estado || filters.search || filters.tecnicoId || filters.fechaDesde || filters.fechaHasta) && (
            <Btn variant="ghost" size="sm" onClick={() => { setFilters({ estado: '', search: '', tecnicoId: '', fechaDesde: '', fechaHasta: '' }); setPage(1); }} icon={<X size={12} />}>Limpiar</Btn>
          )}
        </div>
      </Card>

      {/* Tabla / Cards */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {isMobile ? (
          <div className="ordenes-card-list">
            {isLoading ? (
              <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner size={24} /></div>
            ) : ordenes.length === 0 ? (
              <Empty icon="📋" title="Sin órdenes" subtitle="Importa un Excel para comenzar" />
            ) : (
              ordenes.map(o => (
                <OrdenCard key={o.id} o={o}
                  onNavigate={id => setOrdenDrawer(id)}
                  tipoLabel={tipoLabel}
                />
              ))
            )}
          </div>
        ) : (
          <Table loading={isLoading}
          headers={[
              'N°','Abonado','Dirección / Referencia','Servicio','Fecha','Estado','Técnico','Completado',
            ]}>
            {ordenes.length === 0 && !isLoading ? (
              <tr><td colSpan={7}><Empty icon="📋" title="Sin órdenes" subtitle="Importa un Excel para comenzar" /></td></tr>
            ) : ordenes.map(o => {
              return (
                <Tr key={o.id} onClick={() => setOrdenDrawer(o.id)}>
                  <Td>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--accent)' }}>#{o.nServicio}</span>
                  </Td>
                  <Td>
                    <div style={{ fontWeight: 500 }}>{o.abonado}</div>
                    {o.dni && <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>{o.dni}</div>}
                  </Td>
                  <Td style={{ maxWidth: 200 }}>
                    <div className="truncate" style={{ fontSize: 12, color: 'var(--txt-2)' }}>{o.direccion}</div>
                    {o.referencia && <div className="truncate" style={{ fontSize: 11, color: 'var(--txt-3)' }}>Ref: {o.referencia}</div>}
                  </Td>
                  <Td>
                    <span style={{ fontSize: 11, fontWeight: 600, color: TIPO_COLOR[o.tipoOrden] }}>
                      {tipoLabel(o.tipoOrden)}
                    </span>
                  </Td>
                  <Td style={{ fontSize: 12, color: 'var(--txt-2)', whiteSpace: 'nowrap' }}>
                    {fmtFecha(o.fechaServicio)}
                  </Td>
                  <Td><EstadoBadge estado={o.estado} /></Td>
                  <Td style={{ fontSize: 12, color: 'var(--txt-2)' }}>
                    {o.tecnico ? `${o.tecnico.usuario.nombre} ${o.tecnico.usuario.apellido}` : <span style={{ color: 'var(--txt-3)' }}>Sin técnico</span>}
                  </Td>
                  <Td style={{ fontSize: 12, color: 'var(--txt-2)', whiteSpace: 'nowrap' }}>
                    {o.estado === 'COMPLETADA' && o.fechaFin
                      ? fmtFechaHora(o.fechaFin)
                      : <span style={{ color: 'var(--txt-3)' }}>—</span>}
                  </Td>
                </Tr>
              );
            })}
          </Table>
        )}

        {/* Paginación */}
        {meta && meta.pages > 1 && (
          <div className="ordenes-pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>Página {meta.page} de {meta.pages}</span>
            <div className="ordenes-pagination-btns" style={{ display: 'flex', gap: 6 }}>
              <Btn variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Anterior</Btn>
              <Btn variant="ghost" size="sm" disabled={page >= meta.pages} onClick={() => setPage(p => p + 1)}>Siguiente →</Btn>
            </div>
          </div>
        )}
      </Card>

      <ModalSubirExcel open={showExcel} onClose={() => setShowExcel(false)} tipoLabel={tipoLabel} />
      <DrawerOrden ordenId={ordenDrawer} onCerrar={() => setOrdenDrawer(null)} />
    </div>
  );
}