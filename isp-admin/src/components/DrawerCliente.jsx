import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  X, MapPin, Phone, Fingerprint, Building2, Wifi,
  Calendar, User, Clock, Copy, ExternalLink, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { contratosApi } from '../services/api';
import { Spinner } from './ui';
import { fmtFecha } from '../utils/helpers';
import { useTiposOrden } from '../hooks/useTiposOrden';


const ESTADO_CONTRATO = {
  ACTIVO:         { label: 'Activo',         color: '#16a34a' },
  EN_INSTALACION: { label: 'En instalación', color: '#d97706' },
  CORTADO:        { label: 'Cortado',        color: '#dc2626' },
  BAJA:           { label: 'Baja',           color: '#64748b' },
  SIN_ACTIVIDAD:  { label: 'Sin actividad',  color: '#94a3b8' },
};
const ESTADO_ORDEN = {
  PENDIENTE_NOC:     { label: 'Esperando NOC', color: '#d97706' },
  PENDIENTE_TECNICO: { label: 'Para técnico',  color: '#3b9fd4' },
  ACEPTADA:          { label: 'Aceptada',      color: '#7c3aed' },
  EN_PROCESO:        { label: 'En proceso',    color: '#2563eb' },
  COMPLETADA:        { label: 'Completada',    color: '#16a34a' },
  CANCELADA:         { label: 'Cancelada',     color: '#94a3b8' },
  REPROGRAMADA:      { label: 'Reprogramada',  color: '#7c3aed' },
};

