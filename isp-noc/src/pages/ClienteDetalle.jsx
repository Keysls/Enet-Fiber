import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Phone, Fingerprint, Building2,
  Router, Wifi, Activity, Calendar, User, Clock, ChevronRight, Copy,
  Globe, Pencil, Check, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { contratosApi } from '../services/api';
import { fmtFecha } from '../utils/helpers';
import { useTiposOrden } from '../hooks/useTiposOrden';
import { useAuthStore } from '../store/auth.store';

const ESTADO_CONTRATO = {
  ACTIVO:         { label: 'Activo',         color: '#3fb950' },
  EN_INSTALACION: { label: 'En instalación', color: '#e3b341' },
  CORTADO:        { label: 'Cortado',        color: '#ef4444' },
  BAJA:           { label: 'Baja',           color: '#5a7a9a' },
  SIN_ACTIVIDAD:  { label: 'Sin actividad',  color: '#768999' },
};

const ESTADO_ORDEN = {
  PENDIENTE_NOC:     { label: 'Esperando NOC', color: '#e3b341' },
  PENDIENTE_TECNICO: { label: 'Para técnico',  color: '#3b9fd4' },
  ACEPTADA:          { label: 'Aceptada',      color: '#bc8cff' },
  EN_PROCESO:        { label: 'En proceso',    color: '#58a6ff' },
  COMPLETADA:        { label: 'Completada',    color: '#3fb950' },
  CANCELADA:         { label: 'Cancelada',     color: '#768999' },
  REPROGRAMADA:      { label: 'Reprogramada',  color: '#bc8cff' },
};

