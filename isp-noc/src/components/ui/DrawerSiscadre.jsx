import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Database, Wifi, RefreshCw, Save, CheckCircle, AlertCircle, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { siscadreApi } from '../../services/api';

const TIPO_LABEL = { INTERNET: ' Internet', CABLE: ' Cable', MIXTO: ' Mixto (Internet + Cable)' };
const TIPO_COLOR = { INTERNET: '#2563EB', CABLE: '#8B5CF6', MIXTO: '#059669' };

const Campo = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}
    </label>
    {children}
  </div>
);

const Input = ({ value, onChange, placeholder, type = 'text', mono = false }) => (
  <input
    type={type}
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      width: '100%', padding: '9px 12px',
      border: '1px solid #E2E8F0', borderRadius: 8,
      fontSize: 13, color: '#0F172A',
      fontFamily: mono ? 'monospace' : 'inherit',
      background: '#F8FAFC', outline: 'none',
      boxSizing: 'border-box',
    }}
  />
);

const fmtFecha = (f) => {
  if (!f) return null;
  return new Date(f).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

// ── Formulario de una conexión individual ─────────────────────
function FormConexion({ sedeId, conexion, tipoServicioFijo, onGuardado, onCancelar }) {
  const qc = useQueryClient();
  const esNueva = !conexion;

  const [form, setForm] = useState({
    tipoServicio: conexion?.tipoServicio || tipoServicioFijo || 'MIXTO',
    host:     conexion?.siscadreHost     || '',
    port:     String(conexion?.siscadrePort || '3306'),
    user:     conexion?.siscadreUser     || '',
    password: '',
    database: conexion?.siscadreDatabase || '',
    script:   conexion?.siscadreScript   || '',
  });
  const [probando, setProbando]           = useState(false);
  const [estadoConexion, setEstadoConexion] = useState(null);
  const [showScript, setShowScript]       = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const guardarMut = useMutation({
    mutationFn: () => siscadreApi.guardarConexion(sedeId, {
      tipoServicio: form.tipoServicio,
      host:     form.host,
      port:     form.port,
      user:     form.user,
      password: form.password,
      database: form.database,
      script:   form.script || null,
    }),
    onSuccess: () => {
      toast.success('Conexión guardada');
      qc.invalidateQueries(['siscadre-conexiones', sedeId]);
      onGuardado();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error al guardar'),
  });

  const probarConexion = async () => {
    if (!form.host || !form.user || !form.database || (esNueva && !form.password)) {
      toast.error('Completa todos los campos antes de probar');
      return;
    }
    setProbando(true);
    setEstadoConexion(null);
    try {
      const idProbar = conexion?.id || 'nueva';
      await siscadreApi.probarConexion(idProbar, {
        host: form.host, port: form.port,
        user: form.user, password: form.password,
        database: form.database,
      });
      setEstadoConexion('ok');
      toast.success('Conexión exitosa');
    } catch (e) {
      setEstadoConexion('error');
      toast.error(e.response?.data?.error || 'No se pudo conectar');
    } finally {
      setProbando(false);
    }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>
        {esNueva ? '➕ Nueva conexión' : `Editar: ${TIPO_LABEL[conexion.tipoServicio]}`}
      </div>

      {!tipoServicioFijo && (
        <Campo label="Tipo de servicio">
          <select
            value={form.tipoServicio}
            onChange={e => set('tipoServicio', e.target.value)}
            disabled={!esNueva}
            style={{
              width: '100%', padding: '9px 12px',
              border: '1px solid #E2E8F0', borderRadius: 8,
              fontSize: 13, color: '#0F172A', background: '#F8FAFC',
              outline: 'none', boxSizing: 'border-box',
            }}
          >
            <option value="MIXTO"> Mixto (Internet + Cable en una sola BD)</option>
            <option value="INTERNET"> Solo Internet</option>
            <option value="CABLE"> Solo Cable</option>
          </select>
        </Campo>
      )}

      <Campo label="MySQL Host Address">
        <Input value={form.host} onChange={v => set('host', v)} placeholder="evelyn.jycsisac.com" mono/>
      </Campo>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 2 }}>
          <Campo label="Usuario">
            <Input value={form.user} onChange={v => set('user', v)} placeholder="siscadre"/>
          </Campo>
        </div>
        <div style={{ flex: 1 }}>
          <Campo label="Puerto">
            <Input value={form.port} onChange={v => set('port', v)} placeholder="3306"/>
          </Campo>
        </div>
      </div>

      <Campo label={esNueva ? 'Contraseña' : 'Contraseña (dejar vacío para no cambiar)'}>
        <Input value={form.password} onChange={v => set('password', v)} placeholder="••••••••" type="password"/>
      </Campo>

      <Campo label="Base de datos">
        <Input value={form.database} onChange={v => set('database', v)} placeholder="siscadre_trujillo" mono/>
      </Campo>

      {/* Script SQL colapsable */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          onClick={() => setShowScript(!showScript)}
        >
          <span>📝 Script SQL</span>
          {showScript ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
        </div>
        {!showScript && (
          <div style={{ fontSize: 11, color: '#94A3B8' }}>Si está vacío se usa el script por defecto.</div>
        )}
        {showScript && (
          <textarea
            value={form.script}
            onChange={e => set('script', e.target.value)}
            placeholder="SELECT ... FROM serv_tecnico ..."
            rows={8}
            style={{
              width: '100%', padding: '10px 12px', marginTop: 6,
              border: '1px solid #E2E8F0', borderRadius: 8,
              fontSize: 12, fontFamily: 'monospace',
              color: '#0F172A', background: '#F8FAFC',
              resize: 'vertical', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        )}
      </div>

      {estadoConexion && (
        <div style={{
          marginBottom: 12, padding: '8px 12px', borderRadius: 8,
          background: estadoConexion === 'ok' ? '#DCFCE7' : '#FEE2E2',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, fontWeight: 600,
          color: estadoConexion === 'ok' ? '#16A34A' : '#DC2626',
        }}>
          {estadoConexion === 'ok'
            ? <><CheckCircle size={13}/> Conexión exitosa</>
            : <><AlertCircle size={13}/> No se pudo conectar</>}
        </div>
      )}

      <button
        onClick={probarConexion}
        disabled={probando}
        style={{
          width: '100%', padding: '9px 0', marginBottom: 8,
          border: '1px solid #E2E8F0', borderRadius: 8,
          background: '#F8FAFC', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, color: '#475569',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {probando
          ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }}/> Probando...</>
          : <><Wifi size={14}/> Probar conexión</>}
      </button>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onCancelar}
          style={{
            flex: 1, padding: '9px 0',
            border: '1px solid #E2E8F0', borderRadius: 8,
            background: '#fff', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: '#64748B',
          }}
        >
          Cancelar
        </button>
        <button
          onClick={() => guardarMut.mutate()}
          disabled={guardarMut.isPending}
          style={{
            flex: 2, padding: '9px 0',
            background: '#1E4C8A', color: '#fff',
            border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Save size={14}/>
          {guardarMut.isPending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Card de conexión ya guardada (colapsada) ──────────────────
function CardConexion({ conexion, onEditar, onEliminar }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: TIPO_COLOR[conexion.tipoServicio],
          flexShrink: 0,
        }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
            {TIPO_LABEL[conexion.tipoServicio]}
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {conexion.siscadreDatabase} @ {conexion.siscadreHost}
          </div>
          {conexion.siscadreLastSync && (
            <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
              Último sync: {fmtFecha(conexion.siscadreLastSync)}
            </div>
          )}
        </div>
        <button onClick={onEditar} style={{
          padding: '5px 10px', borderRadius: 6,
          border: '1px solid #E2E8F0', background: '#F8FAFC',
          fontSize: 11, fontWeight: 600, color: '#475569', cursor: 'pointer',
        }}>
          Editar
        </button>
        <button onClick={onEliminar} style={{
          width: 28, height: 28, borderRadius: 6,
          border: '1px solid #FEE2E2', background: '#FEF2F2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#DC2626',
        }}>
          <Trash2 size={13}/>
        </button>
      </div>
    </div>
  );
}

// ── Drawer principal ───────────────────────────────────────────
export default function DrawerSiscadre({ sedeId, sedeNombre, onCerrar }) {
  const qc = useQueryClient();
  const abierto = !!sedeId;

  const [editando, setEditando]   = useState(null); // conexión siendo editada, o 'nueva'
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

  const { data: conexiones = [] } = useQuery({
    queryKey: ['siscadre-conexiones', sedeId],
    queryFn:  () => siscadreApi.listarConexiones(sedeId).then(r => r.data),
    enabled:  abierto,
  });

  useEffect(() => { setEditando(null); setConfirmarEliminar(null); }, [sedeId]);

  const eliminarMut = useMutation({
    mutationFn: (id) => siscadreApi.eliminarConexion(id),
    onSuccess: () => {
      toast.success('Conexión eliminada');
      qc.invalidateQueries(['siscadre-conexiones', sedeId]);
      setConfirmarEliminar(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error al eliminar'),
  });

  const tiposYaUsados = conexiones.map(c => c.tipoServicio);
  const puedeAgregarMas = !tiposYaUsados.includes('MIXTO') && tiposYaUsados.length < 2;

  return createPortal(
    <>
      {abierto && (
        <div onClick={onCerrar} style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.35)',
          backdropFilter: 'blur(2px)',
          zIndex: 9998,
        }}/>
      )}
      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 480, maxWidth: '100vw',
        background: '#F8FAFC',
        zIndex: 9999,
        boxShadow: '-2px 0 32px rgba(15,23,42,0.10)',
        transform: abierto ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {/* Header */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '16px 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={18} style={{ color: '#2563EB' }}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Conexiones Siscadre</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>{sedeNombre}</div>
            </div>
            <button onClick={onCerrar} style={{
              width: 32, height: 32, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: '1px solid #E2E8F0',
              cursor: 'pointer', color: '#64748B',
            }}>
              <X size={16}/>
            </button>
          </div>
        </div>

        {/* Cuerpo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {conexiones.length === 0 && editando === null && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
              <Database size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }}/>
              <div style={{ fontSize: 13 }}>Esta sede no tiene ninguna conexión configurada</div>
            </div>
          )}

          {conexiones.map(c => (
            editando?.id === c.id ? (
              <FormConexion
                key={c.id}
                sedeId={sedeId}
                conexion={c}
                onGuardado={() => setEditando(null)}
                onCancelar={() => setEditando(null)}
              />
            ) : (
              <div key={c.id}>
                {confirmarEliminar === c.id ? (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: '#991B1B', marginBottom: 10 }}>
                      ¿Eliminar la conexión <b>{TIPO_LABEL[c.tipoServicio]}</b>? Esta acción no se puede deshacer.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setConfirmarEliminar(null)} style={{ flex: 1, padding: '7px 0', border: '1px solid #E2E8F0', borderRadius: 6, background: '#fff', fontSize: 12, fontWeight: 600, color: '#64748B', cursor: 'pointer' }}>
                        Cancelar
                      </button>
                      <button onClick={() => eliminarMut.mutate(c.id)} disabled={eliminarMut.isPending} style={{ flex: 1, padding: '7px 0', border: 'none', borderRadius: 6, background: '#DC2626', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                        {eliminarMut.isPending ? 'Eliminando...' : 'Sí, eliminar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <CardConexion
                    conexion={c}
                    onEditar={() => setEditando(c)}
                    onEliminar={() => setConfirmarEliminar(c.id)}
                  />
                )}
              </div>
            )
          ))}

          {editando === 'nueva' && (
            <FormConexion
              sedeId={sedeId}
              conexion={null}
              tipoServicioFijo={tiposYaUsados.includes('MIXTO') ? null : (conexiones.length === 1 ? (tiposYaUsados[0] === 'INTERNET' ? 'CABLE' : 'INTERNET') : null)}
              onGuardado={() => setEditando(null)}
              onCancelar={() => setEditando(null)}
            />
          )}

          {editando === null && (
            <button
              onClick={() => setEditando('nueva')}
              disabled={!puedeAgregarMas}
              style={{
                width: '100%', padding: '11px 0',
                border: '1px dashed #CBD5E1', borderRadius: 10,
                background: puedeAgregarMas ? '#fff' : '#F1F5F9',
                cursor: puedeAgregarMas ? 'pointer' : 'not-allowed',
                fontSize: 13, fontWeight: 600,
                color: puedeAgregarMas ? '#2563EB' : '#94A3B8',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Plus size={15}/> Agregar conexión
            </button>
          )}

          {!puedeAgregarMas && editando === null && conexiones.length > 0 && (
            <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 8 }}>
              {tiposYaUsados.includes('MIXTO')
                ? 'Esta sede usa una conexión Mixta — no se pueden agregar más.'
                : 'Ya configuraste Internet y Cable por separado.'}
            </div>
          )}
        </div>
      </aside>
    </>,
    document.body
  );
}