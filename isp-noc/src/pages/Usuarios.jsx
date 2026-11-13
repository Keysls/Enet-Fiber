import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Pencil, Lock, History, Mail, Phone, MapPin, LogOut, RotateCcw, MessageCircle, Power, PowerOff, Search, X, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { usuariosApi, ordenesApi, sedesApi, authApi } from '../services/api';
import { Card, Btn, Modal, Input, Select, Spinner, Empty } from '../components/ui';
import { fmtFechaHora } from '../utils/helpers';
import { useTiposOrden } from '../hooks/useTiposOrden';
import { useAuthStore } from '../store/auth.store';

// ── CSS responsive ────────────────────────────────────────────
const CSS = `
  .usr-row-actions { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
  .usr-info-row    { display: flex; gap: 14px; flex-wrap: wrap; }
  .usr-row         { display: flex; align-items: center; gap: 14px; padding: 12px 16px; transition: background .12s; }

  @media (max-width: 768px) {
    .usr-row { flex-wrap: wrap; gap: 10px; }
    .usr-row-actions {
      width: 100%;
      justify-content: flex-start;
      padding-top: 8px;
      border-top: 1px solid var(--border);
      gap: 4px;
    }
    .usr-info-row { gap: 8px; }
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('usr-css')) {
  const s = document.createElement('style'); s.id = 'usr-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

// ── Badges ────────────────────────────────────────────────────
function RolBadge({ rol }) {
  const config = {
    SUPERADMIN:   { bg: 'rgba(220,38,38,0.08)',  color: '#DC2626', border: 'rgba(220,38,38,0.2)',  label: 'Super Admin'   },
    OPERADOR_NOC: { bg: 'rgba(30,58,138,0.08)',  color: '#1E3A8A', border: 'rgba(30,58,138,0.2)',  label: 'Operador NOC'  },
    ADMIN:        { bg: 'rgba(59,159,212,0.08)', color: '#3B9FD4', border: 'rgba(59,159,212,0.2)', label: 'Administrador' },
    GERENTE:      { bg: 'rgba(124,58,237,0.08)', color: '#7C3AED', border: 'rgba(124,58,237,0.2)', label: 'Administrador general' },
  };
  const s = config[rol] || config.OPERADOR_NOC;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function Avatar({ nombre, apellido, rol, size = 36 }) {
  const color = rol === 'SUPERADMIN' ? '#DC2626' : rol === 'ADMIN' ? '#3B9FD4' : rol === 'GERENTE' ? '#7C3AED' : '#1E3A8A';
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.25, flexShrink: 0,
      background: `linear-gradient(135deg, ${color}, ${color}99)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 800, color: '#fff',
    }}>
      {nombre?.[0]}{apellido?.[0]}
    </div>
  );
}

