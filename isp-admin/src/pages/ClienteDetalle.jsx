import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Phone, Fingerprint, Building2,
  Router, Wifi, Activity, Calendar, User, Clock, ChevronRight, Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { contratosApi } from '../services/api';
import { Card, Btn, Spinner } from '../components/ui';
import { fmtFecha } from '../utils/helpers';
import { useTiposOrden } from '../hooks/useTiposOrden';

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
  const { numero } = useParams();
  const { tipoLabel } = useTiposOrden();
  const navigate   = useNavigate();
  // Hay contratos con el mismo número en varias sedes: la sede viaja en el enlace (?sede=)
  const [searchParams] = useSearchParams();
  const sede = searchParams.get('sede') || undefined;

  const { data: c, isLoading, error } = useQuery({
    queryKey: ['contrato', numero, sede],
    queryFn:  () => contratosApi.obtener(numero, sede).then(r => r.data),
    enabled:  !!numero,
    staleTime: 30000,
  });

  const copiar = (text, label = 'Copiado') => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  if (isLoading) {
    return (
      <div style={{ padding: 28, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spinner size={28} />
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: 28, color: 'var(--red)', fontSize: 14 }}>
        Error: {error?.response?.data?.error || error.message}
      </div>
    );
  }
  if (!c) return null;

  const cfg    = ESTADO_CONTRATO[c.estado] || { label: c.estado, color: '#768999' };
  const pulsa  = c.estado === 'EN_INSTALACION';

  return (
    <div style={{ padding: 28 }} className="animate-fade">

      {/* Volver */}
      <Btn variant="ghost" size="sm" onClick={() => navigate('/clientes')} icon={<ArrowLeft size={13}/>}>
        Volver a clientes
      </Btn>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 16, marginTop: 16, marginBottom: 24, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h1
              onClick={() => copiar(c.numero, 'Contrato copiado')}
              title="Click para copiar"
              style={{
                fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800,
                color: 'var(--accent)', cursor: 'pointer', margin: 0, letterSpacing: '-0.02em',
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
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--txt)' }}>{c.abonado}</div>
        </div>

        {c.sede && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 12px', borderRadius: 8,
            background: 'var(--bg-3)', border: '1px solid var(--border-2)',
            fontSize: 12, color: 'var(--txt-2)',
          }}>
            <Building2 size={14}/> {c.sede.nombre}{c.sede.ciudad ? ` · ${c.sede.ciudad}` : ''}
          </div>
        )}
      </div>

      {/* Grid de datos del cliente */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 16 }}>
        <Field icon={<Fingerprint size={12}/>} label="DNI"        value={c.dni       || '—'} mono onCopy={c.dni     ? () => copiar(c.dni, 'DNI copiado')             : null}/>
        <Field icon={<Phone size={12}/>}       label="Celular"    value={c.celular   || '—'} mono onCopy={c.celular ? () => copiar(c.celular, 'Celular copiado')     : null}/>
        <Field icon={<MapPin size={12}/>}      label="Dirección"  value={c.direccion}              onCopy={() => copiar(c.direccion, 'Dirección copiada')}/>
        <Field icon={<MapPin size={12}/>}      label="Referencia" value={c.referencia || '—'}/>
        <Field icon={<MapPin size={12}/>}      label="Sector"     value={c.sector     || '—'}/>
        {c.precinto && (
          <Field icon={<MapPin size={12}/>} label="Precinto" value={c.precinto} mono
            onCopy={() => copiar(c.precinto, 'Precinto copiado')}/>
        )}
        {c.mbps && (
          <Field icon={<Wifi size={12}/>} label="Plan" value={`${c.planNombre ? c.planNombre + '  ' : ''}`}/>
        )}
        <Field icon={<Calendar size={12}/>}    label="Registrado" value={fmtFecha(c.createdAt)}/>
      </div>

      {/* Equipo actual */}
      {c.equipoActual && (
        <Card style={{ marginBottom: 16, padding: 0 }}>
          <CardHeader icon={<Router size={15}/>} title="Equipo actual"/>
          <div style={{ padding: '14px 16px' }}>

            {/* ── Instalación ── */}
            <SubSeccion label="Instalación"/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              <Field icon={<Calendar size={11}/>} label="Instalado" value={fmtFecha(c.equipoActual.fechaInstalacion)}/>
              <Field label="Serial Number" value={c.equipoActual.serieOnu || '—'} mono onCopy={c.equipoActual.serieOnu ? () => copiar(c.equipoActual.serieOnu, 'SN copiado') : null}/>
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
                <Link to={`/ordenes/${c.equipoActual.desdeOrden.id}`}
                  style={{ color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  #{c.equipoActual.desdeOrden.nServicio}
                </Link>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Timeline órdenes */}
      <Card style={{ padding: 0 }}>
        <CardHeader icon={<Activity size={15}/>} title={`Historial de órdenes (${c.ordenes.length})`}/>
          <div style={{ padding: '8px 16px 16px' }}>
            {c.ordenes.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>
              Sin órdenes registradas
            </div>
          ) : (
            <div>
              {[...c.ordenes].sort((a, b) => Number(b.nServicio) - Number(a.nServicio)).map((o, i) => {
                const eCfg   = ESTADO_ORDEN[o.estado] || { label: o.estado, color: '#768999' };
                const ultima = i === c.ordenes.length - 1;
                const enProc = o.estado === 'EN_PROCESO';
                return (
                  <div key={o.id}
                    onClick={() => navigate(`/ordenes/${o.id}`)}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: 'var(--txt)', fontSize: 13 }}>
                          {o.tipoOrdenLabel || tipoLabel(o.tipoOrden)}
                        </span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--accent)' }}>
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
                          <Calendar size={11}/> {fmtFecha(o.fechaServicio)}
                        </span>
                        {o.tecnico && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <User size={11}/> {o.tecnico.nombre} {o.tecnico.apellido}
                          </span>
                        )}
                        {o.tiempoInstalacion != null && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11}/> {Math.round(o.tiempoInstalacion)} min
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
        </div>
      </Card>
    </div>
  );
}

// ── Mini-componentes ──────────────────────────────────────────
function Field({ icon, label, value, mono, onCopy }) {
  return (
    <div onClick={onCopy || undefined} style={{
      background: 'var(--bg-3)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 12px', position: 'relative',
      cursor: onCopy ? 'pointer' : 'default', transition: 'background .12s',
    }}
    onMouseEnter={onCopy ? (e) => e.currentTarget.style.background = 'var(--bg-2)' : undefined}
    onMouseLeave={onCopy ? (e) => e.currentTarget.style.background = 'var(--bg-3)' : undefined}>
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

function CardHeader({ icon, title }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '12px 16px',
      borderBottom: '1px solid var(--border)',
      fontSize: 13, fontWeight: 700, color: 'var(--txt)',
      fontFamily: 'var(--font-display)', letterSpacing: '-0.01em',
    }}>
      {icon}{title}
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