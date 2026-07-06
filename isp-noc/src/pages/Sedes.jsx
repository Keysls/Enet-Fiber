import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin, Plus, Pencil, Building2, Users, ClipboardList,
  Power, PowerOff, Router, Wifi, Trash2, Play, Loader2,
  CheckCircle, XCircle, Eye, EyeOff, ChevronDown, ChevronUp,
  Star, Send, Server, Database
} from 'lucide-react';
import DrawerSiscadre from '../components/ui/DrawerSiscadre';
import toast from 'react-hot-toast';
import { sedesApi, oltApi, equiposCabeceraApi }            from '../services/api';
import { Card, Btn, Modal, Input, Select, Spinner, Empty } from '../components/ui';

// ─────────────────────────────────────────────────────────────
// MODALES SEDE
// ─────────────────────────────────────────────────────────────

function ModalCrearSede({ open, onClose }) {
  const qc = useQueryClient();
  const [form, setForm]     = useState({ nombre: '', ciudad: '' });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const mut = useMutation({
    mutationFn: () => sedesApi.crear(form),
    onSuccess: () => {
      toast.success('Sede creada correctamente');
      qc.invalidateQueries(['sedes']);
      onClose();
      setForm({ nombre: '', ciudad: '' });
    },
    onError: e => toast.error(e.response?.data?.error || 'Error al crear sede'),
  });

  const handleSubmit = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'Requerido';
    if (!form.ciudad.trim()) e.ciudad = 'Requerido';
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    mut.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva sede" width={400}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Nombre de la sede *" value={form.nombre} onChange={e => set('nombre', e.target.value)} error={errors.nombre} placeholder="Ej: Sede Trujillo" />
        <Input label="Ciudad *"            value={form.ciudad} onChange={e => set('ciudad', e.target.value)} error={errors.ciudad} placeholder="Ej: Trujillo" />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSubmit} loading={mut.isPending}>Crear sede</Btn>
        </div>
      </div>
    </Modal>
  );
}