// ── Modal Crear ───────────────────────────────────────────────
function ModalCrear({ open, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', telefono: '', rol: 'OPERADOR_NOC', sedeId: '' });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const { data: sedes } = useQuery({ queryKey: ['sedes'], queryFn: () => sedesApi.listar().then(r => r.data), enabled: open });
  const sedesActivas = (sedes || []).filter(s => s.activo);

  const mut = useMutation({
    mutationFn: () => usuariosApi.crear({ nombre: form.nombre, apellido: form.apellido, email: form.email, password: form.password, telefono: form.telefono, rol: form.rol, ...(form.rol === 'ADMIN' && { sedeId: form.sedeId }) }),
    onSuccess: () => { toast.success('Usuario creado'); qc.invalidateQueries(['noc-usuarios']); onClose(); setForm({ nombre: '', apellido: '', email: '', password: '', telefono: '', rol: 'OPERADOR_NOC', sedeId: '' }); },
    onError: e => toast.error(e.response?.data?.error || 'Error al crear usuario'),
  });

  const handleSubmit = () => {
    const e = {};
    if (!form.nombre)   e.nombre   = 'Requerido';
    if (!form.apellido) e.apellido = 'Requerido';
    if (!form.email)    e.email    = 'Requerido';
    if (!form.password || form.password.length < 8) e.password = 'Mínimo 8 caracteres';
    else if (!/[A-Z]/.test(form.password))          e.password = 'Debe tener al menos una mayúscula';
    else if (!/[0-9]/.test(form.password))          e.password = 'Debe tener al menos un número';
    if (form.rol === 'ADMIN' && !form.sedeId) e.sedeId = 'Selecciona una sede';
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({}); mut.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo usuario" width={460}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ marginBottom: 18 }}>
          <SectionLabel>Datos personales</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Nombre *"   value={form.nombre}   onChange={e => set('nombre', e.target.value)}   error={errors.nombre}   placeholder="Juan" />
            <Input label="Apellido *" value={form.apellido} onChange={e => set('apellido', e.target.value)} error={errors.apellido} placeholder="Pérez" />
          </div>
          <div style={{ marginTop: 12 }}>
            <Input label="Teléfono (WhatsApp)" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="9XXXXXXXX" />
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <SectionLabel>Acceso al sistema</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input label="Email *" value={form.email} onChange={e => set('email', e.target.value)} error={errors.email} placeholder="usuario@enetfiber.com" type="email" />
            <Input label="Contraseña *" type="password" value={form.password} onChange={e => set('password', e.target.value)} error={errors.password} placeholder="Mín. 8 chars, mayúscula y número" />
            <Select label="Rol" value={form.rol} onChange={e => set('rol', e.target.value)}>
              <option value="OPERADOR_NOC">Operador NOC</option>
              <option value="ADMIN">Administrador de Sede</option>
              <option value="GERENTE">Administrador general (solo ver)</option>
              <option value="SUPERADMIN">Super Admin</option>
            </Select>
          </div>
        </div>
        {form.rol === 'ADMIN' && (
          <div style={{ marginBottom: 18 }}>
            <SectionLabel>Sede asignada</SectionLabel>
            {sedesActivas.length === 0
              ? <div style={{ fontSize: 12, color: 'var(--red)', padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 8 }}>⚠️ No hay sedes activas.</div>
              : <Select label="Sede *" value={form.sedeId} onChange={e => set('sedeId', e.target.value)} error={errors.sedeId}>
                  <option value="">— Selecciona una sede —</option>
                  {sedesActivas.map(s => <option key={s.id} value={s.id}>{s.nombre} — {s.ciudad}</option>)}
                </Select>
            }
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSubmit} loading={mut.isPending}>Crear usuario</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal Editar ──────────────────────────────────────────────
function ModalEditar({ open, onClose, usuario }) {
  const qc = useQueryClient();
  const usuarioActual = useAuthStore(s => s.usuario);
  const updateUsuario = useAuthStore(s => s.updateUsuario);
  const [form, setForm] = useState({ nombre: '', apellido: '', telefono: '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  React.useEffect(() => {
    if (usuario) setForm({ nombre: usuario.nombre || '', apellido: usuario.apellido || '', telefono: usuario.telefono || '' });
  }, [usuario]);

  const mut = useMutation({
    mutationFn: () => usuariosApi.actualizar(usuario.id, form),
    onSuccess: () => { toast.success('Actualizado'); qc.invalidateQueries(['noc-usuarios']); if (usuario.id === usuarioActual?.id) updateUsuario(form); onClose(); },
    onError: e => toast.error(e.response?.data?.error || 'Error'),
  });

  if (!usuario) return null;
  return (
    <Modal open={open} onClose={onClose} title="Editar usuario" width={400}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--bg-3)', borderRadius: 10, marginBottom: 18 }}>
        <Avatar nombre={usuario.nombre} apellido={usuario.apellido} rol={usuario.rol} size={44} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>{usuario.nombre} {usuario.apellido}</div>
          <div style={{ fontSize: 12, color: 'var(--txt-3)', marginTop: 2 }}>{usuario.email}</div>
          <div style={{ marginTop: 4 }}><RolBadge rol={usuario.rol} /></div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Input label="Nombre"   value={form.nombre}   onChange={e => set('nombre', e.target.value)} />
        <Input label="Apellido" value={form.apellido} onChange={e => set('apellido', e.target.value)} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <Input label="Teléfono (WhatsApp)" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="9XXXXXXXX" />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={() => mut.mutate()} loading={mut.isPending}>Guardar cambios</Btn>
      </div>
    </Modal>
  );
}

// ── Modal Contraseña ──────────────────────────────────────────
function ModalPassword({ open, onClose, usuario }) {
  const [pass, setPass]   = useState('');
  const [conf, setConf]   = useState('');
  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: () => usuariosApi.password(usuario.id, { passwordNueva: pass }),
    onSuccess: () => { toast.success('Contraseña actualizada'); onClose(); setPass(''); setConf(''); },
    onError: e => toast.error(e.response?.data?.error || 'Error'),
  });

  const handleGuardar = () => {
    if (pass.length < 8)       { setError('Mínimo 8 caracteres'); return; }
    if (!/[A-Z]/.test(pass))   { setError('Debe tener al menos una mayúscula'); return; }
    if (!/[0-9]/.test(pass))   { setError('Debe tener al menos un número'); return; }
    if (pass !== conf)         { setError('Las contraseñas no coinciden'); return; }
    setError(''); mut.mutate();
  };

  if (!usuario) return null;
  return (
    <Modal open={open} onClose={onClose} title="Cambiar contraseña" width={360}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-3)', borderRadius: 10, marginBottom: 16 }}>
        <Avatar nombre={usuario.nombre} apellido={usuario.apellido} rol={usuario.rol} size={36} />
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{usuario.nombre} {usuario.apellido}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
        <Input label="Nueva contraseña" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Mín. 8 chars, mayúscula y número" />
        <Input label="Confirmar"        type="password" value={conf} onChange={e => setConf(e.target.value)} placeholder="Repite la contraseña" />
        {error && <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-bg)', borderRadius: 8, borderLeft: '3px solid var(--red)' }}>{error}</div>}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={handleGuardar} loading={mut.isPending}>Cambiar contraseña</Btn>
      </div>
    </Modal>
  );
}

