import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Wifi, Pencil, RefreshCw, CheckCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ordenesApi } from '../services/api';
import { withSede } from '../utils/helpers';
import { useAuthStore } from '../store/auth.store';
import { Card, Btn, Empty, Spinner } from '../components/ui';
import { fmtFecha, TIPO_COLOR, parsearTextoManual } from '../utils/helpers';
import { useTiposOrden } from '../hooks/useTiposOrden';
import Drawer from '../components/ui/DrawerOrdenNoc';


const TIPOS_NOC_OPCIONAL = ['RECONEXION_I'];

const TIPOS_NOC_COMPLETA = [
  'CORTE_DEUDA_I', 'CORTE_SOLICITUD_I',
  'CAMBIO_TITULAR_I', 'CAMBIO_PLAN_I', 'CAMBIO_CONTRASENA_I',
  'ALTA_SERVICIO_I', 'BAJA_SERVICIO_I', 'ATENCION_NOC_I',
  'CORTE_DEUDA_D', 'CORTE_SOLICITUD_D',
  'CAMBIO_TITULAR_D', 'CAMBIO_PLAN_D',
  'ALTA_SERVICIO_D', 'BAJA_SERVICIO_D',
];



function useIsMobile(breakpoint = 1110) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}

function DrawerWan({ open, onClose, orden, tiposTecnico, tipoLabelFn }) {  const qc = useQueryClient();
  const [copiado, setCopiado] = useState(false);
  const [editandoDatos, setEditandoDatos] = useState(false);
  const [mostrarPegar,  setMostrarPegar]  = useState(false);

  const [datos, setDatos] = useState({
    abonado: '', contrato: '', celular: '', direccion: '',
    referencia: '', sector: '', tipoOrden: 'INSTALACION_I', observacion: '',
  });
  const setD = (k, v) => setDatos(p => ({ ...p, [k]: v }));

  const [textoPegado,    setTextoPegado]    = useState('');
  const [parsedPreview,  setParsedPreview]  = useState(null);

  const [wan, setWan] = useState({ ipWan: '', mascara: '255.255.255.0', gateway: '' });
  const setW = (k, v) => setWan(p => ({ ...p, [k]: v }));
  const [erroresWan, setErroresWan] = useState({});
  const esEdicion = !!orden?.ipWan;

  React.useEffect(() => {
    if (open && orden) {
      setDatos({
        abonado: orden.abonado || '', contrato: orden.contrato || '',
        celular: orden.celular || '', direccion: orden.direccion || '',
        referencia: orden.referencia || '', sector: orden.sector || '',
        tipoOrden: orden.tipoOrden || 'INSTALACION_I', observacion: orden.observacion || '',
      });
      setWan({ ipWan: orden.ipWan || '', mascara: orden.mascara || '255.255.255.0', gateway: orden.gateway || '' });
      setTextoPegado('');
      setParsedPreview(null);
      setErroresWan({});
      setEditandoDatos(false);
      setMostrarPegar(false);
    }
  }, [open, orden]);

  const mutActualizar = useMutation({
    mutationFn: () => {
      const cambios = {};
      if (datos.abonado     !== orden.abonado)     cambios.abonado     = datos.abonado;
      if (datos.contrato    !== orden.contrato)    cambios.contrato    = datos.contrato;
      if (datos.celular     !== orden.celular)     cambios.celular     = datos.celular;
      if (datos.direccion   !== orden.direccion)   cambios.direccion   = datos.direccion;
      if (datos.referencia  !== orden.referencia)  cambios.referencia  = datos.referencia;
      if (datos.sector      !== orden.sector)      cambios.sector      = datos.sector;
      if (datos.tipoOrden   !== orden.tipoOrden)   cambios.tipoOrden   = datos.tipoOrden;
      if (datos.observacion !== orden.observacion) cambios.observacion = datos.observacion;
      return ordenesApi.ponerWan(orden.id, {
        ...wan,
        ...(Object.keys(cambios).length > 0 && { datos: cambios }),
      });
    },
    onSuccess: () => {
      toast.success(`✓ WAN ${esEdicion ? 'corregida' : 'configurada'} — ${datos.abonado}`);
      qc.invalidateQueries(['noc-pendientes-wan']);
      qc.invalidateQueries(['noc-configuradas']);
      qc.invalidateQueries(['noc-stats']);
      onClose();
    },
    onError: e => toast.error(e.response?.data?.error || 'Error al guardar'),
  });

  const validarIp = ip => /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
  const handleConfirmar = () => {
    const e = {};
    if (!wan.ipWan   || !validarIp(wan.ipWan))   e.ipWan   = 'IP inválida';
    if (!wan.mascara || !validarIp(wan.mascara)) e.mascara = 'Máscara inválida';
    if (!wan.gateway || !validarIp(wan.gateway)) e.gateway = 'Gateway inválido';
    if (Object.keys(e).length) { setErroresWan(e); return; }
    setErroresWan({});
    mutActualizar.mutate();
  };

  if (!orden) return null;

  const tipoColor = TIPO_COLOR[orden.tipoOrden] || '#666';
  const tipoLabel = tipoLabelFn ? tipoLabelFn(orden.tipoOrden) : orden.tipoOrden;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      accentColor={tipoColor}
      width={500}
      header={
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'monospace', fontWeight: 800,
              fontSize: 16, color: '#3b9fd4',
            }}>
              #{orden.nServicio}
            </span>
            
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: tipoColor,
              background: (tipoColor || '#3b9fd4') + '15',
              padding: '2px 8px', borderRadius: 20,
            }}>
              {tipoLabel}
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
            {datos.abonado || 'Sin nombre'}
          </div>
          {orden.fechaServicio && (
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              {fmtFecha(orden.fechaServicio)}
            </div>
          )}
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* ── Datos del cliente — tarjeta estilo admin ── */}
        <section>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            {/* Header de la tarjeta */}
            <div style={{
              padding: '10px 16px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Datos del cliente</span>
              {!editandoDatos ? (
                <button onClick={() => setEditandoDatos(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 9px', borderRadius: 6,
                    background: '#ffffff', border: '1px solid #e2e8f0',
                  cursor: 'pointer', fontSize: 11, color: '#475569', fontWeight: 600,
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#3b9fd4'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                  <Pencil size={10}/> Editar
                </button>
              ) : (
                <button onClick={() => {
                  // Cancelar: volver a los datos originales
                  setDatos({
                    abonado: orden.abonado || '', contrato: orden.contrato || '',
                    celular: orden.celular || '', direccion: orden.direccion || '',
                    referencia: orden.referencia || '', sector: orden.sector || '',
                    tipoOrden: orden.tipoOrden || 'INSTALACION_I', observacion: orden.observacion || '',
                  });
                  setEditandoDatos(false);
                }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 9px', borderRadius: 6,
                    background: '#ffffff', border: '1px solid #e2e8f0',
                  cursor: 'pointer', fontSize: 11, color: '#94a3b8', fontWeight: 600,
                    fontFamily: 'inherit',
                  }}>
                  <X size={10}/> Cancelar
                </button>
              )}
            </div>

            {!editandoDatos ? (
              /* Vista solo lectura — filas estilo admin */
              <div style={{ padding: '0 16px' }}>
                <FilaLectura label="Abonado" value={datos.abonado || '—'} bold />
                {datos.contrato   && <FilaLectura label="Contrato"   value={datos.contrato} mono />}
                {datos.celular    && <FilaLectura label="Celular"    value={datos.celular} mono />}
                <FilaLectura label="Dirección" value={datos.direccion || '—'} />
                {datos.referencia && <FilaLectura label="Referencia" value={datos.referencia} />}
                {datos.sector     && <FilaLectura label="Sector"     value={datos.sector} />}
                {orden.mbps       && <FilaLectura label="Plan"       value={`${orden.mbps} Mbps`} bold color="#2563eb" last />}

                {datos.observacion && (
                  <div style={{
                    margin: '8px 0 12px', padding: '8px 12px',
                    background: '#fffbeb', borderRadius: 8,
                    border: '1px solid #fde68a',
                    fontSize: 12, color: '#92400e',
                  }}>
                    ⚠ {datos.observacion}
                  </div>
                )}
              </div>
            ) : (
              /* Vista editable */
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="Abonado">
                  <input
                    value={datos.abonado}
                    onChange={e => setD('abonado', e.target.value.toUpperCase())}
                    style={inputStyle}
                    placeholder="NOMBRE APELLIDO"
                  />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Contrato">
                    <input value={datos.contrato} onChange={e => setD('contrato', e.target.value)} style={inputStyle} placeholder="C00000000000" />
                  </Field>
                  <Field label="Celular">
                    <input value={datos.celular} onChange={e => setD('celular', e.target.value)} style={inputStyle} placeholder="9XXXXXXXX" />
                  </Field>
                </div>
                <Field label="Dirección">
                  <input value={datos.direccion} onChange={e => setD('direccion', e.target.value)} style={inputStyle} />
                </Field>
                <Field label="Referencia">
                  <input value={datos.referencia} onChange={e => setD('referencia', e.target.value)} style={inputStyle} placeholder="Cerca al parque..." />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Zona / Sector">
                    <input value={datos.sector} onChange={e => setD('sector', e.target.value)} style={inputStyle} placeholder="ZONA 11" />
                  </Field>
                  <Field label="Tipo de orden">
                    <select value={datos.tipoOrden} onChange={e => setD('tipoOrden', e.target.value)} style={inputStyle}>
                      {tiposTecnico.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>
              </div>
            )}
          </div>
        </section>

         {/* ── Línea de copia rápida: NOMBRE - CONTRATO ── */}
        {(datos.abonado || datos.contrato) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 8,
          }}>
            <span style={{
              flex: 1, fontSize: 12, fontWeight: 600,
              color: '#0f172a', fontFamily: 'monospace',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {[datos.abonado, datos.contrato, orden.mbps ? `${orden.mbps} Mbps` : null].filter(Boolean).join(' - ')}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  [datos.abonado, datos.contrato, orden.mbps ? `${orden.mbps} Mbps` : null].filter(Boolean).join(' - ')
                ).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000); });
              }}
              style={{
                padding: '5px 11px', borderRadius: 6, cursor: 'pointer',
                background: copiado ? '#dcfce7' : '#ffffff',
                border: copiado ? '1px solid #86efac' : '1px solid #e2e8f0',
                color: copiado ? '#16a34a' : '#475569',
                fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 4,
                transition: 'all .15s',
              }}
              onMouseEnter={e => { if (!copiado) e.currentTarget.style.borderColor = '#3b9fd4'; }}
              onMouseLeave={e => { if (!copiado) e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >
              {copiado ? '✓ Copiado' : '📋 Copiar'}
            </button>
          </div>
        )}

        <Divider />

         {/* ── Datos WAN — tarjeta estilo admin ── */}
        <section>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            {/* Header de la tarjeta */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Datos de conexión WAN</span>
            </div>

            <div style={{ padding: '12px 16px' }}>
              {esEdicion && orden.ipWan && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: '#dc2626', marginBottom: 2, fontWeight: 600 }}>WAN actual — será reemplazada</div>
                  <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>
                    {orden.ipWan} / {orden.mascara} → {orden.gateway}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="IP WAN *" error={erroresWan.ipWan}>
                  <input
                    value={wan.ipWan}
                    onChange={e => setW('ipWan', e.target.value)}
                    style={{ ...inputStyle, ...(erroresWan.ipWan ? { borderColor: '#dc2626' } : {}) }}
                    placeholder="200.x.x.x"
                    autoFocus
                  />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Máscara *" error={erroresWan.mascara}>
                    <input
                      value={wan.mascara}
                      onChange={e => setW('mascara', e.target.value)}
                      style={{ ...inputStyle, ...(erroresWan.mascara ? { borderColor: '#dc2626' } : {}) }}
                      placeholder="255.255.255.0"
                    />
                  </Field>
                  <Field label="Gateway *" error={erroresWan.gateway}>
                    <input
                      value={wan.gateway}
                      onChange={e => setW('gateway', e.target.value)}
                      style={{ ...inputStyle, ...(erroresWan.gateway ? { borderColor: '#dc2626' } : {}) }}
                      placeholder="200.x.x.1"
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Botón principal */}
        <button
          onClick={handleConfirmar}
          disabled={mutActualizar.isPending || !datos.abonado}
          style={{
            padding: '13px 20px', borderRadius: 10,
            cursor: (mutActualizar.isPending || !datos.abonado) ? 'not-allowed' : 'pointer',
            background: (mutActualizar.isPending || !datos.abonado)
              ? '#e2e8f0'
              : 'linear-gradient(135deg, #1E3A8A, #3B9FD4)',
            color: (mutActualizar.isPending || !datos.abonado) ? '#94a3b8' : '#fff',
            fontSize: 13, fontWeight: 700, border: 'none',
            fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'opacity .15s',
            opacity: mutActualizar.isPending ? 0.7 : 1,
          }}
          onMouseEnter={e => { if (!mutActualizar.isPending && datos.abonado) e.currentTarget.style.opacity = '0.88'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          <CheckCircle size={15} />
          {mutActualizar.isPending
            ? 'Guardando...'
            : esEdicion ? 'Guardar corrección' : 'Confirmar y enviar al técnico'}
        </button>

      </div>
    </Drawer>
  );
}

