import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, CheckCircle, Clock, XCircle, TrendingUp, Users, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { ordenesApi } from '../services/api';
import { Card, Spinner, Btn, Input } from '../components/ui';
import { fmtFecha, fmtFechaHora, fmtMinutos, ESTADO_CONFIG } from '../utils/helpers';
import { useTiposOrden } from '../hooks/useTiposOrden';

function StatBox({ label, value, color, icon: Icon }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '18px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: color + '18', border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)', lineHeight: 1, color: 'var(--txt)' }}>
          {value ?? <Spinner size={16} />}
        </div>
        <div style={{ fontSize: 12, color: 'var(--txt-2)', marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

function BarChart({ data, total }) {
  if (!data || total === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map(({ label, value, color }) => (
        <div key={label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
            <span style={{ color: 'var(--txt-2)' }}>{label}</span>
            <span style={{ color, fontWeight: 600 }}>
              {value} <span style={{ color: 'var(--txt-3)', fontWeight: 400 }}>({Math.round(value / total * 100)}%)</span>
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3, background: color,
              width: `${Math.round(value / total * 100)}%`,
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReportesPage() {
  const [exportando, setExportando] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const { tipoLabel } = useTiposOrden();

  // Una sola query que trae los AGREGADOS calculados en backend
  const { data: stats } = useQuery({
    queryKey: ['reportes-stats', fechaDesde, fechaHasta],
    queryFn:  () => ordenesApi.reportes({
      ...(fechaDesde && { fechaDesde }),
      ...(fechaHasta && { fechaHasta }),
    }).then(r => r.data),
  });

  const total = stats?.total || 0;

  // Convertir el dict del backend a array ordenado para los charts
  const byEstado = Object.entries(stats?.porEstado || {})
    .map(([k, v]) => ({
      label: ESTADO_CONFIG[k]?.label || k,
      value: v,
      color: ESTADO_CONFIG[k]?.color || '#8b91a8',
    }))
    .sort((a, b) => b.value - a.value);

  const byTipo = Object.entries(stats?.porTipo || {})
    .map(([k, v]) => ({
      label: tipoLabel(k),
      value: v,
      color: 'var(--accent)',
    }))
    .sort((a, b) => b.value - a.value);

  const topTecnicos      = stats?.topTecnicos     || [];
  const topMax           = topTecnicos[0]?.completadas || 0;
  const tecnicosActivos  = stats?.tecnicosActivos || 0;

  // Exportar Excel — paginado para no romper con miles de órdenes
  const exportarExcel = async () => {
    if (!total) { toast.error('Sin datos para exportar'); return; }
    setExportando(true);
    const toastId = toast.loading('Generando reporte...');

    try {
      // Traer todas las órdenes paginando en bloques de 200
      const limit = 200;
      let all = [];
      let page = 1;
      while (true) {
        const r = await ordenesApi.listar({
          page, limit,
          ...(fechaDesde && { fechaDesde }),
          ...(fechaHasta && { fechaHasta }),
        });
        const bloque = r.data?.data || [];
        all = all.concat(bloque);
        toast.loading(`Cargando datos... ${all.length} / ${total}`, { id: toastId });
        if (bloque.length < limit) break;
        if (page > 200)              break; // safety stop (40k filas)
        page++;
      }

      if (!all.length) { toast.error('Sin datos', { id: toastId }); setExportando(false); return; }

      const filas = all.map(o => ({
        'N° Orden':           o.nServicio,
        'Tipo':               tipoLabel(o.tipoOrden),
        'Estado':             ESTADO_CONFIG[o.estado]?.label || o.estado,
        'Abonado':            o.abonado,
        'DNI':                o.dni        || '',
        'Contrato':           o.contrato   || '',
        'Celular':            o.celular    || '',
        'Dirección':          o.direccion  || '',
        'Referencia':         o.referencia || '',
        'Sector':             o.sector     || '',
        'Observación':        o.observacion || '',
        'IP WAN':             o.ipWan      || '',
        'Máscara':            o.mascara    || '',
        'Gateway':            o.gateway    || '',
        'Fecha Servicio':     fmtFecha(o.fechaServicio),
        'Fecha Creación':     fmtFechaHora(o.createdAt),
        'Fecha Aceptación':   o.fechaAceptacion ? fmtFechaHora(o.fechaAceptacion) : '',
        'Fecha Inicio':       o.fechaInicio     ? fmtFechaHora(o.fechaInicio)     : '',
        'Fecha Fin':          o.fechaFin        ? fmtFechaHora(o.fechaFin)        : '',
        'Tiempo (min)':       o.tiempoInstalacion || '',
        'Tiempo formateado':  o.tiempoInstalacion ? fmtMinutos(o.tiempoInstalacion) : '',
        'Técnico':            o.tecnico ? `${o.tecnico.usuario.nombre} ${o.tecnico.usuario.apellido}` : '',
        'Teléfono Técnico':   o.tecnico?.usuario?.telefono  || '',
        'Zona Técnico':       o.tecnico?.zonaAsignada       || '',
        'GPS Latitud':        o.instalacion?.latitud        || '',
        'GPS Longitud':       o.instalacion?.longitud       || '',
        'WiFi SSID':          o.instalacion?.configOnu?.ssid          || '',
        'N° Serie ONU':       o.instalacion?.configOnu?.serialNumber  || '',
        'RX (dBm)':           o.instalacion?.configOnu?.potenciaRx    || '',
        'TX (dBm)':           o.instalacion?.configOnu?.potenciaTx    || '',
        'Temperatura (°C)':   o.instalacion?.configOnu?.temperatura   || '',
      }));

      const ws = XLSX.utils.json_to_sheet(filas);
      ws['!cols'] = Object.keys(filas[0]).map(k => ({
        wch: Math.max(k.length, ...filas.map(f => String(f[k] || '').length)) + 2,
      }));

      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
        if (cell) cell.s = { font: { bold: true } };
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Servicios');

      // Hoja: Distribución por Estado (respeta el rango de fechas filtrado)
      const wsEstado = XLSX.utils.json_to_sheet(
        byEstado.map(e => ({
          'Estado':     e.label,
          'Cantidad':   e.value,
          '% del total': total > 0 ? `${Math.round(e.value / total * 100)}%` : '0%',
        }))
      );
      wsEstado['!cols'] = [{ wch: 24 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsEstado, 'Distribución por Estado');

      // Hoja: Distribución por Tipo (respeta el rango de fechas filtrado)
      const wsTipo = XLSX.utils.json_to_sheet(
        byTipo.map(t => ({
          'Tipo de orden': t.label,
          'Cantidad':      t.value,
          '% del total':   total > 0 ? `${Math.round(t.value / total * 100)}%` : '0%',
        }))
      );
      wsTipo['!cols'] = [{ wch: 32 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsTipo, 'Distribución por Tipo');

      const fecha = new Date().toISOString().split('T')[0];
      const sufijoFecha = (fechaDesde || fechaHasta) ? `_${fechaDesde || 'inicio'}_a_${fechaHasta || fecha}` : '';
      XLSX.writeFile(wb, `EnetFiber_Servicios${sufijoFecha}_${fecha}.xlsx`);
      toast.success(`✓ ${all.length} registros exportados`, { id: toastId });
    } catch (err) {
      toast.error('Error al generar el reporte', { id: toastId });
    } finally {
      setExportando(false);
    }
  };

  return (
    <div style={{ padding: 28 }} className="animate-fade">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Reportes</h1>
          <p style={{ color: 'var(--txt-3)', fontSize: 12, marginTop: 3 }}>Resumen general del sistema · {total} órdenes</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <Input label="Desde" type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ width: 150 }} />
          <Input label="Hasta" type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ width: 150 }} />
          {(fechaDesde || fechaHasta) && (
            <Btn variant="ghost" size="sm" onClick={() => { setFechaDesde(''); setFechaHasta(''); }}>
              Limpiar
            </Btn>
          )}
          <Btn variant="primary" icon={<Download size={13}/>} onClick={exportarExcel} disabled={!total || exportando} loading={exportando}>
            {exportando ? 'Generando...' : 'Exportar Excel'}
          </Btn>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatBox label="Total órdenes"    value={total}                                color="var(--accent)" icon={BarChart2}   />
        <StatBox label="Completadas"      value={stats?.porEstado?.COMPLETADA         || 0} color="var(--green)"  icon={CheckCircle} />
        <StatBox label="Esp. NOC"         value={stats?.porEstado?.PENDIENTE_NOC      || 0} color="var(--yellow)" icon={Clock}       />
        <StatBox label="Para técnico"     value={stats?.porEstado?.PENDIENTE_TECNICO  || 0} color="var(--accent)" icon={TrendingUp}  />
        <StatBox label="Canceladas"       value={stats?.porEstado?.CANCELADA          || 0} color="var(--red)"    icon={XCircle}     />
        <StatBox label="Técnicos activos" value={tecnicosActivos}                            color="var(--purple)" icon={Users}       />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>

        <Card>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, marginBottom: 18, color: 'var(--txt-2)' }}>
            DISTRIBUCIÓN POR ESTADO
          </h3>
          {!stats ? <Spinner /> : <BarChart data={byEstado} total={total} />}
        </Card>

        <Card>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, marginBottom: 18, color: 'var(--txt-2)' }}>
            DISTRIBUCIÓN POR TIPO
          </h3>
          {!stats ? <Spinner /> : <BarChart data={byTipo} total={total} />}
        </Card>

        <Card style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--txt-2)' }}>
            TOP TÉCNICOS — INSTALACIONES COMPLETADAS
          </h3>
          {topTecnicos.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--txt-3)' }}>Sin datos aún</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topTecnicos.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: i === 0 ? 'rgba(245,158,11,0.15)' : 'var(--bg-3)',
                    border: `1px solid ${i === 0 ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    color: i === 0 ? 'var(--yellow)' : 'var(--txt-3)',
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                      <span style={{ fontWeight: 500 }}>{t.nombre} {t.apellido}</span>
                      <span style={{ color: 'var(--green)', fontWeight: 600 }}>{t.completadas} completadas</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        background: i === 0 ? 'var(--yellow)' : 'var(--green)',
                        width: topMax > 0 ? `${t.completadas / topMax * 100}%` : '0%',
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}