// ── Modal Historial WAN ───────────────────────────────────────
function ModalHistorial({ open, onClose, usuario, tipoLabel }) {
  const { data, isLoading } = useQuery({
    queryKey: ['noc-historial', usuario?.id],
    queryFn:  () => ordenesApi.historialWan(usuario.id).then(r => r.data),
    enabled:  open && !!usuario,
  });

  if (!usuario) return null;
  return (
    <Modal open={open} onClose={onClose} title={`Historial WAN — ${usuario.nombre} ${usuario.apellido}`} width={540}>
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 28 }}><Spinner /></div>
      ) : (data || []).length === 0 ? (
        <Empty icon="📋" title="Sin historial" subtitle="Este operador no ha configurado WAN aún" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
          {(data || []).map(o => (
            <div key={o.id} style={{ background: 'var(--bg-3)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>#{o.nServicio}</span>
                  <span style={{ fontSize: 11, color: 'var(--txt-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.abonado}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--txt-3)', fontFamily: 'monospace' }}>
                  {o.ipWan} / {o.mascara} → {o.gateway}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>{fmtFechaHora(o.fechaWan)}</div>
                <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2, fontWeight: 600 }}>{tipoLabel(o.tipoOrden)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Modal Reset con WhatsApp ──────────────────────────────────
function ModalReset({ open, onClose, usuario }) {
  const [loading,     setLoading]     = useState(false);
  const [resetResult, setResetResult] = useState(null);

  React.useEffect(() => { if (!open) setResetResult(null); }, [open]);

  const handleGenerar = async () => {
    setLoading(true);
    try {
      const { data } = await authApi.solicitarReset(usuario.email);
      setResetResult(data);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al generar token');
    } finally { setLoading(false); }
  };

  const handleWhatsApp = () => {
    if (!resetResult?.token) return;
    const telefono = (usuario.telefono || '').replace(/\D/g, '');
    const link     = `${window.location.origin}/reset-password?token=${resetResult.token}`;
    const mensaje  = encodeURIComponent(`Hola ${usuario.nombre}, aquí está tu link para restablecer tu contraseña en EnetFiber:\n\n${link}\n\n⚠️ Este link expira en 30 minutos.`);
    window.open(telefono ? `https://wa.me/51${telefono}?text=${mensaje}` : `https://wa.me/?text=${mensaje}`, '_blank');
  };

  if (!usuario) return null;
  return (
    <Modal open={open} onClose={onClose} title="Recuperar contraseña" width={420}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--bg-3)', borderRadius: 10, marginBottom: 18 }}>
        <Avatar nombre={usuario.nombre} apellido={usuario.apellido} rol={usuario.rol} size={44} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>{usuario.nombre} {usuario.apellido}</div>
          <div style={{ fontSize: 12, color: 'var(--txt-3)', marginTop: 2 }}>{usuario.email}</div>
          {usuario.telefono && <div style={{ fontSize: 12, color: 'var(--txt-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11}/> {usuario.telefono}</div>}
        </div>
      </div>
      {!resetResult ? (
        <>
          <p style={{ fontSize: 13, color: 'var(--txt-2)', marginBottom: 18, lineHeight: 1.6 }}>
            Se generará un token temporal válido por <strong>30 minutos</strong>. El usuario podrá usarlo para restablecer su contraseña.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn variant="primary" icon={<RotateCcw size={13}/>} onClick={handleGenerar} loading={loading}>Generar link</Btn>
          </div>
        </>
      ) : (
        <>
          <div style={{ padding: '12px 14px', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--txt-3)', marginBottom: 6 }}>Link de recuperación:</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', wordBreak: 'break-all', lineHeight: 1.6 }}>
              {`${window.location.origin}/reset-password?token=${resetResult.token}`}
            </div>
            <div style={{ fontSize: 11, color: 'var(--yellow)', marginTop: 8 }}>⚠️ Expira en 30 minutos</div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Btn variant="ghost" onClick={onClose}>Cerrar</Btn>
            <Btn variant="ghost" icon={<RotateCcw size={13}/>} onClick={handleGenerar} loading={loading}>Regenerar</Btn>
            <Btn variant="primary" icon={<MessageCircle size={13}/>} onClick={handleWhatsApp}
              style={{ background: '#25D366', borderColor: '#25D366' }}>
              Enviar por WhatsApp
            </Btn>
          </div>
        </>
      )}
    </Modal>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
      {children}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function UsuariosPage() {
  const { tipoLabel } = useTiposOrden();
  const [showCrear,  setShowCrear]  = useState(false);
  const [userEditar, setUserEditar] = useState(null);
  const [userPass,   setUserPass]   = useState(null);
  const [userHist,   setUserHist]   = useState(null);
  const [userReset,  setUserReset]  = useState(null);
  const [filtroRol,  setFiltroRol]  = useState('TODOS');
  const [busqueda,   setBusqueda]   = useState('');

  const usuarioActual = useAuthStore(s => s.usuario);
  const qc            = useQueryClient();

  const toggleActivoMut = useMutation({
    mutationFn: ({ id, activo }) => usuariosApi.toggleActivo(id, activo),
    onSuccess: (_, { activo }) => { toast.success(activo ? '✓ Usuario habilitado' : 'Usuario deshabilitado'); qc.invalidateQueries(['noc-usuarios']); },
    onError: () => toast.error('Error al cambiar estado'),
  });

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['noc-usuarios'],
    queryFn:  () => usuariosApi.listar().then(r => r.data),
  });

  const usuariosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return (usuarios || []).filter(u => {
      const matchRol = filtroRol === 'TODOS' || u.rol === filtroRol;
      const matchQ   = !q
        || `${u.nombre} ${u.apellido}`.toLowerCase().includes(q)
        || u.email.toLowerCase().includes(q)
        || u.telefono?.toLowerCase().includes(q)
        || u.sede?.nombre?.toLowerCase().includes(q);
      return matchRol && matchQ;
    });
  }, [usuarios, filtroRol, busqueda]);

  const conteo = useMemo(() => ({
    TODOS:        (usuarios || []).length,
    SUPERADMIN:   (usuarios || []).filter(u => u.rol === 'SUPERADMIN').length,
    OPERADOR_NOC: (usuarios || []).filter(u => u.rol === 'OPERADOR_NOC').length,
    ADMIN:        (usuarios || []).filter(u => u.rol === 'ADMIN').length,
    GERENTE:      (usuarios || []).filter(u => u.rol === 'GERENTE').length,
  }), [usuarios]);

  return (
    <div style={{ padding: 24 }} className="animate-fade">

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--txt)', margin: 0 }}>Usuarios</h1>
          <p style={{ color: 'var(--txt-3)', fontSize: 12, marginTop: 4 }}>
            {conteo.TODOS} usuario{conteo.TODOS !== 1 ? 's' : ''} · {usuariosFiltrados.length} mostrado{usuariosFiltrados.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Btn variant="primary" size="sm" icon={<UserPlus size={13}/>} onClick={() => setShowCrear(true)}>
          Nuevo usuario
        </Btn>
      </div>

      {/* ── Buscador + filtros ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Buscador */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)', pointerEvents: 'none' }}/>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, email, teléfono o sede..."
            style={{
              width: '100%', height: 36, paddingLeft: 32, paddingRight: busqueda ? 32 : 12,
              background: 'var(--bg-3)', border: '1px solid var(--border-2)',
              borderRadius: 8, color: 'var(--txt)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
            }}
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-3)', display: 'flex', padding: 2 }}>
              <X size={13}/>
            </button>
          )}
        </div>

        {/* Filtros de rol */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'TODOS',        label: 'Todos' },
            { key: 'SUPERADMIN',   label: 'Super Admin' },
            { key: 'OPERADOR_NOC', label: 'NOC' },
            { key: 'ADMIN',        label: 'Admin' },
            { key: 'GERENTE',      label: 'Gerente' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFiltroRol(key)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
              background: filtroRol === key ? 'var(--accent)' : 'var(--bg-3)',
              color:      filtroRol === key ? '#fff'          : 'var(--txt-3)',
              border:     filtroRol === key ? '1px solid var(--accent)' : '1px solid var(--border)',
            }}>
              {label} <span style={{ opacity: 0.7 }}>({conteo[key] ?? 0})</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Lista ── */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28}/></div>
      ) : usuariosFiltrados.length === 0 ? (
        <Empty icon="🔍" title="Sin resultados" subtitle={busqueda ? `No hay usuarios que coincidan con "${busqueda}"` : 'No hay usuarios con este filtro'}/>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {usuariosFiltrados.map((u, idx) => (
            <div key={u.id}
              className="usr-row"
              style={{ borderBottom: idx < usuariosFiltrados.length - 1 ? '1px solid var(--border)' : 'none', opacity: u.activo ? 1 : 0.5 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Avatar */}
              <Avatar nombre={u.nombre} apellido={u.apellido} rol={u.rol} size={40} />

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--txt)' }}>{u.nombre} {u.apellido}</span>
                  <RolBadge rol={u.rol} />
                  {!u.activo && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'var(--bg-3)', color: 'var(--txt-3)', border: '1px solid var(--border)' }}>
                      Inactivo
                    </span>
                  )}
                  {u.totpActivo && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 20, background: 'rgba(63,185,80,0.1)', color: '#3fb950', border: '1px solid rgba(63,185,80,0.3)' }}>
                      🔐 2FA
                    </span>
                  )}
                </div>
                <div className="usr-info-row">
                  <span style={{ fontSize: 11, color: 'var(--txt-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Mail size={11}/> {u.email}
                  </span>
                  {u.telefono && (
                    <span style={{ fontSize: 11, color: 'var(--txt-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Phone size={11}/> {u.telefono}
                    </span>
                  )}
                  {u.sede && (
                    <span style={{ fontSize: 11, color: 'var(--txt-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={11}/> {u.sede.nombre}
                    </span>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="usr-row-actions">
                <Btn variant="ghost" size="sm" icon={<Pencil size={11}/>}     onClick={() => setUserEditar(u)}>Editar</Btn>
                <Btn variant="ghost" size="sm" icon={<Lock size={11}/>}       onClick={() => setUserPass(u)}>Contraseña</Btn>
                <Btn variant="ghost" size="sm" icon={<RotateCcw size={11}/>}  onClick={() => setUserReset(u)}>Reset</Btn>
                {['OPERADOR_NOC', 'SUPERADMIN'].includes(u.rol) && (
                  <Btn variant="ghost" size="sm" icon={<History size={11}/>}  onClick={() => setUserHist(u)}>Historial</Btn>
                )}
                {u.totpActivo && u.id !== usuarioActual?.id && (
                  <Btn variant="danger" size="sm" icon={<Shield size={11}/>}
                    onClick={() => {
                      if (confirm(`¿Desactivar 2FA de ${u.nombre} ${u.apellido}?\n\nÚsalo solo si perdió acceso a su autenticador.`)) {
                        usuariosApi.desactivar2fa(u.id)
                          .then(() => { toast.success(`2FA de ${u.nombre} desactivado`); qc.invalidateQueries(['noc-usuarios']); })
                          .catch(e => toast.error(e.response?.data?.error || 'Error al desactivar 2FA'));
                      }
                    }}>
                    Quitar 2FA
                  </Btn>
                )}
                {u.id !== usuarioActual?.id && (
                  <Btn variant="yellow" size="sm" icon={<LogOut size={11}/>}
                    onClick={() => { if (confirm(`¿Cerrar sesión de ${u.nombre}?`)) { usuariosApi.cerrarSesion(u.id).then(() => toast.success('Sesión cerrada')).catch(() => toast.error('Error')); } }}>
                    Cerrar sesión
                  </Btn>
                )}
                <Btn
                  variant={u.activo ? 'danger' : 'blue'}
                  size="sm"
                  icon={u.activo ? <PowerOff size={11}/> : <Power size={11}/>}
                  onClick={() => toggleActivoMut.mutate({ id: u.id, activo: !u.activo })}
                  disabled={u.id === usuarioActual?.id}>
                  {u.activo ? 'Deshabilitar' : 'Habilitar'}
                </Btn>
              </div>
            </div>
          ))}
        </Card>
      )}

      <ModalCrear     open={showCrear}    onClose={() => setShowCrear(false)} />
      <ModalEditar    open={!!userEditar} onClose={() => setUserEditar(null)} usuario={userEditar} />
      <ModalPassword  open={!!userPass}   onClose={() => setUserPass(null)}   usuario={userPass} />
      <ModalHistorial open={!!userHist}   onClose={() => setUserHist(null)}   usuario={userHist} tipoLabel={tipoLabel} />
      <ModalReset     open={!!userReset}  onClose={() => setUserReset(null)}  usuario={userReset} />
    </div>
  );
}