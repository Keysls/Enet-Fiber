import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, HardHat, Package, CheckCircle, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { plantaExternaApi, tecnicosApi, stockApi } from '../services/api';
import { Card, Table, Tr, Td, Btn, Modal, Spinner, Empty, EstadoBadge } from '../components/ui';
import { fmtFecha } from '../utils/helpers';

// ── Helpers visuales ──────────────────────────────────────────
const TIPO_CONFIG = {
  PROYECTO:      { label: 'Proyecto',      bg: '#ede9fe', color: '#6d28d9' },
  AVERIA_MASIVA: { label: 'Avería masiva', bg: '#fee2e2', color: '#dc2626' },
  MANTENIMIENTO: { label: 'Mantenimiento', bg: '#fef3c7', color: '#d97706' },
};

function TipoBadge({ tipo }) {
  const cfg = TIPO_CONFIG[tipo] || { label: tipo, bg: '#f1f5f9', color: '#64748b' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

function EstadoPE({ estado }) {
  const activo = estado === 'EN_CURSO';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      background: activo ? '#dcfce7' : '#eff6ff',
      color:      activo ? '#16a34a' : '#2563eb',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: activo ? '#16a34a' : '#2563eb',
        display: 'inline-block',
      }}/>
      {activo ? 'En curso' : 'Completado'}
    </span>
  );
}