function ModalEditarSede({ open, onClose, sede }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nombre: '', ciudad: '', puedeEnviarStock: false, correoReceptor: '', correoEmisor: '', correoEmisorPass: '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  React.useEffect(() => {
    if (sede) setForm({
      nombre:          sede.nombre          || '',
      ciudad:          sede.ciudad          || '',
      puedeEnviarStock: sede.puedeEnviarStock || false,
      correoReceptor:  sede.correoReceptor  || '',
      correoEmisor:    sede.correoEmisor    || '',
      correoEmisorPass: '',
    });
  }, [sede]);

  const mut = useMutation({
    mutationFn: () => sedesApi.actualizar(sede.id, form),
    onSuccess: () => { toast.success('Sede actualizada'); qc.invalidateQueries(['sedes']); onClose(); },
    onError:   e  => toast.error(e.response?.data?.error || 'Error'),
  });

  const toggleActivo = useMutation({
    mutationFn: () => sedesApi.actualizar(sede.id, { activo: !sede.activo }),
    onSuccess: () => { toast.success(sede.activo ? 'Sede desactivada' : 'Sede activada'); qc.invalidateQueries(['sedes']); onClose(); },
    onError:   e  => toast.error(e.response?.data?.error || 'Error'),
  });

  const marcarPrincipal = useMutation({
    mutationFn: () => sedesApi.actualizar(sede.id, { esPrincipal: true }),
    onSuccess: () => { toast.success('Sede principal actualizada'); qc.invalidateQueries(['sedes']); onClose(); },
    onError:   e  => toast.error(e.response?.data?.error || 'Error'),
  });

  if (!sede) return null;
  return (
    <Modal open={open} onClose={onClose} title="Editar sede" width={400}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Nombre de la sede" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
        <Input label="Ciudad"            value={form.ciudad} onChange={e => set('ciudad', e.target.value)} />

        {/* Toggle: Puede enviar stock */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-3)' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)' }}>Puede enviar stock</div>
            <div style={{ fontSize: 11, color: 'var(--txt-3)', marginTop: 2 }}>
              {form.puedeEnviarStock ? 'Esta sede puede enviar material a otras sedes.' : 'Esta sede no puede enviar material a otras sedes.'}
            </div>
          </div>
          <button
            onClick={() => set('puedeEnviarStock', !form.puedeEnviarStock)}
            style={{
              width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', flexShrink: 0,
              background: form.puedeEnviarStock ? '#3b82f6' : '#e2e8f0',
              position: 'relative', transition: 'background .2s',
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: form.puedeEnviarStock ? 21 : 3,
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}/>
          </button>
        </div>

        {/* Correo emisor (SMTP propio de la sede) */}
        <Input
          label="Correo emisor de esta sede"
          value={form.correoEmisor}
          onChange={e => set('correoEmisor', e.target.value)}
          placeholder="sede.trujillo@enetfiber.com"
          type="email"
        />
        <Input
          label={sede.correoEmisor ? 'Contraseña del correo (vacío = no cambiar)' : 'Contraseña del correo'}
          value={form.correoEmisorPass}
          onChange={e => set('correoEmisorPass', e.target.value)}
          placeholder="••••••••"
          type="password"
        />

        {/* Correo receptor de requerimientos */}
        <Input
          label="Correo receptor (destino de requerimientos)"
          value={form.correoReceptor}
          onChange={e => set('correoReceptor', e.target.value)}
          placeholder="almacen@enetfiber.com"
          type="email"
        />

        {/* Sede principal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-3)' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)' }}>Sede principal</div>
            <div style={{ fontSize: 11, color: 'var(--txt-3)', marginTop: 2 }}>
              {sede.esPrincipal ? 'Esta sede es la principal del sistema.' : 'Puedes marcar esta sede como principal.'}
            </div>
          </div>
          {sede.esPrincipal ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#D97706' }}>
              <Star size={13} fill="currentColor"/> Principal
            </span>
          ) : (
            <Btn variant="yellow" size="sm" icon={<Star size={11}/>} onClick={() => marcarPrincipal.mutate()} loading={marcarPrincipal.isPending}>
              Hacer principal
            </Btn>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <Btn variant={sede.activo ? 'danger' : 'blue'} size="sm"
            icon={sede.activo ? <PowerOff size={11}/> : <Power size={11}/>}
            disabled={sede.esPrincipal && sede.activo}
            onClick={() => toggleActivo.mutate()} loading={toggleActivo.isPending}>
            {sede.activo ? 'Desactivar' : 'Activar'}
          </Btn>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn variant="primary" onClick={() => mut.mutate()} loading={mut.isPending}>Guardar</Btn>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL OLT — Crear / Editar
// ─────────────────────────────────────────────────────────────

const emptyOlt = {
  nombre: '', direccionIp: '', fabricanteId: '', modeloId: '',
  usuario: '', contrasena: '',
  puertoSnmp: 161, puertoSsh: 22, puertoTelnet: 23,
  snmpCommunity: 'public',
};

function ModalOlt({ open, onClose, sedeId, oltEditar }) {
  const qc       = useQueryClient();
  const esEditar = !!oltEditar;
  const [form, setForm]     = useState(emptyOlt);
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const { data: fabricantes = [] } = useQuery({
    queryKey: ['olt-fabricantes'],
    queryFn:  () => oltApi.fabricantes().then(r => r.data),
    enabled:  open,
  });

  const modelosDisponibles = fabricantes.find(f => f.id === Number(form.fabricanteId))?.modelos ?? [];

  React.useEffect(() => {
    if (!open) return;
    if (esEditar && fabricantes.length > 0) {
      const fab = fabricantes.find(f => f.nombre === oltEditar.fabricanteNombre);
      const mod = fab?.modelos?.find(m => m.nombre === oltEditar.modeloNombre);
      setForm({
        nombre:        oltEditar.nombre        || '',
        direccionIp:   oltEditar.direccionIp   || '',
        fabricanteId:  fab?.id                 || '',
        modeloId:      mod?.id                 || '',
        usuario:       oltEditar.usuario       || '',
        contrasena:    '',
        puertoSnmp:    oltEditar.puertoSnmp    ?? 161,
        puertoSsh:     oltEditar.puertoSsh     ?? 22,
        puertoTelnet:  oltEditar.puertoTelnet  ?? 23,
        snmpCommunity: oltEditar.snmpCommunity || 'public',
      });
    } else if (!esEditar) {
      setForm(emptyOlt);
    }
    setErrors({});
    setShowPass(false);
  }, [open, oltEditar, fabricantes.length]);

  const mut = useMutation({
    mutationFn: () => {
      const payload = { ...form, sedeId };
      if (esEditar && !payload.contrasena) delete payload.contrasena;
      return esEditar
        ? oltApi.actualizar(oltEditar.id, payload)
        : oltApi.crear(payload);
    },
    onSuccess: () => {
      toast.success(esEditar ? 'OLT actualizada' : 'OLT registrada correctamente');
      qc.invalidateQueries(['olts', sedeId]);
      onClose();
    },
    onError: e => toast.error(e.response?.data?.error || 'Error al guardar OLT'),
  });

  const handleSubmit = () => {
    const e = {};
    if (!form.nombre.trim())        e.nombre       = 'Requerido';
    if (!form.direccionIp.trim())   e.direccionIp  = 'Requerido';
    if (!form.fabricanteId)         e.fabricanteId = 'Requerido';
    if (!form.modeloId)             e.modeloId     = 'Requerido';
    if (!form.usuario.trim())       e.usuario      = 'Requerido';
    if (!esEditar && !form.contrasena.trim()) e.contrasena = 'Requerido';
    if (!form.snmpCommunity.trim()) e.snmpCommunity = 'Requerido';
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    mut.mutate();
  };

  const SectionLabel = ({ children }) => (
    <div style={{
      fontSize: 10, fontWeight: 700, color: 'var(--txt-3)',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)',
    }}>
      {children}
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={esEditar ? 'Editar OLT' : 'Registrar OLT'} width={500}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Dispositivo */}
        <div style={{ marginBottom: 18 }}>
          <SectionLabel>Información del dispositivo</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Nombre OLT *"  value={form.nombre}      onChange={e => set('nombre', e.target.value)}      error={errors.nombre}      placeholder="Ej: OLT-Norte" />
            <Input label="Dirección IP *" value={form.direccionIp} onChange={e => set('direccionIp', e.target.value)} error={errors.direccionIp} placeholder="192.168.1.1" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <Select label="Fabricante *" value={form.fabricanteId}
              onChange={e => { set('fabricanteId', e.target.value); set('modeloId', ''); }}
              error={errors.fabricanteId}>
              <option value="">— Seleccionar —</option>
              {fabricantes.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </Select>
            <Select label="Modelo *" value={form.modeloId}
              onChange={e => set('modeloId', e.target.value)}
              error={errors.modeloId}
              disabled={!form.fabricanteId}>
              <option value="">— Seleccionar —</option>
              {modelosDisponibles.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </Select>
          </div>
        </div>

        {/* Credenciales */}
        <div style={{ marginBottom: 18 }}>
          <SectionLabel>Credenciales</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Usuario *" value={form.usuario} onChange={e => set('usuario', e.target.value)} error={errors.usuario} placeholder="admin" />
            <div style={{ position: 'relative' }}>
              <Input
                label={esEditar ? 'Contraseña (vacío = no cambiar)' : 'Contraseña *'}
                type={showPass ? 'text' : 'password'}
                value={form.contrasena}
                onChange={e => set('contrasena', e.target.value)}
                error={errors.contrasena}
                placeholder="••••••••"
              />
              <button onClick={() => setShowPass(v => !v)}
                style={{ position: 'absolute', right: 10, top: 30, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-3)' }}>
                {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
          </div>
        </div>

        {/* Puertos */}
        <div style={{ marginBottom: 20 }}>
          <SectionLabel>Puertos de protocolo</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <Input label="SNMP"           type="number" value={form.puertoSnmp}    onChange={e => set('puertoSnmp',    Number(e.target.value))} />
            <Input label="SSH"            type="number" value={form.puertoSsh}     onChange={e => set('puertoSsh',     Number(e.target.value))} />
            <Input label="Telnet"         type="number" value={form.puertoTelnet}  onChange={e => set('puertoTelnet',  Number(e.target.value))} />
            <Input label="Comunidad SNMP" value={form.snmpCommunity} onChange={e => set('snmpCommunity', e.target.value)} error={errors.snmpCommunity} placeholder="public" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSubmit} loading={mut.isPending}>
            {esEditar ? 'Guardar cambios' : 'Registrar OLT'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL TEST CONEXIÓN
// ─────────────────────────────────────────────────────────────

function ModalTest({ open, onClose, olt }) {
  const qc = useQueryClient();
  const [resultado, setResultado] = useState(null);

  const mut = useMutation({
    mutationFn: () => oltApi.test(olt.id),
    onSuccess: (res) => {
      setResultado(res.data);
      qc.invalidateQueries(['olts', olt.sedeId]);
    },
    onError: () => {
      setResultado({
        estado: 'Desconectado',
        resultados: [{ success: false, protocol: 'Error', message: 'No se pudo conectar', latency: 0 }],
      });
    },
  });

  React.useEffect(() => {
    if (open && olt) { setResultado(null); mut.mutate(); }
  }, [open]);

  if (!olt) return null;

  const OCULTAR = ['SSH', 'Telnet'];
  const resultadosFiltrados = resultado?.resultados?.filter(r => !OCULTAR.includes(r.protocol)) ?? [];

  const getEstilo = (success) => {
    if (success === null)  return { bg: 'rgba(100,116,139,0.06)', border: 'rgba(100,116,139,0.2)', color: '#64748B' };
    if (success === true)  return { bg: 'rgba(22,163,74,0.06)',   border: 'rgba(22,163,74,0.2)',   color: '#16A34A' };
    return                        { bg: 'rgba(220,38,38,0.06)',   border: 'rgba(220,38,38,0.2)',   color: '#DC2626' };
  };

  const getIcono = (success) => {
    if (success === null) return <span style={{ fontSize: 14, color: '#64748B' }}>—</span>;
    if (success === true) return <CheckCircle size={15} color="#16A34A"/>;
    return <XCircle size={15} color="#DC2626"/>;
  };

  return (
    <Modal open={open} onClose={onClose} title={`Test — ${olt.nombre}`} width={400}>
      <p style={{ fontSize: 12, color: 'var(--txt-3)', marginBottom: 16 }}>
        <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{olt.direccionIp}</span>
        {' · '}{olt.fabricanteNombre} {olt.modeloNombre}
      </p>

      {mut.isPending ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '32px 0', color: 'var(--txt-3)' }}>
          <Loader2 size={18} className="spin"/> Probando conexión...
        </div>
      ) : resultado && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {resultadosFiltrados.map((r, i) => {
            const s = getEstilo(r.success);
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10,
                background: s.bg, border: `1px solid ${s.border}`,
              }}>
                {getIcono(r.success)}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{r.protocol}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>{r.message}</div>
                </div>
                {r.latency > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--txt-3)', fontFamily: 'monospace' }}>
                    {r.latency}ms
                  </span>
                )}
              </div>
            );
          })}

          <div style={{
            marginTop: 4, padding: '10px 14px', borderRadius: 10, textAlign: 'center',
            fontSize: 12, fontWeight: 700,
            background: resultado.estado === 'Conectado' ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
            color:      resultado.estado === 'Conectado' ? '#16A34A' : '#DC2626',
          }}>
            {resultado.estado === 'Conectado' ? '✅ OLT accesible' : '❌ OLT no responde'}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose} style={{ width: '100%' }}>Cerrar</Btn>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// SECCIÓN OLTs
