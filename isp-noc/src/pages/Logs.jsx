import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { logsApi } from '../services/api';
import { Badge, Spinner, Card, Empty } from '../components/ui';

const ACCION_COLOR = {
  LOGIN:                    'green',
  LOGIN_FALLIDO:            'red',
  LOGOUT:                   'gray',
  CERRAR_SESION_FORZADO: 'red',
  CREAR_USUARIO:            'blue',
  ACTUALIZAR_UBICACION_CONTRATO: 'blue',
  GUARDAR_WAN_CONTRATO:     'blue',
  PONER_WAN_NOC:            'blue',
  IMPORTAR_CONTRATOS_EXCEL: 'yellow',
  IMPORTAR_ORDENES_EXCEL:   'yellow',
};

const fmtFecha = (fecha) => {
  if (!fecha) return '—';
  const d = new Date(fecha);
  return d.toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

const ROL_COLOR = {
  SUPERADMIN:   'red',
  OPERADOR_NOC: 'blue',
  ADMIN:        'yellow',
  TECNICO:      'green',
  SECRETARIA:   'gray',
  GERENTE:      'blue',
};

function DetallesCell({ detalles }) {
  const [expandido, setExpandido] = React.useState(false);
  const texto = JSON.stringify(detalles, null, 2);
  const resumen = Object.entries(detalles)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ')
    .slice(0, 60);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--txt-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
          {resumen}{resumen.length >= 60 ? '…' : ''}
        </span>
        <button onClick={() => setExpandido(e => !e)} style={{
          flexShrink: 0, padding: '1px 6px', borderRadius: 4, fontSize: 10,
          border: '1px solid var(--border-2)', background: 'transparent',
          color: 'var(--txt-3)', cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
          {expandido ? 'cerrar' : 'ver'}
        </button>
      </div>
      {expandido && (
        <pre style={{
          marginTop: 6, padding: '8px 10px',
          background: 'var(--bg-3)', border: '1px solid var(--border)',
          borderRadius: 6, fontSize: 10, fontFamily: 'monospace',
          color: 'var(--txt-2)', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          maxWidth: 320, position: 'relative', zIndex: 10,
        }}>
          {texto}
        </pre>
      )}
    </div>
  );
}

export default function LogsPage() {
  const [page,      setPage]      = useState(1);
  const [accion,    setAccion]    = useState('');
  const [ip,        setIp]        = useState('');
  const [desde,     setDesde]     = useState('');
  const [hasta,     setHasta]     = useState('');

  const { data: stats } = useQuery({
    queryKey: ['logs-stats'],
    queryFn:  () => logsApi.stats().then(r => r.data),
    refetchInterval: 30000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['logs', page, accion, ip, desde, hasta],
    queryFn:  () => logsApi.listar({ page, limit: 15, accion, ip, desde, hasta }).then(r => r.data),
    keepPreviousData: true,
  });

  const logs       = data?.data        || [];
  const total      = data?.total       || 0;
  const totalPages = data?.totalPages  || 1;

  const inputStyle = {
    height: 34, padding: '0 10px',
    background: 'var(--bg-3)', border: '1px solid var(--border-2)',
    borderRadius: 7, color: 'var(--txt)', fontSize: 12, outline: 'none',
  };

  return (
    <div style={{ padding: 24 }} className="animate-fade">

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--txt)', letterSpacing: '-0.02em', marginBottom: 4 }}>
          Logs de Actividad
        </h1>
        <p style={{ fontSize: 13, color: 'var(--txt-3)' }}>
          Registro de acciones, conexiones e IPs del sistema
        </p>
      </div>

      {/* ── Stats cards ── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          <StatCard label="Acciones hoy"    value={stats.hoy.total}     color="#3B9FD4" />
          <StatCard label="Logins hoy"      value={stats.hoy.logins}    color="#16A34A" />
          <StatCard label="IPs únicas hoy"  value={stats.hoy.ipsUnicas} color="#D97706" />
          <StatCard label="IPs esta semana" value={stats.semana.ipsUnicas} color="#7C3AED" />
        </div>
      )}


      {/* ── Filtros ── */}
      <Card style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input style={{ ...inputStyle, width: 180 }} placeholder="Acción (ej: LOGIN)" value={accion} onChange={e => { setAccion(e.target.value); setPage(1); }} />
          <input style={{ ...inputStyle, width: 140 }} placeholder="IP" value={ip} onChange={e => { setIp(e.target.value); setPage(1); }} />
          <input style={{ ...inputStyle, width: 140 }} type="date" value={desde} onChange={e => { setDesde(e.target.value); setPage(1); }} />
          <input style={{ ...inputStyle, width: 140 }} type="date" value={hasta} onChange={e => { setHasta(e.target.value); setPage(1); }} />
          <button onClick={() => { setAccion(''); setIp(''); setDesde(''); setHasta(''); setPage(1); }}
            style={{ height: 34, padding: '0 14px', borderRadius: 7, border: '1px solid var(--border-2)', background: 'transparent', color: 'var(--txt-3)', fontSize: 12, cursor: 'pointer' }}>
            Limpiar
          </button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--txt-3)' }}>
            {total.toLocaleString()} registros
          </span>
        </div>
      </Card>

      {/* ── Tabla logs ── */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={28} /></div>
        ) : logs.length === 0 ? (
          <Empty icon="📋" title="Sin logs" subtitle="No hay registros para los filtros seleccionados" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-3)' }}>
                  {['Fecha', 'Usuario', 'Rol', 'Acción', 'IP', 'Detalles'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--txt-3)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id || i} style={{ borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--txt-3)', whiteSpace: 'nowrap' }}>
                      {fmtFecha(log.createdAt)}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {log.usuario ? (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--txt)' }}>
                            {log.usuario.nombre} {log.usuario.apellido}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>{log.usuario.email}</div>
                          {log.usuario.sede && (
                            <div style={{ fontSize: 10, color: 'var(--txt-3)' }}>{log.usuario.sede.nombre}</div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--txt-3)', fontStyle: 'italic', fontSize: 12 }}>Sistema</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {log.usuario?.rol && (
                        <Badge color={ROL_COLOR[log.usuario.rol] || 'gray'}>{log.usuario.rol}</Badge>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <Badge color={ACCION_COLOR[log.accion] || 'gray'}>{log.accion}</Badge>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--txt-2)' }}>
                      {log.ip || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--txt-3)', maxWidth: 220 }}>
                      {log.detalles ? (
                        <DetallesCell detalles={log.detalles} />
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>
              Página {page} de {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <PagBtn onClick={() => setPage(1)}       disabled={page <= 1}>«</PagBtn>
              <PagBtn onClick={() => setPage(p => p - 1)} disabled={page <= 1}>‹</PagBtn>
              <PagBtn onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>›</PagBtn>
              <PagBtn onClick={() => setPage(totalPages)} disabled={page >= totalPages}>»</PagBtn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, color: 'var(--txt-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: 'var(--font-display)' }}>{value ?? '—'}</div>
    </div>
  );
}

function PagBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 30, height: 30, borderRadius: 6,
      border: '1px solid var(--border)', background: 'transparent',
      color: 'var(--txt)', cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.4 : 1, fontSize: 14,
    }}>{children}</button>
  );
}