export default function ClienteDetalle() {
  const { numero }       = useParams();
  const { tipoLabel }    = useTiposOrden();
  const navigate         = useNavigate();
  const location         = useLocation();

  const sedeSeleccionada = useAuthStore(s => s.sedeSeleccionada);

  // sedeId desde el state de navegación tiene prioridad (viene de la lista)
  // Si el usuario recarga la página o entra directo por URL, cae al sedeSeleccionada
  const sedeId = location.state?.sedeId || sedeSeleccionada || null;

  const { data: c, isLoading, error } = useQuery({
    queryKey: ['contrato', numero, sedeId],
    queryFn:  () => contratosApi.obtener(numero, {
      soloInternet: true,
      ...(sedeId && { sedeId }),
    }).then(r => r.data),
    enabled:  !!numero,
    staleTime: 30000,
  });

  const copiar = (texto, label = 'Copiado') => {
    navigator.clipboard.writeText(texto);
    toast.success(label);
  };

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt-3)' }}>Cargando...</div>;
  }
  if (error) {
    return <div style={{ padding: 40, color: '#ef4444' }}>Error: {error?.response?.data?.error || error.message}</div>;
  }
  if (!c) return null;

  const cfg   = ESTADO_CONTRATO[c.estado] || { label: c.estado, color: '#768999' };
  const pulsa = c.estado === 'EN_INSTALACION';

  return (
    <div style={{ padding: 24 }} className="animate-fade">

      {/* Volver */}
      <button onClick={() => navigate('/clientes')} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'var(--txt-3)', fontSize: 12, marginBottom: 16, padding: 0,
      }}>
        <ArrowLeft size={13}/> Volver a clientes
      </button>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 16, marginBottom: 20, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h1
              onClick={() => copiar(c.numero, 'Contrato copiado')}
              title="Click para copiar"
              style={{
                fontSize: 26, fontWeight: 800, margin: 0,
                fontFamily: 'var(--font-mono)', color: 'var(--accent)',
                cursor: 'pointer', letterSpacing: '-0.02em',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
              {c.numero}
              <Copy size={14} style={{ opacity: 0.5 }}/>
            </h1>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
              fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
              background: cfg.color + '15', color: cfg.color,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%', background: cfg.color,
                animation: pulsa ? 'pulse 1.5s ease-in-out infinite' : 'none',
              }}/>
              {cfg.label}
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt)' }}>{c.abonado}</div>
        </div>
        {c.sede && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '7px 12px', borderRadius: 8,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            fontSize: 12, color: 'var(--txt-2)',
          }}>
            <Building2 size={14}/> {c.sede.nombre}{c.sede.ciudad ? ` · ${c.sede.ciudad}` : ''}
          </div>
        )}
      </div>

      {/* Grid de datos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 16 }}>
        <Field icon={<Fingerprint size={12}/>} label="DNI"        value={c.dni       || '—'} mono onCopy={c.dni     ? () => copiar(c.dni, 'DNI copiado')             : null}/>
        <Field icon={<Phone size={12}/>}       label="Celular"    value={c.celular   || '—'} mono onCopy={c.celular ? () => copiar(c.celular, 'Celular copiado')     : null}/>
        <Field icon={<MapPin size={12}/>}      label="Dirección"  value={c.direccion}              onCopy={() => copiar(c.direccion, 'Dirección copiada')}/>
        <Field icon={<MapPin size={12}/>}      label="Referencia" value={c.referencia || '—'}/>
        <Field icon={<MapPin size={12}/>}      label="Sector"     value={c.sector     || '—'}/>
        {(c.mbps || c.planNombre) && (
          <Field icon={<Wifi size={12}/>} label="Plan" value={c.planNombre ? `${c.planNombre}` : ``}/>
        )}
        <Field icon={<Calendar size={12}/>}    label="Registrado" value={fmtFecha(c.createdAt)}/>
      </div>

      {/* WAN del contrato */}
      <WanContrato contrato={c} />

      {/* Equipo actual */}
      {c.equipoActual && (
        <Section icon={<Router size={15}/>} title="Equipo actual">

          {/* ── Instalación ── */}
          <SubSeccion label="Instalación"/>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <Field label="Serial Number"  value={c.equipoActual.serieOnu  || '—'} mono onCopy={c.equipoActual.serieOnu ? () => copiar(c.equipoActual.serieOnu, 'SN copiado') : null}/>
            <Field icon={<Calendar size={11}/>} label="Instalado" value={fmtFecha(c.equipoActual.fechaInstalacion)}/>
            <Field icon={<Building2 size={11}/>} label="OLT" value={c.equipoActual.oltNombre || '—'}/>
          </div>

          {/* ── Red ── */}
          {c.equipoActual.configOnu && (
            <>
              <SubSeccion label="Red"/>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                <Field label="VLAN"    value={c.equipoActual.configOnu.vlan    || '—'} mono/>
                <Field label="IP WAN"  value={c.equipoActual.configOnu.ipWan   || '—'} mono onCopy={c.equipoActual.configOnu.ipWan   ? () => copiar(c.equipoActual.configOnu.ipWan,   'IP copiada')      : null}/>
                <Field label="Máscara" value={c.equipoActual.configOnu.mascara || '—'} mono/>
                <Field label="Gateway" value={c.equipoActual.configOnu.gateway || '—'} mono onCopy={c.equipoActual.configOnu.gateway ? () => copiar(c.equipoActual.configOnu.gateway, 'Gateway copiado') : null}/>
              </div>
            </>
          )}

          {/* ── ONU / OLT ── */}
          {c.equipoActual.configOnu && (
            <>
              <SubSeccion label="ONU / OLT"/>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                <Field label="Puerto OLT" value={c.equipoActual.configOnu.puertoOlt || '—'} mono/>
                <Field label="ONU ID"     value={c.equipoActual.configOnu.onuIdOlt  || '—'} mono/>
                <Field icon={<Wifi size={11}/>} label="RX" value={c.equipoActual.configOnu.potenciaRx != null ? `${c.equipoActual.configOnu.potenciaRx} dBm` : '—'} mono/>
                <Field icon={<Wifi size={11}/>} label="TX" value={c.equipoActual.configOnu.potenciaTx != null ? `${c.equipoActual.configOnu.potenciaTx} dBm` : '—'} mono/>
              </div>
            </>
          )}

          {c.equipoActual.desdeOrden && (
            <div style={{
              marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)',
              fontSize: 11, color: 'var(--txt-3)',
            }}>
              Configurado en la orden{' '}
              <Link to={`/seguimiento/${c.equipoActual.desdeOrden.id}`}
                style={{ color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                #{c.equipoActual.desdeOrden.nServicio}
              </Link>
            </div>
          )}
        </Section>
      )}

      {/* Timeline órdenes */}
      <Section icon={<Activity size={15}/>} title={`Historial de órdenes (${c.ordenes.length})`}>
        {c.ordenes.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>
            Sin órdenes registradas
          </div>
        ) : (
          <div>
            {c.ordenes.map((o, i) => {
              const eCfg   = ESTADO_ORDEN[o.estado] || { label: o.estado, color: '#768999' };
              const ultima = i === c.ordenes.length - 1;
              const enProc = o.estado === 'EN_PROCESO';
              return (
                <div key={o.id}
                  onClick={() => navigate(`/seguimiento/${o.id}`)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 4px', cursor: 'pointer', borderRadius: 6,
                    borderBottom: ultima ? 'none' : '1px solid var(--border)',
                    transition: 'background .12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  {/* Punto + línea */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 5 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: eCfg.color, boxShadow: `0 0 0 3px ${eCfg.color}30`,
                      animation: enProc ? 'pulse 1.5s ease-in-out infinite' : 'none',
                    }}/>
                    {!ultima && <div style={{ width: 2, flex: 1, background: 'var(--border)', marginTop: 4, minHeight: 22 }}/>}
                  </div>

                  {/* Contenido */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, color: 'var(--txt)', fontSize: 13 }}>
                        {o.tipoOrdenLabel || tipoLabel(o.tipoOrden)}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
                        #{o.nServicio}
                      </span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                        fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
                        background: eCfg.color + '15', color: eCfg.color,
                      }}>
                        {eCfg.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--txt-3)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={11}/> <span style={{ fontFamily: 'var(--font-mono)' }}>{fmtFecha(o.fechaServicio)}</span>
                      </span>
                      {o.tecnico && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <User size={11}/> {o.tecnico.nombre} {o.tecnico.apellido}
                        </span>
                      )}
                      {o.tiempoInstalacion != null && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11}/> <span style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(o.tiempoInstalacion)} min</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={16} style={{ color: 'var(--txt-3)', alignSelf: 'center', flexShrink: 0 }}/>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Mini-componentes ──────────────────────────────────────────
