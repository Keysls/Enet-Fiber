import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity, ClipboardList, Users, GitBranch,
  MapPin, Wifi, Contact, LayoutDashboard,
  Package, BookOpen, BarChart2, LogOut, Shield, Settings, ScanSearch,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import api from '../../services/api';

// ─── Estilos base ───────────────────────────────────────────────────────────
const S = {
  aside: {
    position:      'fixed',
    top:           0,
    left:          0,
    bottom:        0,
    width:         224,
    background:    '#FFFFFF',
    borderRight:   '1px solid #F1F5F9',
    boxShadow:     '1px 0 8px rgba(0,0,0,0.04)',
    display:       'flex',
    flexDirection: 'column',
    zIndex:        100,
    overflow:      'hidden',
    transition:    'transform .25s ease, width .2s ease',
  },
  header: {
    padding:      '20px 16px',
    borderBottom: '1px solid #F1F5F9',
    display:      'flex',
    alignItems:   'center',
    gap:          10,
  },
  logoWrap: {
    width:          32,
    height:         32,
    borderRadius:   8,
    flexShrink:     0,
    background:     '#EFF6FF',
    border:         '1px solid #DBEAFE',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    overflow:       'hidden',
  },
  brandName: {
    fontSize:   14,
    fontWeight: 700,
    color:      '#1E293B',
    lineHeight: 1.2,
  },
  brandSub: {
    fontSize:  10,
    color:     '#94A3B8',
    marginTop: 1,
  },
  nav: {
    flex:          1,
    padding:       '10px 10px',
    overflowY:     'auto',
    display:       'flex',
    flexDirection: 'column',
    gap:           2,
  },
  sectionLabel: {
    fontSize:      9,
    fontWeight:    700,
    color:         '#94A3B8',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding:       '12px 6px 4px',
  },
  sectionDivider: {
    height:     1,
    background: '#F1F5F9',
    margin:     '10px 4px',
  },
  itemBase: {
    display:        'flex',
    alignItems:     'center',
    gap:            10,
    padding:        '9px 10px',
    borderRadius:   12,
    textDecoration: 'none',
    fontSize:       13,
    fontWeight:     500,
    transition:     'all .15s',
    border:         'none',
    cursor:         'pointer',
    width:          '100%',
    textAlign:      'left',
  },
  itemActive: {
    background: '#2563EB',
    color:      '#FFFFFF',
    boxShadow:  '0 4px 10px rgba(37,99,235,0.30)',
  },
  itemInactive: {
    background: 'transparent',
    color:      '#64748B',
  },
  footer: {
    padding:   '8px 10px 12px',
    borderTop: '1px solid #F1F5F9',
  },
  logoutBtn: {
    display:      'flex',
    alignItems:   'center',
    gap:          10,
    padding:      '9px 10px',
    borderRadius: 12,
    fontSize:     13,
    fontWeight:   500,
    color:        '#94A3B8',
    background:   'transparent',
    border:       'none',
    cursor:       'pointer',
    width:        '100%',
    transition:   'all .15s',
  },
};

// ─── Health status ───────────────────────────────────────────────────────────
function HealthStatus() {
  const { isLoading, isError, isFetching, dataUpdatedAt } = useQuery({
    queryKey:        ['health-check'],
    queryFn:         () => api.get('/health', { timeout: 5000 }).then(r => r.data),
    refetchInterval: 30000,
    retry:           1,
    retryDelay:      1500,
    staleTime:       0,
  });

  let color, label;
  if (isLoading) {
    color = '#F59E0B'; label = 'Verificando…';
  } else if (isError) {
    color = '#EF4444'; label = 'Sin conexión';
  } else {
    const segs = Math.floor((Date.now() - dataUpdatedAt) / 1000);
    label = isFetching ? 'Verificando…'
          : segs < 5   ? 'En línea'
          : segs < 60  ? `hace ${segs}s`
          : `hace ${Math.floor(segs / 60)}min`;
    color = '#22C55E';
  }

  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          6,
      padding:      '6px 10px',
      borderRadius: 8,
      background:   '#F8FAFC',
      border:       '1px solid #F1F5F9',
      marginTop:    2,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: color, flexShrink: 0,
        animation: 'pulse 2s infinite',
        display: 'inline-block',
      }}/>
      <span style={{ fontSize: 10, color: '#64748B' }}>{label}</span>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
