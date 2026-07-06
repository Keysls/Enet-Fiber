import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, UserCircle, Menu, PanelLeft, Bell, BellOff, Key, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificacionesApi } from '../../services/api';

const TOPBAR_CSS = `
  @media (max-width: 1080px) {
    .topbar-username { display: none !important; }
    .topbar-notis-panel { right: -8px !important; width: 280px !important; }
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('topbar-responsive-css')) {
  const s = document.createElement('style');
  s.id = 'topbar-responsive-css';
  s.textContent = TOPBAR_CSS;
  document.head.appendChild(s);
}

const TITULOS = {
  '/':                    'Dashboard',
  '/ordenes':             'Órdenes',
  '/clientes':            'Clientes',
  '/mapa':                'Mapa de Red',
  '/tecnicos':            'Técnicos',
  '/reportes':            'Reportes',
  '/perfil':              'Mi Perfil',
  '/programar':           'Programar',
  '/almacen':             'Almacén · Dashboard',
  '/almacen/inventario':  'Almacén · Inventario',
  '/almacen/devoluciones': 'Almacén · Devoluciones',
  '/almacen/reportes':    'Almacén · Reportes',
  '/plantaexterna':       'Planta externa',
};

function tituloDeRuta(pathname) {
  if (pathname === '/') return TITULOS['/'];
  const match = Object.keys(TITULOS)
    .filter(r => r !== '/')
    .sort((a, b) => b.length - a.length)   // más específico primero
    .find(r => pathname.startsWith(r));
  return match ? TITULOS[match] : 'Panel';
}

export default function Topbar({ esMovil, colapsado, anchoSidebar, onMenuToggle, onColapsarToggle }) {
  const usuario  = useAuthStore(s => s.usuario);
  const logout   = useAuthStore(s => s.logout);
  const loc      = useLocation();
  const navigate = useNavigate();

  const [showMenu,  setShowMenu]  = useState(false);
  const [showNotis, setShowNotis] = useState(false);

  // ── Notificaciones ──────────────────────────────────────────
  const qc = useQueryClient();
  const sedeId = usuario?.sedeId;

  const { data: notisData } = useQuery({
    queryKey: ['notificaciones-admin', sedeId],
    queryFn:  () => notificacionesApi.listar({ sedeId }).then(r => r.data),
    refetchInterval: 10000,   // refresca cada 10 seg
    enabled: !!sedeId,
  });
  const notificaciones = notisData?.items || [];

  const marcarLeida = async (id) => {
    await notificacionesApi.marcarLeida(id);
    qc.invalidateQueries({ queryKey: ['notificaciones-admin'] });
  };

  const marcarTodas = async () => {
    await notificacionesApi.marcarTodasLeidas(sedeId);
    qc.invalidateQueries({ queryKey: ['notificaciones-admin'] });
  };

  const titulo    = tituloDeRuta(loc.pathname);
  const iniciales = `${usuario?.nombre?.[0] || ''}${usuario?.apellido?.[0] || ''}`.toUpperCase();

  const cerrarTodo = () => { setShowMenu(false); setShowNotis(false); };

  return (
    <header style={{
      position: 'fixed', top: 0, right: 0,
      left: esMovil ? 0 : anchoSidebar,
      height: 56,
      background: '#FFFFFF',
      borderBottom: '1px solid #E2ECF4',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 16,
      zIndex: 600,
      transition: 'left .2s ease',
    }}>

      {/* Hamburguesa — solo móvil */}
      {esMovil && (
        <button onClick={onMenuToggle}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 8,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#5A7A9A', marginLeft: -8,
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#F4F8FC'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          aria-label="Abrir menú">
          <Menu size={20}/>
        </button>
      )}

      {/* Colapsar — solo escritorio */}
      {!esMovil && (
        <button onClick={onColapsarToggle}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 8,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#5A7A9A', marginLeft: -8,
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#F4F8FC'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          aria-label={colapsado ? 'Expandir menú' : 'Colapsar menú'}>
          <PanelLeft size={19}/>
        </button>
      )}

      {/* Título */}
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 16, fontWeight: 800, color: '#0D1B2A',
        margin: 0, letterSpacing: '-0.01em',
        flex: 1, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {titulo}
      </h1>

      {/* ── Lado derecho ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>

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
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#F4F8FC'}
            onMouseLeave={e => { if (!showNotis) e.currentTarget.style.background = 'transparent'; }}>
            <Bell size={18}/>
            {notificaciones.length > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                minWidth: 16, height: 16, borderRadius: 999,
                background: '#DC2626', border: '1.5px solid #fff',
                fontSize: 9, fontWeight: 800, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', lineHeight: 1,
              }}>
                {notificaciones.length > 99 ? '99+' : notificaciones.length}
              </span>
            )}
          </button>

          {showNotis && (
            <>
              <div onClick={() => setShowNotis(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 998 }}/>
              <div className="topbar-notis-panel" style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                width: 300, background: '#FFFFFF',
                border: '1px solid #E2ECF4', borderRadius: 12,
                boxShadow: '0 8px 24px rgba(30,58,138,0.12)',
                overflow: 'hidden', zIndex: 999,
              }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #EAF1F8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0D1B2A' }}>
                    Notificaciones {notificaciones.length > 0 && <span style={{ marginLeft: 6, fontSize: 11, background: '#DC2626', color: '#fff', borderRadius: 20, padding: '1px 7px' }}>{notificaciones.length}</span>}
                  </span>
                  {notificaciones.length > 0 && (
                    <button onClick={marcarTodas} style={{ fontSize: 11, color: '#3B9FD4', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      Marcar todas leídas
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
                    {notificaciones.map(n => (
                      <div key={n.id}
                        onClick={() => { marcarLeida(n.id); setShowNotis(false); if (n.link) navigate(n.link); }}
                        style={{
                          display: 'flex', gap: 10, padding: '10px 14px',
                          borderBottom: '1px solid #EAF1F8', cursor: 'pointer',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F4F8FC'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                          background: n.tipo === 'ENVIO_PENDIENTE_RECEPCION' ? '#F59E0B15'
                            : n.tipo === 'STOCK_CRITICO' ? '#DC262615'
                            : n.tipo === 'STOCK_BAJO'    ? '#F59E0B15'
                            : '#DC262615',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {n.tipo === 'ENVIO_PENDIENTE_RECEPCION' ? <span style={{ fontSize: 15 }}>📦</span>
                            : n.tipo === 'STOCK_CRITICO'             ? <span style={{ fontSize: 15 }}>🚨</span>
                            : n.tipo === 'STOCK_BAJO'                ? <span style={{ fontSize: 15 }}>⚠️</span>
                            : <Bell size={15} color="#DC2626"/>
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#0D1B2A' }}>
                            {n.titulo}
                          </div>
                          <div style={{ fontSize: 11, color: '#5A7A9A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {n.detalle}
                          </div>
                        </div>
                      </div>
                    ))}
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
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '5px 8px 5px 6px', borderRadius: 10,
              background: showMenu ? '#F4F8FC' : 'transparent',
              border: '1px solid', borderColor: showMenu ? '#E2ECF4' : 'transparent',
              cursor: 'pointer', transition: 'all .15s',
            }}
            onMouseEnter={e => { if (!showMenu) e.currentTarget.style.background = '#F4F8FC'; }}
            onMouseLeave={e => { if (!showMenu) e.currentTarget.style.background = 'transparent'; }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: '#3B9FD4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff',
            }}>
              {iniciales || '?'}
            </div>
            <div className="topbar-username" style={{ textAlign: 'left', lineHeight: 1.3 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0D1B2A' }}>
                {usuario?.nombre} {usuario?.apellido}
              </div>
              <div style={{ fontSize: 10, color: '#8AAABB' }}>Administrador</div>
            </div>
            <ChevronDown size={14} color="#8AAABB"
              style={{ transition: 'transform .15s', transform: showMenu ? 'rotate(180deg)' : 'none' }}/>
          </button>

          {showMenu && (
            <>
              <div onClick={() => setShowMenu(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 999 }}/>
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 8,
                width: 220, background: '#FFFFFF',
                border: '1px solid #E2ECF4', borderRadius: 12,
                boxShadow: '0 8px 24px rgba(30,58,138,0.12)',
                overflow: 'hidden', zIndex: 1000,
              }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #EAF1F8' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0D1B2A' }}>
                    {usuario?.nombre} {usuario?.apellido}
                  </div>
                  <div style={{ fontSize: 11, color: '#8AAABB', marginTop: 2 }}>
                    {usuario?.email || ''}
                  </div>
                  {usuario?.sede && (
                    <span style={{
                      display: 'inline-block', marginTop: 6,
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                      background: 'rgba(59,159,212,0.1)', color: '#3B9FD4',
                    }}>
                      {usuario.sede.nombre}
                    </span>
                  )}
                </div>
                <div style={{ padding: 6 }}>
                  <button
                    onClick={() => { setShowMenu(false); navigate('/perfil'); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                      padding: '8px 10px', borderRadius: 8,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: '#5A7A9A',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F4F8FC'; e.currentTarget.style.color = '#1E3A8A'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5A7A9A'; }}>
                    <UserCircle size={15}/> Mi perfil
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); navigate('/perfil#2fa'); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                      padding: '8px 10px', borderRadius: 8,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: '#1E3A8A',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#EEF3FC'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                    <Shield size={15}/> Autenticación 2FA
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