function DrawerNocCompletar({ open, onClose, orden, tipoLabelFn }) {
  const qc = useQueryClient();
  const [comentario, setComentario] = useState('');

  React.useEffect(() => {
    if (open) setComentario(orden?.observacion || '');
  }, [open, orden]);

  const mut = useMutation({
    mutationFn: () => ordenesApi.nocCompletar(orden.id, comentario),
    onSuccess: () => {
      toast.success(`✓ Orden #${orden.nServicio} completada`);
      qc.invalidateQueries(['noc-pendientes-completar']);
      qc.invalidateQueries(['noc-stats']);
      onClose();
    },
    onError: e => toast.error(e.response?.data?.error || 'Error al completar'),
  });

  if (!orden) return null;

  const tipoColor = TIPO_COLOR[orden.tipoOrden] || '#666';
  const tipoLabel = tipoLabelFn ? tipoLabelFn(orden.tipoOrden) : orden.tipoOrden;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      accentColor={tipoColor}
      width={500}
      header={
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'monospace', fontWeight: 800,
              fontSize: 16, color: '#3b9fd4',
            }}>
              #{orden.nServicio}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: tipoColor,
              background: (tipoColor || '#3b9fd4') + '15',
              padding: '2px 8px', borderRadius: 20,
            }}>
              {tipoLabel}
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
            {orden.abonado || 'Sin nombre'}
          </div>
          {orden.fechaServicio && (
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              {fmtFecha(orden.fechaServicio)}
            </div>
          )}
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        <div style={{ background: '#ffffff', borderRadius: 10, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>{orden.abonado}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: tipoColor + '20', color: tipoColor, border: `1px solid ${tipoColor}35` }}>
              {tipoLabel}
            </span>
            {orden.contrato && <span style={{ fontSize: 11, color: '#94a3b8', alignSelf: 'center', fontFamily: 'monospace' }}>{orden.contrato}</span>}
          </div>
          {orden.direccion && <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>📍 {orden.direccion}</div>}
          {orden.celular   && <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{orden.celular}</div>}
        </div>

