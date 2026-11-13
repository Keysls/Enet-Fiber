import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Wifi, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { planesApi } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { soloLectura } from '../utils/permisos';
import { useSedeVista } from '../hooks/useSedeVista';

const TIPOS = [
  { value: 'INTERNET', label: 'Internet',        color: '#2563EB', bg: '#EFF6FF' },
  { value: 'DUO',      label: 'Dúo (Int+Cable)', color: '#7C3AED', bg: '#F5F3FF' },
];

const tipoInfo = (v) => TIPOS.find(t => t.value === v) || TIPOS[0];

const S = {
  page:    { padding: '24px', maxWidth: 820, margin: '0 auto' },
  header:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title:   { fontSize: 20, fontWeight: 700, color: 'var(--txt)', margin: 0 },
  sub:     { fontSize: 13, color: 'var(--txt-2)', marginTop: 4 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },

  card: {
    background: 'var(--bg-2)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '14px 18px',
    display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8,
  },
  badge: (tipo) => ({
    background: tipoInfo(tipo).bg, color: tipoInfo(tipo).color,
    borderRadius: 8, padding: '5px 11px',
    fontWeight: 700, fontSize: 14, minWidth: 90, textAlign: 'center',
    whiteSpace: 'nowrap',
  }),
  info:    { flex: 1 },
  name:    { fontWeight: 600, fontSize: 14, color: 'var(--txt)' },
  precio:  { fontSize: 13, color: 'var(--txt-2)', marginTop: 2 },
  actions: { display: 'flex', gap: 6 },

  btn: (v = 'primary') => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 8, border: 'none',
    cursor: 'pointer', fontSize: 13, fontWeight: 500,
    background: v === 'primary' ? '#2563EB' : v === 'danger' ? '#FEE2E2' : 'transparent',
    color:      v === 'primary' ? '#fff'    : v === 'danger' ? '#DC2626' : 'var(--txt-2)',
  }),

  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: 'var(--bg)', borderRadius: 14, padding: 28,
    width: '100%', maxWidth: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  modalTitle: { fontWeight: 700, fontSize: 16, marginBottom: 20, color: 'var(--txt)' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--txt-2)', marginBottom: 5 },
  input: {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--bg-2)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '9px 12px', fontSize: 14, color: 'var(--txt)',
    outline: 'none', marginBottom: 14,
  },
  select: {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--bg-2)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '9px 12px', fontSize: 14, color: 'var(--txt)',
    outline: 'none', marginBottom: 14, cursor: 'pointer',
  },
  row:          { display: 'flex', gap: 12 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  empty: { textAlign: 'center', padding: '48px 0', color: 'var(--txt-3)', fontSize: 14 },
};

const EMPTY_FORM = { nombre: '', mbps: '', precio: '', tipoServicio: 'INTERNET' };

