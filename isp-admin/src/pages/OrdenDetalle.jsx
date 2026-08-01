import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Phone, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ordenesApi, tecnicosApi, BACKEND_URL } from '../services/api';
import { Card, EstadoBadge, Btn, Select, Spinner, Modal, Avatar, TimerBadge } from '../components/ui';
import { fmtFecha, fmtFechaHora, fmtMinutos, TIPO_COLOR, waLink } from '../utils/helpers';
import { useTiposOrden } from '../hooks/useTiposOrden';

function InfoFila({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, color: 'var(--txt-3)', width: 100, flexShrink: 0, paddingTop: 1 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--txt)', fontWeight: 500, flex: 1 }}>{value || '—'}</div>
    </div>
  );
}

function FichaSeccion({ titulo, campos }) {
  const [copied, setCopied] = useState(false);
  const camposValidos = campos.filter(([, v]) => v != null && v !== '' && v !== undefined);

  const copiar = () => {
    const texto = camposValidos.map(([l, v]) => `${l}: ${v}`).join('\n');
    navigator.clipboard.writeText(texto).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  if (!camposValidos.length) return null;

  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: '0.06em' }}>{titulo}</span>
        <button
          onClick={copiar}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', background: 'none',
            border: `1px solid ${copied ? 'var(--green)' : 'var(--border-2)'}`,
            borderRadius: 6, cursor: 'pointer', fontSize: 11,
            color: copied ? 'var(--green)' : 'var(--txt-3)',
            transition: 'all 0.2s',
          }}
        >
          {copied ? '✓ Copiado' : '⧉ Copiar'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
        {camposValidos.map(([label, value]) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', padding: '3px 0' }}>
            <span style={{ fontSize: 10, color: 'var(--txt-3)', marginBottom: 1 }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)', fontFamily: 'monospace' }}>{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const CSS = `
  @media (max-width: 1080px) {
    .od-header-btns { flex-direction: column !important; width: 100%; }
    .od-header-btns select { width: 100% !important; }
    .od-header-btns button { width: 100% !important; justify-content: center; }
    .od-grid-main   { grid-template-columns: 1fr !important; }
    .od-grid-inst   { grid-template-columns: 1fr 1fr !important; }
    .od-inst-fotos  { grid-column: span 2 !important; }
  }
  @media (max-width: 600px) {
    .od-grid-inst  { grid-template-columns: 1fr !important; }
    .od-inst-fotos { grid-column: span 1 !important; }
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('od-responsive-css')) {
  const s = document.createElement('style');
  s.id = 'od-responsive-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Convierte cantidad en unidades a la representación para mostrar */
function formatCantidadConsumo(c) {
  if (c.producto.esMedible) {
    return { valor: Number(c.cantidad), unidad: 'm' }; // ya viene en metros, no reconvertir
  }
  return { valor: Number(c.cantidad), unidad: c.producto.unidad || 'und' };
}

export default function OrdenDetalle() {
  const { id }   = useParams();
  const { tipoLabel, esInternet: esInternetFn, esDeGrupo } = useTiposOrden();
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const [showFicha,   setShowFicha]   = useState(false);

  const { data: orden, isLoading } = useQuery({
    queryKey: ['orden', id],
    queryFn:  () => ordenesApi.obtener(id).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: tecnicos } = useQuery({
    queryKey: ['tecnicos-activos'],
    queryFn:  () => tecnicosApi.listar({ activo: true }).then(r => r.data),
  });

  const estadoMut = useMutation({
    mutationFn: (estado) => ordenesApi.cambiarEstado(id, estado),
    onSuccess:  () => { toast.success('Estado actualizado'); qc.invalidateQueries(['orden', id]); qc.invalidateQueries(['stats']); },
  });

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Spinner size={28} />
    </div>
  );
  if (!orden) return <div style={{ padding: 28, color: 'var(--txt-3)' }}>Orden no encontrada</div>;

  const esInternet = esInternetFn(orden.tipoOrden);
  const esDuo      = esDeGrupo(orden.tipoOrden, 'DUO');
  const tieneInternet = esInternet || esDuo;
  const inst       = orden.instalacion;
  const enCurso    = orden.estado === 'ACEPTADA' || orden.estado === 'EN_PROCESO';

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 28px)', maxWidth: 1000, margin: '0 auto' }} className="animate-fade">

      <button onClick={() => navigate('/ordenes')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--txt-3)', fontSize: 12, marginBottom: 20 }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--txt)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-3)'}>
        <ArrowLeft size={14} /> Volver a órdenes
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>Orden #{orden.nServicio}</h1>
            <EstadoBadge estado={orden.estado} />
            <span style={{ fontSize: 11, fontWeight: 600, color: TIPO_COLOR[orden.tipoOrden], background: TIPO_COLOR[orden.tipoOrden] + '15', padding: '3px 10px', borderRadius: 20 }}>
              {esDuo ? '📡📺' : esInternet ? '📡' : '📺'} {tipoLabel(orden.tipoOrden)}
            </span>
            {enCurso && orden.fechaAceptacion && <TimerBadge fechaAceptacion={orden.fechaAceptacion} completada={false} />}
            {orden.tiempoInstalacion && (
              <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>✓ {fmtMinutos(orden.tiempoInstalacion)}</span>
            )}
          </div>
          <p style={{ color: 'var(--txt-3)', fontSize: 12 }}>Creada {fmtFechaHora(orden.createdAt)}</p>
        </div>
        <div className="od-header-btns" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={orden.estado} onChange={e => estadoMut.mutate(e.target.value)}
            style={{ padding: '7px 12px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--txt)', fontSize: 12, outline: 'none' }}>
            {['PENDIENTE_NOC','PENDIENTE_TECNICO','ACEPTADA','EN_PROCESO','COMPLETADA','CANCELADA','REPROGRAMADA'].map(s => (
              <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline */}
      <Card style={{ marginBottom: 18, padding: '12px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', gap: 0 }}>
          {[
            { label: 'Creada',     fecha: orden.createdAt },
            ...(tieneInternet ? [{ label: 'WAN OK', fecha: orden.fechaWan }] : []),
            { label: 'Aceptada',   fecha: orden.fechaAceptacion },
            { label: 'En campo',   fecha: orden.fechaInicio },
            { label: 'Completada', fecha: orden.fechaFin },
          ].map((step, i, arr) => {
            const done = !!step.fecha;
            return (
              <React.Fragment key={step.label}>
                <div style={{ textAlign: 'center', minWidth: 80 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', margin: '0 auto 4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? 'var(--accent)' : 'var(--bg-3)',
                    border: `2px solid ${done ? 'var(--accent)' : 'var(--border-2)'}`,
                    fontSize: 11, color: done ? '#fff' : 'var(--txt-3)',
                  }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <div style={{ fontSize: 10, color: done ? 'var(--txt)' : 'var(--txt-3)', fontWeight: done ? 600 : 400 }}>{step.label}</div>
                  {step.fecha && <div style={{ fontSize: 9, color: 'var(--txt-3)', marginTop: 1 }}>{fmtFechaHora(step.fecha)}</div>}
                </div>
                {i < arr.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: done ? 'var(--accent)' : 'var(--border-2)', marginBottom: 20 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      <div className="od-grid-main" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Datos del cliente */}
        <Card>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', marginBottom: 10, letterSpacing: '0.06em' }}>DATOS DEL CLIENTE</h3>
          <InfoFila label="Abonado"    value={orden.abonado} />
          <InfoFila label="DNI"        value={orden.dni} />
          <InfoFila label="Contrato"   value={orden.contrato} />
          <InfoFila label="Fecha"      value={fmtFecha(orden.fechaServicio)} />
          <InfoFila label="Dirección"  value={orden.direccion} />
          <InfoFila label="Referencia" value={orden.referencia} />
          <InfoFila label="Sector"     value={orden.sector} />
          {(orden.plan?.nombre || orden.mbps) && (
              <InfoFila label="Plan" value={orden.plan?.nombre || `${orden.mbps} Mbps`} />
            )}
          {orden.observacion && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--yellow-bg)', borderRadius: 8, fontSize: 12, color: 'var(--yellow)', borderLeft: '3px solid var(--yellow)' }}>
              {orden.observacion}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {orden.celular && <>
              <a href={`tel:${orden.celular}`} style={{ flex: 1 }}>
                <Btn variant="ghost" size="sm" style={{ width: '100%', justifyContent: 'center' }} icon={<Phone size={13} />}>{orden.celular}</Btn>
              </a>
              <a href={waLink(orden.celular)} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                <Btn variant="success" size="sm" style={{ width: '100%', justifyContent: 'center' }} icon={<MessageCircle size={13} />}>WhatsApp</Btn>
              </a>
            </>}
          </div>
        </Card>

        {/* WAN + Técnico */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tieneInternet && (
            <Card>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', marginBottom: 10, letterSpacing: '0.06em' }}>WAN — NOC</h3>
              {orden.ipWan ? (
                <>
                  <InfoFila label="IP WAN"  value={orden.ipWan} />
                  <InfoFila label="Máscara" value={orden.mascara} />
                  <InfoFila label="Gateway" value={orden.gateway} />
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>✓ WAN lista para el técnico</div>
                </>
              ) : (
                <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--txt-3)', fontSize: 12 }}>
                  ⏳ Esperando que el NOC configure la WAN
                </div>
              )}
            </Card>
          )}

          <Card>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', marginBottom: 10, letterSpacing: '0.06em' }}>TÉCNICO</h3>
            {orden.tecnico ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar nombre={orden.tecnico.usuario.nombre} apellido={orden.tecnico.usuario.apellido} size={38} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{orden.tecnico.usuario.nombre} {orden.tecnico.usuario.apellido}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>{orden.tecnico.zonaAsignada || 'Sin zona'}</div>
                </div>
                {orden.tecnico.usuario.telefono && (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <a href={`tel:${orden.tecnico.usuario.telefono}`}>
                      <Btn variant="ghost" size="sm" icon={<Phone size={12} />} />
                    </a>
                    <a href={waLink(orden.tecnico.usuario.telefono)} target="_blank" rel="noreferrer">
                      <Btn variant="success" size="sm" icon={<MessageCircle size={12} />} />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--txt-3)', fontSize: 12 }}>
                🕓 Esperando que un técnico tome esta orden
              </div>
            )}
          </Card>
        </div>

        {/* Instalación */}
        {inst && (
          <Card style={{ gridColumn: '1 / -1', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: '0.06em' }}>REGISTRO DE INSTALACIÓN</h3>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <EstadoBadge estado={inst.completada ? 'COMPLETADA' : 'EN_PROCESO'} />
                {orden.tiempoInstalacion && (
                  <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>⏱ {fmtMinutos(orden.tiempoInstalacion)}</span>
                )}
                {inst.completada && (
                  <button
                    onClick={() => setShowFicha(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', background: 'none',
                      border: '1px solid var(--border-2)', borderRadius: 7,
                      cursor: 'pointer', color: 'var(--txt-3)', fontSize: 11,
                      fontFamily: 'inherit', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--txt)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--txt-3)'; }}
                  >
                    🗒 Ver ficha completa
                  </button>
                )}
              </div>
            </div>
            <div className="od-grid-inst" style={{ display: 'grid', gridTemplateColumns: tieneInternet ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)' }}>

              {/* GPS */}
              <div style={{ padding: '14px 16px', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--txt-3)', letterSpacing: '0.06em', marginBottom: 8 }}>GPS</div>
                {inst.latitud ? (
                  <>
                    <div style={{ fontSize: 12, color: 'var(--txt-2)', marginBottom: 6 }}>
                      {inst.latitud.toFixed(5)}, {inst.longitud.toFixed(5)}
                    </div>
                    <a href={`https://maps.google.com/?q=${inst.latitud},${inst.longitud}`} target="_blank" rel="noreferrer">
                      <Btn variant="ghost" size="sm">Ver mapa</Btn>
                    </a>
                  </>
                ) : <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>Sin GPS</span>}
              </div>

              {/* Config ONU */}
              {tieneInternet && (
                <div style={{ padding: '14px 16px', borderRight: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--txt-3)', letterSpacing: '0.06em', marginBottom: 8 }}>SEÑAL ONU</div>
                  {inst.configOnu ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12 }}>
                      {inst.configOnu.serialNumber && <div>SN: <strong>{inst.configOnu.serialNumber}</strong></div>}
                      {inst.configOnu.potenciaRx && (
                        <div>RX: <strong style={{ color: inst.configOnu.potenciaRx > -25 ? 'var(--green)' : 'var(--red)' }}>
                          {inst.configOnu.potenciaRx} dBm
                        </strong></div>
                      )}
                      {inst.configOnu.potenciaTx && <div>TX: <strong>{inst.configOnu.potenciaTx} dBm</strong></div>}
                      {inst.configOnu.ssid && <div style={{ color: 'var(--txt-3)', marginTop: 2 }}>WiFi: {inst.configOnu.ssid}</div>}
                    </div>
                  ) : <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>Sin config</span>}
                </div>
              )}

              {/* Fotos */}
              <div className="od-inst-fotos" style={{ padding: '14px 16px', gridColumn: 'span 2' }}>
                <div style={{ fontSize: 10, color: 'var(--txt-3)', letterSpacing: '0.06em', marginBottom: 8 }}>
                  FOTOS ({inst.fotos?.length || 0})
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(inst.fotos || []).map(f => {
                    const fotoUrl = f.url.startsWith('http') ? f.url : `${BACKEND_URL}${f.url}`;
                    return (
                      <a key={f.id} href={fotoUrl} target="_blank" rel="noreferrer">
                        <div style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--border)', overflow: 'hidden', position: 'relative' }}>
                          <img src={fotoUrl} alt={f.tipo}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}/>
                          <div style={{
                            display: 'none', position: 'absolute', inset: 0,
                            alignItems: 'center', justifyContent: 'center',
                            flexDirection: 'column', gap: 3,
                            background: 'var(--bg-3)',
                          }}>
                            <span style={{ fontSize: 18 }}>📷</span>
                            <span style={{ fontSize: 9, color: 'var(--txt-3)', textAlign: 'center', padding: '0 4px' }}>{f.tipo}</span>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                  {(inst.fotos?.length || 0) === 0 && <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>Sin fotos</span>}
                </div>
              </div>

            </div>
          </Card>
        )}
      </div>

      {/* Modal ficha completa */}
      {inst && (
        <Modal open={showFicha} onClose={() => setShowFicha(false)} title={`Ficha completa — Orden #${orden.nServicio}`} width={560}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>

            <FichaSeccion
              titulo="ORDEN"
              campos={[
                ['N° Orden',          orden.nServicio],
                ['Tipo',              tipoLabel(orden.tipoOrden)],
                ['Estado',            orden.estado?.replace(/_/g, ' ')],
                ['Fecha servicio',    fmtFecha(orden.fechaServicio)],
                ['Fecha creación',    fmtFechaHora(orden.createdAt)],
                ['Tiempo instalación',orden.tiempoInstalacion ? fmtMinutos(orden.tiempoInstalacion) : null],
              ]}
            />

            <FichaSeccion
              titulo="CLIENTE"
              campos={[
                ['Abonado',    orden.abonado],
                ['DNI',        orden.dni],
                ['Contrato',   orden.contrato],
                ['Celular',    orden.celular],
                ['Dirección',  orden.direccion],
                ['Referencia', orden.referencia],
                ['Sector',     orden.sector],
                ['Plan', orden.plan?.nombre || (orden.mbps ? `${orden.mbps} Mbps` : null)],
                ['Observación',orden.observacion],
              ]}
            />

            {tieneInternet && (
              <FichaSeccion
                titulo="WAN"
                campos={[
                  ['IP WAN',  orden.ipWan],
                  ['Máscara', orden.mascara],
                  ['Gateway', orden.gateway],
                ]}
              />
            )}

            {orden.tecnico && (
              <FichaSeccion
                titulo="TÉCNICO"
                campos={[
                  ['Técnico',      `${orden.tecnico.usuario.nombre} ${orden.tecnico.usuario.apellido}`],
                  ['Teléfono',     orden.tecnico.usuario.telefono],
                  ['Zona',         orden.tecnico.zonaAsignada],
                  ['Observación',  inst.observaciones],
                ]}
              />
            )}

            <FichaSeccion
              titulo="INSTALACIÓN / ONU"
              campos={[
                ['GPS Latitud',    inst.latitud],
                ['GPS Longitud',   inst.longitud],
                ...(tieneInternet ? [
                  ['WiFi SSID',      inst.configOnu?.ssid],
                  ['N° Serie ONU',   inst.configOnu?.serialNumber],
                  ['RX (dBm)',       inst.configOnu?.potenciaRx],
                  ['TX (dBm)',       inst.configOnu?.potenciaTx],
                  ['Temperatura (°C)', inst.configOnu?.temperatura],
                ] : []),
              ]}
            />

            <FichaSeccion
              titulo="FECHAS"
              campos={[
                ['Fecha aceptación', fmtFechaHora(orden.fechaAceptacion)],
                ['Fecha inicio',     fmtFechaHora(orden.fechaInicio)],
                ['Fecha fin',        fmtFechaHora(orden.fechaFin)],
              ]}
            />

            {/* Materiales utilizados — solo para no-retiros */}
                {(orden.consumos?.length > 0) && 
                !orden.tipoOrden?.includes('RETIRO') && 
                !orden.tipoOrden?.includes('BAJA') && (
                <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: '0.06em' }}>
                      {orden.tipoOrden?.includes('RETIRO') || orden.tipoOrden?.includes('BAJA') 
                        ? 'EQUIPOS RECUPERADOS' 
                        : 'MATERIALES UTILIZADOS'}
                    </span>
                  <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>{orden.consumos.length} item{orden.consumos.length !== 1 ? 's' : ''}</span>
                
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {orden.consumos.map((c, i) => {
                    const { valor, unidad } = formatCantidadConsumo(c);
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', background: 'var(--bg-3)',
                        borderRadius: 8, border: '1px solid var(--border)',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{c.producto.nombre}</div>
                          {c.producto.codigo && (
                            <div style={{ fontSize: 11, color: 'var(--txt-3)', fontFamily: 'monospace' }}>{c.producto.codigo}</div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--orange, #E67E22)' }}>
                            -{valor % 1 === 0 ? valor : valor.toFixed(1)} {unidad}
                          </div>
                          {c.motivo && c.motivo !== 'SERVICIO' && (
                            <div style={{ fontSize: 10, color: 'var(--txt-3)' }}>{c.motivo}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 10px', borderTop: '1px solid var(--border)', marginTop: 2,
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>Total materiales</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)' }}>
                      {orden.consumos.length} item{orden.consumos.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {(!orden.consumos || orden.consumos.length === 0) && 
              !orden.tipoOrden?.includes('RETIRO') && 
              !orden.tipoOrden?.includes('BAJA') && (
                <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                    MATERIALES UTILIZADOS
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>Sin materiales registrados</span>
                </div>
              )}

            {/* Equipos recuperados — retiros y cambio de equipo */}
{(orden.tipoOrden?.includes('RETIRO') || orden.tipoOrden?.includes('BAJA') || orden.tipoOrden?.includes('CAMBIO_EQUIPO')) && (
                <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: '0.06em' }}>
                      EQUIPOS RECUPERADOS
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>
                      {(orden.recojos?.length || 0)} equipo{(orden.recojos?.length || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {(orden.recojos?.length || 0) === 0 ? (
                    <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>Sin equipos registrados</span>
                  ) : (orden.recojos || []).map((r, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', background: 'var(--bg-3)',
                      borderRadius: 8, border: '1px solid var(--border)', marginBottom: 6,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>
                          {r.nombreProducto || r.tipoEquipo || 'Equipo'}
                        </div>
                        {r.codigoPon && (
                          <div style={{ fontSize: 11, color: '#7c3aed', fontFamily: 'monospace', fontWeight: 600 }}>
                            ◈ {r.codigoPon}
                          </div>
                        )}
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                        background: r.estado === 'en_mano' ? '#FEF3C7' : '#DCFCE7',
                        color: r.estado === 'en_mano' ? '#92400E' : '#166534',
                      }}>
                        {r.estado === 'en_mano' ? 'En mano' : r.estado}
                      </span>
                    </div>
                  ))}
                </div>
              )}

          </div>
        </Modal>
      )}

    </div>
  );
}