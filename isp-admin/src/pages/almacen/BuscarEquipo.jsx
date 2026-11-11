import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Search, ScanLine, MapPin, User, Router as RouterIcon, AlertTriangle, PackageSearch,
  Home, Truck, Undo2, ClipboardCheck, XCircle, Warehouse, LogOut, CircleHelp,
} from 'lucide-react';
import api from '../../services/api';
import { useEscaner } from '../../hooks/useEscaner';
import { Spinner } from '../../components/ui';

// Buscar equipo: dónde está una ONU ahora y todo lo que le pasó.
// Se busca pegando, escribiendo o escaneando el PON-SN (con la pistola no hace
// falta poner el cursor en la caja). El código va en la dirección (?codigo=)
// para poder abrirlo desde Inventario o mandar el enlace.

const CSS = `
  .beq-wrap { max-width: 880px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
  .beq-card { background: var(--bg-card, #fff); border: 1px solid var(--border, #e5e7eb); border-radius: 12px; padding: 18px 20px; }
  .beq-form { display: flex; gap: 10px; }
  .beq-input { flex: 1; min-width: 0; font: 600 18px var(--font-mono, monospace); letter-spacing: .04em; text-transform: uppercase;
    padding: 12px 14px 12px 42px; border: 1.5px solid var(--border-2, #d1d5db); border-radius: 10px; background: var(--bg, #fff); color: var(--txt, #111827); outline: none; }
  .beq-input:focus { border-color: var(--accent, #3B9FD4); }
  .beq-btn { padding: 0 20px; border: none; border-radius: 10px; background: var(--accent, #3B9FD4); color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; }
  .beq-btn:disabled { opacity: .5; cursor: default; }
  .beq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
  @media (max-width: 700px) { .beq-grid { grid-template-columns: 1fr; } .beq-form { flex-direction: column; } .beq-btn { padding: 12px; } }
  .beq-dato { font-size: 13px; color: var(--txt-2, #374151); line-height: 1.6; }
  .beq-dato b { color: var(--txt, #111827); font-weight: 600; }
  .beq-sub { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--txt-3, #6b7280); margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
  .beq-tl { list-style: none; margin: 0; padding: 0; }
  .beq-ev { position: relative; padding: 0 0 18px 30px; }
  .beq-ev:last-child { padding-bottom: 0; }
  .beq-ev::before { content: ''; position: absolute; left: 7px; top: 18px; bottom: -2px; width: 2px; background: var(--border, #e5e7eb); }
  .beq-ev:last-child::before { display: none; }
  .beq-punto { position: absolute; left: 0; top: 3px; width: 16px; height: 16px; border-radius: 50%; border: 3px solid var(--bg-card, #fff); box-shadow: 0 0 0 1px var(--border-2, #d1d5db); }
  .beq-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 8px; font: 600 12px var(--font-mono, monospace);
    background: var(--bg-3, #f3f4f6); color: var(--txt, #111827); border: 1px solid var(--border, #e5e7eb); cursor: pointer; }
  .beq-chip:hover { border-color: var(--accent, #3B9FD4); }
`;
if (typeof document !== 'undefined' && !document.getElementById('beq-css')) {
  const s = document.createElement('style'); s.id = 'beq-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

const ESTADOS = {
  instalada:  { color: '#16a34a', bg: '#dcfce7', Icon: Home },
  en_camino:  { color: '#d97706', bg: '#fef3c7', Icon: Truck },
  devolucion: { color: '#d97706', bg: '#fef3c7', Icon: Undo2 },
  revision:   { color: '#d97706', bg: '#fef3c7', Icon: ClipboardCheck },
  tecnico:    { color: '#2563eb', bg: '#dbeafe', Icon: User },
  almacen:    { color: '#0891b2', bg: '#cffafe', Icon: Warehouse },
  malogrado:  { color: '#dc2626', bg: '#fee2e2', Icon: XCircle },
  salida:     { color: '#6b7280', bg: '#f3f4f6', Icon: LogOut },
  otro:       { color: '#6b7280', bg: '#f3f4f6', Icon: CircleHelp },
};

const COLOR_EVENTO = {
  registro: '#0891b2', asignacion: '#2563eb', consumo: '#16a34a', olt: '#16a34a',
  devolucion: '#d97706', retiro: '#d97706', revision: '#0891b2', entrada: '#0891b2',
  malogrado: '#dc2626', salida_directa: '#6b7280', reingreso: '#0891b2', reingreso_malograda: '#0891b2',
  envio: '#d97706', envio_recibido: '#16a34a', envio_cancelado: '#6b7280', cambio_codigo: '#7c3aed', log: '#9ca3af',
};

const fmtFecha = (f) => new Date(f).toLocaleString('es-PE', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const limpiar = (v) => String(v || '').trim().toUpperCase();

export default function BuscarEquipo() {
  const [params, setParams] = useSearchParams();
  const codigo = limpiar(params.get('codigo'));
  const [texto, setTexto] = useState(codigo);
  const caja = useRef(null);

  useEffect(() => { setTexto(codigo); }, [codigo]);
  useEffect(() => { caja.current?.focus(); }, []);

  const buscar = (valor) => {
    const c = limpiar(valor);
    if (c.length < 4) return;
    setTexto(c);
    setParams({ codigo: c });
  };

  // La pistola funciona aunque el cursor no esté en la caja
  useEscaner(buscar, true);

  const q = useQuery({
    queryKey: ['historial-onu', codigo],
    enabled: codigo.length >= 4,
    queryFn: () => api.get('/onus/historial', { params: { codigo } }).then(r => r.data),
    retry: false,
  });
  const d = q.data;

  return (
    <div className="beq-wrap">
      <div className="beq-card">
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt, #111827)' }}>Buscar equipo</div>
        <div style={{ fontSize: 13, color: 'var(--txt-3, #6b7280)', margin: '2px 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ScanLine size={14} /> Escanea la ONU con la pistola, o escribe o pega su PON-SN
        </div>
        <form className="beq-form" onSubmit={e => { e.preventDefault(); buscar(texto); }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3, #6b7280)' }} />
            <input ref={caja} className="beq-input" value={texto} onChange={e => setTexto(e.target.value)}
              placeholder="OPTI5779ED2F" autoComplete="off" spellCheck={false} />
          </div>
          <button className="beq-btn" type="submit" disabled={limpiar(texto).length < 4}>Buscar</button>
        </form>
      </div>

      {q.isFetching && !d && <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}><Spinner /></div>}

      {q.isError && (
        <div className="beq-card" style={{ color: '#dc2626', fontSize: 14 }}>
          {q.error?.response?.data?.error || 'No se pudo buscar. Revisa la conexión e intenta otra vez.'}
        </div>
      )}

      {d && <Resultado d={d} onBuscar={buscar} />}
    </div>
  );
}

function Resultado({ d, onBuscar }) {
  const est = d.estado ? (ESTADOS[d.estado.tipo] || ESTADOS.otro) : null;

  return (
    <>
      {d.encontrada ? (
        <div className="beq-card" style={{ borderLeft: `4px solid ${est.color}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: est.bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <est.Icon size={22} color={est.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: '700 13px var(--font-mono, monospace)', color: 'var(--txt-3, #6b7280)' }}>{d.onu.codigoPon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: est.color, lineHeight: 1.25 }}>{d.estado.titulo}</div>
              {d.estado.detalle && <div className="beq-dato" style={{ marginTop: 2 }}>{d.estado.detalle}</div>}
              <div className="beq-dato" style={{ marginTop: 6, color: 'var(--txt-3, #6b7280)' }}>
                {d.onu.producto}{d.estado.sede ? ` · ${d.estado.sede}` : ''}
              </div>
            </div>
          </div>

          {(d.estado.cliente || d.estado.olt) && (
            <div className="beq-grid">
              {d.estado.cliente && (
                <div>
                  <div className="beq-sub"><User size={12} /> Cliente</div>
                  <div className="beq-dato">
                    <b>{d.estado.cliente.abonado}</b><br />
                    {d.estado.cliente.contrato && <>Contrato {d.estado.cliente.contrato}<br /></>}
                    {d.estado.cliente.direccion && <>{d.estado.cliente.direccion}<br /></>}
                    Orden N° {d.estado.cliente.orden}
                    {d.estado.cliente.tecnico && <> · técnico {d.estado.cliente.tecnico}</>}
                  </div>
                </div>
              )}
              {d.estado.olt && (
                <div>
                  <div className="beq-sub"><RouterIcon size={12} /> OLT</div>
                  <div className="beq-dato">
                    <b>{d.estado.olt.nombre || 'OLT sin nombre'}</b><br />
                    {d.estado.olt.puerto && <>Puerto {d.estado.olt.puerto}{d.estado.olt.onuId && ` · ONU ${d.estado.olt.onuId}`}<br /></>}
                    {d.estado.olt.vlan && <>VLAN {d.estado.olt.vlan}<br /></>}
                    {d.estado.olt.estado && String(d.estado.olt.estado).toLowerCase().replace(/_/g, ' ')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="beq-card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <PackageSearch size={22} color="var(--txt-3, #6b7280)" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--txt, #111827)' }}>No hay ninguna ONU {d.codigo} en el inventario</div>
            <div className="beq-dato">
              {d.eventos.length > 0
                ? 'Pero el código aparece en otros registros: abajo está lo que se encontró.'
                : 'Revisa que el código esté bien escrito.'}
            </div>
          </div>
        </div>
      )}

      {d.parecidas.length > 0 && (
        <div className="beq-card" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
          <div className="beq-sub" style={{ color: '#b45309' }}><AlertTriangle size={13} /> Códigos parecidos registrados</div>
          <div className="beq-dato" style={{ marginBottom: 10 }}>
            {d.encontrada
              ? 'Puede ser la misma ONU registrada dos veces con un carácter de más o de menos.'
              : '¿Buscabas alguno de estos?'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {d.parecidas.map(p => (
              <button key={p.id} type="button" className="beq-chip" onClick={() => onBuscar(p.codigoPon)} title={p.producto || ''}>
                {p.codigoPon}
                <span style={{ fontFamily: 'var(--font-body, sans-serif)', fontWeight: 500, color: 'var(--txt-3, #6b7280)' }}>· {p.sede}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {d.eventos.length > 0 && (
        <div className="beq-card">
          <div className="beq-sub" style={{ marginBottom: 14 }}>Historial</div>
          <ol className="beq-tl">
            {[...d.eventos].reverse().map((e, i) => (
              <li key={i} className="beq-ev">
                <span className="beq-punto" style={{ background: COLOR_EVENTO[e.tipo] || '#9ca3af' }} />
                <div style={{ fontSize: 12, color: 'var(--txt-3, #6b7280)' }}>{fmtFecha(e.fecha)}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt, #111827)' }}>{e.titulo}</div>
                {e.detalle && <div className="beq-dato">{e.detalle}</div>}
                {(e.sede || e.usuario) && (
                  <div style={{ fontSize: 12, color: 'var(--txt-3, #6b7280)', display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 2 }}>
                    {e.sede && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{e.sede}</span>}
                    {e.usuario && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><User size={11} />{e.usuario}</span>}
                  </div>
                )}
              </li>
            ))}
          </ol>
          <div style={{ fontSize: 11, color: 'var(--txt-hint, #9ca3af)', marginTop: 16, borderTop: '1px solid var(--border, #e5e7eb)', paddingTop: 10 }}>
            Los envíos entre sedes, las salidas directas y las correcciones de código quedan en el historial desde que se activó esta pantalla.
            {!d.historialCompleto && ' (Todavía falta activar ese registro en el servidor.)'}
          </div>
        </div>
      )}
    </>
  );
}
