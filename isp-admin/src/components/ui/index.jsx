import React from 'react';
import { ESTADO_CONFIG, fmtMinutos } from '../../utils/helpers';
import ReactDOM from 'react-dom';

/* ── EstadoBadge ─────────────────────────────────────────────── */
export function EstadoBadge({ estado }) {
  const cfg = ESTADO_CONFIG[estado] || { label: estado, color: '#8b91a8', bg: 'rgba(139,145,168,0.1)', icon: '●' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      color: cfg.color, background: cfg.bg, letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 9 }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

/* ── Badge genérico ──────────────────────────────────────────── */
export function Badge({ children, color = 'blue' }) {
  const colors = {
    blue:   ['#3b82f6', 'rgba(59,130,246,0.1)'],
    green:  ['#22c55e', 'rgba(34,197,94,0.1)'],
    yellow: ['#f59e0b', 'rgba(245,158,11,0.1)'],
    red:    ['#ef4444', 'rgba(239,68,68,0.1)'],
    purple: ['#a855f7', 'rgba(168,85,247,0.1)'],
    cyan:   ['#06b6d4', 'rgba(6,182,212,0.1)'],
    gray:   ['#8b91a8', 'rgba(139,145,168,0.1)'],
  };
  const [c, bg] = colors[color] || colors.gray;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, color: c, background: bg, letterSpacing: '0.04em',
    }}>{children}</span>
  );
}

/* ── Timer badge — muestra tiempo transcurrido ───────────────── */
export function TimerBadge({ fechaAceptacion, completada }) {
  const [mins, setMins] = React.useState(null);

  React.useEffect(() => {
    if (!fechaAceptacion || completada) return;
    const calc = () => setMins(Math.round((Date.now() - new Date(fechaAceptacion)) / 60000));
    calc();
    const t = setInterval(calc, 30000); // actualiza cada 30s
    return () => clearInterval(t);
  }, [fechaAceptacion, completada]);

  if (!fechaAceptacion) return null;

  const minutos = completada
    ? null // si está completada no mostramos timer en vivo
    : mins;

  const color = !minutos ? '#22c55e'
    : minutos < 60  ? '#22c55e'
    : minutos < 120 ? '#f59e0b'
    : '#ef4444';

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      color, background: color + '15', letterSpacing: '0.03em',
    }}>
      ⏱ {minutos !== null ? fmtMinutos(minutos) : '...'}
    </span>
  );
}

/* ── Btn ─────────────────────────────────────────────────────── */
export function Btn({
  children, variant = 'primary', size = 'md', onClick, disabled,
  type = 'button', style = {}, icon, loading,
  className, onMouseEnter, onMouseLeave, // 👈 nuevo
}) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.02em',
    borderRadius: 8, cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.5 : 1, transition: 'all .15s',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'transparent', // 👈 cambiado
  };
  const sizes = { sm: { padding: '5px 12px', fontSize: 12 }, md: { padding: '8px 18px', fontSize: 13 }, lg: { padding: '11px 24px', fontSize: 14 } };
  const variants = {
    primary: { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' },
    ghost:   { background: 'transparent', color: 'var(--txt-2)', borderColor: 'var(--border-2)' },
    danger:  { background: 'var(--red-bg)', color: 'var(--red)', borderColor: 'rgba(239,68,68,0.25)' },
    success: { background: 'var(--green-bg)', color: 'var(--green)', borderColor: 'rgba(34,197,94,0.25)' },
    yellow:  { background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.25)' },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={className} 
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {loading ? <Spinner size={13} color="currentColor" /> : icon && <span style={{ display: 'flex' }}>{icon}</span>}
      {children}
    </button>
  );
}

/* ── Input ───────────────────────────────────────────────────── */
export function Input({ label, error, icon, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 12, color: 'var(--txt-2)', fontWeight: 500 }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)', display: 'flex' }}>{icon}</span>}
        <input {...props} style={{
          width: '100%', padding: icon ? '9px 12px 9px 34px' : '9px 12px',
          background: 'var(--bg-3)', border: `1px solid ${error ? 'var(--red)' : 'var(--border-2)'}`,
          borderRadius: 8, color: 'var(--txt)', fontSize: 13, outline: 'none', transition: 'border-color .15s',
          ...props.style,
        }} />
      </div>
      {error && <span style={{ fontSize: 11, color: 'var(--red)' }}>{error}</span>}
    </div>
  );
}

/* ── Select ──────────────────────────────────────────────────── */
export function Select({ label, error, children, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 12, color: 'var(--txt-2)', fontWeight: 500 }}>{label}</label>}
      <select {...props} style={{
        width: '100%', padding: '9px 12px', background: 'var(--bg-3)',
        border: `1px solid ${error ? 'var(--red)' : 'var(--border-2)'}`,
        borderRadius: 8, color: 'var(--txt)', fontSize: 13, outline: 'none', appearance: 'none',
        ...props.style,
      }}>{children}</select>
      {error && <span style={{ fontSize: 11, color: 'var(--red)' }}>{error}</span>}
    </div>
  );
}

/* ── Card ────────────────────────────────────────────────────── */
export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: 20, ...style,
    }}>{children}</div>
  );
}

/* ── Spinner ─────────────────────────────────────────────────── */
export function Spinner({ size = 20, color = 'var(--accent)' }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid ${color}30`, borderTopColor: color,
      borderRadius: '50%', animation: 'spin .7s linear infinite', flexShrink: 0,
    }} />
  );
}

/* ── Empty ───────────────────────────────────────────────────── */
export function Empty({ icon, title, subtitle }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--txt-3)' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <p style={{ fontSize: 15, color: 'var(--txt-2)', fontWeight: 600, marginBottom: 4 }}>{title}</p>
      {subtitle && <p style={{ fontSize: 13 }}>{subtitle}</p>}
    </div>
  );
}

/* ── Avatar ──────────────────────────────────────────────────── */
export function Avatar({ nombre, apellido, size = 32 }) {
  const txt = `${nombre?.[0] || ''}${apellido?.[0] || ''}`.toUpperCase();
  const colors = ['#3b82f6','#22c55e','#f59e0b','#a855f7','#ef4444','#14b8a6'];
  const idx = (nombre?.charCodeAt(0) || 0) % colors.length;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: colors[idx] + '20', border: `1.5px solid ${colors[idx]}50`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: colors[idx],
      fontFamily: 'var(--font-display)',
    }}>{txt}</div>
  );
}

/* ── Modal ───────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, width = 480 }) {
  React.useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
      padding: 20,
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        width: '100%',
        maxWidth: width,
        maxHeight: '85vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
        animation: 'fadeIn .2s ease both',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>
            {title}
          </h2>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--txt-3)', fontSize: 20, lineHeight: 1,
            transition: 'all .15s', background: 'transparent', border: 'none', cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--txt)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--txt-3)'; }}>
            ×
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Table ───────────────────────────────────────────────────── */
export function Table({ headers, children, loading }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: '10px 14px', textAlign: 'left', color: 'var(--txt-3)',
                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 11,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={headers.length} style={{ textAlign: 'center', padding: 40 }}><Spinner /></td></tr>
          ) : children}
        </tbody>
      </table>
    </div>
  );
}

export function Tr({ children, onClick }) {
  return (
    <tr onClick={onClick} style={{ borderBottom: '1px solid var(--border)', cursor: onClick ? 'pointer' : 'default', transition: 'background .12s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {children}
    </tr>
  );
}

export function Td({ children, style = {} }) {
  return <td style={{ padding: '11px 14px', color: 'var(--txt)', verticalAlign: 'middle', ...style }}>{children}</td>;
}