function Field({ icon, label, value, mono, onCopy }) {
  return (
    <div onClick={onCopy || undefined} style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 12px', position: 'relative',
      cursor: onCopy ? 'pointer' : 'default', transition: 'background .12s',
    }}
    onMouseEnter={onCopy ? (e) => e.currentTarget.style.background = 'var(--bg-3)' : undefined}
    onMouseLeave={onCopy ? (e) => e.currentTarget.style.background = 'var(--bg-card)' : undefined}>
      <div style={{
        fontSize: 10, color: 'var(--txt-3)', letterSpacing: 0.5,
        textTransform: 'uppercase', fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4,
      }}>
        {icon}{label}
      </div>
      <div style={{
        fontSize: 13, color: 'var(--txt)',
        fontFamily: mono ? 'var(--font-mono)' : 'inherit',
        wordBreak: 'break-word',
      }}>
        {value}
      </div>
      {onCopy && (
        <Copy size={11} style={{
          position: 'absolute', top: 8, right: 8,
          color: 'var(--txt-3)', opacity: 0.4,
        }}/>
      )}
    </div>
  );
}

function Section({ icon, title, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 10, marginBottom: 16, overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        fontSize: 13, fontWeight: 700, color: 'var(--txt)',
      }}>
        {icon}{title}
      </div>
      <div style={{ padding: 14 }}>
        {children}
      </div>
    </div>
  );
}

function SubSeccion({ label }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: 'var(--txt-3)',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      marginTop: 14, marginBottom: 8,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {label}
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
    </div>
  );
}