// ── Drawer detalle ────────────────────────────────────────────
function DrawerTrabajo({ trabajoId, onCerrar }) {
  const qc = useQueryClient();
  const abierto = !!trabajoId;
  const [showAddTecnico, setShowAddTecnico]   = useState(false);

  const { data: trabajo, isLoading } = useQuery({
    queryKey: ['trabajo-pe', trabajoId],
    queryFn:  () => plantaExternaApi.obtener(trabajoId).then(r => r.data),
    enabled:  abierto,
    staleTime: 15000,
  });

  const completarMut = useMutation({
    mutationFn: () => plantaExternaApi.completar(trabajoId),
    onSuccess: () => {
      toast.success('Trabajo completado');
      qc.invalidateQueries(['trabajos-pe']);
      qc.invalidateQueries(['trabajo-pe', trabajoId]);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  return createPortal(
    <>
      {abierto && (
        <div onClick={onCerrar} style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.35)',
          backdropFilter: 'blur(2px)',
          zIndex: 9998,
        }}/>
      )}
      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 480, maxWidth: '100vw',
        background: '#f8fafc',
        zIndex: 9999,
        boxShadow: '-2px 0 32px rgba(15,23,42,0.10)',
        transform: abierto ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {!abierto ? null : isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner size={26}/>
          </div>
        ) : trabajo ? (
          <>
            {/* Cabecera */}
            <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 20px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <TipoBadge tipo={trabajo.tipo}/>
                    <EstadoPE estado={trabajo.estado}/>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                    {trabajo.nombre}
                  </div>
                  {trabajo.descripcion && (
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{trabajo.descripcion}</div>
                  )}
                  {trabajo.ubicacion && (
                    <div style={{ fontSize: 12, color: '#dc2626', marginTop: 2 }}>📍 {trabajo.ubicacion}</div>
                  )}
                </div>
                <button onClick={onCerrar} style={{
                  width: 32, height: 32, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', border: '1px solid #e2e8f0',
                  cursor: 'pointer', color: '#64748b', flexShrink: 0,
                }}>
                  <X size={16}/>
                </button>
              </div>

              {/* Fechas */}
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
                <span>Inicio: <b style={{ color: '#475569' }}>{fmtFecha(trabajo.fechaInicio)}</b></span>
                {trabajo.fechaFin && (
                  <span>Fin: <b style={{ color: '#475569' }}>{fmtFecha(trabajo.fechaFin)}</b></span>
                )}
              </div>
            </div>

            {/* Cuerpo */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 16px' }}>

              {/* Técnicos */}
              <Seccion
                titulo="Técnicos asignados"
                icono={<Users size={13} style={{ color: '#64748b' }}/>}
                accion={trabajo.estado === 'EN_CURSO'
                  ? <button onClick={() => setShowAddTecnico(true)} style={{ fontSize: 11, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Agregar</button>
                  : null}
              >
                {trabajo.tecnicos.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#94a3b8', padding: '8px 0' }}>Sin técnicos asignados</div>
                ) : trabajo.tecnicos.map(t => (
                  <div key={t.id} style={{ padding: '7px 0', borderBottom: '1px solid #f8fafc', fontSize: 13, color: '#0f172a' }}>
                    👷 {t.tecnico.usuario.nombre} {t.tecnico.usuario.apellido}
                  </div>
                ))}
              </Seccion>

              {/* Materiales */}
              <Seccion
                titulo="Materiales utilizados"
                icono={<Package size={13} style={{ color: '#64748b' }}/>}
                badge={trabajo.consumos?.length > 0 ? `${trabajo.consumos.length} ítem${trabajo.consumos.length !== 1 ? 's' : ''}` : null}
                accion={null}
              >
                {(!trabajo.consumos || trabajo.consumos.length === 0) ? (
                  <div style={{ fontSize: 12, color: '#94a3b8', padding: '8px 0' }}>Sin materiales registrados</div>
                ) : trabajo.consumos.map((c, i) => {
                  const esMedible = c.producto?.esMedible && c.producto?.metrosPorUnidad;
                  const valor = esMedible ? Number(c.cantidad) * c.producto.metrosPorUnidad : Number(c.cantidad);
                  const unidad = esMedible ? 'm' : (c.producto?.unidad || 'und');
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: i === trabajo.consumos.length - 1 ? 'none' : '1px solid #f8fafc', gap: 10 }}>
                      <div style={{ flex: 1, fontSize: 13, color: '#0f172a' }}>{c.producto?.nombre}</div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#e67e22', fontFamily: 'monospace' }}>
                        -{valor % 1 === 0 ? valor : valor.toFixed(1)} {unidad}
                      </span>
                    </div>
                  );
                })}
              </Seccion>

              {/* Botón completar */}
              {trabajo.estado === 'EN_CURSO' && (
                <div style={{ margin: '16px 14px 0' }}>
                  <button
                    onClick={() => {
                      if (window.confirm('¿Marcar este trabajo como completado? No podrás agregar más materiales.')) {
                        completarMut.mutate();
                      }
                    }}
                    disabled={completarMut.isPending}
                    style={{
                      width: '100%', padding: '11px 0',
                      background: '#dcfce7', color: '#16a34a',
                      border: '1px solid #86efac', borderRadius: 10,
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    }}
                  >
                    <CheckCircle size={15}/> Marcar como completado
                  </button>
                </div>
              )}
            </div>

            {/* Modales */}
            {showAddTecnico && (
              <ModalAgregarTecnico
                trabajoId={trabajoId}
                sedeId={trabajo.sedeId}
                yaAsignados={trabajo.tecnicos.map(t => t.tecnicoId)}
                onClose={() => setShowAddTecnico(false)}
                onSuccess={() => {
                  setShowAddTecnico(false);
                  qc.invalidateQueries(['trabajo-pe', trabajoId]);
                }}
              />
            )}
          </>
        ) : null}
      </aside>
    </>,
    document.body
  );
}

function Seccion({ titulo, icono, badge, accion, children }) {
  return (
    <div style={{ background: '#fff', margin: '10px 14px 0', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 7 }}>
        {icono}
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{titulo}</span>
        {badge && (
          <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#eff6ff', color: '#2563eb' }}>{badge}</span>
        )}
        {accion && <span style={{ marginLeft: 'auto' }}>{accion}</span>}
      </div>
      <div style={{ padding: '0 16px' }}>{children}</div>
    </div>
  );
}

