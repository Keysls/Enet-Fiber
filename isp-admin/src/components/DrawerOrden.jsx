import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  X, ExternalLink, Calendar, User, Clock,
  Copy, MapPin, Wifi, Package, Recycle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ordenesApi } from '../services/api';
import { Spinner, EstadoBadge } from './ui';
import { fmtFecha, fmtFechaHora, TIPO_COLOR } from '../utils/helpers';
import { useTiposOrden } from '../hooks/useTiposOrden';

export default function DrawerOrden({ ordenId, onCerrar }) {
  const navigate  = useNavigate();
  const { tipoLabel } = useTiposOrden();
  const abierto   = !!ordenId;
  const [copiado, setCopiado] = React.useState(false);

  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [abierto]);

  const { data: orden, isLoading, error } = useQuery({
    queryKey: ['orden', ordenId],
    queryFn:  () => ordenesApi.obtener(ordenId).then(r => r.data),
    enabled:  abierto,
    staleTime: 30000,
  });

  const copiar = (text, label = 'Copiado') => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const esRetiro = orden?.tipoOrden?.includes('RETIRO') || orden?.tipoOrden?.includes('BAJA');
  const esCambio = orden?.tipoOrden?.includes('CAMBIO_EQUIPO');

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
        width: 500, maxWidth: '100vw',
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
            <div style={{ color: '#dc2626', fontSize: 14, marginTop: 16 }}>
              Error: {error?.response?.data?.error || error.message}
            </div>
          </div>
        ) : orden ? (
          <>
            {/* ── Cabecera ── */}
            <div style={{
              background: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              padding: '14px 20px',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: 'monospace', fontWeight: 800,
                      fontSize: 16, color: '#3b9fd4',
                    }}>
                      #{orden.nServicio}
                    </span>
                    <EstadoBadge estado={orden.estado}/>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: TIPO_COLOR[orden.tipoOrden],
                      background: (TIPO_COLOR[orden.tipoOrden] || '#3b9fd4') + '15',
                      padding: '2px 8px', borderRadius: 20,
                    }}>
                      {tipoLabel(orden.tipoOrden)}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                    {orden.abonado}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    {fmtFecha(orden.fechaServicio)}
                    {orden.tecnico && ` · ${orden.tecnico.usuario.nombre} ${orden.tecnico.usuario.apellido}`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <IconBtn title="Ver orden completa" onClick={() => { onCerrar(); navigate(`/ordenes/${ordenId}`); }}>
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

              {/* ── Datos del cliente ── */}
              <Seccion titulo="Datos del cliente">
                <FilaDato label="Abonado"   value={orden.abonado}/>
                {orden.dni       && <FilaDato label="DNI"       value={orden.dni} mono/>}
                {orden.contrato  && <FilaDato label="Contrato"  value={orden.contrato} mono
                  onCopy={() => copiar(orden.contrato, 'Contrato copiado')}/>}
                {orden.celular   && <FilaDato label="Celular"   value={orden.celular} mono/>}
                <FilaDato label="Dirección" value={orden.direccion}/>
                {orden.referencia && <FilaDato label="Referencia" value={orden.referencia}/>}
                {orden.sector    && <FilaDato label="Sector"    value={orden.sector}/>}
                {orden.plan?.nombre && <FilaDato label="Plan"   value={orden.plan.nombre} last/>}
                {(orden.precinto || orden.contratoRef?.precinto) && (
                  <FilaDato label="Precinto" value={orden.precinto || orden.contratoRef?.precinto} mono
                    onCopy={() => copiar(orden.precinto || orden.contratoRef?.precinto, 'Precinto copiado')}/>
                )}
                {orden.observacion && (
                  <div style={{
                    margin: '8px 0', padding: '8px 12px',
                    background: '#fffbeb', borderRadius: 8,
                    border: '1px solid #fde68a',
                    fontSize: 12, color: '#92400e',
                  }}>
                    ⚠ {orden.observacion}
                  </div>
                )}
              </Seccion>

              {/* ── WAN / NOC ── */}
              {orden.ipWan && (
                <Seccion titulo="WAN — NOC">
                  <FilaDato label="IP WAN"  value={orden.ipWan}  mono
                    onCopy={() => copiar(orden.ipWan, 'IP copiada')}/>
                  <FilaDato label="Máscara" value={orden.mascara} mono/>
                  <FilaDato label="Gateway" value={orden.gateway} mono
                    onCopy={() => copiar(orden.gateway, 'Gateway copiado')} last/>
                </Seccion>
              )}

              {/* ── Señal ONU ── */}
              {orden.instalacion?.configOnu && (
                <Seccion titulo="Señal ONU">
                  {orden.instalacion.configOnu.serialNumber && (
                    <FilaDato label="Serial" value={orden.instalacion.configOnu.serialNumber} mono
                      onCopy={() => copiar(orden.instalacion.configOnu.serialNumber, 'SN copiado')}/>
                  )}
                  {orden.instalacion.configOnu.potenciaRx != null && (
                    <FilaDato label="RX" value={`${orden.instalacion.configOnu.potenciaRx} dBm`} mono/>
                  )}
                  {orden.instalacion.configOnu.potenciaTx != null && (
                    <FilaDato label="TX" value={`${orden.instalacion.configOnu.potenciaTx} dBm`} mono/>
                  )}
                  {orden.instalacion.configOnu.ssid && (
                    <FilaDato label="WiFi" value={orden.instalacion.configOnu.ssid} last/>
                  )}
                </Seccion>
              )}

              {/* ── Materiales utilizados ── */}
              {!esRetiro && orden.consumos?.length > 0 && (
                <div style={{
                  background: '#ffffff',
                  margin: '10px 14px 0',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '10px 16px', borderBottom: '1px solid #f1f5f9',
                    display: 'flex', alignItems: 'center', gap: 7,
                  }}>
                    <Package size={13} style={{ color: '#64748b' }}/>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                      Materiales utilizados
                    </span>
                    <span style={{
                      marginLeft: 'auto', fontSize: 10, fontWeight: 700,
                      padding: '2px 8px', borderRadius: 10,
                      background: '#eff6ff', color: '#2563eb',
                    }}>
                      {orden.consumos.length} ítem{orden.consumos.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {orden.consumos.map((c, i) => {
                    const esMedible = c.producto?.esMedible;
                    const valor = Number(c.cantidad);
                    const unidad = esMedible ? 'm' : (c.producto?.unidad || 'und');
                    const ultima = i === orden.consumos.length - 1;
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center',
                        padding: '9px 16px',
                        borderBottom: ultima ? 'none' : '1px solid #f8fafc',
                        gap: 10,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>
                            {c.producto?.nombre}
                          </div>
                          {c.codigoPon && (
                            <div style={{ fontSize: 11, color: '#7c3aed', fontFamily: 'monospace', marginTop: 2 }}>
                              ◈ {c.codigoPon}
                            </div>
                          )}
                        </div>
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          color: '#e67e22', fontFamily: 'monospace',
                          flexShrink: 0,
                        }}>
                          -{valor % 1 === 0 ? valor : valor.toFixed(1)} {unidad}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Equipos recuperados ── */}
              {(esRetiro || esCambio) && orden.recojos?.length > 0 && (
                <div style={{
                  background: '#ffffff',
                  margin: '10px 14px 0',
                  borderRadius: 10,
                  border: '1px solid #bbf7d0',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '10px 16px', borderBottom: '1px solid #dcfce7',
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: '#f0fdf4',
                  }}>
                    <Recycle size={13} style={{ color: '#16a34a' }}/>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                      Equipos recuperados
                    </span>
                    <span style={{
                      marginLeft: 'auto', fontSize: 10, fontWeight: 700,
                      padding: '2px 8px', borderRadius: 10,
                      background: '#dcfce7', color: '#16a34a',
                    }}>
                      {orden.recojos.length} equipo{orden.recojos.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {orden.recojos.map((r, i) => {
                    const ultima = i === orden.recojos.length - 1;
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center',
                        padding: '9px 16px',
                        borderBottom: ultima ? 'none' : '1px solid #f0fdf4',
                        gap: 10,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: '#166534', fontWeight: 500 }}>
                            {r.nombreProducto || r.tipoEquipo || 'Equipo'}
                          </div>
                          {r.codigoPon && (
                            <div style={{ fontSize: 11, color: '#7c3aed', fontFamily: 'monospace', marginTop: 2 }}>
                              ◈ {r.codigoPon}
                            </div>
                          )}
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          padding: '2px 8px', borderRadius: 4,
                          background: r.estado === 'en_mano' ? '#fef3c7' : '#dcfce7',
                          color:      r.estado === 'en_mano' ? '#92400e' : '#166534',
                          flexShrink: 0,
                        }}>
                          {r.estado === 'en_mano' ? 'En mano' : r.estado}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Botón copiar resumen ── */}
              <div style={{ margin: '16px 14px' }}>
                <button
                  onClick={() => {
                    const lineas = [];

                    if (orden.ipWan) {
                      lineas.push(`IP: ${orden.ipWan}`);
                    }

                    const sn = orden.instalacion?.configOnu?.serialNumber;
                      if (sn) {
                        lineas.push(`SERIE PON: ${sn}`);
                      }

                      const precinto = orden.precinto || orden.contratoRef?.precinto;
                      if (precinto) {
                        lineas.push(`PRECINTO: ${precinto}`);
                      }


                    if (!esRetiro && orden.consumos?.length > 0) {
                      const items = orden.consumos.map(c => {
                        const esMedible = c.producto?.esMedible;
                        const valor = Number(c.cantidad);
                        const unidad = esMedible ? 'm' : (c.producto?.unidad || 'und');
                        const pon = c.codigoPon ? ` (◈ ${c.codigoPon})` : '';
                        return `${c.producto?.nombre}${pon}: ${valor % 1 === 0 ? valor : valor.toFixed(1)} ${unidad}`;
                      }).join(', ');
                      lineas.push(`MATERIALES GASTADOS: ${items}`);
                    }

                    if ((esRetiro || esCambio) && orden.recojos?.length > 0) {
                      const items = orden.recojos.map(r => {
                        const pon = r.codigoPon ? ` (◈ ${r.codigoPon})` : '';
                        return `${r.nombreProducto || r.tipoEquipo || 'Equipo'}${pon}`;
                      }).join(', ');
                      lineas.push(`MATERIALES RECUPERADOS: ${items}`);
                    }

                   const texto = lineas.join(' // ');
                    navigator.clipboard.writeText(texto);
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 2000);
                  }}

                  onMouseEnter={e => { if (!copiado) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}}
                  onMouseLeave={e => { if (!copiado) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}}
                  style={{
                    width: '100%', padding: '11px 0',
                    background: copiado ? '#dcfce7' : '#f8fafc',
                    color:      copiado ? '#16a34a' : '#475569',
                    border:     `1px solid ${copiado ? '#86efac' : '#e2e8f0'}`,
                    borderRadius: 10,
                    fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: 7,
                    transition: 'all .3s',
                  }}
                >
                  {copiado ? '✓ Copiado' : <><Copy size={14}/> Copiar resumen</>}
                </button>
              </div>

              <div style={{ height: 8 }}/>
            </div>
          </>
        ) : null}
      </aside>
    </>,
    document.body
  );
}

    function IconBtn({ onClick, title, children }) {
      return (
        <button onClick={onClick} title={title} style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: '1px solid #e2e8f0',
          cursor: 'pointer', color: '#64748b', transition: 'all .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}>
          {children}
        </button>
      );
    }

    function Seccion({ titulo, children }) {
      return (
        <div style={{
          background: '#ffffff',
          margin: '10px 14px 0',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{titulo}</span>
          </div>
          <div style={{ padding: '0 16px' }}>{children}</div>
        </div>
      );
    }

    function FilaDato({ label, value, mono, onCopy, last }) {
      return (
        <div onClick={onCopy || undefined} style={{
          display: 'flex', alignItems: 'center',
          padding: '9px 0',
          borderBottom: last ? 'none' : '1px solid #f8fafc',
          cursor: onCopy ? 'pointer' : 'default',
          gap: 12,
        }}>
          <span style={{ fontSize: 12, color: '#94a3b8', minWidth: 80, flexShrink: 0 }}>
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
        </div>
  );
}