export default function PlanesPage() {
  const qc = useQueryClient();
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const lectura = soloLectura(useAuthStore(s => s.usuario));  // gerente: solo mira
  const { todas } = useSedeVista();
  const verSede = lectura && todas;  // con "Todas las sedes" cada plan dice de cuál es

  const { data: planes = [], isLoading } = useQuery({
    queryKey: ['planes'],
    queryFn:  () => planesApi.listar().then(r => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['planes'] });

  const mutCrear = useMutation({
    mutationFn: (data) => planesApi.crear(data),
    onSuccess:  () => { toast.success('Plan creado'); invalidate(); cerrar(); },
    onError:    (e) => toast.error(e.response?.data?.error || 'Error al crear'),
  });

  const mutEditar = useMutation({
    mutationFn: ({ id, data }) => planesApi.actualizar(id, data),
    onSuccess:  () => { toast.success('Plan actualizado'); invalidate(); cerrar(); },
    onError:    (e) => toast.error(e.response?.data?.error || 'Error al actualizar'),
  });

  const mutEliminar = useMutation({
    mutationFn: (id) => planesApi.eliminar(id),
    onSuccess:  () => { toast.success('Plan desactivado'); invalidate(); },
    onError:    (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const abrirCrear = () => { setForm(EMPTY_FORM); setEditId(null); setModal('crear'); };
  const abrirEditar = (plan) => {
    setForm({ nombre: plan.nombre, mbps: String(plan.mbps), precio: String(plan.precio), tipoServicio: plan.tipoServicio });
    setEditId(plan.id);
    setModal('editar');
  };
  const cerrar = () => { setModal(null); setForm(EMPTY_FORM); setEditId(null); };

  const handleSubmit = () => {
    const { nombre, mbps, precio, tipoServicio } = form;
    if (!nombre.trim() || !mbps || !precio) return toast.error('Completa todos los campos');
    if (isNaN(Number(mbps)) || isNaN(Number(precio))) return toast.error('Mbps y precio deben ser números');
    const data = { nombre: nombre.trim(), mbps: Number(mbps), precio: Number(precio), tipoServicio };
    if (modal === 'crear') mutCrear.mutate(data);
    else mutEditar.mutate({ id: editId, data });
  };

  const handleEliminar = (plan) => {
    if (!window.confirm(`¿Desactivar el plan "${plan.nombre}"?`)) return;
    mutEliminar.mutate(plan.id);
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const activos   = planes.filter(p => p.activo);
  const inactivos = planes.filter(p => !p.activo);

  // Agrupar activos por tipo
  const porTipo = TIPOS.map(t => ({
    ...t,
    planes: activos.filter(p => p.tipoServicio === t.value),
  })).filter(g => g.planes.length > 0);

  const totalActivos = activos.length;

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Planes de Internet</h1>
          <p style={S.sub}>{lectura ? 'Planes y precios de la sede' : 'Los precios se usan para identificar el plan al subir un Excel'}</p>
        </div>
        {!lectura && (
          <button style={S.btn('primary')} onClick={abrirCrear}>
            <Plus size={15} /> Nuevo plan
          </button>
        )}
      </div>

      {isLoading ? (
        <p style={S.empty}>Cargando...</p>
      ) : totalActivos === 0 && inactivos.length === 0 ? (
        <div style={S.empty}>
          <Wifi size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
          <p>No hay planes creados aún.</p>
          {!lectura && <p style={{ fontSize: 12 }}>Crea un plan para que el sistema asigne Mbps automáticamente al subir el Excel.</p>}
        </div>
      ) : (
        <>
          {/* Planes activos agrupados por tipo */}
          {porTipo.map(grupo => (
            <div key={grupo.value} style={S.section}>
              <p style={S.sectionTitle}>{grupo.label}</p>
              {grupo.planes.map(plan => (
                <div key={plan.id} style={S.card}>
                  <div style={S.badge(plan.tipoServicio)}>{plan.mbps} Mbps</div>
                  <div style={S.info}>
                    <div style={S.name}>{plan.nombre}</div>
                    <div style={S.precio}>S/ {Number(plan.precio).toFixed(2)} / mes{verSede && plan.sede?.nombre ? ` · ${plan.sede.nombre}` : ''}</div>
                  </div>
                  {!lectura && (
                    <div style={S.actions}>
                      <button style={S.btn('ghost')} title="Editar" onClick={() => abrirEditar(plan)}>
                        <Pencil size={15} />
                      </button>
                      <button style={S.btn('danger')} title="Desactivar" onClick={() => handleEliminar(plan)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Inactivos */}
          {inactivos.length > 0 && (
            <div style={S.section}>
              <p style={S.sectionTitle}>Inactivos</p>
              {inactivos.map(plan => (
                <div key={plan.id} style={{ ...S.card, opacity: 0.5 }}>
                  <div style={{ ...S.badge(plan.tipoServicio), background: 'var(--bg-3)', color: 'var(--txt-3)' }}>
                    {plan.mbps} Mbps
                  </div>
                  <div style={S.info}>
                    <div style={S.name}>{plan.nombre}</div>
                    <div style={S.precio}>
                      S/ {Number(plan.precio).toFixed(2)} / mes · {tipoInfo(plan.tipoServicio).label}{verSede && plan.sede?.nombre ? ` · ${plan.sede.nombre}` : ''} · <em>inactivo</em>
                    </div>
                  </div>
                  {!lectura && (
                    <button style={S.btn('ghost')} title="Reactivar"
                      onClick={() => mutEditar.mutate({ id: plan.id, data: { activo: true } })}>
                      <CheckCircle size={15} color="#16a34a" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <p style={S.modalTitle}>{modal === 'crear' ? 'Nuevo plan' : 'Editar plan'}</p>

            <label style={S.label}>Tipo de servicio</label>
            <select style={S.select} value={form.tipoServicio} onChange={set('tipoServicio')}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>

            <label style={S.label}>Nombre del plan</label>
            <input style={S.input} placeholder="Plan 250 Mbps" value={form.nombre} onChange={set('nombre')} />

            <div style={S.row}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Velocidad (Mbps)</label>
                <input style={S.input} type="number" placeholder="250" value={form.mbps} onChange={set('mbps')} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Precio mensual (S/)</label>
                <input style={S.input} type="number" step="0.01" placeholder="60.00" value={form.precio} onChange={set('precio')} />
              </div>
            </div>

            <div style={S.modalActions}>
              <button style={S.btn('ghost')} onClick={cerrar}>Cancelar</button>
              <button style={S.btn('primary')} onClick={handleSubmit}
                disabled={mutCrear.isPending || mutEditar.isPending}>
                {mutCrear.isPending || mutEditar.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}