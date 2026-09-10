import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Send, TrendingDown, Warehouse, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { stockApi } from '../../services/api';
import { useSedeSeleccionada } from './hooks';

const CSS = `
  .dash-header { flex-direction: row; align-items: center; }
  .dash-charts  { grid-template-columns: 1fr 1fr; }
  .dash-bajo-table { display: block; }
  .dash-bajo-list  { display: none; }

  @media (max-width: 900px) {
    .dash-charts { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 700px) {
    .dash-header {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 12px !important;
    }
    .dash-header > *:last-child { width: 100%; }
    .dash-header > *:last-child select { width: 100% !important; min-width: unset !important; }
    .dash-bajo-table { display: none; }
    .dash-bajo-list  { display: flex; flex-direction: column; gap: 8px; }
  }
`;

if (typeof document !== 'undefined' && !document.getElementById('dash-responsive-css')) {
  const s = document.createElement('style');
  s.id = 'dash-responsive-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

const inputStyle = {
  width: '100%', height: 36, padding: '0 12px',
  background: 'var(--bg-3)', border: '1px solid var(--border-2)',
  borderRadius: 6, color: 'var(--txt)', fontSize: 13, outline: 'none',
};

const COLORS_BAR  = ['#3b9fd4', '#58a6ff', '#1E3A8A', '#3fb950', '#e3b341', '#bc8cff'];
const COLORS_PIE  = ['#ef4444', '#3b9fd4'];

// ── Tooltip personalizado ─────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    }}>
      {label && <div style={{ fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--txt-2)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

function Header({ title, subtitle, right }) {
  return (
    <div className="dash-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)', border: '1px solid var(--border)', flexShrink: 0 }}>
          <Warehouse size={19} color="var(--blue)" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>{title}</h1>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>{subtitle}</p>
        </div>
      </div>
      {right}
    </div>
  );
}

function SedeSelect({ sedes, sedeId, setSedeId }) {
  return (
    <select value={sedeId} onChange={e => setSedeId(e.target.value)}
      style={{ ...inputStyle, width: 'auto', minWidth: 180 }}>
      <option value="">Seleccionar sede...</option>
      {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre} - {s.ciudad}</option>)}
    </select>
  );
}

function Stat({ label, value, icon: Icon, color = 'var(--blue)', bg = 'var(--blue-bg)' }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '16px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, display: 'grid', placeItems: 'center', background: bg, flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--txt)', fontFamily: 'var(--font-mono)', lineHeight: 1.2, marginTop: 2 }}>{value ?? 0}</div>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children, minHeight = 220 }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '18px 20px',
    }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--txt-3)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ minHeight }}>{children}</div>
    </div>
  );
}

function EmptyChart({ msg = 'Sin datos disponibles' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 160, color: 'var(--txt-3)', fontSize: 13 }}>
      {msg}
    </div>
  );
}

