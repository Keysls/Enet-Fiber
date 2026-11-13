import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, X, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { contratosApi } from '../services/api';
import { Card, Table, Tr, Td, Btn, Empty, Modal, Spinner } from '../components/ui';
import { fmtFecha } from '../utils/helpers';
import { useTiposOrden } from '../hooks/useTiposOrden';
import DrawerCliente from '../components/DrawerCliente';
import { useAuthStore } from '../store/auth.store';
import { soloLectura } from '../utils/permisos';

// ── Hook: detectar móvil ──────────────────────────────────────
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}

const FILTROS_ESTADO = [
  { key: '',               label: 'Todos'          },
  { key: 'ACTIVO',         label: 'Activos'        },
  { key: 'EN_INSTALACION', label: 'En instalación' },
  { key: 'CORTADO',        label: 'Cortados'       },
  { key: 'BAJA',           label: 'Baja'           },
  { key: 'SIN_ACTIVIDAD',  label: 'Sin actividad'  },
];

const ESTADO_COLOR = {
  ACTIVO:         '#3fb950',
  EN_INSTALACION: '#e3b341',
  CORTADO:        '#ef4444',
  BAJA:           '#5a7a9a',
  SIN_ACTIVIDAD:  '#768999',
};

// ── Tarjeta de cliente para móvil ─────────────────────────────
function ClienteCard({ c, eColor, eLabel, onClick, tipoLabel }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        background: 'var(--bg)',
        transition: 'background .15s',
        WebkitTapHighlightColor: 'transparent',
      }}
      onTouchStart={e => { e.currentTarget.style.background = 'var(--bg-3)'; }}
      onTouchEnd={e   => { e.currentTarget.style.background = 'var(--bg)';  }}
    >
      {/* N° contrato + estado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>
          {c.numero}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '2px 9px', borderRadius: 4, fontSize: 11, fontWeight: 600,
          background: eColor + '15', color: eColor, letterSpacing: '0.04em',
          fontFamily: 'var(--font-mono)',
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%', background: eColor,
            animation: c.estado === 'EN_INSTALACION' ? 'pulse 1.5s ease-in-out infinite' : 'none',
          }} />
          {eLabel}
        </span>
      </div>

      {/* Abonado */}
      <div style={{ fontWeight: 500, marginBottom: 4 }}>{c.abonado}</div>

      {/* Dirección */}
      <div style={{ fontSize: 12, color: 'var(--txt-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
        {c.direccion}
      </div>
      {c.sector && (
        <div style={{ fontSize: 11, color: 'var(--txt-3)', marginBottom: 6 }}>{c.sector}</div>
      )}

      {/* DNI + celular */}
      <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--txt-3)', fontFamily: 'var(--font-display)', marginBottom: c.ultimaActividad ? 6 : 0 }}>
        {c.dni    && <span>DNI: {c.dni}</span>}
        {c.celular && <span>📱 {c.celular}</span>}
      </div>
      {c.mbps && (
        <div style={{ marginTop: 4, marginBottom: 4 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 4,
            background: '#EFF6FF', color: '#2563EB',
            fontSize: 11, fontWeight: 700,
          }}>
            {c.mbps} Mbps
          </span>
        </div>
      )}

      {/* Última actividad */}
      {c.ultimaActividad && (
        <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>
          {fmtFecha(c.ultimaActividad)}
          {c.ultimoTipoOrden && ` · ${tipoLabel(c.ultimoTipoOrden)}`}
        </div>
      )}
    </div>
  );
}