export default function DrawerCliente({ numero, sedeId, onCerrar }) {
  const navigate = useNavigate();
  const { tipoLabel } = useTiposOrden();
  const abierto  = !!numero;

  // Bloquear scroll del body cuando el drawer está abierto
  useEffect(() => {
    if (abierto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [abierto]);

  const { data: c, isLoading, error } = useQuery({
    queryKey: ['contrato', numero, sedeId],
    queryFn:  () => contratosApi.obtener(numero, sedeId).then(r => r.data),
    enabled:  abierto,
    staleTime: 30000,
  });

  const copiar = (text, label = 'Copiado') => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const cfg = c ? (ESTADO_CONTRATO[c.estado] || { label: c.estado, color: '#94a3b8' }) : null;

  // Inicial para el avatar
  const inicial = c?.abonado?.[0]?.toUpperCase() || '?';

  return createPortal(
    <>
      {/* Backdrop */}
      {abierto && (
        <div onClick={onCerrar} style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.35)',
          backdropFilter: 'blur(2px)',
          zIndex: 9998,
        }}/>
      )}

      {/* Panel */}
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
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
            <Spinner size={26}/>
          </div>
        ) : error ? (
          <div style={{ padding: 24, background: '#fff' }}>
            <BotonCerrar onCerrar={onCerrar}/>
            <div style={{ color: '#dc2626', fontSize: 14, marginTop: 16 }}>
              Error: {error?.response?.data?.error || error.message}
            </div>
          </div>
        ) : c ? (
          <>
            {/* ── Cabecera ── */}
            <div style={{
              background: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              padding: '16px 20px',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: '#3b9fd4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 800, color: '#fff',
                }}>
                  {inicial}
                </div>

                {/* Nombre + DNI */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 15, fontWeight: 700, color: '#0f172a',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    letterSpacing: '-0.01em',
                  }}>
                    {c.abonado}
                  </div>
                  {c.numero && (
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, fontFamily: 'monospace' }}>
                    Contrato:&nbsp;{c.numero}
                  </div>
                )}
                </div>

                {/* Acciones rápidas + cerrar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <IconBtn title="Ver ficha" onClick={() => { onCerrar(); navigate(`/clientes/${c.numero}`); }}>
                    <ExternalLink size={15}/>
                  </IconBtn>

                  <IconBtn title="Cerrar" onClick={onCerrar}>
                    <X size={16}/>
                  </IconBtn>
                </div>
              </div>
            </div>

            {/* ── Cuerpo scrolleable ── */}
            <div style={{ flex: 1, overflowY: 'auto' }}>

              {/* ── Sección datos personales ── */}
                <div style={{
                  background: '#ffffff',
                  margin: '12px 14px 0',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '11px 16px',
                    borderBottom: '1px solid #f1f5f9',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                      Datos personales
                    </span>
                  </div>

                  <div style={{ padding: '0 16px' }}>
                    <FilaDato label="Nombre"   value={c.abonado}/>
                    <FilaDato label="DNI"      value={c.dni || '—'} mono/>
                    <FilaDato
                      label="Teléfono" value={c.celular || '—'} mono
                      action={c.celular && (
                        <IconBtn title="Abrir WhatsApp" color="#25D366" onClick={() => abrirWhatsapp(c.celular)}>
                          <IconWhatsapp size={14}/>
                        </IconBtn>
                      )}
                    />
                    {c.direccion && (
                      <FilaDato
                        label="Dirección" value={c.direccion}
                        action={
                          <IconBtn title="Compartir ubicación por WhatsApp" color="#3b9fd4" onClick={() => compartirUbicacionWhatsapp(c)}>
                            <MapPin size={14}/>
                          </IconBtn>
                        }
                      />
                    )}
                    {c.referencia && <FilaDato label="Referencia" value={c.referencia}/>}
                    {c.sector && <FilaDato label="Sector" value={c.sector}/>}
                    {c.precinto && <FilaDato label="Precinto" value={c.precinto} mono/>}
                    {c.contratoRef?.precinto && (
                      <FilaDato label="Precinto" value={c.contratoRef.precinto} mono/>
                    )}
                    {c.mbps && (
                      <FilaDato label="Plan" value={`${c.planNombre || ''}`}/>
                    )}
                    {c.sede && (
                      <FilaDato label="Sede" value={`${c.sede.nombre}${c.sede.ciudad ? ' · ' + c.sede.ciudad : ''}`} last/>
                    )}
                  </div>
                </div>

              {/* ── Sección equipo ── */}
              {c.equipoActual && (
                <div style={{
                  background: '#ffffff',
                  margin: '10px 14px 0',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                }}>
                  <div style={{ padding: '11px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Equipo actual</span>
                  </div>
                  <div style={{ padding: '0 16px' }}>
                    <FilaDato label="Instalado" value={fmtFecha(c.equipoActual.fechaInstalacion)}/>
                    <FilaDato label="Serial"    value={c.equipoActual.serieOnu || '—'} mono
                      onCopy={c.equipoActual.serieOnu ? () => copiar(c.equipoActual.serieOnu, 'SN copiado') : null}/>
                    <FilaDato label="OLT"       value={c.equipoActual.oltNombre || '—'}/>
                    {c.equipoActual.configOnu && (
                      <>
                        <FilaDato label="IP WAN"  value={c.equipoActual.configOnu.ipWan   || '—'} mono
                          onCopy={c.equipoActual.configOnu.ipWan ? () => copiar(c.equipoActual.configOnu.ipWan, 'IP copiada') : null}/>
                        <FilaDato label="Gateway" value={c.equipoActual.configOnu.gateway || '—'} mono
                          onCopy={c.equipoActual.configOnu.gateway ? () => copiar(c.equipoActual.configOnu.gateway, 'Gateway copiado') : null}/>
                        <FilaDato label="VLAN"    value={c.equipoActual.configOnu.vlan    || '—'} mono/>
                        <FilaDato label="RX / TX"
                          value={
                            c.equipoActual.configOnu.potenciaRx != null
                              ? `${c.equipoActual.configOnu.potenciaRx} dBm / ${c.equipoActual.configOnu.potenciaTx ?? '—'} dBm`
                              : '—'
                          } mono last/>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── Sección historial de órdenes ── */}
              <div style={{
                background: '#ffffff',
                margin: '10px 14px 0',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
              }}>
                <div style={{ padding: '11px 16px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <FileText size={13} style={{ color: '#64748b' }}/>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                      Historial de órdenes ({c.ordenes.length})
                    </span>
                  </div>
                </div>

                {c.ordenes.length === 0 ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    Sin órdenes registradas
                  </div>
                ) : (
                  <div>
                    {c.ordenes.map((o, i) => {
                      const eCfg   = ESTADO_ORDEN[o.estado] || { label: o.estado, color: '#94a3b8' };
                      const ultima = i === c.ordenes.length - 1;
                      return (
                        <div key={o.id}
                          onClick={() => navigate(`/ordenes/${o.id}`)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 16px',
                            borderBottom: ultima ? 'none' : '1px solid #f8fafc',
                            cursor: 'pointer',
                            transition: 'background .12s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                          {/* Ícono */}
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                            background: eCfg.color + '12',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <FileText size={14} color={eCfg.color}/>
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                                {o.tipoOrdenLabel || tipoLabel(o.tipoOrden)}
                              </span>
                              <span style={{ fontSize: 11, color: '#3b9fd4', fontFamily: 'monospace' }}>
                                #{o.nServicio}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#94a3b8' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Calendar size={10}/> {fmtFecha(o.fechaServicio)}
                              </span>
                              {o.tecnico && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <User size={10}/> {o.tecnico.nombre} {o.tecnico.apellido}
                                </span>
                              )}
                              {o.tiempoInstalacion != null && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <Clock size={10}/> {Math.round(o.tiempoInstalacion)} min
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Badge estado */}
                          <span style={{
                            padding: '3px 8px', borderRadius: 5, flexShrink: 0,
                            fontSize: 10, fontWeight: 700,
                            background: eCfg.color + '12',
                            color: eCfg.color,
                            border: `1px solid ${eCfg.color}20`,
                          }}>
                            {eCfg.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ height: 16 }}/>
            </div>
          </>
        ) : null}
      </aside>
    </>,
    document.body
  );
}

// ── Mini-componentes ──────────────────────────────────────────

// Perú: si el número no trae código de país, se le antepone 51.
function abrirWhatsapp(celular, texto) {
  const digitos = String(celular).replace(/\D/g, '');
  const numero  = digitos.startsWith('51') ? digitos : `51${digitos}`;
  const query   = texto ? `?text=${encodeURIComponent(texto)}` : '';
  window.open(`https://wa.me/${numero}${query}`, '_blank', 'noopener,noreferrer');
}

// Arma el mensaje de ubicación (Contrato/Nombre/Dirección + GPS si existe)
// y abre WhatsApp SIN número de destino — el usuario elige a quién
// reenviarlo (técnico, supervisor, etc.), no va directo al cliente.
function compartirUbicacionWhatsapp(c) {
  const lineas = [
    `Contrato: ${c.numero}`,
    `Nombre: ${c.abonado}`,
    `Dirección: ${c.direccion}`,
  ];
  if (c.latitud != null && c.longitud != null) {
    lineas.push(`Ubicación GPS: https://www.google.com/maps?q=${c.latitud},${c.longitud}`);
  }
  const texto = encodeURIComponent(lineas.join('\n'));
  window.open(`https://wa.me/?text=${texto}`, '_blank', 'noopener,noreferrer');
}

function IconWhatsapp({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12.04 2c-5.523 0-10 4.477-10 10 0 1.76.454 3.482 1.317 5.01L2 22l5.14-1.343A9.958 9.958 0 0 0 12.04 22c5.523 0 10-4.477 10-10s-4.477-10-10-10zm0 18.135c-1.607 0-3.183-.432-4.564-1.25l-.327-.194-3.05.797.815-2.973-.213-.305a8.115 8.115 0 0 1-1.278-4.393c0-4.503 3.664-8.166 8.167-8.166 2.18 0 4.229.85 5.77 2.393a8.108 8.108 0 0 1 2.396 5.774c0 4.503-3.663 8.317-8.166 8.317z"/>
    </svg>
  );
}

function IconBtn({ onClick, title, children, color }) {
  const colorBase  = color || '#64748b';
  const colorHover = color || '#0f172a';
  return (
    <button onClick={onClick} title={title} style={{
      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'transparent', border: '1px solid #e2e8f0',
      cursor: 'pointer', color: colorBase,
      transition: 'all .15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = colorHover; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colorBase; }}>
      {children}
    </button>
  );
}

function FilaDato({ label, value, mono, onCopy, last, action }) {
  return (
    <div onClick={onCopy || undefined} style={{
      display: 'flex', alignItems: 'center',
      padding: '9px 0',
      borderBottom: last ? 'none' : '1px solid #f8fafc',
      cursor: onCopy ? 'pointer' : 'default',
      gap: 12,
    }}>
      <span style={{
        fontSize: 12, color: '#94a3b8',
        minWidth: 90, flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{
        flex: 1, fontSize: 13, color: '#0f172a', fontWeight: 500,
        fontFamily: mono ? 'monospace' : 'inherit',
        wordBreak: 'break-word',
      }}>
        {value}
      </span>
      {onCopy && <Copy size={11} style={{ color: '#cbd5e1', flexShrink: 0 }}/>}
      {action && <span onClick={e => e.stopPropagation()} style={{ display: 'flex' }}>{action}</span>}
    </div>
  );
}