export default function Sidebar({ esMovil, abierto, colapsado, onCerrar }) {
  const usuario      = useAuthStore(s => s.usuario);
  const loc          = useLocation();
  const esSuperAdmin = usuario?.rol === 'SUPERADMIN';

  const NAV_BASE = [
    { to: '/',                label: 'Monitor',         icon: Activity      },
    { to: '/pendientes',      label: 'Pendientes WAN',  icon: ClipboardList },
    { to: '/seguimiento',     label: 'Seguimiento',     icon: GitBranch     },
    { to: '/clientes',        label: 'Clientes',        icon: Contact       },
    { to: '/onus-pendientes', label: 'ONUs Pendientes', icon: Wifi          },
  ];

  const NAV_ALMACEN = [
    { to: '/almacen',            label: 'Dashboard',  icon: LayoutDashboard },
    { to: '/almacen/inventario', label: 'Inventario', icon: Package         },
    { to: '/almacen/equipo',     label: 'Buscar equipo', icon: ScanSearch  },
    { to: '/almacen/catalogo',   label: 'Catálogo',   icon: BookOpen        },
    { to: '/almacen/reportes',   label: 'Reportes',   icon: BarChart2       },
  ];

  const NAV_SUPER = [
    { to: '/sedes',       label: 'Sedes',         icon: MapPin   },
    { to: '/usuarios',    label: 'Usuarios',      icon: Users    },
    { to: '/tipos-orden', label: 'Tipos de Orden', icon: Settings },
    { to: '/logs',        label: 'Logs',          icon: Shield   },
  ];

  const EXACT = ['/', '/almacen'];
  const isActive = (to) =>
    EXACT.includes(to) ? loc.pathname === to : loc.pathname.startsWith(to);

  return (
    <>
      {/* Backdrop móvil */}
      {esMovil && abierto && (
        <div
          onClick={onCerrar}
          style={{
            position:   'fixed',
            inset:      0,
            background: 'rgba(15,23,42,0.45)',
            zIndex:     99,
          }}
        />
      )}

      <aside style={{
        ...S.aside,
        width:     colapsado ? 64 : 224,
        transform: esMovil && !abierto ? 'translateX(-100%)' : 'translateX(0)',
      }}>

        {/* ── Header ── */}
        <div style={{
          ...S.header,
          justifyContent: colapsado ? 'center' : 'flex-start',
        }}>
          <div style={S.logoWrap}>
            <img
              src="/logo-e.png"
              alt="Enet"
              style={{ width: 22, height: 22, objectFit: 'contain' }}
              onError={e => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML =
                  '<span style="font-size:15px;font-weight:900;color:#2563EB">E</span>';
              }}
            />
          </div>
          {!colapsado && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.brandName}>Enet Fiber Perú</div>
              <div style={S.brandSub}>Panel NOC</div>
            </div>
          )}
        </div>


        {/* ── Nav ── */}
        <nav style={S.nav}>

          {!colapsado
            ? <div style={S.sectionLabel}>Operaciones</div>
            : <div style={S.sectionDivider}/>
          }
          {NAV_BASE.map(({ to, label, icon: Icon }) => (
            <NavItem key={to} to={to} label={label} Icon={Icon}
              active={isActive(to)} colapsado={colapsado}
              esMovil={esMovil} onCerrar={onCerrar}/>
          ))}

          {!colapsado
            ? <div style={S.sectionLabel}>Almacén</div>
            : <div style={S.sectionDivider}/>
          }
          {NAV_ALMACEN.map(({ to, label, icon: Icon }) => (
            <NavItem key={to} to={to} label={label} Icon={Icon}
              active={isActive(to)} colapsado={colapsado}
              esMovil={esMovil} onCerrar={onCerrar}/>
          ))}

          {esSuperAdmin && (
            <>
              {!colapsado
                ? <div style={S.sectionLabel}>Administración</div>
                : <div style={S.sectionDivider}/>
              }
              {NAV_SUPER.map(({ to, label, icon: Icon }) => (
                <NavItem key={to} to={to} label={label} Icon={Icon}
                  active={isActive(to)} colapsado={colapsado}
                  esMovil={esMovil} onCerrar={onCerrar}/>
              ))}
            </>
          )}
        </nav>

      </aside>
    </>
  );
}

// ─── NavItem ─────────────────────────────────────────────────────────────────
function NavItem({ to, label, Icon, active, colapsado, esMovil, onCerrar }) {
  const activeStyle   = { ...S.itemBase, ...S.itemActive,   justifyContent: colapsado ? 'center' : 'flex-start' };
  const inactiveStyle = { ...S.itemBase, ...S.itemInactive, justifyContent: colapsado ? 'center' : 'flex-start' };

  return (
    <NavLink
      to={to}
      onClick={() => { if (esMovil) onCerrar(); }}
      title={colapsado ? label : undefined}
      style={active ? activeStyle : inactiveStyle}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = '#EFF6FF';
          e.currentTarget.style.color      = '#1D4ED8';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color      = '#64748B';
        }
      }}
    >
      <Icon size={17} style={{ flexShrink: 0 }}/>
      {!colapsado && <span>{label}</span>}
    </NavLink>
  );
}