<div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, color: '#16a34a' }}>          ✓ Esta orden se completará directamente desde el NOC sin pasar por el técnico.
        </div>

        <Field label="Comentario (opcional)">
          <textarea
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="Ej: Corte aplicado por deuda vencida..."
            style={{ ...inputStyle, resize: 'vertical', height: 90, width: '100%', boxSizing: 'border-box' }}
          />
        </Field>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '11px', borderRadius: 9, cursor: 'pointer',
            background: '#ffffff', color: '#475569', fontSize: 13, fontWeight: 600,
            border: '1px solid #e2e8f0', transition: 'border-color .15s',
            fontFamily: 'inherit',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#94a3b8'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
            Cancelar
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            style={{
              flex: 2, padding: '11px', borderRadius: 9,
              cursor: mut.isPending ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg,#15803d,#16a34a)', color: '#fff',
              fontSize: 13, fontWeight: 700, border: 'none',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,opacity: mut.isPending ? 0.7 : 1, transition: 'opacity .15s',
            }}
          >
            <CheckCheck size={14} />
            {mut.isPending ? 'Completando...' : 'Completar orden'}
          </button>
        </div>
      </div>
    </Drawer>
  );
}

const inputStyle = {
  width: '100%', padding: '9px 12px',
  background: '#f8fafc', border: '1px solid #e2e8f0',
  borderRadius: 8, color: '#0f172a', fontSize: 13, outline: 'none',
  transition: 'border-color .15s', boxSizing: 'border-box',
  fontFamily: 'inherit',
};

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {children}
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: error ? '#dc2626' : '#64748b', display: 'block', marginBottom: 5, fontWeight: 500 }}>
        {label}
      </label>
      {children}
      {error && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 3 }}>{error}</div>}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: '#e2e8f0' }} />;
}

