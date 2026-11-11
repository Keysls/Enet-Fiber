import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, LogOut, Menu, PanelLeft, Bell, BellOff, MapPin, Wifi, Clock, Check, CheckCheck, Shield, Key } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { sedesApi, notificacionesApi, authApi } from '../../services/api';

const TITULOS = {
  '/':                   'Monitor',
  '/pendientes':         'Pendientes WAN',
  '/seguimiento':        'Seguimiento',
  '/clientes':           'Clientes',
  '/onus-pendientes':    'ONUs Pendientes',
  '/sedes':              'Sedes',
  '/usuarios':           'Usuarios',
  '/perfil':             'Mi Perfil',
  '/almacen':            'Almacén · Dashboard',
  '/almacen/inventario': 'Almacén · Inventario',
  '/almacen/equipo':     'Almacén · Buscar equipo',
  '/almacen/catalogo':   'Almacén · Catálogo',
  '/almacen/reportes':   'Almacén · Reportes',
};

function tituloDeRuta(pathname) {
  if (pathname === '/') return TITULOS['/'];
  if (TITULOS[pathname]) return TITULOS[pathname];
  const match = Object.keys(TITULOS).find(r => r !== '/' && pathname.startsWith(r));
  return match ? TITULOS[match] : 'Panel NOC';
}

const ROL_CFG = {
  SUPERADMIN:   { label: 'Super Admin',  color: '#DC2626' },
  OPERADOR_NOC: { label: 'Operador NOC', color: '#1E3A8A' },
};

// Hook simple para saber si estamos en pantalla angosta
function useEsAngosto(breakpoint = 600) {
  const [angosto, setAngosto] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false
  );
  useEffect(() => {
    const fn = () => setAngosto(window.innerWidth <= breakpoint);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [breakpoint]);
  return angosto;
}

