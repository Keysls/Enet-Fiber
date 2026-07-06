import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Database, Wifi, WifiOff, RefreshCw, Save, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { siscadreApi } from '../../services/api';

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

export default function DrawerSiscadre({ sedeId, sedeNombre, onCerrar }) {
  const qc = useQueryClient();
  const abierto = !!sedeId;

  const [form, setForm] = useState({
    host: '', port: '3306', user: '', password: '', database: '', script: ''
  });
  const [probando, setProbando] = useState(false);
  const [estadoConexion, setEstadoConexion] = useState(null); // 'ok' | 'error' | null
  const [showScript, setShowScript] = useState(false);

  const { data: config } = useQuery({
    queryKey: ['siscadre-config', sedeId],
    queryFn:  () => siscadreApi.obtenerConfig(sedeId).then(r => r.data),
    enabled:  abierto,
  });

  useEffect(() => {
    if (config) {
      setForm(f => ({
        ...f,
        host:     config.siscadreHost     || '',
        port:     String(config.siscadrePort || '3306'),
        user:     config.siscadreUser     || '',
        password: '',
        database: config.siscadreDatabase || '',
        script:   config.siscadreScript   || '',
      }));
    }
  }, [config]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const guardarMut = useMutation({
    mutationFn: async () => {
        const inicio = Date.now();
        const resultado = await siscadreApi.guardarConfig(sedeId, {
        host:     form.host,
        port:     form.port,
        user:     form.user,
        password: form.password,
        database: form.database,
        script:   form.script || null,
        });
        // Asegurar mínimo 600ms de "Guardando..." para que se vea
        const transcurrido = Date.now() - inicio;
        if (transcurrido < 600) {
        await new Promise(r => setTimeout(r, 600 - transcurrido));
        }
        return resultado;
    },
    onSuccess: () => {
        toast.success('Configuración guardada');
        qc.invalidateQueries(['siscadre-config', sedeId]);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error al guardar'),
    });

  const probarConexion = async () => {
    if (!form.host || !form.user || !form.password || !form.database) {
      toast.error('Completa todos los campos antes de probar');
      return;
    }
    setProbando(true);
    setEstadoConexion(null);
    try {
      await siscadreApi.probarConexion(sedeId, {
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

  const fmtFecha = (f) => {
    if (!f) return null;
    return new Date(f).toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

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
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Conexión Siscadre</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>{sedeNombre}</div>
            </div>
            {config?.siscadreHost && (
            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 700, color: '#16A34A',
                background: '#DCFCE7', padding: '2px 8px', borderRadius: 20,
                marginBottom: 6,
            }}>
                ✓ Configurado
            </div>
            )}
            {config?.siscadreLastSync && (
              <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'right' }}>
                Último sync<br/>
                <span style={{ color: '#475569', fontWeight: 600 }}>{fmtFecha(config.siscadreLastSync)}</span>
              </div>
            )}
            <button onClick={onCerrar} style={{
              width: 32, height: 32, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: '1px solid #E2E8F0',
              cursor: 'pointer', color: '#64748B',
            }}>
              <X size={16}/>
            </button>
          </div>

          {/* Estado conexión */}
          {estadoConexion && (
            <div style={{
              marginTop: 10, padding: '8px 12px', borderRadius: 8,
              background: estadoConexion === 'ok' ? '#DCFCE7' : '#FEE2E2',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 13, fontWeight: 600,
              color: estadoConexion === 'ok' ? '#16A34A' : '#DC2626',
            }}>
              {estadoConexion === 'ok'
                ? <><CheckCircle size={14}/> Conexión exitosa a Siscadre</>
                : <><AlertCircle size={14}/> No se pudo conectar</>
              }
            </div>
          )}
        </div>

        {/* Cuerpo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {/* Card: Datos de conexión */}
          <div style={{
            background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
            padding: 16, marginBottom: 12,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>
              📡 Datos de conexión
            </div>

            <Campo label="MySQL Host Address">
              <Input value={form.host} onChange={v => set('host', v)} placeholder="evelyn.jycssisac.com" mono/>
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

            <Campo label="Contraseña">
              <Input value={form.password} onChange={v => set('password', v)} placeholder="••••••••" type="password"/>
            </Campo>

            <Campo label="Base de datos">
              <Input value={form.database} onChange={v => set('database', v)} placeholder="siscadre_trujillo" mono/>
            </Campo>

            {/* Botón probar conexión */}
            <button
              onClick={probarConexion}
              disabled={probando}
              style={{
                width: '100%', padding: '10px 0', marginTop: 4,
                border: '1px solid #E2E8F0', borderRadius: 8,
                background: '#F8FAFC', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: '#475569',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {probando
                ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }}/> Probando...</>
                : <><Wifi size={14}/> Probar conexión</>
              }
            </button>
          </div>

          {/* Card: Script SQL */}
          <div style={{
            background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
            padding: 16, marginBottom: 12,
          }}>
            <div
              style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              onClick={() => setShowScript(!showScript)}
            >
              <span>📝 Script SQL</span>
              <span style={{ fontSize: 11, color: '#94A3B8' }}>{showScript ? 'Ocultar ▲' : 'Ver/Editar ▼'}</span>
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: showScript ? 12 : 0 }}>
              Si está vacío se usa el script por defecto.
            </div>
            {showScript && (
              <textarea
                value={form.script}
                onChange={e => set('script', e.target.value)}
                placeholder="SELECT ... FROM serv_tecnico ..."
                rows={10}
                style={{
                  width: '100%', padding: '10px 12px',
                  border: '1px solid #E2E8F0', borderRadius: 8,
                  fontSize: 12, fontFamily: 'monospace',
                  color: '#0F172A', background: '#F8FAFC',
                  resize: 'vertical', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          background: '#fff', borderTop: '1px solid #E2E8F0',
          padding: '14px 20px', flexShrink: 0,
        }}>
          <button
            onClick={() => guardarMut.mutate()}
            disabled={guardarMut.isPending}
            style={{
              width: '100%', padding: '11px 0',
              background: '#1E4C8A', color: '#fff',
              border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Save size={15}/>
            {guardarMut.isPending ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </aside>
    </>,
    document.body
  );
}