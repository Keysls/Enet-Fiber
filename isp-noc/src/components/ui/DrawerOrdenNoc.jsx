import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// ─────────────────────────────────────────────
// Hook detectar móvil
// ─────────────────────────────────────────────
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = React.useState(
    () => window.innerWidth < breakpoint
  );

  useEffect(() => {
    const handler = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);

  return isMobile;
}

// ─────────────────────────────────────────────
// DRAWER — tema claro (igual que DrawerOrden admin)
// ─────────────────────────────────────────────
export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  header,
  accentColor = '#3b9fd4',
  width = 520,
  children,
}) {
  const isMobile = useIsMobile();

  // cerrar con ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return createPortal(
    <>
      {/* BACKDROP */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          background: 'rgba(15,23,42,0.35)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity .25s ease',
          backdropFilter: open ? 'blur(2px)' : 'none',
        }}
      />

      {/* DRAWER */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: isMobile ? '100vw' : width,
          maxWidth: '100vw',
          height: '100dvh',
          zIndex: 9999,
          background: '#f8fafc',
          borderLeft: '1px solid #e2e8f0',
          boxShadow: '-2px 0 32px rgba(15,23,42,0.10)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform .32s cubic-bezier(.32,.72,0,1)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            flexShrink: 0,
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
          }}
        >
          {/* contenido */}
          <div
            style={{
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            {header ? (
              <div style={{ flex: 1, minWidth: 0 }}>{header}</div>
            ) : (
              <div>
                {subtitle && (
                  <div
                    style={{
                      fontSize: 11,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '.08em',
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    {subtitle}
                  </div>
                )}

                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: '#0f172a',
                  }}
                >
                  {title}
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: 'transparent',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all .15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <X size={16} />
            </button>
          </div>
            
        </div>

        {/* BODY */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '10px 14px 16px',
            background: '#f8fafc',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </div>
      </aside>
    </>,
    document.body
  );
}