// ── Modal: Importar contratos desde Excel ─────────────────────
function ModalImportarContratos({ open, onClose }) {
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
      return contratosApi.subirExcel(fd);
    },
    onSuccess: (res) => { setResultado(res.data); setStep('review'); },
    onError:   (e)   => toast.error(e.response?.data?.error || 'Error al leer el Excel'),
  });

  const confirmarMut = useMutation({
    mutationFn: () => contratosApi.confirmarExcel({ contratos: resultado.contratos }),
    onSuccess: (res) => {
      toast.success(`✓ ${res.data.creados} contratos nuevos`);
      if (res.data.actualizados > 0)
        toast(`↻ ${res.data.actualizados} contratos actualizados`, {
          icon: 'ℹ️',
          style: { background: 'var(--accent-glow)', color: 'var(--accent)' },
        });
      if (res.data.errores?.length > 0)
        toast.error(`✗ ${res.data.errores.length} con error`);
      qc.invalidateQueries(['contratos']);
      handleClose();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error al confirmar'),
  });

  const handleClose = () => {
    setFile(null); setResultado(null); setStep('upload');
    onClose();
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xls') || f.name.endsWith('.xlsx'))) {
      setFile(f); subirMut.mutate(f);
    } else toast.error('Solo archivos .xls o .xlsx');
  };

  return (
    <Modal open={open} onClose={handleClose} title="Importar contratos desde Excel" width={isMobile ? '100%' : 680}>

      {/* PASO 1 — Subir archivo */}
      {step === 'upload' && (
        <div>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('excel-contratos-input').click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-2)'}`,
              borderRadius: 12,
              padding: isMobile ? '28px 16px' : '40px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? 'var(--accent-glow)' : 'var(--bg-3)',
              transition: 'all .2s',
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
          <input id="excel-contratos-input" type="file" accept=".xls,.xlsx"
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files[0];
              if (f) { setFile(f); subirMut.mutate(f); }
            }} />
        </div>
      )}

      {/* PASO 2 — Revisar y confirmar */}
      {step === 'review' && resultado && (
        <div>
          {/* Resumen chips */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ padding: '7px 12px', background: 'var(--green-bg)', borderRadius: 8, fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
              ✓ {resultado.total} contratos leídos
            </div>
            {resultado.errores?.length > 0 && (
              <div style={{ padding: '7px 12px', background: 'var(--red-bg)', borderRadius: 8, fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>
                ✗ {resultado.errores.length} con error
              </div>
            )}
            <div style={{ padding: '7px 12px', background: 'var(--accent-glow)', borderRadius: 8, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
              📡 {resultado.contratos.filter(c => c.tipoServicio === 'INTERNET').length} Internet
            </div>
            <div style={{ padding: '7px 12px', background: 'rgba(139,92,246,0.1)', borderRadius: 8, fontSize: 12, color: '#8b5cf6', fontWeight: 600 }}>
              📺 {resultado.contratos.filter(c => c.tipoServicio === 'CABLE').length} Cable
            </div>
            <div style={{ padding: '7px 12px', background: 'rgba(249,115,22,0.1)', borderRadius: 8, fontSize: 12, color: '#f97316', fontWeight: 600 }}>
              📡📺 {resultado.contratos.filter(c => c.tipoServicio === 'DUO').length} Dúo
            </div>
          </div>

          {/* Errores */}
          {resultado.errores?.length > 0 && (
            <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, marginBottom: 6 }}>Filas con error (se omitirán):</p>
              {resultado.errores.map((e, i) => (
                <p key={i} style={{ fontSize: 11, color: 'var(--red)' }}>Fila {e.fila}: {e.error}</p>
              ))}
            </div>
          )}

          {/* Preview tabla */}
          <div style={{ maxHeight: isMobile ? 200 : 240, overflowY: 'auto', overflowX: 'auto', marginBottom: 16, border: '1px solid var(--border)', borderRadius: 8, WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: isMobile ? 480 : 'auto', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg-3)' }}>
                  {['N° Contrato','Abonado','DNI','Dirección','Servicio','Plan'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--txt-3)', fontWeight: 600, fontSize: 11, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultado.contratos.slice(0, 100).map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '7px 12px', color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.numero}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--txt)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.abonado}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--txt-2)', whiteSpace: 'nowrap' }}>{c.dni || '—'}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--txt-2)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.direccion}</td>
                    <td style={{ padding: '7px 12px', whiteSpace: 'nowrap', color: 'var(--txt-3)' }}>{c.tipoServicio || '—'}</td>
                    <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                    {c.mbps ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 4,
                        background: '#EFF6FF', color: '#2563EB',
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {c.mbps} Mbps
                      </span>
                    ) : (
                      <span style={{ color: 'var(--txt-3)' }}>—</span>
                    )}
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {resultado.contratos.length > 100 && (
            <p style={{ fontSize: 11, color: 'var(--txt-3)', marginBottom: 12, textAlign: 'center' }}>
              Mostrando los primeros 100 de {resultado.contratos.length}. Se importarán todos.
            </p>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Btn variant="ghost" onClick={() => setStep('upload')}>← Volver</Btn>
            <Btn variant="primary" onClick={() => confirmarMut.mutate()} loading={confirmarMut.isPending} style={{ flex: isMobile ? 1 : undefined }}>
              Importar {resultado.total} contratos
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function ClientesPage() {
  const navigate       = useNavigate();
  const isMobile       = useIsMobile();
  const { tipoLabel } = useTiposOrden();
  const [filtroEstado,  setFiltroEstado]  = useState('');
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busqueda,      setBusqueda]      = useState('');
  const [page,          setPage]          = useState(1);
  const [contratoSel,   setContratoSel]   = useState(null);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [showImport,    setShowImport]    = useState(false);
  const lectura = soloLectura(useAuthStore(s => s.usuario)); // gerente: no importa contratos
  const [tipoServicio,  setTipoServicio]  = useState('');
  const LIMIT = 15;

  useEffect(() => {
    const t = setTimeout(() => { setBusqueda(busquedaInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [busquedaInput]);

  useEffect(() => { setPage(1); }, [filtroEstado, tipoServicio]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['contratos', { busqueda, filtroEstado, tipoServicio, page }],
    queryFn:  () => contratosApi.listar({
      page, limit: LIMIT,
      ...(busqueda      && { search: busqueda }),
      ...(filtroEstado  && { estado: filtroEstado }),
      ...(tipoServicio  && { tipoServicio }),
    }).then(r => r.data),
    placeholderData: keepPreviousData,
    refetchInterval: 30000,
  });

  const contratos = data?.data       || [];
  const total     = data?.total      || 0;
  const pages     = data?.totalPages || 1;
  const stats     = data?.stats      || {};

  return (
    <div style={{ padding: isMobile ? '16px 12px' : 28 }} className="animate-fade">

       {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 18 : 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Clientes
          </h1>
          <p style={{ color: 'var(--txt-3)', fontSize: 12, marginTop: 3 }}>
            {total} contrato{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Filtro Internet / Cable */}
          <select
            value={tipoServicio}
            onChange={e => setTipoServicio(e.target.value)}
            style={{
              padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: '1px solid',
              background: tipoServicio ? 'var(--accent)' : 'transparent',
              color:      tipoServicio ? '#fff'          : 'var(--txt-3)',
              borderColor: tipoServicio ? 'var(--accent)' : 'var(--border-2)',
              outline: 'none', fontFamily: 'inherit',
            }}>
            <option value="">Todos</option>
            <option value="INTERNET">📡 Internet</option>
            <option value="CABLE">📺 Cable</option>
            <option value="DUO">📡📺 Dúo</option>
          </select>
          {!lectura && (
            <Btn variant="primary" size="sm" onClick={() => setShowImport(true)} icon={<Upload size={13} />}>
              {isMobile ? 'Importar' : 'Importar Excel'}
            </Btn>
          )}
        </div>
      </div>


      {/* Filtros */}
      <Card style={{ marginBottom: 16, padding: '12px 14px' }}>
        {isMobile ? (
          /* ── Móvil: buscador expandible + combobox ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {searchOpen ? (
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)' }} />
                <input
                  autoFocus
                  placeholder="Buscar abonado, contrato, DNI, celular..."
                  value={busquedaInput}
                  onChange={e => setBusquedaInput(e.target.value)}
                  style={{ width: '100%', padding: '9px 36px 9px 30px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--txt)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
                <button
                  onClick={() => { setSearchOpen(false); setBusquedaInput(''); }}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-3)', padding: 2 }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8, cursor: 'pointer', color: busquedaInput ? 'var(--accent)' : 'var(--txt-3)', fontSize: 13, fontWeight: 500, textAlign: 'left', width: '100%', boxSizing: 'border-box' }}>
                <Search size={15} />
                {busquedaInput ? `"${busquedaInput}"` : 'Buscar abonado, contrato, DNI...'}
              </button>
            )}
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: filtroEstado ? 'var(--accent)' : 'var(--txt-2)', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
            >
              {FILTROS_ESTADO.map(f => (
                <option key={f.key} value={f.key}>
                  {f.label}{f.key ? ` (${stats[f.key] ?? 0})` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : (
          /* ── Desktop: diseño original sin cambios ── */
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)' }} />
              <input placeholder="Buscar abonado, contrato, DNI, celular, dirección..."
                value={busquedaInput}
                onChange={e => setBusquedaInput(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 30px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--txt)', fontSize: 12, outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {FILTROS_ESTADO.map(f => (
                <button key={f.key} onClick={() => setFiltroEstado(f.key)}
                  style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', border: '1px solid', transition: 'all .15s',
                    background:  filtroEstado === f.key ? 'var(--accent)' : 'transparent',
                    color:       filtroEstado === f.key ? '#fff'          : 'var(--txt-3)',
                    borderColor: filtroEstado === f.key ? 'var(--accent)' : 'var(--border-2)',
                  }}>
                  {f.label}{f.key && ` (${stats[f.key] ?? 0})`}
                </button>
              ))}
            </div>
            {(filtroEstado || busquedaInput) && (
              <Btn variant="ghost" size="sm" onClick={() => { setFiltroEstado(''); setBusquedaInput(''); }} icon={<X size={12} />}>
                Limpiar
              </Btn>
            )}
          </div>
        )}
      </Card>

      {/* Contenido */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {isMobile ? (
          /* ── Móvil: cards ── */
          <div>
            {isLoading ? (
              <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 24, height: 24, border: '2px solid var(--border-2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              </div>
            ) : contratos.length === 0 ? (
              <Empty icon="🔍" title="Sin clientes" subtitle={busqueda || filtroEstado ? 'Prueba ajustando los filtros' : 'Aún no hay contratos registrados'} />
            ) : contratos.map(c => (
              <ClienteCard
                key={`${c.sede?.id ?? 'sin-sede'}-${c.numero}`}
                c={c}
                eColor={ESTADO_COLOR[c.estado] || '#768999'}
                eLabel={FILTROS_ESTADO.find(f => f.key === c.estado)?.label || c.estado}
                onClick={() => setContratoSel({ numero: c.numero, sedeId: c.sede?.id })}
                tipoLabel={tipoLabel}
              />
            ))}
          </div>
        ) : (
          /* ── Desktop: tabla original sin cambios ── */
          <Table loading={isLoading} headers={['N° Contrato', 'Abonado', 'DNI', 'Dirección / Sector', 'Celular', 'Plan', 'Estado', 'Última actividad', '']}>
            {contratos.length === 0 && !isLoading ? (
              <tr><td colSpan={8}>
                <Empty icon="🔍" title="Sin clientes" subtitle={busqueda || filtroEstado ? "Prueba ajustando los filtros" : "Aún no hay contratos registrados"} />
              </td></tr>
            ) : contratos.map(c => {
              const eColor = ESTADO_COLOR[c.estado] || '#768999';
              const eLabel = FILTROS_ESTADO.find(f => f.key === c.estado)?.label || c.estado;
              return (
                <Tr key={`${c.sede?.id ?? 'sin-sede'}-${c.numero}`} onClick={() => setContratoSel({ numero: c.numero, sedeId: c.sede?.id })}>
                  <Td>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>
                      {c.numero}
                    </span>
                  </Td>
                  <Td>
                    <div style={{ fontWeight: 500 }}>{c.abonado}</div>
                  </Td>
                  <Td style={{ fontSize: 12, color: 'var(--txt-3)', fontFamily: 'var(--font-display)' }}>
                    {c.dni || '—'}
                  </Td>
                  <Td style={{ maxWidth: 200 }}>
                    <div className="truncate" style={{ fontSize: 12, color: 'var(--txt-2)' }}>{c.direccion}</div>
                    {c.sector && <div className="truncate" style={{ fontSize: 11, color: 'var(--txt-3)' }}> {c.sector}</div>}
                  </Td>
                  <Td style={{ fontSize: 12, fontFamily: 'var(--font-display)' }}>
                    {c.celular || <span style={{ color: 'var(--txt-3)' }}>—</span>}
                  </Td>
                  <Td>
                    {c.mbps ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 4,
                        background: '#EFF6FF', color: '#2563EB',
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {c.mbps} Mbps
                      </span>
                    ) : (
                      <span style={{ color: 'var(--txt-3)', fontSize: 12 }}>—</span>
                    )}
                  </Td>
                  <Td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '2px 9px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: eColor + '15', color: eColor, letterSpacing: '0.04em',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%', background: eColor,
                        animation: c.estado === 'EN_INSTALACION' ? 'pulse 1.5s ease-in-out infinite' : 'none',
                      }} />
                      {eLabel}
                    </span>
                  </Td>
                  <Td style={{ fontSize: 12, color: 'var(--txt-3)', whiteSpace: 'nowrap' }}>
                    {c.ultimaActividad ? (
                      <>
                        <div style={{ fontFamily: 'var(--font-mono)' }}>{fmtFecha(c.ultimaActividad)}</div>
                        <div style={{ fontSize: 10, marginTop: 1 }}>
                          {tipoLabel(c.ultimoTipoOrden)}
                        </div>
                      </>
                    ) : '—'}
                  </Td>
                  <Td>
                    <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>Ver →</span>
                  </Td>
                </Tr>
              );
            })}
          </Table>
        )}

        {/* Paginador */}
        {pages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderTop: '1px solid var(--border)',
            ...(isMobile && { flexDirection: 'column', gap: 8 }),
          }}>
            <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>
              Página {page} de {pages} {isFetching && '(actualizando...)'}
            </span>
            <div style={{ display: 'flex', gap: 6, ...(isMobile && { width: '100%' }) }}>
              <Btn variant="ghost" size="sm" disabled={page === 1}    onClick={() => setPage(p => p - 1)} style={isMobile ? { flex: 1, justifyContent: 'center' } : {}}>← Anterior</Btn>
              <Btn variant="ghost" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)} style={isMobile ? { flex: 1, justifyContent: 'center' } : {}}>Siguiente →</Btn>
            </div>
          </div>
        )}
      </Card>

      <div style={{ fontSize: 11, color: 'var(--txt-3)', marginTop: 10, textAlign: isMobile ? 'center' : 'right' }}>
        Mostrando {contratos.length} de {total} contrato{total !== 1 ? 's' : ''}
      </div>

      <DrawerCliente numero={contratoSel?.numero} sedeId={contratoSel?.sedeId} onCerrar={() => setContratoSel(null)} />
      <ModalImportarContratos open={showImport} onClose={() => setShowImport(false)} />

    </div>
  );
}