export default function AlmacenDashboard() {
  const { sedes, sedeId, setSedeId } = useSedeSeleccionada();

  const statsQ = useQuery({
    queryKey: ['stock-stats', sedeId],
    enabled:  Boolean(sedeId),
    queryFn:  () => stockApi.stats({ sedeId }).then(r => r.data),
  });
  const stats = statsQ.data || {};

  // ── Datos para gráficas ───────────────────────────────────
  // 1. Items asignados por técnico
  const dataTecnicos = (stats.misTecnicos || [])
    .filter(t => t.itemsAsignados > 0)
    .sort((a, b) => b.itemsAsignados - a.itemsAsignados)
    .slice(0, 8)
    .map(t => ({
      nombre: t.nombre.split(' ')[0], // solo primer nombre para el eje
      nombreCompleto: t.nombre,
      items: t.itemsAsignados,
    }));

  // 2. Últimas salidas de stock
  const dataUltimasSalidas = (stats.ultimasSalidas || [])
    .slice(0, 6)
    .reverse()
    .map(s => ({
      nombre: s.item?.length > 18 ? s.item.substring(0, 18) + '…' : s.item,
      cantidad: s.cantidad,
    }));

  // 3. Distribución stock: bajo vs normal
  const totalStockBajo = (stats.stockBajo || []).length;
  const totalProductos  = totalStockBajo + Math.max(0, (stats.itemsEnSede || 0) - totalStockBajo);
  const dataPie = [
    { name: 'Bajo mínimo', value: totalStockBajo },
    { name: 'OK',          value: Math.max(0, totalProductos - totalStockBajo) },
  ].filter(d => d.value > 0);

  // 4. Stock bajo — top productos críticos
  const dataStockBajo = (stats.stockBajo || [])
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 8)
    .map(p => ({
      nombre: p.nombre?.length > 20 ? p.nombre.substring(0, 20) + '…' : p.nombre,
      nombreCompleto: p.nombre,
      stock:  p.stock,
      minimo: p.minimo,
    }));

  const noData = !sedeId;

  return (
    <div style={{ padding: 24 }} className="animate-fade">
      <Header
        title="Almacén"
        subtitle="Resumen de stock, técnicos y movimientos"
        right={<SedeSelect sedes={sedes} sedeId={sedeId} setSedeId={setSedeId} />}
      />

      {noData ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 24px', color: 'var(--txt-3)', gap: 12,
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
        }}>
          <Warehouse size={36} color="var(--txt-3)" />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt-2)' }}>Selecciona una sede</div>
          <div style={{ fontSize: 13 }}>para ver el resumen del almacén</div>
        </div>
      ) : (
        <>
          {/* ── Stats ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            <Stat label="Items en sede"         value={stats.itemsEnSede}            icon={Package}      color="var(--blue)"  bg="var(--blue-bg)" />
            <Stat label="Técnicos activos"      value={stats.tecnicos}               icon={Send}         color="#3fb950"      bg="rgba(63,185,80,0.1)" />
            <Stat label="Salidas recientes"     value={stats.movimientosHoy}         icon={Warehouse}    color="#e3b341"      bg="rgba(227,179,65,0.1)" />
            <Stat label="Bajo stock"            value={totalStockBajo}               icon={TrendingDown} color="#ef4444"      bg="rgba(239,68,68,0.1)" />
          </div>

          {/* ── Gráficas fila 1 ── */}
          <div className="dash-charts" style={{ display: 'grid', gap: 16, marginBottom: 16 }}>

            {/* Items por técnico */}
            <ChartCard title="Items asignados por técnico" subtitle="Stock actual en mano de cada técnico">
              {dataTecnicos.length === 0 ? <EmptyChart msg="Sin técnicos con stock asignado" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dataTecnicos} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: 'var(--txt-3)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--txt-3)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-3)' }} />
                    <Bar dataKey="items" name="Items" radius={[4, 4, 0, 0]}>
                      {dataTecnicos.map((_, i) => (
                        <Cell key={i} fill={COLORS_BAR[i % COLORS_BAR.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Distribución stock */}
            <ChartCard title="Distribución del stock" subtitle="Productos bajo mínimo vs en estado normal">
              {dataPie.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={dataPie} cx="50%" cy="45%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={3} dataKey="value"
                    >
                      {dataPie.map((_, i) => (
                        <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      iconType="circle" iconSize={10}
                      formatter={v => <span style={{ fontSize: 12, color: 'var(--txt-2)' }}>{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* ── Gráficas fila 2 ── */}
          <div className="dash-charts" style={{ display: 'grid', gap: 16, marginBottom: 16 }}>

            {/* Stock bajo — barras horizontales */}
            <ChartCard title="Productos bajo mínimo" subtitle="Stock actual vs nivel mínimo configurado" minHeight={240}>
              {dataStockBajo.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8, color: 'var(--green)' }}>
                  <div style={{ fontSize: 32 }}>✅</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Todo el stock en niveles normales</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, dataStockBajo.length * 36)}>
                  <BarChart data={dataStockBajo} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--txt-3)' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 11, fill: 'var(--txt-2)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-3)' }} />
                    <Bar dataKey="minimo" name="Mínimo" fill="var(--border)" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="stock"  name="Stock"  fill="#ef4444"       radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Últimas salidas */}
            <ChartCard title="Últimas salidas de stock" subtitle="Productos más recientemente despachados a técnicos" minHeight={240}>
              {dataUltimasSalidas.length === 0 ? <EmptyChart msg="Sin salidas recientes" /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dataUltimasSalidas} margin={{ top: 4, right: 8, left: -10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="nombre"
                      tick={{ fontSize: 10, fill: 'var(--txt-3)' }}
                      axisLine={false} tickLine={false}
                      angle={-30} textAnchor="end" interval={0}
                    />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--txt-3)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-3)' }} />
                    <Bar dataKey="cantidad" name="Cantidad" fill="#3b9fd4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* ── Alerta stock bajo ── */}
          {dataStockBajo.length > 0 && (
            <div style={{
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 12, padding: '14px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <AlertTriangle size={15} color="#ef4444" />
                <span style={{ fontWeight: 700, fontSize: 14, color: '#ef4444' }}>
                  {dataStockBajo.length} producto{dataStockBajo.length !== 1 ? 's' : ''} bajo mínimo
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dataStockBajo.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', background: 'var(--bg-card)',
                    border: '1px solid var(--border)', borderRadius: 8,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.nombreCompleto}
                    </span>
                    <div style={{ display: 'flex', gap: 16, flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stock</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#ef4444', fontSize: 14 }}>{p.stock}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mínimo</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--txt-3)', fontSize: 14 }}>{p.minimo}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}