function FilaLectura({ label, value, mono, bold, color, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '9px 0',
      borderBottom: last ? 'none' : '1px solid #f1f5f9',
      gap: 12,
    }}>
      <span style={{ fontSize: 12, color: '#94a3b8', minWidth: 80, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{
        flex: 1, fontSize: 13,
        color: color || '#0f172a',
        fontWeight: bold ? 700 : 500,
        fontFamily: mono ? 'monospace' : 'inherit',
        wordBreak: 'break-word',
      }}>
        {value}
      </span>
    </div>
  );
}

function TecnicoCell({ tecnico, compact }) {
  if (!tecnico) {
    return <span style={{ fontSize: 11, color: 'var(--txt-3)', fontStyle: 'italic' }}>—</span>;
  }
  const { nombre, apellido } = tecnico.usuario;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
        {nombre[0]}{apellido[0]}
      </div>
      {!compact && (
        <span style={{ fontSize: 12, color: 'var(--txt-2)' }}>{nombre} {apellido}</span>
      )}
    </div>
  );
}

function TipoBadge({ tipoOrden, pulse, tipoLabelFn }) {
  const color = TIPO_COLOR[tipoOrden] || '#768999';
  const label = tipoLabelFn ? tipoLabelFn(tipoOrden) : tipoOrden;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 9px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: color + '15', color, letterSpacing: '0.04em',
      fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%', background: color,
        animation: pulse ? 'pulse 1.5s ease-in-out infinite' : 'none',
      }} />
      {label}
    </span>
  );
}

