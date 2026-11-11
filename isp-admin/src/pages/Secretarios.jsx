import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Pencil, Lock, PowerOff, Power, Mail, Phone, CreditCard, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { usuariosApi, authApi } from '../services/api';
import { Card, Btn, Modal, Input, Avatar, Spinner, Empty } from '../components/ui';
import { useAuthStore } from '../store/auth.store';


// ─── CSS responsivo ───────────────────────────────────────────
const CSS = `
  .sec-row       { flex-wrap: nowrap; }
  .sec-info-meta { display: flex; }
  .sec-acciones  { flex-direction: row; }

  @media (max-width: 760px) {
    .sec-row {
      flex-wrap: wrap !important;
      gap: 10px !important;
    }
    .sec-info-meta {
      flex-direction: column !important;
      gap: 3px !important;
    }
    .sec-meta-hide {
      display: none !important;
    }
    .sec-acciones {
      width: 100% !important;
      flex-wrap: nowrap !important;
      gap: 4px !important;
      padding-top: 8px !important;
      border-top: 1px solid var(--border) !important;
    }
    .sec-acciones > * {
      flex: 1 !important;
      justify-content: center !important;
      padding-left: 6px !important;
      padding-right: 6px !important;
      font-size: 11px !important;
      min-width: 0 !important;
    }
    .sec-btn-label { display: none !important; }
  }
`;

if (typeof document !== 'undefined' && !document.getElementById('sec-responsive-css')) {
  const s = document.createElement('style');
  s.id = 'sec-responsive-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}


function Badge({ children, color = 'blue' }) {
  const colors = {
    green: { bg: 'rgba(22,163,74,0.1)',   color: '#16A34A', border: 'rgba(22,163,74,0.2)'   },
    gray:  { bg: 'rgba(100,116,139,0.1)', color: '#64748B', border: 'rgba(100,116,139,0.2)' },
    blue:  { bg: 'rgba(59,159,212,0.1)',  color: '#3B9FD4', border: 'rgba(59,159,212,0.2)'  },
  };
  const s = colors[color] || colors.blue;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {children}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
      {children}
    </div>
  );
}

// ── Qué cuenta gestiona la pantalla (la misma sirve para secretarias y supervisores) ──
const TIPOS = {
  secretaria: {
    titulo: 'Secretario(a)', uno: 'secretario(a)', Uno: 'Secretario(a)', plural: 'secretarios', queryKey: 'secretarios',
    listar: () => usuariosApi.listarSecretarios(), crear: (f) => usuariosApi.crearSecretario(f),
    emailEjemplo: 'secretaria@enetfiber.com', icono: '👩‍💼',
    acceso: 'La secretaria tendrá acceso a Dashboard, Órdenes, Clientes y Mapa de la sede',
  },
  supervisor: {
    titulo: 'Supervisores', uno: 'supervisor', Uno: 'Supervisor', plural: 'supervisores', queryKey: 'supervisores',
    listar: () => usuariosApi.listarSupervisores(), crear: (f) => usuariosApi.crearSupervisor(f),
    emailEjemplo: 'supervisor@enetfiber.com', icono: '🧑‍🔧',
    acceso: 'El supervisor verá Órdenes, Técnicos, Mapa y Reportes, y podrá asignar o cambiar el técnico de una orden (nada más) en la sede',
  },
};