// ── WAN del contrato (editable, IP estática o PPPoE) ───────────
function WanContrato({ contrato }) {
  const qc = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [usaPppoe, setUsaPppoe] = useState(!!contrato.usaPppoe);
  const [form, setForm] = useState({
    ipWan:         contrato.ipWan   || '',
    mascara:       contrato.mascara || '255.255.255.0',
    gateway:       contrato.gateway || '',
    pppoeUser:     contrato.pppoeUser     || '',
    pppoePassword: contrato.pppoePassword || '',
  });
  const [errores, setErrores] = useState({});

  const tieneWan = contrato.usaPppoe ? !!contrato.pppoeUser : !!contrato.ipWan;

  const mut = useMutation({
    mutationFn: () => contratosApi.guardarWan(contrato.numero, { ...form, usaPppoe }, contrato.sede?.id),
    onSuccess: () => {
      toast.success('WAN del contrato guardada');
      qc.invalidateQueries(['contrato', contrato.numero, contrato.sede?.id]);
      setEditando(false);
    },
    onError: e => toast.error(e.response?.data?.error || 'Error al guardar'),
  });

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const esIp = v => /^(\d{1,3}\.){3}\d{1,3}$/.test(v || '');

  const guardar = () => {
    const e = {};
    if (usaPppoe) {
      if (!form.pppoeUser.trim())     e.pppoeUser     = 'Usuario obligatorio';
      if (!form.pppoePassword.trim()) e.pppoePassword = 'Contraseña obligatoria';
    } else {
      if (!esIp(form.ipWan))   e.ipWan   = 'IP inválida';
      if (!esIp(form.mascara)) e.mascara = 'Máscara inválida';
      if (!esIp(form.gateway)) e.gateway = 'Gateway inválido';
    }
    if (Object.keys(e).length) { setErrores(e); return; }
    setErrores({});
    mut.mutate();
  };

  const cancelar = () => {
    setForm({
      ipWan:         contrato.ipWan   || '',
      mascara:       contrato.mascara || '255.255.255.0',
      gateway:       contrato.gateway || '',
      pppoeUser:     contrato.pppoeUser     || '',
      pppoePassword: contrato.pppoePassword || '',
    });
    setUsaPppoe(!!contrato.usaPppoe);
    setErrores({});
    setEditando(false);
  };

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 10, marginBottom: 16, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>
          <Globe size={15}/> WAN del contrato
        </div>
        {!editando && (
          <button onClick={() => setEditando(true)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'transparent', border: '1px solid var(--border-2)',
            borderRadius: 7, padding: '5px 10px', cursor: 'pointer',
            fontSize: 11, fontWeight: 600, color: 'var(--accent)',
          }}>
            <Pencil size={11}/> {tieneWan ? 'Editar' : 'Registrar WAN'}
          </button>
        )}
      </div>

      <div style={{ padding: 14 }}>
        {/* ── Modo lectura ── */}
        {!editando && (
          tieneWan ? (
            contrato.usaPppoe ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                <Field label="Modo" value="PPPoE"/>
                <Field label="Usuario PPPoE" value={contrato.pppoeUser} mono/>
                <Field label="Contraseña PPPoE" value={contrato.pppoePassword} mono/>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                <Field label="Modo" value="IP Estática"/>
                <Field label="IP WAN"  value={contrato.ipWan}   mono/>
                <Field label="Máscara" value={contrato.mascara || '—'} mono/>
                <Field label="Gateway" value={contrato.gateway || '—'} mono/>
              </div>
            )
          ) : (
            <div style={{ fontSize: 12, color: 'var(--txt-3)', textAlign: 'center', padding: '8px 0' }}>
              Este contrato aún no tiene WAN registrada. Las órdenes nuevas pedirán configurarla.
            </div>
          )
        )}

        {/* ── Modo edición ── */}
        {editando && (
          <div>
            {/* Switch IP Estática / PPPoE */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: !usaPppoe ? 'var(--txt)' : 'var(--txt-3)' }}>
                IP Estática
              </span>
              <button
                type="button"
                onClick={() => setUsaPppoe(p => !p)}
                style={{
                  width: 38, height: 20, borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: usaPppoe ? 'var(--accent)' : 'var(--border-2)',
                  position: 'relative', transition: 'background 0.15s', flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 2, left: usaPppoe ? 20 : 2,
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.15s',
                }}/>
              </button>
              <span style={{ fontSize: 12, fontWeight: 600, color: usaPppoe ? 'var(--txt)' : 'var(--txt-3)' }}>
                PPPoE
              </span>
            </div>

            {usaPppoe ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 12 }}>
                <CampoEdit label="Usuario PPPoE *"     value={form.pppoeUser}     onChange={v => setF('pppoeUser', v)}     error={errores.pppoeUser}     placeholder="usuario@enet"/>
                <CampoEdit label="Contraseña PPPoE *"  value={form.pppoePassword} onChange={v => setF('pppoePassword', v)} error={errores.pppoePassword} placeholder="contraseña"/>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 12 }}>
                <CampoEdit label="IP WAN *"  value={form.ipWan}   onChange={v => setF('ipWan', v)}   error={errores.ipWan}   placeholder="200.x.x.x"/>
                <CampoEdit label="Máscara *" value={form.mascara} onChange={v => setF('mascara', v)} error={errores.mascara} placeholder="255.255.255.0"/>
                <CampoEdit label="Gateway *" value={form.gateway} onChange={v => setF('gateway', v)} error={errores.gateway} placeholder="200.x.x.1"/>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={cancelar} disabled={mut.isPending} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'transparent', border: '1px solid var(--border-2)',
                borderRadius: 7, padding: '7px 12px', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: 'var(--txt-3)',
              }}>
                <X size={13}/> Cancelar
              </button>
              <button onClick={guardar} disabled={mut.isPending} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'var(--accent)', border: 'none',
                borderRadius: 7, padding: '7px 14px', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: '#fff',
                opacity: mut.isPending ? 0.6 : 1,
              }}>
                <Check size={13}/> {mut.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Campo de input para edición ───────────────────────────────
function CampoEdit({ label, value, onChange, error, placeholder }) {
  return (
    <div>
      <label style={{
        fontSize: 10, color: 'var(--txt-3)', letterSpacing: 0.5,
        textTransform: 'uppercase', fontWeight: 600,
        display: 'block', marginBottom: 4,
      }}>
        {label}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '8px 10px',
          background: 'var(--bg-3)',
          border: `1px solid ${error ? 'var(--red)' : 'var(--border-2)'}`,
          borderRadius: 7, color: 'var(--txt)',
          fontSize: 13, fontFamily: 'var(--font-mono)', outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {error && (
        <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 3 }}>{error}</div>
      )}
    </div>
  );
}