// ─────────────────────────────────────────────────────────────

const ESTADO_OLT = {
  Conectado:    { bg: 'rgba(22,163,74,0.08)',  color: '#16A34A' },
  Desconectado: { bg: 'rgba(220,38,38,0.08)', color: '#DC2626' },
  Degradado:    { bg: 'rgba(217,119,6,0.08)', color: '#D97706' },
};

function OltsSection({ sedeId }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [oltEditar, setOltEditar] = useState(null);
  const [oltTest,   setOltTest]   = useState(null);

  const { data: olts = [], isLoading } = useQuery({
    queryKey: ['olts', sedeId],
    queryFn:  () => oltApi.listarPorSede(sedeId).then(r => r.data),
  });

  const eliminarMut = useMutation({
    mutationFn: (id) => oltApi.eliminar(id),
    onSuccess: () => { toast.success('OLT eliminada'); qc.invalidateQueries(['olts', sedeId]); },
    onError:   e  => toast.error(e.response?.data?.error || 'Error'),
  });

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {olts.length} OLT{olts.length !== 1 ? 's' : ''} registrada{olts.length !== 1 ? 's' : ''}
        </span>
        <Btn variant="ghost" size="sm" icon={<Plus size={11}/>}
          onClick={() => { setOltEditar(null); setShowModal(true); }}>
          Agregar
        </Btn>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><Spinner size={16}/></div>
      ) : olts.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--txt-3)', textAlign: 'center', padding: '10px 0', fontStyle: 'italic' }}>
          Sin OLTs — agrega una para esta sede
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {olts.map(olt => {
            const s = ESTADO_OLT[olt.estado] || ESTADO_OLT.Desconectado;
            return (
              <div key={olt.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--bg-3)', borderRadius: 10, padding: '9px 12px',
                border: '1px solid var(--border)',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Wifi size={13} color={s.color}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }} className="truncate">{olt.nombre}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20, background: s.bg, color: s.color }}>
                      {olt.estado}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--txt-3)', fontFamily: 'monospace' }}>
                    {olt.direccionIp} · {olt.fabricanteNombre} {olt.modeloNombre}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => setOltTest(olt)} title="Test"
                    style={{ padding: '5px 7px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', color: 'var(--txt-3)', display: 'flex' }}>
                    <Play size={11}/>
                  </button>
                  <button onClick={() => { setOltEditar(olt); setShowModal(true); }} title="Editar"
                    style={{ padding: '5px 7px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', color: 'var(--txt-3)', display: 'flex' }}>
                    <Pencil size={11}/>
                  </button>
                  <button onClick={() => { if (confirm(`¿Eliminar OLT "${olt.nombre}"?`)) eliminarMut.mutate(olt.id); }} title="Eliminar"
                    style={{ padding: '5px 7px', borderRadius: 7, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.06)', cursor: 'pointer', color: '#DC2626', display: 'flex' }}>
                    <Trash2 size={11}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ModalOlt  open={showModal}  onClose={() => { setShowModal(false); setOltEditar(null); }} sedeId={sedeId} oltEditar={oltEditar} />
      <ModalTest open={!!oltTest}  onClose={() => setOltTest(null)} olt={oltTest} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL EQUIPO DE CABECERA — Crear / Editar
// ─────────────────────────────────────────────────────────────

const TIPOS_EQUIPO_CABECERA = ['OLT', 'MIKROTIK', 'SWITCH', 'ROUTER', 'OTRO'];
const emptyEquipoCabecera = { nombre: '', tipo: 'MIKROTIK', direccionIp: '', usuario: '', contrasena: '', notas: '' };

function ModalEquipoCabecera({ open, onClose, sedeId, equipoEditar }) {
  const qc       = useQueryClient();
  const esEditar = !!equipoEditar;
  const [form, setForm]     = useState(emptyEquipoCabecera);
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  React.useEffect(() => {
    if (!open) return;
    if (esEditar) {
      setForm({
        nombre:      equipoEditar.nombre      || '',
        tipo:        equipoEditar.tipo        || 'MIKROTIK',
        direccionIp: equipoEditar.direccionIp || '',
        usuario:     equipoEditar.usuario     || '',
        contrasena:  '',
        notas:       equipoEditar.notas       || '',
      });
    } else {
      setForm(emptyEquipoCabecera);
    }
    setErrors({});
    setShowPass(false);
  }, [open, equipoEditar]);

  const mut = useMutation({
    mutationFn: () => {
      const payload = { ...form, sedeId };
      if (esEditar && !payload.contrasena) delete payload.contrasena;
      return esEditar
        ? equiposCabeceraApi.actualizar(equipoEditar.id, payload)
        : equiposCabeceraApi.crear(payload);
    },
    onSuccess: () => {
      toast.success(esEditar ? 'Equipo actualizado' : 'Equipo registrado correctamente');
      qc.invalidateQueries(['equipos-cabecera', sedeId]);
      onClose();
    },
    onError: e => toast.error(e.response?.data?.error || 'Error al guardar el equipo'),
  });

  const handleSubmit = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'Requerido';
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    mut.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title={esEditar ? 'Editar equipo' : 'Registrar equipo de cabecera'} width={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Nombre *" value={form.nombre} onChange={e => set('nombre', e.target.value)} error={errors.nombre} placeholder="Ej: Mikrotik Principal" />
        <Select label="Tipo" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
          {TIPOS_EQUIPO_CABECERA.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Input label="Dirección IP" value={form.direccionIp} onChange={e => set('direccionIp', e.target.value)} placeholder="192.168.1.1" />
        <Input label="Usuario" value={form.usuario} onChange={e => set('usuario', e.target.value)} placeholder="admin" />
        <div style={{ position: 'relative' }}>
          <Input
            label={esEditar ? 'Contraseña (vacío = no cambiar)' : 'Contraseña'}
            type={showPass ? 'text' : 'password'}
            value={form.contrasena}
            onChange={e => set('contrasena', e.target.value)}
            placeholder="••••••••"
          />
          <button onClick={() => setShowPass(v => !v)}
            style={{ position: 'absolute', right: 10, top: 30, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-3)' }}>
            {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
          </button>
        </div>
        <Input label="Notas" value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Observaciones, ubicación física, etc." />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSubmit} loading={mut.isPending}>
            {esEditar ? 'Guardar cambios' : 'Registrar equipo'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// SECCIÓN CABECERA (equipos de red de la sede)
// ─────────────────────────────────────────────────────────────

const TIPO_BADGE = {
  OLT:      { bg: 'rgba(59,130,246,0.08)',  color: '#3b82f6' },
  MIKROTIK: { bg: 'rgba(220,38,38,0.08)',   color: '#DC2626' },
  SWITCH:   { bg: 'rgba(22,163,74,0.08)',   color: '#16A34A' },
  ROUTER:   { bg: 'rgba(217,119,6,0.08)',   color: '#D97706' },
  OTRO:     { bg: 'rgba(100,116,139,0.08)', color: '#64748B' },
};

function EquipoPasswordReveal({ equipoId, tieneContrasena }) {
  const [valor, setValor]   = useState(null);
  const [loading, setLoading] = useState(false);

  if (!tieneContrasena) return <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>—</span>;

  if (valor !== null) {
    return (
      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--txt)' }}>
        {valor}{' '}
        <button onClick={() => setValor(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt-3)', verticalAlign: 'middle' }}>
          <EyeOff size={11}/>
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={async () => {
        setLoading(true);
        try {
          const r = await equiposCabeceraApi.verContrasena(equipoId);
          setValor(r.data?.contrasena ?? '—');
        } catch {
          toast.error('No se pudo obtener la contraseña');
        } finally { setLoading(false); }
      }}
      title="Ver contraseña"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--txt-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
      <Eye size={11}/> {loading ? '...' : 'Ver'}
    </button>
  );
}

function EquiposCabeceraSection({ sedeId }) {
  const qc = useQueryClient();
  const [showModal, setShowModal]   = useState(false);
  const [equipoEditar, setEquipoEditar] = useState(null);

  const { data: equipos = [], isLoading } = useQuery({
    queryKey: ['equipos-cabecera', sedeId],
    queryFn:  () => equiposCabeceraApi.listarPorSede(sedeId).then(r => r.data),
  });

  const eliminarMut = useMutation({
    mutationFn: (id) => equiposCabeceraApi.eliminar(id),
    onSuccess: () => { toast.success('Equipo eliminado'); qc.invalidateQueries(['equipos-cabecera', sedeId]); },
    onError:   e  => toast.error(e.response?.data?.error || 'Error'),
  });

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {equipos.length} equipo{equipos.length !== 1 ? 's' : ''} de cabecera
        </span>
        <Btn variant="ghost" size="sm" icon={<Plus size={11}/>}
          onClick={() => { setEquipoEditar(null); setShowModal(true); }}>
          Agregar
        </Btn>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><Spinner size={16}/></div>
      ) : equipos.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--txt-3)', textAlign: 'center', padding: '10px 0', fontStyle: 'italic' }}>
          Sin equipos registrados — agrega uno para esta sede
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {equipos.map(eq => {
            const b = TIPO_BADGE[eq.tipo] || TIPO_BADGE.OTRO;
            return (
              <div key={eq.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--bg-3)', borderRadius: 10, padding: '9px 12px',
                border: '1px solid var(--border)',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: b.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Server size={13} color={b.color}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }} className="truncate">{eq.nombre}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20, background: b.bg, color: b.color }}>
                      {eq.tipo}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--txt-3)' }}>
                    <span style={{ fontFamily: 'monospace' }}>{eq.direccionIp || '—'}</span>
                    {eq.usuario && <span>usr: {eq.usuario}</span>}
                    <EquipoPasswordReveal equipoId={eq.id} tieneContrasena={eq.tieneContrasena} />
                  </div>
                  {eq.notas && <div style={{ fontSize: 11, color: 'var(--txt-3)', marginTop: 2, fontStyle: 'italic' }}>{eq.notas}</div>}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => { setEquipoEditar(eq); setShowModal(true); }} title="Editar"
                    style={{ padding: '5px 7px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', color: 'var(--txt-3)', display: 'flex' }}>
                    <Pencil size={11}/>
                  </button>
                  <button onClick={() => { if (confirm(`¿Quitar "${eq.nombre}" del inventario?`)) eliminarMut.mutate(eq.id); }} title="Quitar"
                    style={{ padding: '5px 7px', borderRadius: 7, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.06)', cursor: 'pointer', color: '#DC2626', display: 'flex' }}>
                    <Trash2 size={11}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ModalEquipoCabecera open={showModal} onClose={() => { setShowModal(false); setEquipoEditar(null); }} sedeId={sedeId} equipoEditar={equipoEditar} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FILA DE SEDE (vista lista)
// ─────────────────────────────────────────────────────────────

function SedeRow({ sede, onEditar, onSiscadre }) {
  const [verOlts, setVerOlts] = useState(false);
  const [verCabecera, setVerCabecera] = useState(false);
  const expandido = verOlts || verCabecera;

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, opacity: sede.activo ? 1 : 0.6, transition: 'opacity .2s',
      borderLeft: sede.esPrincipal ? '3px solid #D97706' : '1px solid var(--border)',
    }}>
      {/* Fila principal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', flexWrap: 'wrap' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: sede.activo ? 'linear-gradient(135deg, #1E3A8A, #3B9FD4)' : '#8AAABB',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MapPin size={17} color="#fff"/>
        </div>

        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }} className="truncate">{sede.nombre}</span>
            {sede.esPrincipal && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 20, background: 'rgba(217,119,6,0.08)', color: '#D97706', border: '1px solid rgba(217,119,6,0.22)' }}>
                <Star size={10} fill="currentColor"/> Principal
              </span>
            )}
            {sede.puedeEnviarStock && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 20, background: 'rgba(59,130,246,0.08)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.22)' }}>
                <Send size={10}/> Envía stock
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 8px', borderRadius: 20, background: sede.activo ? 'rgba(22,163,74,0.08)' : 'rgba(100,116,139,0.1)', color: sede.activo ? '#16A34A' : '#64748B', border: `1px solid ${sede.activo ? 'rgba(22,163,74,0.2)' : 'rgba(100,116,139,0.2)'}` }}>
              {sede.activo ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--txt-3)', marginTop: 2 }}>
            <Building2 size={11}/> {sede.ciudad}
          </div>
        </div>

        {/* Métricas inline */}
        <div style={{ display: 'flex', gap: 18, flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--txt)' }}>{sede._count?.usuarios ?? 0}</div>
            <div style={{ fontSize: 9, color: 'var(--txt-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Usuarios</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--txt)' }}>{sede._count?.ordenes ?? 0}</div>
            <div style={{ fontSize: 9, color: 'var(--txt-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Órdenes</div>
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <Btn variant="ghost" size="sm" icon={<Pencil size={11}/>} onClick={() => onEditar(sede)}>
            Editar
          </Btn>
          <Btn variant="ghost" size="sm" icon={<Database size={11}/>} onClick={() => onSiscadre(sede)}>
            Siscadre
          </Btn>
          <button onClick={() => { setVerOlts(v => !v); setVerCabecera(false); }} title="OLTs de esta sede"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: verOlts ? 'var(--bg-3)' : 'var(--bg)', cursor: 'pointer', color: 'var(--txt-2)', fontSize: 12, fontWeight: 600 }}>
            <Router size={12} color="var(--accent)"/> OLTs
          </button>
          <button onClick={() => { setVerCabecera(v => !v); setVerOlts(false); }} title="Equipos de cabecera"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: verCabecera ? 'var(--bg-3)' : 'var(--bg)', cursor: 'pointer', color: 'var(--txt-2)', fontSize: 12, fontWeight: 600 }}>
            <Server size={12} color="var(--accent)"/> Cabecera
          </button>
          {expandido
            ? <ChevronUp size={14} color="var(--txt-3)" style={{ flexShrink: 0 }}/>
            : <ChevronDown size={14} color="var(--txt-3)" style={{ flexShrink: 0 }}/>}
        </div>
      </div>

      {verOlts && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
          <OltsSection sedeId={sede.id} />
        </div>
      )}
      {verCabecera && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
          <EquiposCabeceraSection sedeId={sede.id} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────

export default function SedesPage() {
  const [showCrear,  setShowCrear]  = useState(false);
  const [sedeEditar, setSedeEditar] = useState(null);
  const [siscadre, setSiscadre]     = useState(null);

  const { data: sedes, isLoading } = useQuery({
    queryKey: ['sedes'],
    queryFn:  () => sedesApi.listar().then(r => r.data),
  });

  const activas   = (sedes || []).filter(s => s.activo).length;
  const inactivas = (sedes || []).filter(s => !s.activo).length;

  return (
    <div style={{ padding: 24 }} className="animate-fade">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--txt)' }}>
            Sedes
          </h1>
          <p style={{ color: 'var(--txt-3)', fontSize: 12, marginTop: 4 }}>
            {activas} activa{activas !== 1 ? 's' : ''}
            {inactivas > 0 && ` · ${inactivas} inactiva${inactivas !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Btn variant="primary" size="sm" icon={<Plus size={13}/>} onClick={() => setShowCrear(true)}>
          Nueva sede
        </Btn>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28}/></div>
      ) : (sedes || []).length === 0 ? (
        <Empty icon="🏢" title="Sin sedes" subtitle="Crea la primera sede para comenzar"/>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(sedes || []).map(s => (
            <SedeRow key={s.id} sede={s} onEditar={setSedeEditar} onSiscadre={setSiscadre}/>
          ))}
        </div>
      )}

      <ModalCrearSede  open={showCrear}    onClose={() => setShowCrear(false)} />
      <ModalEditarSede open={!!sedeEditar} onClose={() => setSedeEditar(null)} sede={sedeEditar} />
      <DrawerSiscadre sedeId={siscadre?.id} sedeNombre={siscadre?.nombre}onCerrar={() => setSiscadre(null)} />
    </div>
  );
}