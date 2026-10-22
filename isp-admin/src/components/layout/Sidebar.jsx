import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { stockApi } from '../../services/api';
import { LayoutDashboard, ClipboardList, Contact, Users, BarChart2, Map, Package, UserCog, Wifi, ArrowDownToLine, HardHat } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

const NAV_PRINCIPAL = [
  { to: '/',         label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ordenes',  label: 'Órdenes',   icon: ClipboardList   },
  { to: '/clientes', label: 'Clientes',  icon: Contact         },
  { to: '/mapa',     label: 'Mapa',      icon: Map             },
  { to: '/reportes', label: 'Reportes',  icon: BarChart2       },
  { to: '/planes',   label: 'Planes',    icon: Wifi            },
];

const NAV_ALMACEN = [
  { to: '/almacen',            label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/almacen/inventario', label: 'Inventario', icon: Package         },
  { to: '/almacen/devoluciones', label: 'Devoluciones', icon: ArrowDownToLine },
  { to: '/almacen/reportes',   label: 'Reportes',   icon: BarChart2       },
];

const NAV_PERSONAL = [
  { to: '/tecnicos',    label: 'Técnicos',       icon: Users    },
  { to: '/secretarios', label: 'Secretario(a)',  icon: UserCog  },
];

const NAV_PLANTA_EXTERNA = [
  { to: '/planta-externa', label: 'Planta Externa', icon: HardHat },
];

const S = {
  aside: {
    position:      'fixed',
    top:           0,
    left:          0,
    bottom:        0,
    background:    '#FFFFFF',
    borderRight:   '1px solid #F1F5F9',
    boxShadow:     '1px 0 8px rgba(0,0,0,0.04)',
    display:       'flex',
    flexDirection: 'column',
    zIndex:        999,
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
    flex:            1,
    padding:         '10px 10px',
    overflowY:       'auto',
    msOverflowStyle: 'none',
    scrollbarWidth:  'none',
    display:         'flex',
    flexDirection:   'column',
    gap:             2,
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
};

export default function Sidebar({ esMovil, abierto, colapsado, onCerrar }) {
  const loc     = useLocation();
  const usuario = useAuthStore(s => s.usuario);
  const esAdmin = usuario?.rol === 'ADMIN';

  // Misma queryKey que la página de Devoluciones: comparten caché y se refresca al aprobar/rechazar
  const { data: devolucionesPendientes } = useQuery({
    queryKey: ['devoluciones', 'pendiente'],
    queryFn:  () => stockApi.listarDevoluciones({ estado: 'pendiente' }).then(r => r.data),
    enabled:  esAdmin,
    refetchInterval: 60000,
  });
  const badges = { '/almacen/devoluciones': Array.isArray(devolucionesPendientes) ? devolucionesPendientes.length : 0 };

  const isActive = (to) =>
    to === '/' || to === '/almacen'
      ? loc.pathname === to
      : loc.pathname.startsWith(to);

  const navItemProps = { colapsado, esMovil, onCerrar };

  return (
    <>
      {esMovil && abierto && (
        <div
          onClick={onCerrar}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 998 }}
        />
      )}

      <aside style={{
        ...S.aside,
        width:     colapsado ? 64 : 224,
        transform: esMovil && !abierto ? 'translateX(-100%)' : 'translateX(0)',
      }}>

        {/* ── Header ── */}
        <div style={{ ...S.header, justifyContent: colapsado ? 'center' : 'flex-start' }}>
          <div style={S.logoWrap}>
            <img
              src="/logo-e.png"
              alt="Enet"
              style={{ width: 22, height: 22, objectFit: 'contain' }}
              onError={e => {
                e.target.style.display = 'none';
                e.target.parentNode.innerHTML =
                  '<span style="font-size:15px;font-weight:900;color:#2563EB">E</span>';
              }}
            />
          </div>
          {!colapsado && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.brandName}>Enet Fiber Perú</div>
              <div style={S.brandSub}>
                {esAdmin ? 'Panel Administrador' : 'Panel Secretaría'}
              </div>
            </div>
          )}
        </div>

        {/* ── Nav ── */}
        <nav style={S.nav}>

          {/* Menú principal */}
          {!colapsado ? <div style={S.sectionLabel}>Menú principal</div> : <div style={S.sectionDivider} />}
          {NAV_PRINCIPAL.map(({ to, label, icon: Icon }) => (
            <NavItem key={to} to={to} label={label} Icon={Icon} active={isActive(to)} {...navItemProps} />
          ))}

          {/* Almacén — solo ADMIN */}
          {esAdmin && (
            <>
              {!colapsado ? <div style={S.sectionLabel}>Almacén</div> : <div style={S.sectionDivider} />}
              {NAV_ALMACEN.map(({ to, label, icon: Icon }) => (
                <NavItem key={to} to={to} label={label} Icon={Icon} active={isActive(to)} badge={badges[to]} {...navItemProps} />
              ))}
            </>
          )}

          {/* Planta Externa — solo ADMIN */}
          {esAdmin && (
            <>
              {!colapsado ? <div style={S.sectionLabel}>Planta Externa</div> : <div style={S.sectionDivider} />}
              {NAV_PLANTA_EXTERNA.map(({ to, label, icon: Icon }) => (
                <NavItem key={to} to={to} label={label} Icon={Icon} active={isActive(to)} {...navItemProps} />
              ))}
            </>
          )}

          {/* Personal — solo ADMIN */}
          {esAdmin && (
            <>
              {!colapsado ? <div style={S.sectionLabel}>Personal</div> : <div style={S.sectionDivider} />}
              {NAV_PERSONAL.map(({ to, label, icon: Icon }) => (
                <NavItem key={to} to={to} label={label} Icon={Icon} active={isActive(to)} {...navItemProps} />
              ))}
            </>
          )}

        </nav>
      </aside>
    </>
  );
}

function NavItem({ to, label, Icon, active, badge, colapsado, esMovil, onCerrar }) {
  const activeStyle   = { ...S.itemBase, ...S.itemActive,   justifyContent: colapsado ? 'center' : 'flex-start', position: 'relative' };
  const inactiveStyle = { ...S.itemBase, ...S.itemInactive, justifyContent: colapsado ? 'center' : 'flex-start', position: 'relative' };
  const textoBadge = badge > 99 ? '99+' : String(badge);
  const pastilla = {
    background: '#EF4444', color: '#FFFFFF', fontSize: 10, fontWeight: 700,
    minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
  };

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
      <Icon size={17} style={{ flexShrink: 0 }} />
      {!colapsado && <span style={{ flex: 1 }}>{label}</span>}
      {badge > 0 && (
        <span
          title={`${badge} pendiente${badge !== 1 ? 's' : ''}`}
          style={colapsado ? { ...pastilla, position: 'absolute', top: 2, right: 4, minWidth: 16, height: 16, fontSize: 9 } : pastilla}
        >
          {textoBadge}
        </span>
      )}
    </NavLink>
  );
}