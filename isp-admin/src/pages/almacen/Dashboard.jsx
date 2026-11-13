import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Send, Warehouse, TrendingDown, AlertTriangle, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { stockApi } from '../../services/api';
import { useSedeVista } from '../../hooks/useSedeVista';
import { Spinner } from '../../components/ui';

// ─── CSS ─────────────────────────────────────────────────────
const CSS = `
  .adash-grid2 { grid-template-columns: 1fr 1fr; }
  @media (max-width: 900px) { .adash-grid2 { grid-template-columns: 1fr !important; } }
`;
if (typeof document !== 'undefined' && !document.getElementById('adash-css')) {
  const s = document.createElement('style'); s.id = 'adash-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

const COLORS_BAR = ['#3B9FD4', '#58a6ff', '#1E3A8A', '#3fb950', '#e3b341', '#bc8cff'];

// ── Tooltip ───────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
      padding: '8px 12px', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    }}>
      {label && <div style={{ fontWeight: 700, color: '#111827', marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

// ── Stat card ─────────────────────────────────────────────────
function Stat({ label, value, icon: Icon, color, bg, trend }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
      padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 12, display: 'grid',
        placeItems: 'center', background: bg, flexShrink: 0,
      }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', lineHeight: 1.2, marginTop: 2 }}>{value ?? 0}</div>
      </div>
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────
function Card({ title, subtitle, icon: Icon, iconColor = '#3B9FD4', children, style }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', ...style }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
        {Icon && <Icon size={14} color={iconColor} />}
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ padding: '14px 18px' }}>{children}</div>
    </div>
  );
}

function fmtFechaCorta(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

export default function AdminAlmacenDashboard() {
  // Gerente: la sede que eligió arriba, o todas (el backend suma todas sin sede)
  const { sedeId, sedeNombre, gerente } = useSedeVista();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stock-stats', sedeId],
    enabled:  Boolean(sedeId) || gerente,
    queryFn:  () => stockApi.stats().then(r => r.data),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <Spinner size={28} />
    </div>
  );

  const data = stats || {};

  // ── Datos para gráficas ───────────────────────────────────
  const dataTecnicos = (data.misTecnicos || [])
    .filter(t => t.itemsAsignados > 0)
    .sort((a, b) => b.itemsAsignados - a.itemsAsignados)
    .slice(0, 6)
    .map(t => ({
      nombre: t.nombre.split(' ')[0],
      nombreCompleto: t.nombre,
      items: t.itemsAsignados,
    }));

  const dataBajo = (data.stockBajo || [])
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 7)
    .map(p => ({
      nombre: p.nombre?.length > 22 ? p.nombre.substring(0, 22) + '…' : p.nombre,
      nombreCompleto: p.nombre,
      stock:  p.stock,
      minimo: p.minimo,
    }));

  const dataPie = [
    { name: 'Bajo mínimo', value: (data.stockBajo || []).length },
    { name: 'En stock',    value: Math.max(0, (data.totalProductos || 0) - (data.stockBajo || []).length) },
  ].filter(d => d.value > 0);

  const ultimasSalidas = (data.ultimasSalidas || []).slice(0, 5);

  return (
    <div style={{ padding: 24, background: '#f9fafb', minHeight: '100vh' }} className="animate-fade">

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>Almacén</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#6b7280' }}>Inventario y movimientos de {sedeNombre}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>
          {sedeNombre}
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <Stat label="Items en sede"    value={data.itemsEnSede}            icon={Package}      color="#3B9FD4" bg="#eff6ff" />
        <Stat label="Técnicos"         value={data.tecnicos}               icon={Send}         color="#3fb950" bg="rgba(63,185,80,0.1)" />
        <Stat label="Movimientos hoy"  value={data.movimientosHoy}         icon={Warehouse}    color="#e3b341" bg="rgba(227,179,65,0.1)" />
        <Stat label="Bajo stock"       value={(data.stockBajo||[]).length} icon={TrendingDown}  color="#ef4444" bg="rgba(239,68,68,0.08)" />
      </div>

      {/* ── Fila 1: Técnicos + Pie ── */}
      <div className="adash-grid2" style={{ display: 'grid', gap: 16, marginBottom: 16 }}>

        {/* Items por técnico */}
        <Card title="Items por técnico" subtitle="Stock asignado a cada técnico" icon={Send}>
          {dataTecnicos.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '24px 0' }}>Sin técnicos con stock asignado</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dataTecnicos} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="items" name="Items" radius={[5, 5, 0, 0]}>
                  {dataTecnicos.map((_, i) => <Cell key={i} fill={COLORS_BAR[i % COLORS_BAR.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Pie distribución */}
        <Card title="Estado del stock" subtitle="Distribución de productos" icon={Package}>
          {dataPie.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '24px 0' }}>Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={dataPie} cx="50%" cy="42%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value">
                  <Cell fill="#ef4444" />
                  <Cell fill="#3B9FD4" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={9} formatter={v => <span style={{ fontSize: 12, color: '#374151' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ── Fila 2: Stock bajo (barras) + Últimas salidas ── */}
      <div className="adash-grid2" style={{ display: 'grid', gap: 16, marginBottom: 16 }}>

        {/* Stock bajo — barras horizontales */}
        <Card title="Productos bajo mínimo" subtitle="Stock actual vs nivel mínimo" icon={TrendingDown} iconColor="#ef4444">
          {dataBajo.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 0', gap: 8 }}>
              <div style={{ fontSize: 28 }}>✅</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#3fb950' }}>Todo el stock en niveles normales</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, dataBajo.length * 34)}>
              <BarChart data={dataBajo} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="minimo" name="Mínimo" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
                <Bar dataKey="stock"  name="Stock"  fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Últimas 5 salidas */}
        <Card title="Últimas salidas del día" subtitle="Asignaciones recientes a técnicos" icon={Clock} iconColor="#e3b341">
          {ultimasSalidas.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '24px 0' }}>Sin movimientos hoy</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ultimasSalidas.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', background: '#f9fafb',
                  border: '1px solid #f3f4f6', borderRadius: 8,
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                    background: '#eff6ff', display: 'grid', placeItems: 'center',
                  }}>
                    <Package size={15} color="#3B9FD4" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.item}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                      {fmtFechaCorta(s.fecha)}
                    </div>
                  </div>
                  <div style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 800,
                    background: '#dbeafe', color: '#1d4ed8', flexShrink: 0,
                  }}>
                    −{s.cantidad}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Lista completa stock bajo ── */}
      {dataBajo.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #fee2e2', background: '#fef2f2', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14} color="#ef4444" />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#dc2626' }}>
              {dataBajo.length} producto{dataBajo.length !== 1 ? 's' : ''} requieren reposición
            </span>
          </div>
          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(data.stockBajo || []).map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 12px', background: '#fafafa',
                border: '1px solid #f3f4f6', borderRadius: 8,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.nombre}
                </span>
                <div style={{ display: 'flex', gap: 16, flexShrink: 0, marginLeft: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stock</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#ef4444', fontSize: 15 }}>{p.stock}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mínimo</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#9ca3af', fontSize: 15 }}>{p.minimo}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}