export default function Topbar({ esMovil, colapsado, anchoSidebar, onMenuToggle, onColapsarToggle }) {
  const usuario = useAuthStore(s => s.usuario);
  const logout  = useAuthStore(s => s.logout);
  const loc     = useLocation();

  const [showMenu,        setShowMenu]        = useState(false);
  const [showNotis,       setShowNotis]       = useState(false);
  const [showSedePanel,   setShowSedePanel]   = useState(false);

  const sedeSeleccionada    = useAuthStore(s => s.sedeSeleccionada);
  const setSedeSeleccionada = useAuthStore(s => s.setSedeSeleccionada);

  const { data: sedes = [] } = useQuery({
    queryKey: ['sedes'],
    queryFn:  () => sedesApi.listar().then(r => r.data),
  });

  const angosto   = useEsAngosto(600);   // true en móvil
  const titulo    = tituloDeRuta(loc.pathname);
  const iniciales = `${usuario?.nombre?.[0] || ''}${usuario?.apellido?.[0] || ''}`.toUpperCase();
  const rolCfg    = ROL_CFG[usuario?.rol] || { label: usuario?.rol || '', color: '#5A7A9A' };
  const sedeName  = sedes.find(s => s.id === sedeSeleccionada)?.nombre;

  const cerrarTodo = () => { setShowMenu(false); setShowNotis(false); setShowSedePanel(false); };

  const navigate = useNavigate();

  const qc = useQueryClient();

  const { data: notisData } = useQuery({
    queryKey: ['notificaciones', sedeSeleccionada],
    queryFn:  () => notificacionesApi.listar(sedeSeleccionada ? { sedeId: sedeSeleccionada } : {}).then(r => r.data),
    refetchInterval: 30000,
  });
  const notificaciones = notisData?.items || [];

  // Mutations
  const marcarLeidaMut = useMutation({
    mutationFn: (id) => notificacionesApi.marcarLeida(id),
    onSuccess:  () => qc.invalidateQueries(['notificaciones']),
  });

  const marcarTodasMut = useMutation({
    mutationFn: () => notificacionesApi.marcarTodasLeidas(sedeSeleccionada || undefined),
    onSuccess:  () => qc.invalidateQueries(['notificaciones']),
  });

  return (
    <header style={{
      position: 'fixed', top: 0, right: 0,
      left: esMovil ? 0 : anchoSidebar,
      height: 56,
      background: '#FFFFFF',
      borderBottom: '1px solid #E2ECF4',
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 10,
      zIndex: 90,
      transition: 'left .2s ease',
    }}>

      {/* Hamburguesa — solo móvil */}
      {esMovil && (
        <button onClick={onMenuToggle} aria-label="Abrir menú" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: 'transparent', border: 'none', cursor: 'pointer', color: '#5A7A9A',
        }}>
          <Menu size={20}/>
        </button>
      )}

      {/* Colapsar — solo escritorio */}
      {!esMovil && (
        <button onClick={onColapsarToggle}
          aria-label={colapsado ? 'Expandir menú' : 'Colapsar menú'} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: 'transparent', border: 'none', cursor: 'pointer', color: '#5A7A9A',
        }}>
          <PanelLeft size={19}/>
        </button>
      )}

      {/* Título */}
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 15, fontWeight: 800, color: '#0D1B2A',
        margin: 0, flex: 1, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {titulo}
      </h1>

      {/* ── Lado derecho ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>

        {/* DESKTOP: select normal */}
        {!angosto && sedes.length > 0 && (
          <select
            value={sedeSeleccionada}
            onChange={e => setSedeSeleccionada(e.target.value)}
            style={{
              padding: '6px 10px', marginRight: 4,
              background: sedeSeleccionada ? 'rgba(30,58,138,0.08)' : 'transparent',
              border: '1px solid #E2ECF4', borderRadius: 8,
              color: sedeSeleccionada ? '#1E3A8A' : '#5A7A9A',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none',
              fontFamily: 'inherit', maxWidth: 170,
            }}>
            <option value="">Todas las sedes</option>
            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}

        {/* MÓVIL: botón ícono de sede */}
        {angosto && sedes.length > 0 && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { cerrarTodo(); setShowSedePanel(v => !v); }}
              aria-label="Seleccionar sede"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 8,
                background: sedeSeleccionada ? 'rgba(30,58,138,0.08)' : 'transparent',
                border: sedeSeleccionada ? '1px solid rgba(30,58,138,0.25)' : '1px solid transparent',
                cursor: 'pointer',
                color: sedeSeleccionada ? '#1E3A8A' : '#5A7A9A',
              }}>
              <MapPin size={18}/>
            </button>

            {showSedePanel && (
              <>
                <div onClick={() => setShowSedePanel(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }}/>
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  width: 220, background: '#FFFFFF',
                  border: '1px solid #E2ECF4', borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(30,58,138,0.12)',
                  overflow: 'hidden', zIndex: 50,
                }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #EAF1F8' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0D1B2A' }}>Seleccionar sede</span>
                  </div>
                  <div style={{ padding: 6 }}>
                    {[{ id: '', nombre: 'Todas las sedes' }, ...sedes].map(s => (
                      <button key={s.id}
                        onClick={() => { setSedeSeleccionada(s.id); setShowSedePanel(false); }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                          padding: '9px 10px', borderRadius: 8, textAlign: 'left',
                          background: sedeSeleccionada === s.id ? 'rgba(30,58,138,0.08)' : 'transparent',
                          border: 'none', cursor: 'pointer',
                          fontSize: 13,
                          color: sedeSeleccionada === s.id ? '#1E3A8A' : '#0D1B2A',
                          fontWeight: sedeSeleccionada === s.id ? 700 : 400,
                        }}>
                        <MapPin size={13} style={{ flexShrink: 0, opacity: 0.6 }}/>
                        {s.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Campana ── */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { cerrarTodo(); setShowNotis(v => !v); }}
            aria-label="Notificaciones"
            style={{
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 8,
              background: showNotis ? '#F4F8FC' : 'transparent',
              border: 'none', cursor: 'pointer', color: '#5A7A9A',
            }}>
            <Bell size={18}/>
            {notificaciones.length > 0 && (
              <span style={{
                position: 'absolute', top: 7, right: 8,
                width: 8, height: 8, borderRadius: '50%',
                background: '#DC2626', border: '1.5px solid #fff',
              }}/>
            )}
          </button>

          {showNotis && (
            <>
              <div onClick={() => setShowNotis(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 40 }}/>
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                width: 300, background: '#FFFFFF',
                border: '1px solid #E2ECF4', borderRadius: 12,
                boxShadow: '0 8px 24px rgba(30,58,138,0.12)',
                overflow: 'hidden', zIndex: 50,
              }}>
                <div style={{
                  padding: '12px 14px', borderBottom: '1px solid #EAF1F8',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0D1B2A' }}>Notificaciones</span>
                  {notificaciones.length > 0 && (
                    <button
                      onClick={() => marcarTodasMut.mutate()}
                      disabled={marcarTodasMut.isPending}
                      title="Marcar todas como leídas"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 8px', borderRadius: 6,
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: 11, color: '#1E3A8A', fontWeight: 600,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#E2ECF4'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <CheckCheck size={12}/> Marcar todas
                    </button>
                  )}
                </div>
                {notificaciones.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: '#8AAABB' }}>
                    <BellOff size={26} style={{ opacity: 0.5 }}/>
                    <div style={{ fontSize: 12, marginTop: 8 }}>No tenés notificaciones</div>
                  </div>
                ) : (
                  
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {notificaciones.map(n => {
                      const cfg = n.tipo === 'ONU_ERROR_OLT'
                        ? { color: '#DC2626', Icon: Wifi }
                        : { color: '#D97706', Icon: Clock };
                      return (
                        <div key={n.id}
                          style={{
                            display: 'flex', gap: 10, padding: '10px 14px',
                            borderBottom: '1px solid #EAF1F8',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F4F8FC'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div style={{
                            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                            background: cfg.color + '15',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <cfg.Icon size={15} color={cfg.color}/>
                          </div>
                          <div
                            onClick={() => { setShowNotis(false); navigate(n.link); }}
                            style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#0D1B2A' }}>
                              {n.titulo}
                            </div>
                            <div style={{ fontSize: 11, color: '#5A7A9A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {n.detalle}
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); marcarLeidaMut.mutate(n.id); }}
                            title="Marcar como leída"
                            style={{
                              flexShrink: 0,
                              width: 26, height: 26, borderRadius: 6,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              color: '#8AAABB',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#E2ECF4'; e.currentTarget.style.color = '#1E3A8A'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8AAABB'; }}>
                            <Check size={14}/>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Avatar / menú usuario ── */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { cerrarTodo(); setShowMenu(v => !v); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 6px', borderRadius: 10,
              background: showMenu ? '#F4F8FC' : 'transparent',
              border: '1px solid', borderColor: showMenu ? '#E2ECF4' : 'transparent',
              cursor: 'pointer', transition: 'all .15s',
            }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: rolCfg.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff',
            }}>
              {iniciales || '?'}
            </div>

            {/* Nombre + rol — solo desktop */}
            {!angosto && (
              <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0D1B2A', whiteSpace: 'nowrap' }}>
                  {usuario?.nombre} {usuario?.apellido}
                </div>
                <div style={{ fontSize: 10, color: rolCfg.color, fontWeight: 600 }}>
                  {rolCfg.label}
                </div>
              </div>
            )}

            {/* Chevron — solo desktop */}
            {!angosto && (
              <ChevronDown size={14} color="#8AAABB"
                style={{ transition: 'transform .15s', transform: showMenu ? 'rotate(180deg)' : 'none' }}/>
            )}
          </button>

          {showMenu && (
            <>
              <div onClick={() => setShowMenu(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 40 }}/>
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                width: 220, background: '#FFFFFF',
                border: '1px solid #E2ECF4', borderRadius: 12,
                boxShadow: '0 8px 24px rgba(30,58,138,0.12)',
                overflow: 'hidden', zIndex: 50,
              }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #EAF1F8' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0D1B2A' }}>
                    {usuario?.nombre} {usuario?.apellido}
                  </div>
                  <div style={{ fontSize: 11, color: '#8AAABB', marginTop: 2 }}>
                    {usuario?.email || ''}
                  </div>
                  <span style={{
                    display: 'inline-block', marginTop: 6,
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: rolCfg.color + '1a', color: rolCfg.color,
                  }}>
                    {rolCfg.label}
                  </span>
                  {/* Sede activa visible en el menú (útil en móvil) */}
                  {sedeName && (
                    <div style={{
                      marginTop: 8, fontSize: 11, color: '#5A7A9A',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <MapPin size={11}/> {sedeName}
                    </div>
                  )}
                </div>
                <div style={{ padding: 6 }}>
                  {/* Perfil / 2FA / Contraseña → página de perfil */}
                  <button
                    onClick={() => { setShowMenu(false); navigate('/perfil'); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                      padding: '8px 10px', borderRadius: 8,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: 'var(--txt-2)', marginBottom: 2,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                    <Shield size={15}/> Mi perfil y seguridad
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); logout(); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                      padding: '8px 10px', borderRadius: 8,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: '#DC2626',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                    <LogOut size={15}/> Cerrar sesión
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
// ═════════════════════════════════════════════════════════════
//  MODAL 2FA
// ═════════════════════════════════════════════════════════════
function Modal2FA({ onClose, usuario }) {
  const [paso,    setPaso]    = useState('info'); // info | qr | desactivar
  const [qrData,  setQrData]  = useState(null);
  const [manual,  setManual]  = useState('');
  const [codigo,  setCodigo]  = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [exito,   setExito]   = useState('');

  const activo = usuario?.totpActivo;

  const generarQR = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await authApi.generar2fa();
      setQrData(data.qr);
      setManual(data.manual);
      setPaso('qr');
    } catch (e) {
      setError(e.response?.data?.error || 'Error al generar QR');
    } finally { setLoading(false); }
  };

  const activar = async () => {
    if (codigo.length !== 6) { setError('Ingresa el código de 6 dígitos'); return; }
    setLoading(true); setError('');
    try {
      await authApi.activar2fa(codigo);
      setExito('✅ 2FA activado correctamente');
      setTimeout(onClose, 2000);
    } catch (e) {
      setError(e.response?.data?.error || 'Código incorrecto');
    } finally { setLoading(false); }
  };

  const desactivar = async () => {
    if (codigo.length !== 6) { setError('Ingresa el código de 6 dígitos'); return; }
    setLoading(true); setError('');
    try {
      await authApi.desactivar2fa(codigo);
      setExito('2FA desactivado');
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(e.response?.data?.error || 'Código incorrecto');
    } finally { setLoading(false); }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #C8DAEA', background: '#F4F8FC', fontSize: 13, color: '#0D1B2A', outline: 'none', boxSizing: 'border-box' };

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Shield size={20} color="#1E3A8A" />
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0D1B2A' }}>Autenticación en dos pasos</h2>
      </div>

      {exito && <div style={{ padding: '10px 14px', background: '#F0FDF4', borderRadius: 8, color: '#16A34A', fontSize: 13, marginBottom: 12 }}>{exito}</div>}
      {error && <div style={{ padding: '10px 14px', background: '#FEF2F2', borderRadius: 8, color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {/* Info inicial */}
      {paso === 'info' && (
        <>
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
            {activo
              ? '✅ El 2FA está activado en tu cuenta. Cada login pedirá un código de Google Authenticator.'
              : 'Agrega una capa extra de seguridad. Necesitarás Google Authenticator o similar.'}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {!activo && (
              <button onClick={generarQR} disabled={loading}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#1E3A8A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {loading ? 'Cargando...' : 'Activar 2FA'}
              </button>
            )}
            {activo && (
              <button onClick={() => { setPaso('desactivar'); setCodigo(''); setError(''); }}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Desactivar 2FA
              </button>
            )}
            <button onClick={onClose}
              style={{ padding: '10px 16px', borderRadius: 8, background: 'transparent', border: '1px solid #C8DAEA', color: '#475569', cursor: 'pointer', fontSize: 13 }}>
              Cerrar
            </button>
          </div>
        </>
      )}

      {/* QR para activar */}
      {paso === 'qr' && (
        <>
          <p style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>
            1. Abre Google Authenticator<br/>
            2. Toca "+" → "Escanear código QR"<br/>
            3. Ingresa el código de 6 dígitos para confirmar
          </p>
          {qrData && <img src={qrData} alt="QR 2FA" style={{ width: '100%', maxWidth: 200, display: 'block', margin: '0 auto 12px', borderRadius: 8 }} />}
          {manual && (
            <div style={{ padding: '8px 12px', background: '#F4F8FC', borderRadius: 8, fontFamily: 'monospace', fontSize: 12, color: '#1E3A8A', marginBottom: 12, wordBreak: 'break-all', textAlign: 'center' }}>
              {manual}
            </div>
          )}
          <input type="text" inputMode="numeric" maxLength={6} value={codigo}
            onChange={e => setCodigo(e.target.value.replace(/\D/g, ''))}
            placeholder="Código de 6 dígitos" style={{ ...inputStyle, textAlign: 'center', fontSize: 20, fontWeight: 700, letterSpacing: 6, marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={activar} disabled={loading || codigo.length !== 6}
              style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#1E3A8A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: codigo.length !== 6 ? 0.5 : 1 }}>
              {loading ? 'Verificando...' : 'Confirmar y activar'}
            </button>
            <button onClick={() => setPaso('info')} style={{ padding: '10px 16px', borderRadius: 8, background: 'transparent', border: '1px solid #C8DAEA', color: '#475569', cursor: 'pointer', fontSize: 13 }}>
              Cancelar
            </button>
          </div>
        </>
      )}

      {/* Desactivar */}
      {paso === 'desactivar' && (
        <>
          <p style={{ fontSize: 13, color: '#DC2626', marginBottom: 12 }}>
            ⚠ Para desactivar el 2FA necesitas confirmar con un código válido de tu app autenticadora.
          </p>
          <input type="text" inputMode="numeric" maxLength={6} value={codigo}
            onChange={e => setCodigo(e.target.value.replace(/\D/g, ''))}
            placeholder="Código de 6 dígitos" style={{ ...inputStyle, textAlign: 'center', fontSize: 20, fontWeight: 700, letterSpacing: 6, marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={desactivar} disabled={loading || codigo.length !== 6}
              style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#DC2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: codigo.length !== 6 ? 0.5 : 1 }}>
              {loading ? 'Verificando...' : 'Desactivar 2FA'}
            </button>
            <button onClick={() => setPaso('info')} style={{ padding: '10px 16px', borderRadius: 8, background: 'transparent', border: '1px solid #C8DAEA', color: '#475569', cursor: 'pointer', fontSize: 13 }}>
              Cancelar
            </button>
          </div>
        </>
      )}
    </ModalOverlay>
  );
}

// ═════════════════════════════════════════════════════════════
//  MODAL CAMBIAR CONTRASEÑA
// ═════════════════════════════════════════════════════════════
function ModalCambiarPass({ onClose }) {
  const [actual,  setActual]  = useState('');
  const [nueva,   setNueva]   = useState('');
  const [conf,    setConf]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [exito,   setExito]   = useState('');

  const handleGuardar = async () => {
    setError('');
    if (!actual || !nueva || !conf) { setError('Completa todos los campos'); return; }
    if (nueva !== conf) { setError('Las contraseñas no coinciden'); return; }
    if (nueva.length < 8) { setError('Mínimo 8 caracteres'); return; }
    if (!/[A-Z]/.test(nueva)) { setError('Debe contener al menos una mayúscula'); return; }
    if (!/[0-9]/.test(nueva)) { setError('Debe contener al menos un número'); return; }

    setLoading(true);
    try {
      await authApi.cambiarPassword({ passwordActual: actual, passwordNueva: nueva });
      setExito('✅ Contraseña actualizada correctamente');
      setTimeout(onClose, 2000);
    } catch (e) {
      setError(e.response?.data?.error || 'Error al cambiar contraseña');
    } finally { setLoading(false); }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #C8DAEA', background: '#F4F8FC', fontSize: 13, color: '#0D1B2A', outline: 'none', boxSizing: 'border-box', marginBottom: 10 };

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Key size={20} color="#475569" />
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0D1B2A' }}>Cambiar contraseña</h2>
      </div>
      {exito && <div style={{ padding: '10px 14px', background: '#F0FDF4', borderRadius: 8, color: '#16A34A', fontSize: 13, marginBottom: 12 }}>{exito}</div>}
      {error && <div style={{ padding: '10px 14px', background: '#FEF2F2', borderRadius: 8, color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contraseña actual</label>
      <input type="password" value={actual} onChange={e => setActual(e.target.value)} style={inputStyle} placeholder="••••••••" />
      <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nueva contraseña</label>
      <input type="password" value={nueva} onChange={e => setNueva(e.target.value)} style={inputStyle} placeholder="Mín. 8 chars, mayúscula y número" />
      <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirmar nueva</label>
      <input type="password" value={conf} onChange={e => setConf(e.target.value)} style={inputStyle} placeholder="••••••••" />
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={handleGuardar} disabled={loading}
          style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#1E3A8A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
        <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: 8, background: 'transparent', border: '1px solid #C8DAEA', color: '#475569', cursor: 'pointer', fontSize: 13 }}>
          Cancelar
        </button>
      </div>
    </ModalOverlay>
  );
}

// ── Overlay base ──────────────────────────────────────────────
function ModalOverlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        {children}
      </div>
    </div>
  );
}