// ── Modal: Agregar técnico ────────────────────────────────────
function ModalAgregarTecnico({ trabajoId, sedeId, yaAsignados, onClose, onSuccess }) {
  const [tecnicoId, setTecnicoId] = useState('');

  const { data: tecnicosData } = useQuery({
    queryKey: ['tecnicos-activos'],
    queryFn:  () => tecnicosApi.listar({ activo: true }).then(r => r.data),
  });
  const tecnicos = (tecnicosData || []).filter(t => !yaAsignados.includes(t.id));

  const mut = useMutation({
    mutationFn: () => plantaExternaApi.agregarTecnico(trabajoId, { tecnicoId }),
    onSuccess: () => { toast.success('Técnico agregado'); onSuccess(); },
    onError:   (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 340, maxWidth: '90vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Agregar técnico</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={16}/></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <select value={tecnicoId} onChange={e => setTecnicoId(e.target.value)}
            style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', outline: 'none' }}>
            <option value="">— Seleccionar técnico —</option>
            {tecnicos.map(t => (
              <option key={t.id} value={t.id}>{t.usuario.nombre} {t.usuario.apellido}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '9px 0', border: '1px solid #e2e8f0', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
            <button
              onClick={() => mut.mutate()}
              disabled={!tecnicoId || mut.isPending}
              style={{ flex: 1, padding: '9px 0', border: 'none', borderRadius: 8, background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: !tecnicoId ? 0.5 : 1 }}>
              {mut.isPending ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Crear trabajo ──────────────────────────────────────
function ModalCrear({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({ tipo: 'PROYECTO', nombre: '', descripcion: '', ubicacion: '', fechaInicio: '' });
  const [tecnicoIds, setTecnicoIds] = useState([]);

  const { data: tecnicosData } = useQuery({
    queryKey: ['tecnicos-activos'],
    queryFn:  () => tecnicosApi.listar({ activo: true }).then(r => r.data),
    enabled:  open,
  });
  const tecnicos = tecnicosData || [];

  const mut = useMutation({
    mutationFn: () => plantaExternaApi.crear({ ...form, tecnicoIds }),
    onSuccess: () => { toast.success('Trabajo creado'); onSuccess(); },
    onError:   (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  if (!open) return null;

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: 24,
        width: 440, maxWidth: '100%',
        maxHeight: 'calc(100vh - 48px)',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Nuevo trabajo</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={16}/></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
          <div>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Tipo</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }}>
              <option value="PROYECTO">Proyecto</option>
              <option value="AVERIA_MASIVA">Avería masiva</option>
              <option value="MANTENIMIENTO">Mantenimiento</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Nombre *</label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
              placeholder="Ej: Ampliación Sector Norte"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}/>
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Descripción</label>
            <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
              rows={2} placeholder="Descripción del trabajo..."
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}/>
          </div>

          {form.tipo === 'AVERIA_MASIVA' && (
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Ubicación *</label>
              <input value={form.ubicacion} onChange={e => set('ubicacion', e.target.value)}
                placeholder="Ej: Av. Principal km 3"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}/>
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Fecha de inicio</label>
            <input type="date" value={form.fechaInicio} onChange={e => set('fechaInicio', e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}/>
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Técnico(s)</label>
            <select multiple value={tecnicoIds} onChange={e => setTecnicoIds(Array.from(e.target.selectedOptions, o => o.value))}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', minHeight: 80, boxSizing: 'border-box' }}>
              {tecnicos.map(t => (
                <option key={t.id} value={t.id}>{t.usuario.nombre} {t.usuario.apellido}</option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Ctrl+click para seleccionar varios</div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4, flexShrink: 0 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1px solid #e2e8f0', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
            <button
              onClick={() => mut.mutate()}
              disabled={!form.nombre || (form.tipo === 'AVERIA_MASIVA' && !form.ubicacion) || mut.isPending}
              style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: (!form.nombre || (form.tipo === 'AVERIA_MASIVA' && !form.ubicacion)) ? 0.5 : 1 }}>
              {mut.isPending ? 'Creando...' : 'Crear trabajo'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Página principal ──────────────────────────────────────────
export default function PlantaExternaPage() {
  const qc = useQueryClient();
  const [drawer, setDrawer]   = useState(null);
  const [showCrear, setShowCrear] = useState(false);
  const [filters, setFilters] = useState({ tipo: '', estado: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['trabajos-pe', filters],
    queryFn:  () => plantaExternaApi.listar(filters).then(r => r.data),
    staleTime: 15000,
  });

  const trabajos = data || [];

  return (
    <div style={{ padding: 28 }} className="animate-fade">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <HardHat size={22} style={{ color: 'var(--accent)' }}/>
            Planta Externa
          </h1>
          <p style={{ color: 'var(--txt-3)', fontSize: 12, marginTop: 3 }}>
            {trabajos.length} trabajo{trabajos.length !== 1 ? 's' : ''}
            {' · '}
            {trabajos.filter(t => t.estado === 'EN_CURSO').length} en curso
          </p>
        </div>
        <Btn variant="primary" size="sm" icon={<Plus size={13}/>} onClick={() => setShowCrear(true)}>
          Nuevo trabajo
        </Btn>
      </div>

      {/* Filtros */}
      <Card style={{ marginBottom: 14, padding: '10px 12px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={filters.tipo} onChange={e => setFilters(p => ({ ...p, tipo: e.target.value }))}
            style={{ padding: '7px 10px', background: 'var(--bg-3)', border: `1px solid ${filters.tipo ? 'var(--accent)' : 'var(--border-2)'}`, borderRadius: 8, color: filters.tipo ? 'var(--accent)' : 'var(--txt-2)', fontSize: 12, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            <option value="">Todos los tipos</option>
            <option value="PROYECTO">Proyecto</option>
            <option value="AVERIA_MASIVA">Avería masiva</option>
            <option value="MANTENIMIENTO">Mantenimiento</option>
          </select>
          <select value={filters.estado} onChange={e => setFilters(p => ({ ...p, estado: e.target.value }))}
            style={{ padding: '7px 10px', background: 'var(--bg-3)', border: `1px solid ${filters.estado ? 'var(--accent)' : 'var(--border-2)'}`, borderRadius: 8, color: filters.estado ? 'var(--accent)' : 'var(--txt-2)', fontSize: 12, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            <option value="">Todos los estados</option>
            <option value="EN_CURSO">En curso</option>
            <option value="COMPLETADO">Completado</option>
          </select>
          {(filters.tipo || filters.estado) && (
            <Btn variant="ghost" size="sm" onClick={() => setFilters({ tipo: '', estado: '' })}>Limpiar</Btn>
          )}
        </div>
      </Card>

      {/* Tabla */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Table loading={isLoading} headers={['Nombre', 'Tipo', 'Técnicos', 'Inicio', 'Estado', 'Materiales', '']}>
          {trabajos.length === 0 && !isLoading ? (
            <tr><td colSpan={7}><Empty icon="🏗️" title="Sin trabajos" subtitle="Crea el primer trabajo de planta externa"/></td></tr>
          ) : trabajos.map(t => (
            <Tr key={t.id} onClick={() => setDrawer(t.id)}>
              <Td>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--txt)' }}>{t.nombre}</div>
                {t.ubicacion && <div style={{ fontSize: 11, color: '#dc2626' }}>📍 {t.ubicacion}</div>}
                {t.descripcion && <div style={{ fontSize: 11, color: 'var(--txt-3)', marginTop: 2 }}>{t.descripcion}</div>}
              </Td>
              <Td><TipoBadge tipo={t.tipo}/></Td>
              <Td style={{ fontSize: 12, color: 'var(--txt-2)' }}>
                {t.tecnicos.length === 0
                  ? <span style={{ color: 'var(--txt-3)' }}>Sin asignar</span>
                  : t.tecnicos.map(tc => `${tc.tecnico.usuario.nombre} ${tc.tecnico.usuario.apellido}`).join(', ')}
              </Td>
              <Td style={{ fontSize: 12, color: 'var(--txt-2)', whiteSpace: 'nowrap' }}>{fmtFecha(t.fechaInicio)}</Td>
              <Td><EstadoPE estado={t.estado}/></Td>
              <Td style={{ fontSize: 12, color: 'var(--txt-2)' }}>
                {t.consumos?.length > 0 ? `${t.consumos.length} ítem${t.consumos.length !== 1 ? 's' : ''}` : '—'}
              </Td>
              <Td>
                <Btn variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setDrawer(t.id); }}>Ver</Btn>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      <DrawerTrabajo trabajoId={drawer} onCerrar={() => setDrawer(null)}/>

      <ModalCrear
        open={showCrear}
        onClose={() => setShowCrear(false)}
        onSuccess={() => { setShowCrear(false); qc.invalidateQueries(['trabajos-pe']); }}
      />
    </div>
  );
}