function AccionesOrden({ orden, origen, onConfigurarWan, onCompletarNoc, full }) {
  const esNocDirecto = origen === 'noc';
  const esOpcional   = TIPOS_NOC_OPCIONAL.includes(orden.tipoOrden);

  const btnPrimary = {
    padding: '7px 14px', borderRadius: 7, cursor: 'pointer',
    background: 'linear-gradient(135deg,#1E3A8A,#3B9FD4)', color: '#fff',
    fontSize: 12, fontWeight: 600, border: 'none',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    transition: 'opacity .15s', ...(full ? { flex: 1 } : {}),
  };
  const btnGreen = {
    padding: '7px 14px', borderRadius: 7, cursor: 'pointer',
    background: 'linear-gradient(135deg,#15803d,#16a34a)', color: '#fff',
    fontSize: 12, fontWeight: 600, border: 'none',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    transition: 'opacity .15s', ...(full ? { flex: 1 } : {}),
  };
  const btnGreenGhost = {
    padding: '7px 12px', borderRadius: 7, cursor: 'pointer',
    background: 'transparent', color: '#16a34a',
    fontSize: 12, fontWeight: 600, border: '1px solid rgba(22,163,74,0.4)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    transition: 'all .15s', ...(full ? { flex: 1 } : {}),
  };

  if (esNocDirecto) {
    return (
      <button onClick={() => onCompletarNoc(orden)} style={btnGreen}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
        <CheckCheck size={12} /> Completar
      </button>
    );
  }

  if (esOpcional) {
    return (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', ...(full ? { width: '100%' } : {}) }}>
        <button onClick={() => onConfigurarWan(orden)} style={btnPrimary}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
          <Wifi size={11} /> WAN
        </button>
        <button onClick={() => onCompletarNoc(orden)} style={btnGreenGhost}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(22,163,74,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
          <CheckCheck size={11} /> NOC
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => onConfigurarWan(orden)} style={btnPrimary}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
      <Wifi size={12} /> Configurar
    </button>
  );
}

// ── Tarjeta móvil — Pendiente ─────────────────────────────────
function OrdenCard({ orden, origen, onConfigurarWan, onCompletarNoc, tipoLabelFn }) {
  const o = orden;
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--accent)' }}>
          #{o.nServicio}
        </span>
        <TipoBadge tipoOrden={o.tipoOrden} tipoLabelFn={tipoLabelFn} pulse />
      </div>

      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {o.abonado || <span style={{ color: 'var(--yellow)', fontStyle: 'italic', fontWeight: 400 }}>Sin nombre</span>}
      </div>

      {o.direccion && (
        <div style={{ fontSize: 12, color: 'var(--txt-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
          {o.direccion}
        </div>
      )}
      {(o.referencia || o.sector) && (
        <div style={{ fontSize: 11, color: 'var(--txt-3)', marginBottom: 6 }}>
          {[o.sector, o.referencia && `Ref: ${o.referencia}`].filter(Boolean).join(' · ')}
        </div>
      )}

      <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--txt-3)', fontFamily: 'var(--font-display)', marginBottom: 8 }}>
        {o.contrato && <span>{o.contrato}</span>}
        {o.celular  && <span>📱 {o.celular}</span>}
      </div>

      {/* ── Sede ── */}
      {o.sede && (
        <div style={{ fontSize: 11, color: 'var(--txt-3)', marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>📍</span>
          <span>{o.sede.nombre}</span>
        </div>
      )}

      {o.tecnico && (
        <div style={{ marginBottom: 10 }}>
          <TecnicoCell tecnico={o.tecnico} />
        </div>
      )}

      {o.mbps && (
        <div style={{ fontSize: 12, color: '#2563EB', fontWeight: 700, marginBottom: 6 }}>
          📶 {o.mbps} Mbps
        </div>
      )}

      {o.observacion && (
        <div style={{ fontSize: 11, color: 'var(--yellow)', marginBottom: 10 }}>
          ⚠ {o.observacion.slice(0, 60)}{o.observacion.length > 60 ? '…' : ''}
        </div>
      )}

      <AccionesOrden
        orden={o}
        origen={origen}
        onConfigurarWan={onConfigurarWan}
        onCompletarNoc={onCompletarNoc}
        full
      />
    </div>
  );
}

// ── Tarjeta móvil — Configurada ───────────────────────────────
function ConfiguradaCard({ orden, onEditarWan, tipoLabelFn }) {
  const o = orden;
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: '#3B9FD4' }}>
          #{o.nServicio}
        </span>
        <TipoBadge tipoOrden={o.tipoOrden} tipoLabelFn={tipoLabelFn} />
      </div>

      <div style={{ fontWeight: 600, marginBottom: 4 }}>{o.abonado}</div>

      {o.direccion && (
        <div style={{ fontSize: 12, color: 'var(--txt-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
          {o.direccion}
        </div>
      )}
      {o.sector && (
        <div style={{ fontSize: 11, color: 'var(--txt-3)', marginBottom: 6 }}>{o.sector}</div>
      )}

      {/* ── Sede ── */}
      {o.sede && (
        <div style={{ fontSize: 11, color: 'var(--txt-3)', marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>📍</span>
          <span>{o.sede.nombre}</span>
        </div>
      )}

      {o.ipWan && (
        <div style={{ fontFamily: 'monospace', fontSize: 12, marginBottom: 8 }}>
          <span style={{ color: '#3B9FD4', fontWeight: 600 }}>{o.ipWan}</span>
          <span style={{ color: 'var(--txt-3)', fontSize: 11 }}> · {o.mascara} · GW {o.gateway}</span>
        </div>
      )}

      {o.tecnico && (
        <div style={{ marginBottom: 10 }}>
          <TecnicoCell tecnico={o.tecnico} />
        </div>
      )}

      <button onClick={() => onEditarWan(o)}
        style={{ width: '100%', padding: '8px 14px', borderRadius: 7, cursor: 'pointer', background: 'transparent', color: '#3B9FD4', fontSize: 12, fontWeight: 600, border: '1px solid rgba(59,159,212,0.35)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all .15s' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,159,212,0.1)'; e.currentTarget.style.borderColor = 'rgba(59,159,212,0.7)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(59,159,212,0.35)'; }}>
        <Pencil size={12} /> Editar WAN
      </button>
    </div>
  );
}

const thStyle = {
  padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.06em',
  borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
};
const tdStyle = {
  padding: '11px 14px', fontSize: 13, color: 'var(--txt)',
  borderBottom: '1px solid var(--border)', verticalAlign: 'middle',
};

// ── Tabla desktop — Pendientes ────────────────────────────────
function TablaPendientes({ filas, onConfigurarWan, onCompletarNoc, tipoLabelFn }) {
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--bg-3)' }}>
            <th style={thStyle}>Orden</th>
            <th style={thStyle}>Contrato</th>
            <th style={thStyle}>Abonado</th>
            <th style={thStyle}>Dirección</th>
            <th style={thStyle}>Sede</th>
            <th style={thStyle}>Tipo</th>
            <th style={thStyle}>Técnico</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Acción</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((o, i) => {
            const isLast = i === filas.length - 1;
            const rowTd = { ...tdStyle, borderBottom: isLast ? 'none' : tdStyle.borderBottom };
            return (
              <tr key={o.id}
                style={{ transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                <td style={rowTd}>
                  <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 13 }}>#{o.nServicio}</span>
                </td>
                <td style={rowTd}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--txt-2)' }}>
                    {o.contrato || <span style={{ color: 'var(--txt-3)', fontStyle: 'italic' }}>—</span>}
                  </span>
                </td>
                <td style={rowTd}>
                  <span style={{ fontWeight: 600 }}>
                    {o.abonado || <span style={{ color: 'var(--yellow)', fontStyle: 'italic', fontWeight: 400 }}>Sin nombre</span>}
                  </span>
                </td>
                <td style={{ ...rowTd, maxWidth: 200 }}>
                  <span style={{ color: 'var(--txt-2)', fontSize: 12 }}>
                    {o.direccion || <span style={{ color: 'var(--txt-3)', fontStyle: 'italic' }}>—</span>}
                  </span>
                  {o.referencia && <div style={{ fontSize: 10, color: 'var(--txt-3)', marginTop: 2 }}>Ref: {o.referencia}</div>}
                  {o.sector     && <div style={{ fontSize: 10, color: 'var(--txt-3)', marginTop: 1 }}>{o.sector}</div>}
                </td>

                {/* ── Sede ── */}
                <td style={rowTd}>
                  <span style={{ fontSize: 12, color: 'var(--txt-2)' }}>
                    {o.sede?.nombre || <span style={{ color: 'var(--txt-3)', fontStyle: 'italic' }}>—</span>}
                  </span>
                </td>

                <td style={rowTd}>
                  <TipoBadge tipoOrden={o.tipoOrden} pulse tipoLabelFn={tipoLabelFn} />
                  {o.mbps && (
                    <div style={{ fontSize: 11, color: '#2563EB', fontWeight: 700, marginTop: 3 }}>
                      {o.mbps} Mbps
                    </div>
                  )}
                </td>
                <td style={rowTd}>
                  <TecnicoCell tecnico={o.tecnico} />
                </td>
                <td style={{ ...rowTd, textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <AccionesOrden
                    orden={o}
                    origen={o._origen}
                    onConfigurarWan={onConfigurarWan}
                    onCompletarNoc={onCompletarNoc}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Tabla desktop — Configuradas ──────────────────────────────
function TablaConfiguradas({ ordenes, onEditarWan, tipoLabelFn }) {
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--bg-3)' }}>
            <th style={thStyle}>Orden</th>
            <th style={thStyle}>Contrato</th>
            <th style={thStyle}>Abonado</th>
            <th style={thStyle}>Dirección</th>
            <th style={thStyle}>Sede</th>
            <th style={thStyle}>Tipo</th>
            <th style={thStyle}>WAN configurada</th>
            <th style={thStyle}>Técnico</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Acción</th>
          </tr>
        </thead>
        <tbody>
          {ordenes.map((o, i) => {
            const isLast = i === ordenes.length - 1;
            const rowTd = { ...tdStyle, borderBottom: isLast ? 'none' : tdStyle.borderBottom };
            return (
              <tr key={o.id}
                style={{ transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                <td style={rowTd}>
                  <span style={{ fontWeight: 800, color: '#3B9FD4', fontSize: 13 }}>#{o.nServicio}</span>
                </td>
                <td style={rowTd}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--txt-2)' }}>
                    {o.contrato || <span style={{ color: 'var(--txt-3)', fontStyle: 'italic' }}>—</span>}
                  </span>
                </td>
                <td style={rowTd}>
                  <span style={{ fontWeight: 600 }}>{o.abonado}</span>
                </td>
                <td style={{ ...rowTd, maxWidth: 180 }}>
                  <span style={{ color: 'var(--txt-2)', fontSize: 12 }}>
                    {o.direccion || <span style={{ color: 'var(--txt-3)', fontStyle: 'italic' }}>—</span>}
                  </span>
                  {o.sector && <div style={{ fontSize: 10, color: 'var(--txt-3)', marginTop: 1 }}>{o.sector}</div>}
                </td>

                {/* ── Sede ── */}
                <td style={rowTd}>
                  <span style={{ fontSize: 12, color: 'var(--txt-2)' }}>
                    {o.sede?.nombre || <span style={{ color: 'var(--txt-3)', fontStyle: 'italic' }}>—</span>}
                  </span>
                </td>

                <td style={rowTd}>
                  <TipoBadge tipoOrden={o.tipoOrden} tipoLabelFn={tipoLabelFn} />
                </td>
                <td style={rowTd}>
                  {o.ipWan ? (
                    <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      <div style={{ color: '#3B9FD4', fontWeight: 600 }}>{o.ipWan}</div>
                      <div style={{ color: 'var(--txt-3)', fontSize: 11 }}>{o.mascara} · GW {o.gateway}</div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--txt-3)', fontStyle: 'italic', fontSize: 12 }}>—</span>
                  )}
                </td>
                <td style={rowTd}>
                  <TecnicoCell tecnico={o.tecnico} />
                </td>
                <td style={{ ...rowTd, textAlign: 'center' }}>
                  <button onClick={() => onEditarWan(o)}
                    style={{ padding: '6px 14px', borderRadius: 7, cursor: 'pointer', background: 'transparent', color: '#3B9FD4', fontSize: 12, fontWeight: 600, border: '1px solid rgba(59,159,212,0.35)', display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,159,212,0.1)'; e.currentTarget.style.borderColor = 'rgba(59,159,212,0.7)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(59,159,212,0.35)'; }}>
                    <Pencil size={12} /> Editar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SeccionHeader({ icono, titulo, count, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color, letterSpacing: '0.04em' }}>
        {icono} {titulo}
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: color + '20', color, border: `1px solid ${color}35`, flexShrink: 0 }}>
        {count}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

export default function PendientesPage() {
  const isMobile = useIsMobile();
  const { tipoLabel: tipoLabelFn, grupos } = useTiposOrden();
  const TODOS_TECNICO = grupos.NOC_TECNICO || [];
  const [ordenWan,       setOrdenWan]       = useState(null);
  const [ordenCompletar, setOrdenCompletar] = useState(null);

  const [spinning, setSpinning] = useState(false);

  const handleRefetch = async () => {
    setSpinning(true);
    await refetch();
    setTimeout(() => setSpinning(false), 600);
  };

  const sedeSel = useAuthStore(s => s.sedeSeleccionada);

  const { data: dataWan, isLoading, refetch, isFetching } = useQuery({
  queryKey: ['noc-pendientes-wan', sedeSel],
  queryFn: () => ordenesApi.listar(withSede({
    estado: 'PENDIENTE_NOC', tipos: TODOS_TECNICO.join(','), limit: 100, _t: Date.now(),
  }, sedeSel)).then(r => r.data),
  refetchInterval: 20000,
  staleTime: 0,
  gcTime: 0,
});

const { data: dataCompletar } = useQuery({
  queryKey: ['noc-pendientes-completar', sedeSel],
  queryFn: () => ordenesApi.listar(withSede({
    estado: 'PENDIENTE_NOC', tipos: TIPOS_NOC_COMPLETA.join(','), limit: 100, _t: Date.now(),
  }, sedeSel)).then(r => r.data),
  refetchInterval: 20000,
  staleTime: 0,
  gcTime: 0,
});

const { data: dataConfiguradas } = useQuery({
  queryKey: ['noc-configuradas', sedeSel],
  queryFn: () => ordenesApi.listar(withSede({
    estado: 'PENDIENTE_TECNICO', tipos: TODOS_TECNICO.join(','), limit: 100, _t: Date.now(),
  }, sedeSel)).then(r => r.data),
  refetchInterval: 20000,
  staleTime: 0,
  gcTime: 0,
});

    const ordenesPendientesWan = (dataWan?.data || [])
        .filter(o => TODOS_TECNICO.includes(o.tipoOrden));
  
    const ordenesPendienteNoc = (dataCompletar?.data || [])
    .filter(o => TIPOS_NOC_COMPLETA.includes(o.tipoOrden));

  const ordenesConfiguradas = (dataConfiguradas?.data || []);

  const filasPendientes = [
    ...ordenesPendientesWan.map(o => ({ ...o, _origen: 'wan' })),
    ...ordenesPendienteNoc.map(o => ({ ...o, _origen: 'noc' })),
  ];
  const totalPendientes = filasPendientes.length;

  return (
    <div style={{ padding: isMobile ? '16px 12px' : 28 }} className="animate-fade">

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 18 : 22, fontWeight: 800, color: 'var(--txt)', letterSpacing: '-0.02em' }}>
            Pendientes NOC
          </h1>
          <p style={{ color: 'var(--txt-3)', fontSize: 12, marginTop: 3 }}>
            {totalPendientes} orden{totalPendientes !== 1 ? 'es' : ''} pendiente{totalPendientes !== 1 ? 's' : ''}
            {isFetching && ' · actualizando...'}
          </p>
        </div>
        <Btn variant="ghost" size="sm" icon={<span className={spinning ? 'spin' : ''} style={{ display: 'inline-flex' }}><RefreshCw size={13} /></span>} onClick={handleRefetch}>        </Btn>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner size={28} />
        </div>
      )}

      {!isLoading && totalPendientes > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SeccionHeader
            icono={<Wifi size={13} />}
            titulo={isMobile ? 'PENDIENTES' : 'PENDIENTES — CONFIGURAR WAN / COMPLETAR NOC'}
            count={totalPendientes}
            color="var(--accent)"
          />
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {isMobile ? (
              <div>
                {filasPendientes.map(o => (
                  <OrdenCard
                    key={o.id}
                    orden={o}
                    origen={o._origen}
                    onConfigurarWan={setOrdenWan}
                    onCompletarNoc={setOrdenCompletar}
                    tipoLabelFn={tipoLabelFn}
                  />
                ))}
              </div>
            ) : (
              <TablaPendientes
                filas={filasPendientes}
                onConfigurarWan={setOrdenWan}
                onCompletarNoc={setOrdenCompletar}
                tipoLabelFn={tipoLabelFn}
              />
            )}
          </Card>
        </div>
      )}

      {!isLoading && totalPendientes === 0 && (
        <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
          <Empty icon="✅" title="Todo al día" subtitle="No hay órdenes pendientes" />
        </Card>
      )}

      {!isLoading && ordenesConfiguradas.length > 0 && (
        <div>
          <SeccionHeader
            icono={<CheckCircle size={13} />}
            titulo={isMobile ? 'WAN CONFIGURADA' : 'WAN CONFIGURADA — ESPERANDO TÉCNICO'}
            count={ordenesConfiguradas.length}
            color="var(--txt-3)"
          />
          <Card style={{ padding: 0, overflow: 'hidden', opacity: 0.94 }}>
            {isMobile ? (
              <div>
                {ordenesConfiguradas.map(o => (
                  <ConfiguradaCard key={o.id} orden={o} onEditarWan={setOrdenWan} tipoLabelFn={tipoLabelFn} />
                ))}
              </div>
            ) : (
              <TablaConfiguradas ordenes={ordenesConfiguradas} onEditarWan={setOrdenWan} tipoLabelFn={tipoLabelFn} />
            )}
          </Card>
        </div>
      )}

  <DrawerWan          open={!!ordenWan}       onClose={() => setOrdenWan(null)}       orden={ordenWan} tiposTecnico={TODOS_TECNICO} tipoLabelFn={tipoLabelFn} />      <DrawerNocCompletar open={!!ordenCompletar} onClose={() => setOrdenCompletar(null)} orden={ordenCompletar} tipoLabelFn={tipoLabelFn} />
    </div>
  );
}