// ── Modal Crear ───────────────────────────────────────────────
function ModalCrear({ open, onClose, t }) {
  const qc      = useQueryClient();
  const usuario = useAuthStore(s => s.usuario);
  const [form, setForm]   = useState({ nombre: '', apellido: '', email: '', password: '', telefono: '', dni: '' });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const mut = useMutation({
    mutationFn: () => t.crear(form),
    onSuccess: () => {
      toast.success(`${t.Uno} creado correctamente`);
      qc.invalidateQueries([t.queryKey]);
      onClose();
      setForm({ nombre: '', apellido: '', email: '', password: '', telefono: '', dni: '' });
    },
    onError: e => {
      const msg = e.response?.data?.error || `Error al crear ${t.uno}`;
      toast.error(msg);
      if (msg.toLowerCase().includes('email')) setErrors(p => ({ ...p, email: 'Este email ya está registrado' }));
    },
  });

  const handleSubmit = () => {
    const e = {};
    if (!form.nombre)   e.nombre   = 'Requerido';
    if (!form.apellido) e.apellido = 'Requerido';
    if (!form.email)    e.email    = 'Requerido';
    if (!form.password || form.password.length < 6) e.password = 'Mínimo 6 caracteres';
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    mut.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Nuevo ${t.uno}`} width={500}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <SectionLabel>Datos personales</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
          <Input label="Nombre *"   value={form.nombre}   onChange={e => set('nombre', e.target.value)}   error={errors.nombre}   placeholder="María" />
          <Input label="Apellido *" value={form.apellido} onChange={e => set('apellido', e.target.value)} error={errors.apellido} placeholder="García López" />
          <Input label="DNI"        value={form.dni}      onChange={e => set('dni', e.target.value)}      placeholder="12345678"  maxLength={8} />
          <Input label="Teléfono"   value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="9XXXXXXXX" />
        </div>
        <SectionLabel>Acceso al sistema</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Input label="Email *" value={form.email} onChange={e => set('email', e.target.value)} error={errors.email} placeholder={t.emailEjemplo} type="email" />
            </div>
            <Btn variant="ghost" size="sm"
              style={{ marginBottom: errors.email ? 22 : 0, flexShrink: 0, fontSize: 11, whiteSpace: 'nowrap' }}
              onClick={() => {
                const nombre   = form.nombre.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const apellido = form.apellido.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(' ')[0];
                const sede     = (usuario?.sede?.nombre || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/sede/gi, '').replace(/\s+/g, '').replace(/^[-.]+|[-.]+$/g, '');
                if (!nombre || !apellido) { toast.error('Ingresa nombre y apellido primero'); return; }
                set('email', `${nombre[0]}${apellido}${sede ? '.' + sede : ''}@enetfiber.com`);
              }}>
              ✉ Generar
            </Btn>
          </div>
          <Input label="Contraseña *" type="password" value={form.password} onChange={e => set('password', e.target.value)} error={errors.password} placeholder="Mínimo 6 caracteres" />
        </div>
        <div style={{ fontSize: 12, color: 'var(--txt-3)', padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 8, marginBottom: 16 }}>
          {t.acceso} <strong>{usuario?.sede?.nombre}</strong>.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSubmit} loading={mut.isPending}>Crear {t.uno}</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal Editar ──────────────────────────────────────────────
function ModalEditar({ open, onClose, secretario, t }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nombre: '', apellido: '', telefono: '', dni: '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  React.useEffect(() => {
    if (secretario) setForm({
      nombre:   secretario.nombre   || '',
      apellido: secretario.apellido || '',
      telefono: secretario.telefono || '',
      dni:      secretario.dni      || '',
    });
  }, [secretario]);

  const mut = useMutation({
    mutationFn: () => usuariosApi.actualizar(secretario.id, form),
    onSuccess:  () => { toast.success(`${t.Uno} actualizado`); qc.invalidateQueries([t.queryKey]); onClose(); },
    onError:    e  => toast.error(e.response?.data?.error || 'Error'),
  });

  if (!secretario) return null;
  return (
    <Modal open={open} onClose={onClose} title={`Editar ${t.uno}`} width={440}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--bg-3)', borderRadius: 12, marginBottom: 20 }}>
        <Avatar nombre={secretario.nombre} apellido={secretario.apellido} size={44} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{secretario.nombre} {secretario.apellido}</div>
          <div style={{ fontSize: 12, color: 'var(--txt-3)', marginTop: 2 }}>{secretario.email}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <Input label="Nombre"   value={form.nombre}   onChange={e => set('nombre', e.target.value)} />
        <Input label="Apellido" value={form.apellido} onChange={e => set('apellido', e.target.value)} />
        <Input label="Teléfono" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="9XXXXXXXX" />
        <Input label="DNI"      value={form.dni}      onChange={e => set('dni', e.target.value)}      placeholder="12345678" maxLength={8} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={() => mut.mutate()} loading={mut.isPending}>Guardar cambios</Btn>
      </div>
    </Modal>
  );
}

// ── Modal Contraseña ──────────────────────────────────────────
function ModalPassword({ open, onClose, secretario }) {
  const [password,  setPassword]  = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error,     setError]     = useState('');

  const mut = useMutation({
    mutationFn: () => usuariosApi.resetPassword(secretario.id, { password }),
    onSuccess:  () => { toast.success('Contraseña actualizada'); onClose(); setPassword(''); setConfirmar(''); },
    onError:    e  => toast.error(e.response?.data?.error || 'Error'),
  });

  const handleGuardar = () => {
    if (!password || password.length < 6) { setError('Mínimo 6 caracteres'); return; }
    if (password !== confirmar)            { setError('Las contraseñas no coinciden'); return; }
    setError('');
    mut.mutate();
  };

  if (!secretario) return null;
  return (
    <Modal open={open} onClose={onClose} title="Cambiar contraseña" width={380}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-3)', borderRadius: 10, marginBottom: 18 }}>
        <Avatar nombre={secretario.nombre} apellido={secretario.apellido} size={36} />
        <div style={{ fontSize: 13, fontWeight: 600 }}>{secretario.nombre} {secretario.apellido}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        <Input label="Nueva contraseña" type="password" value={password}  onChange={e => setPassword(e.target.value)}  placeholder="Mínimo 6 caracteres" />
        <Input label="Confirmar"        type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} placeholder="Repite la contraseña" />
        {error && <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-bg)', borderRadius: 8, borderLeft: '3px solid var(--red)' }}>{error}</div>}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={handleGuardar} loading={mut.isPending}>Cambiar contraseña</Btn>
      </div>
    </Modal>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function SecretariosPage() {
  return <CuentasDeSede tipo="secretaria" />;
}

export function CuentasDeSede({ tipo }) {
  const t = TIPOS[tipo];
  const qc      = useQueryClient();
  const usuario = useAuthStore(s => s.usuario);
  const [showCrear,   setShowCrear]   = useState(false);
  const [editando,    setEditando]    = useState(null);
  const [cambiandoPass, setCambiandoPass] = useState(null);

  const { data: secretarios, isLoading } = useQuery({
    queryKey: [t.queryKey],
    queryFn:  () => t.listar().then(r => r.data),
  });

  const toggleActivoMut = useMutation({
    mutationFn: ({ id, activo }) => usuariosApi.actualizar(id, { activo }),
    onSuccess:  (_, { activo }) => {
      toast.success(activo ? `✓ ${t.Uno} habilitado` : `${t.Uno} deshabilitado`);
      qc.invalidateQueries([t.queryKey]);
    },
    onError: () => toast.error('Error al cambiar estado'),
  });

  return (
    <div style={{ padding: 28 }} className="animate-fade">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--txt)' }}>
            {t.titulo}
          </h1>
          <p style={{ color: 'var(--txt-3)', fontSize: 12, marginTop: 4 }}>
            {secretarios?.length || 0} {secretarios?.length === 1 ? t.uno : t.plural} en {usuario?.sede?.nombre || 'tu sede'}
          </p>
        </div>
        <Btn variant="primary" size="sm" icon={<UserPlus size={13}/>} onClick={() => setShowCrear(true)}>
          Nuevo {t.uno}
        </Btn>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28}/></div>
      ) : (secretarios || []).length === 0 ? (
        <Empty icon={t.icono} title={`Sin ${t.plural} registrados`} subtitle={`Agrega un ${t.uno} para tu sede`}/>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {(secretarios || []).map((s, idx) => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px',
              borderBottom: idx < secretarios.length - 1 ? '1px solid var(--border)' : 'none',
              opacity: s.activo ? 1 : 0.5,
              transition: 'background .15s',
            }}
              className="sec-row"
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Avatar nombre={s.nombre} apellido={s.apellido} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>{s.nombre} {s.apellido}</span>
                  <Badge color={s.activo ? 'green' : 'gray'}>{s.activo ? '● Activo' : '○ Inactivo'}</Badge>
                </div>
                <div className="sec-info-meta" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[
                    { icon: <Mail size={11}/>,       val: s.email,                              hide: false },
                    { icon: <Phone size={11}/>,      val: s.telefono || '—',                    hide: true  },
                    { icon: <CreditCard size={11}/>, val: s.dni ? `DNI: ${s.dni}` : 'Sin DNI', hide: true  },
                  ].map((item, i) => (
                    <div key={i}
                      className={item.hide ? 'sec-meta-hide' : ''}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--txt-3)' }}>
                      {item.icon} {item.val}
                    </div>
                  ))}
                </div>
              </div>
              <div className="sec-acciones" style={{ display: 'flex', gap: 5, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Btn variant="ghost" size="sm" icon={<Pencil size={11}/>} onClick={() => setEditando(s)}>
                  <span className="sec-btn-label">Editar</span>
                </Btn>
                <Btn variant="ghost" size="sm" icon={<Lock size={11}/>}   onClick={() => setCambiandoPass(s)}>
                  <span className="sec-btn-label">Contraseña</span>
                </Btn>
                {s.totpActivo && (
                  <Btn variant="danger" size="sm" icon={<Shield size={11}/>}
                    onClick={() => {
                      if (confirm(`¿Desactivar 2FA de ${s.nombre} ${s.apellido}?\n\nÚsalo solo si perdió acceso a su autenticador.`)) {
                        usuariosApi.desactivar2fa(s.id)
                          .then(() => { toast.success(`2FA de ${s.nombre} desactivado`); qc.invalidateQueries([t.queryKey]); })
                          .catch(e => toast.error(e.response?.data?.error || 'Error al desactivar 2FA'));
                      }
                    }}>
                    <span className="sec-btn-label">Quitar 2FA</span>
                  </Btn>
                )}
                <Btn
                  variant={s.activo ? 'danger' : 'ghost'}
                  size="sm"
                  icon={s.activo ? <PowerOff size={11}/> : <Power size={11} color="#22c55e"/>}
                  style={!s.activo ? { color: '#22c55e', borderColor: 'rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.08)' } : {}}
                  onClick={() => toggleActivoMut.mutate({ id: s.id, activo: !s.activo })}
                  loading={toggleActivoMut.isPending}>
                  <span className="sec-btn-label">{s.activo ? 'Deshabilitar' : 'Habilitar'}</span>
                </Btn>
              </div>
            </div>
          ))}
        </Card>
      )}

      <ModalCrear    open={showCrear}       onClose={() => setShowCrear(false)} t={t} />
      <ModalEditar   open={!!editando}      onClose={() => setEditando(null)}      secretario={editando} t={t} />
      <ModalPassword open={!!cambiandoPass} onClose={() => setCambiandoPass(null)} secretario={cambiandoPass} />
    </div>
  );
}