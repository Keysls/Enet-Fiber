import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Warehouse, ArrowDownToLine, ArrowUpFromLine, Send,
  PackageCheck, ClipboardCheck, Search, Calendar,
  ChevronDown, XCircle, FileDown, FileText, X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { stockApi } from '../../services/api';
import { useSedeSeleccionada } from './hooks';

const CSS = `
  .rep-stats       { flex-wrap: nowrap; }
  .rep-filters     { flex-wrap: nowrap; }
  .rep-detail-table { display: table; width: 100%; border-collapse: collapse; }
  .rep-detail-cards { display: none; }

  @media (max-width: 1080px) {
    .rep-stats {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      flex-wrap: unset !important;
    }
    .rep-stats > button { flex: unset !important; min-width: unset !important; padding: 12px !important; }
    .rep-filters { flex-direction: column !important; flex-wrap: unset !important; }
    .rep-filters > * { width: 100% !important; min-width: unset !important; }
    .rep-filters > div { width: 100% !important; }
    .rep-filters select { width: 100% !important; min-width: unset !important; }
    .rep-group-header { flex-wrap: wrap; gap: 6px !important; }
    .rep-group-header-actions { margin-left: 0 !important; width: 100%; }
    .rep-detail-table { display: none !important; }
    .rep-detail-cards { display: flex !important; flex-direction: column; gap: 6px; padding: 8px 12px; }
  }

  .rep-detail-card {
    background: var(--bg-3); border: 1px solid var(--border);
    border-radius: 8px; padding: 10px 12px;
    display: flex; flex-direction: column; gap: 4px;
  }

  /* ── Modal exportación ── */
  .exp-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .exp-modal {
    background: #fff; border-radius: 12px; width: 100%; max-width: 480px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2); overflow: hidden; font-family: inherit;
  }
  .exp-header {
    padding: 16px 20px 14px; border-bottom: 1px solid #e5e7eb;
    display: flex; align-items: center; justify-content: space-between;
  }
  .exp-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }
  .exp-footer {
    padding: 12px 20px; border-top: 1px solid #e5e7eb;
    display: flex; gap: 8px; justify-content: flex-end;
  }
  .exp-format-btn {
    flex: 1; padding: 12px 14px; border-radius: 8px;
    border: 1.5px solid #e5e7eb; background: #fff;
    cursor: pointer; transition: all .15s;
    display: flex; align-items: center; gap: 10px; text-align: left;
  }
  .exp-format-btn.active { border-color: #2563eb; background: #eff6ff; }
  .exp-format-btn:hover:not(.active) { border-color: #93c5fd; background: #f8faff; }
  .exp-label { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px; display: block; }
  .exp-sublabel { font-size: 11px; color: #6b7280; margin-top: 1px; }
  .exp-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .exp-field-label { font-size: 11px; color: #6b7280; margin-bottom: 4px; display: block; }
  .exp-input {
    width: 100%; height: 36px; padding: 0 10px;
    background: #fff; border: 1px solid #d1d5db;
    border-radius: 6px; color: #111827; font-size: 13px; outline: none;
    box-sizing: border-box; font-family: inherit;
  }
  .exp-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
  .exp-select {
    width: 100%; height: 36px; padding: 0 30px 0 10px;
    background: #fff; border: 1px solid #d1d5db;
    border-radius: 6px; color: #111827; font-size: 13px; outline: none;
    appearance: none; -webkit-appearance: none; cursor: pointer; font-family: inherit;
  }
  .exp-select:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
  .exp-count-bar {
    font-size: 13px; color: #1d4ed8; text-align: center;
    padding: 8px 12px; background: #eff6ff; border-radius: 6px; border: 1px solid #bfdbfe;
  }
  .exp-count-bar strong { font-weight: 800; }
  .exp-btn-cancel {
    padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600;
    background: #fff; border: 1px solid #d1d5db; color: #374151; cursor: pointer; transition: all .15s;
  }
  .exp-btn-cancel:hover { background: #f9fafb; }
`;

if (typeof document !== 'undefined' && !document.getElementById('rep-responsive-css')) {
  const s = document.createElement('style');
  s.id = 'rep-responsive-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

const TIPO_META = {
  entrada:         { label: 'Entrada stock',      Icon: ArrowDownToLine, color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
  envio_entrada:   { label: 'Recepción de envío', Icon: PackageCheck,    color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
  salida:          { label: 'Salida a técnico',   Icon: ArrowUpFromLine, color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  salida_directa:  { label: 'Salida directa',     Icon: ArrowUpFromLine, color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
  envio_salida:    { label: 'Envío a sede',        Icon: Send,            color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  consumo:         { label: 'Consumo técnico',    Icon: ClipboardCheck,  color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  envio_cancelado: { label: 'Envío cancelado',    Icon: XCircle,         color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

function fmtCantidad(cantidad) {
  if (typeof cantidad === 'string') return cantidad;
  const n = Number(cantidad);
  if (isNaN(n)) return cantidad;
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function fmtDatetime(d) {
  const date = new Date(d);
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function limpiarComentario(comentario) {
  if (!comentario) return null;
  if (/^Orden:\s*[0-9a-f-]{36}$/i.test(comentario.trim())) return null;
  return comentario;
}

// ── Modal exportación ─────────────────────────────────────────
function ModalExport({ open, onClose, movimientos, sedes, loading }) {
  const [formato,    setFormato]    = useState('pdf');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [sedeFiltro, setSedeFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [producto,   setProducto]   = useState('');

  if (!open) return null;

  const productosUnicos = [...new Set(movimientos.map(m => m.item).filter(Boolean))].sort();

  const aplicarFiltros = () => movimientos.filter(m => {
    const fecha = m.fecha ? new Date(m.fecha) : null;
    if (fechaDesde && fecha && fecha < new Date(fechaDesde + 'T00:00:00')) return false;
    if (fechaHasta && fecha && fecha > new Date(fechaHasta + 'T23:59:59')) return false;
    if (tipoFiltro && m.tipo !== tipoFiltro) return false;
    if (producto && m.item !== producto) return false;
    if (sedeFiltro) {
      const nombre = sedes.find(s => s.id === sedeFiltro)?.nombre?.toLowerCase() || '';
      const enMov  = [m.sede_nombre, m.sede_origen, m.sede_destino].some(s => s?.toLowerCase().includes(nombre))
                  || m.sedeId === sedeFiltro;
      if (!enMov) return false;
    }
    return true;
  });

  const toRows = (data) => data.map(m => ({
    'Fecha y hora':         fmtDatetime(m.fecha),
    'Tipo':                 TIPO_META[m.tipo]?.label || m.tipo || '—',
    'Producto / Ítem':      m.item || '—',
    'Cantidad':             fmtCantidad(m.cantidad),
    'Técnico':              m.tecnico_nombre || '—',
    'Sede origen':          m.sede_origen || '—',
    'Sede destino':         m.sede_destino || m.sede_nombre || '—',
    'Guía':                 m.guia || '—',
    'Comentario / Motivo':  limpiarComentario(m.comentario) || m.motivo || '—',
  }));

  const exportarExcel = () => {
    const rows = toRows(aplicarFiltros());
    const ws   = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 28 }, { wch: 10 }, { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 35 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    const nombre = ['movimientos', fechaDesde, fechaHasta ? 'al_' + fechaHasta : '', tipoFiltro].filter(Boolean).join('_');
    XLSX.writeFile(wb, nombre + '.xlsx');
    onClose();
  };

  const exportarPDF = async () => {
    const data  = aplicarFiltros();
    const rows  = toRows(data);
    const cols  = Object.keys(rows[0] || {});
    const rango = [fechaDesde, fechaHasta].filter(Boolean).join(' al ') || 'Todos los períodos';
    const sedeL = sedeFiltro ? sedes.find(s => s.id === sedeFiltro)?.nombre || sedeFiltro : 'Todas';
    const tipoL = tipoFiltro ? TIPO_META[tipoFiltro]?.label || tipoFiltro : 'Todos';
    const prodL = producto || '';
    const ahora = new Date();
    const fechaGen = ahora.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
    const horaGen  = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    // Cargar logo como base64 (public/logo-e.png)
    let logoHtml = `<div class="logo-box">E</div>`;
    try {
      const resp = await fetch('/logo-e.png');
      const blob = await resp.blob();
      const logoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      logoHtml = `<img src="${logoBase64}" style="height:48px;width:48px;object-fit:contain;border-radius:10px;" />`;
    } catch (_) {}

    // Resumen por tipo (para los KPIs)
    const resumenTipo = {};
    for (const m of data) {
      const t = m.tipo?.toLowerCase() || 'otro';
      const label = TIPO_META[t]?.label || t;
      const color = TIPO_META[t]?.color || '#94a3b8';
      if (!resumenTipo[label]) resumenTipo[label] = { count: 0, color };
      resumenTipo[label].count++;
    }
    const resumenHtml = Object.entries(resumenTipo)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([label, { count, color }]) =>
        `<div class="kpi"><div class="kpi-val" style="color:${color}">${count}</div><div class="kpi-label">${label}</div><div class="kpi-bar" style="background:${color}"></div></div>`
      ).join('');

    const thHtml = cols.map(h => '<th' + (h === 'Cantidad' ? ' style="text-align:right"' : '') + '>' + h + '</th>').join('');
    const tbHtml = rows.map((r, i) => {
      const tipo = data[i]?.tipo?.toLowerCase() || '';
      const dotColor = TIPO_META[tipo]?.color || '#94a3b8';
      const cells = cols.map((k) => {
        if (k === 'Tipo') return '<td><span class="tipo-dot" style="background:' + dotColor + '"></span>' + (r[k] ?? '—') + '</td>';
        if (k === 'Cantidad') return '<td class="cant-cell">' + (r[k] ?? '—') + '</td>';
        return '<td>' + (r[k] ?? '—') + '</td>';
      }).join('');
      return '<tr>' + cells + '</tr>';
    }).join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Auditoría de Almacén — Enet Fiber Perú</title>
<style>
  @page { size: A4 landscape; margin: 14mm 12mm 12mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; font-size: 10px; color: #1e293b; background: #fff; }

  .header {
    display: flex; align-items: flex-end; justify-content: space-between;
    padding: 0 0 16px 0; margin-bottom: 18px;
    border-bottom: 3px solid #1e3a8a;
  }
  .header-brand { display: flex; align-items: center; gap: 16px; }
  .logo-box {
    width: 48px; height: 48px; border-radius: 10px;
    background: linear-gradient(135deg, #1e3a8a, #2563eb);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 900; font-size: 22px; flex-shrink: 0;
  }
  .header-brand .brand-text .name { font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; line-height: 1.2; }
  .header-brand .brand-text .tag { font-size: 10px; color: #64748b; font-weight: 500; margin-top: 1px; }
  .header-title { text-align: right; }
  .header-title h1 { font-size: 19px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.4px; line-height: 1.2; }
  .header-title .doc-type {
    display: inline-block; margin-top: 6px; padding: 3px 11px;
    background: #1e3a8a; color: #fff; border-radius: 4px;
    font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  }

  .meta-row { display: flex; justify-content: space-between; align-items: stretch; gap: 12px; margin-bottom: 16px; }
  .meta-filters {
    flex: 1; display: flex; gap: 0; flex-wrap: wrap;
    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;
  }
  .meta-filters .filter-item {
    padding: 9px 16px; font-size: 10px; color: #475569;
    border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 2px;
    flex: 1; min-width: 100px;
  }
  .meta-filters .filter-item:last-child { border-right: none; }
  .meta-filters .filter-item strong { color: #1e3a8a; font-weight: 700; font-size: 12px; }
  .meta-filters .filter-item span { font-size: 8.5px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }
  .meta-date {
    padding: 9px 16px; background: linear-gradient(135deg, #1e3a8a, #2563eb); color: #fff; border-radius: 8px;
    font-size: 10px; line-height: 1.7; min-width: 160px; display: flex; flex-direction: column; justify-content: center;
  }
  .meta-date strong { font-weight: 700; }

  .kpis { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
  .kpi {
    flex: 1; min-width: 90px; padding: 12px 14px 10px;
    background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;
    text-align: center; position: relative; overflow: hidden;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
  }
  .kpi-val { font-size: 26px; font-weight: 900; line-height: 1.1; }
  .kpi-label { font-size: 8.5px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-top: 4px; }
  .kpi-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 4px; }

  .table-wrap { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
  table { width: 100%; border-collapse: collapse; }
  thead { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); }
  th {
    padding: 10px 12px; text-align: left; font-size: 8.5px; font-weight: 700;
    color: #fff; text-transform: uppercase; letter-spacing: 0.07em; white-space: nowrap;
  }
  td {
    padding: 7px 12px; border-bottom: 1px solid #f1f5f9;
    font-size: 9.8px; color: #334155; vertical-align: top; line-height: 1.45;
  }
  tr:nth-child(even) td { background: #f6f9fc; }
  .tipo-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
  .cant-cell { font-family: 'Consolas', monospace; font-weight: 700; text-align: right; color: #0f172a; }
  td:first-child { color: #64748b; font-size: 9.3px; white-space: nowrap; }

  .footer {
    display: flex; align-items: flex-end; justify-content: space-between;
    margin-top: 20px; padding-top: 12px; border-top: 2px solid #1e3a8a;
  }
  .footer-left { font-size: 11px; color: #1e3a8a; font-weight: 700; }
  .footer-left .sub { font-size: 8.5px; color: #94a3b8; font-weight: 500; margin-top: 2px; }
  .footer-right { text-align: right; font-size: 8.5px; color: #94a3b8; line-height: 1.6; }
  .footer-conf { display: inline-block; margin-top: 4px; padding: 3px 9px; background: #fef2f2; color: #991b1b; border-radius: 4px; font-size: 8px; font-weight: 700; letter-spacing: 0.04em; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header, .meta-row, .kpis { break-after: avoid; }
    tr { break-inside: avoid; }
  }
</style></head><body>

  <div class="header">
    <div class="header-brand">
      ${logoHtml}
      <div class="brand-text">
        <div class="name">Enet Fiber Perú</div>
        <div class="tag">Proveedor de Servicios de Internet</div>
      </div>
    </div>
    <div class="header-title">
      <h1>Auditoría de Almacén</h1>
      <div class="doc-type">Informe de movimientos</div>
    </div>
  </div>

  <div class="meta-row">
    <div class="meta-filters">
      <div class="filter-item"><span>Período</span><strong>${rango}</strong></div>
      <div class="filter-item"><span>Sede</span><strong>${sedeL}</strong></div>
      <div class="filter-item"><span>Tipo</span><strong>${tipoL}</strong></div>
      ${prodL ? `<div class="filter-item"><span>Producto</span><strong>${prodL}</strong></div>` : ''}
      <div class="filter-item"><span>Registros</span><strong>${data.length}</strong></div>
    </div>
    <div class="meta-date">
      <div><strong>Emitido:</strong> ${fechaGen}</div>
      <div><strong>Hora:</strong> ${horaGen}</div>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi">
      <div class="kpi-val" style="color:#1e3a8a">${data.length}</div>
      <div class="kpi-label">Total movimientos</div>
      <div class="kpi-bar" style="background:#1e3a8a"></div>
    </div>
    ${resumenHtml}
  </div>

  <div class="table-wrap">
    <table>
      <thead><tr>${thHtml}</tr></thead>
      <tbody>${tbHtml}</tbody>
    </table>
  </div>

  <div class="footer">
    <div class="footer-left">
      Enet Fiber Perú
      <div class="sub">Sistema de Gestión ISP — Módulo de Almacén</div>
    </div>
    <div class="footer-right">
      Documento generado automáticamente el ${fechaGen} a las ${horaGen}<br>
      <span class="footer-conf">USO INTERNO — CONFIDENCIAL</span>
    </div>
  </div>

</body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
    onClose();
  };

  const countFiltrado = aplicarFiltros().length;
  const isPDF = formato === 'pdf';

  const overlay = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  };
  const modal = {
    background: '#fff', borderRadius: 12, width: '100%', maxWidth: 468,
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)', overflow: 'hidden', fontFamily: 'inherit',
  };
  const inputStyle = {
    width: '100%', height: 38, padding: '0 10px',
    background: '#fff', border: '1px solid #d1d5db', borderRadius: 6,
    color: '#111827', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  };
  const selectStyle = {
    width: '100%', height: 38, padding: '0 28px 0 10px',
    background: '#fff', border: '1px solid #d1d5db', borderRadius: 6,
    color: '#111827', fontSize: 13, outline: 'none',
    appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', fontFamily: 'inherit',
  };
  const fmtBtn = (active) => ({
    flex: 1, padding: '11px 14px', borderRadius: 8,
    border: active ? '1.5px solid #2563eb' : '1.5px solid #e5e7eb',
    background: active ? '#eff6ff' : '#fff',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
  });
  const fmtIcon = (active) => ({
    width: 38, height: 38, borderRadius: 8, flexShrink: 0,
    background: active ? '#dbeafe' : '#f3f4f6',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  });
  const smallLabel = { display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 4 };

  const Chevron = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return ReactDOM.createPortal(
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>

        {/* Header */}
        <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Exportar auditoría</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: '#9ca3af' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Formato */}
          <div>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Formato</span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={fmtBtn(isPDF)} onClick={() => setFormato('pdf')}>
                <div style={fmtIcon(isPDF)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isPDF ? '#2563eb' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: isPDF ? '#1d4ed8' : '#111827', lineHeight: 1.3 }}>PDF</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Informe imprimible con logo</div>
                </div>
              </button>
              <button style={fmtBtn(!isPDF)} onClick={() => setFormato('excel')}>
                <div style={fmtIcon(!isPDF)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={!isPDF ? '#2563eb' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    <line x1="8" y1="13" x2="16" y2="17"/><line x1="16" y1="13" x2="8" y2="17"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: !isPDF ? '#1d4ed8' : '#111827', lineHeight: 1.3 }}>Excel</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>3 hojas: resumen, detalle, sedes</div>
                </div>
              </button>
            </div>
          </div>

          {/* Fechas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <span style={smallLabel}>Desde</span>
              <input type="date" style={inputStyle} value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
            </div>
            <div>
              <span style={smallLabel}>Hasta</span>
              <input type="date" style={inputStyle} value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
            </div>
          </div>

          {/* Sede + Tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <span style={smallLabel}>Sede</span>
              <div style={{ position: 'relative' }}>
                <select style={selectStyle} value={sedeFiltro} onChange={e => setSedeFiltro(e.target.value)}>
                  <option value="">Todas las sedes</option>
                  {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
                <Chevron />
              </div>
            </div>
            <div>
              <span style={smallLabel}>Tipo</span>
              <div style={{ position: 'relative' }}>
                <select style={selectStyle} value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}>
                  <option value="">Todos</option>
                  {Object.entries(TIPO_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <Chevron />
              </div>
            </div>
          </div>

          {/* Producto */}
          <div>
            <span style={smallLabel}>Producto</span>
            <div style={{ position: 'relative' }}>
              <select style={selectStyle} value={producto} onChange={e => setProducto(e.target.value)}>
                <option value="">Todos los productos</option>
                {productosUnicos.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <Chevron />
            </div>
          </div>

          {/* Count info */}
          <div style={{ fontSize: 13, color: loading ? '#6b7280' : '#1d4ed8', padding: '9px 14px', background: loading ? '#f9fafb' : '#eff6ff', borderRadius: 6, border: `1px solid ${loading ? '#e5e7eb' : '#bfdbfe'}` }}>
            {loading
              ? 'Cargando datos...'
              : <>Se exportarán <strong style={{ fontWeight: 800 }}>{countFiltrado}</strong> registro{countFiltrado !== 1 ? 's' : ''} con los filtros seleccionados.</>
            }
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, background: '#fff', border: '1px solid #d1d5db', color: '#374151', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button
            disabled={countFiltrado === 0 || loading}
            onClick={isPDF ? exportarPDF : exportarExcel}
            style={{
              padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 700,
              border: 'none', cursor: (countFiltrado === 0 || loading) ? 'not-allowed' : 'pointer',
              background: (countFiltrado === 0 || loading) ? '#9ca3af' : '#2563eb',
              color: '#fff', opacity: (countFiltrado === 0 || loading) ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {isPDF
                ? <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>
                : <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>
              }
            </svg>
            Exportar {isPDF ? 'PDF' : 'Excel'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}


// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ tipo, count, active, onClick }) {
  const meta = TIPO_META[tipo] || { label: tipo, Icon: Warehouse, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' };
  const { Icon } = meta;
  return (
    <button onClick={onClick} style={{
      flex: 1, minWidth: 0, background: active ? meta.color : 'var(--bg-card, #fff)',
      border: `1px solid ${active ? meta.color : 'var(--border, #e2e8f0)'}`,
      borderRadius: 12, padding: '16px 18px', cursor: 'pointer', textAlign: 'left',
      transition: 'all .15s', boxShadow: active ? `0 4px 14px ${meta.color}33` : 'none',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, display: 'grid', placeItems: 'center', flexShrink: 0,
        background: active ? '#ffffff22' : meta.bg, border: `1px solid ${active ? '#ffffff33' : meta.border}`,
      }}>
        <Icon size={18} color={active ? '#fff' : meta.color} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: active ? '#fff' : 'var(--txt, #0f172a)', letterSpacing: '-0.5px' }}>
          {count}
        </div>
        <div style={{ fontSize: 12, color: active ? '#ffffffcc' : 'var(--txt-3, #94a3b8)', marginTop: 3, fontWeight: 500 }}>
          {meta.label}
        </div>
      </div>
    </button>
  );
}

function GroupHeader({ tipo, guia, sede, count }) {
  const meta = TIPO_META[tipo?.toLowerCase()] || { label: tipo, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' };
  return (
    <div className="rep-group-header" style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
      background: meta.bg, borderBottom: `1px solid ${meta.border}`,
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: meta.color, background: `${meta.color}18`,
        border: `1px solid ${meta.color}33`, borderRadius: 6, padding: '2px 8px',
        textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
      }}>{meta.label}</span>
      {guia && <>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt, #0f172a)', fontFamily: 'monospace' }}>Guía: {guia}</span>
        <span style={{ color: 'var(--txt-3, #94a3b8)', fontSize: 12 }}>·</span>
      </>}
      {sede && (
        <span style={{ fontSize: 12, color: 'var(--txt-2, #475569)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--txt-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {tipo === 'envio_salida' ? '→' : tipo === 'envio_entrada' ? '←' : ''}
          </span>
          {sede}
        </span>
      )}
      <div className="rep-group-header-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--txt-3, #94a3b8)' }}>{count} producto{count !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function AlmacenReportes() {
  const { sedes, sedeId, setSedeId } = useSedeSeleccionada();
  const [busqueda,        setBusqueda]        = useState('');
  const [tipoFiltro,      setTipoFiltro]      = useState('');
  const [showExportModal, setShowExportModal] = useState(false);

  const auditoriaQ = useQuery({
    queryKey: ['stock-auditoria', sedeId],
    queryFn: () => stockApi.auditoria({ sedeId: sedeId || undefined }).then(r => r.data),
    staleTime: 30000,
  });

  // Query sin filtro de sede — exclusiva para exportación (siempre activa)
  const auditoriaExportQ = useQuery({
    queryKey: ['stock-auditoria-todos'],
    queryFn: () => stockApi.auditoria({}).then(r => r.data),
    staleTime: 60000,
  });

  const movimientos = auditoriaQ.data || [];

  const counts = useMemo(() => {
    const c = {};
    for (const m of movimientos) { const t = m.tipo?.toLowerCase(); c[t] = (c[t] || 0) + 1; }
    return c;
  }, [movimientos]);

  const filtrados = useMemo(() => {
    return movimientos
      .map(m => ({ ...m, tipo: m.estado === 'CANCELADO' ? 'envio_cancelado' : m.tipo?.toLowerCase() }))
      .filter(m => {
        const matchTipo = !tipoFiltro || m.tipo === tipoFiltro;
        const q = busqueda.toLowerCase();
        const matchBusq = !q || [m.item, m.usuario, m.guia, m.sede_nombre].some(v => v?.toLowerCase().includes(q));
        return matchTipo && matchBusq;
      });
  }, [movimientos, tipoFiltro, busqueda]);

  const porFecha = useMemo(() => {
    const map = {};
    for (const m of filtrados) {
      const fecha = m.fecha
        ? new Date(m.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'Sin fecha';
      if (!map[fecha]) map[fecha] = [];
      map[fecha].push(m);
    }
    return Object.fromEntries(
      Object.entries(map).sort(([a], [b]) => {
        if (a === 'Sin fecha') return 1;
        if (b === 'Sin fecha') return -1;
        return new Date(b) - new Date(a);
      })
    );
  }, [filtrados]);

  const selectStyle = {
    height: 36, padding: '0 32px 0 12px',
    background: 'var(--bg-card, #fff)', border: '1px solid var(--border, #e2e8f0)',
    borderRadius: 8, color: 'var(--txt, #0f172a)', fontSize: 13, outline: 'none',
    cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', width: '100%',
  };

  return (
    <div style={{ padding: 24 }} className="animate-fade">

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--txt, #0f172a)', letterSpacing: '-0.3px' }}>
          Auditoría de almacén
        </h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--txt-3, #94a3b8)' }}>
          Movimientos de stock por sede
        </p>
      </div>

      <div className="rep-stats" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(TIPO_META).map(([tipo]) => (
          <StatCard key={tipo} tipo={tipo} count={counts[tipo] || 0}
            active={tipoFiltro === tipo} onClick={() => setTipoFiltro(t => t === tipo ? '' : tipo)} />
        ))}
      </div>

      <div className="rep-filters" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por ítem, usuario, guía o sede..."
            style={{
              width: '100%', height: 36, paddingLeft: 32, paddingRight: 12,
              background: 'var(--bg-card, #fff)', border: '1px solid var(--border, #e2e8f0)',
              borderRadius: 8, color: 'var(--txt, #0f172a)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }} />
        </div>

        <div style={{ position: 'relative', minWidth: 160 }}>
          <select value={sedeId} onChange={e => setSedeId(e.target.value)} style={selectStyle}>
            <option value="">Todas las sedes</option>
            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre} - {s.ciudad}</option>)}
          </select>
          <ChevronDown size={13} color="#94a3b8" style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        <div style={{ position: 'relative', minWidth: 160 }}>
          <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)} style={selectStyle}>
            <option value="">Todos los tipos</option>
            {Object.entries(TIPO_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <ChevronDown size={13} color="#94a3b8" style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        <button onClick={() => setShowExportModal(true)} style={{
          height: 36, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6,
          background: '#2563EB', border: '1px solid #2563EB',
          borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
          <FileDown size={14} /> Exportar ({filtrados.length})
        </button>
      </div>

      <p style={{ fontSize: 13, color: 'var(--txt-3, #94a3b8)', marginBottom: 16 }}>
        <strong style={{ color: 'var(--txt-2, #475569)', fontWeight: 600 }}>{filtrados.length}</strong> registro(s)
        {tipoFiltro && <> · Tipo: <strong style={{ color: TIPO_META[tipoFiltro]?.color }}>{TIPO_META[tipoFiltro]?.label}</strong></>}
      </p>

      {Object.entries(porFecha).map(([fecha, items]) => {
        const subGroupsMap = new Map();
        const itemsOrdenados = [...items].sort((a, b) => {
          if (!a.fecha) return 1; if (!b.fecha) return -1;
          return new Date(a.fecha) - new Date(b.fecha);
        });
        for (const m of itemsOrdenados) {
          const key = `${m.tipo?.toLowerCase()}__${(m.guia || '').toUpperCase()}`;
          if (!subGroupsMap.has(key)) subGroupsMap.set(key, {
            tipo: m.tipo?.toLowerCase(), guia: m.guia?.toUpperCase(),
            sede: m.tipo?.toLowerCase() === 'envio_salida' ? m.sede_destino || m.sede_nombre
                : m.tipo?.toLowerCase() === 'envio_entrada' ? m.sede_origen || m.sede_nombre
                : m.sede_nombre,
            primeraFecha: m.fecha, items: [],
          });
          subGroupsMap.get(key).items.push(m);
        }

        return (
          <div key={fecha} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Calendar size={14} color="#94a3b8" />
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt, #0f172a)' }}>{fecha}</span>
              <span style={{ fontSize: 12, color: 'var(--txt-3, #94a3b8)' }}>{items.length} movimiento{items.length !== 1 ? 's' : ''}</span>
            </div>

            {[...subGroupsMap.values()].sort((a, b) => {
              if (!a.primeraFecha) return 1; if (!b.primeraFecha) return -1;
              return new Date(b.primeraFecha) - new Date(a.primeraFecha);
            }).map((sg, si) => (
              <div key={si} style={{
                background: 'var(--bg-card, #fff)', border: '1px solid var(--border, #e2e8f0)',
                borderRadius: 12, overflow: 'hidden', marginBottom: 12,
              }}>
                <GroupHeader tipo={sg.tipo} guia={sg.guia} sede={sg.sede} count={sg.items.length} />

                {/* Desktop: tabla */}
                <table className="rep-detail-table">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                      {['DETALLE', 'CANT.', 'DESTINATARIO / ORIGEN', 'COMENTARIO'].map(h => (
                        <th key={h} style={{
                          padding: '8px 16px', textAlign: h === 'CANT.' ? 'right' : 'left',
                          fontSize: 11, fontWeight: 700, color: 'var(--txt-3, #94a3b8)',
                          letterSpacing: '0.07em', background: 'var(--bg-2, #f8fafc)',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sg.items.map((m, i) => (
                      <tr key={i} style={{ borderBottom: i < sg.items.length - 1 ? '1px solid var(--border, #f1f5f9)' : 'none' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--txt, #0f172a)' }}>{m.item}</div>
                          {(m.usuario || m.tecnico) && (
                            <div style={{ fontSize: 11, color: 'var(--txt-3, #94a3b8)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              {m.tipo?.toLowerCase()?.includes('envio') && <Send size={10} color="#3b82f6" />}
                              {m.usuario ? `Por: ${m.usuario}` : `Técnico: ${m.tecnico}`}
                              {m.guia && <> · Guía: <strong style={{ fontFamily: 'monospace' }}>{m.guia}</strong></>}
                            </div>
                          )}
                          {(m.tipo === 'salida' || m.tipo === 'consumo') && m.tecnico_nombre && (
                            <div style={{ marginTop: 4 }}>
                              <span style={{ fontSize: 11, color: '#2563EB', fontWeight: 600, background: '#EFF6FF', padding: '1px 7px', borderRadius: 5 }}>
                                👤 {m.tecnico_nombre}
                              </span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
                          {fmtCantidad(m.cantidad)}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--txt-2, #475569)' }}>
                          {m.tipo === 'envio_salida' ? <span>→ <strong>{m.sede_destino || m.sede_nombre || '—'}</strong></span>
                          : m.tipo === 'envio_entrada' ? <span>← <strong>{m.sede_origen || m.sede_nombre || '—'}</strong></span>
                          : (m.sede_nombre || '—')}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--txt-3, #94a3b8)' }}>
                          {m.motivo_cancelacion
                            ? <span style={{ color: '#dc2626', fontWeight: 600 }}>❌ {m.motivo_cancelacion}</span>
                            : limpiarComentario(m.comentario) || m.motivo || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Móvil: cards */}
                <div className="rep-detail-cards">
                  {sg.items.map((m, i) => (
                    <div key={i} className="rep-detail-card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--txt, #0f172a)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.item}
                        </span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>×{fmtCantidad(m.cantidad)}</span>
                      </div>
                      {(m.usuario || m.tecnico) && (
                        <div style={{ fontSize: 11, color: 'var(--txt-3, #94a3b8)' }}>
                          {m.usuario ? `Por: ${m.usuario}` : `Técnico: ${m.tecnico}`}
                        </div>
                      )}
                      {(m.tipo === 'salida' || m.tipo === 'consumo') && m.tecnico_nombre && (
                        <div style={{ fontSize: 11, color: '#2563EB', fontWeight: 600 }}>👤 {m.tecnico_nombre}</div>
                      )}
                      {(m.sede_nombre || m.sede_destino || m.sede_origen) && (
                        <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>
                          {m.tipo === 'envio_salida' ? `→ ${m.sede_destino || m.sede_nombre}`
                          : m.tipo === 'envio_entrada' ? `← ${m.sede_origen || m.sede_nombre}`
                          : `📍 ${m.sede_nombre}`}
                        </div>
                      )}
                      {(limpiarComentario(m.comentario) || m.motivo || m.motivo_cancelacion) && (
                        <div style={{ fontSize: 11, color: m.motivo_cancelacion ? '#dc2626' : 'var(--txt-3)' }}>
                          {m.motivo_cancelacion ? `❌ ${m.motivo_cancelacion}` : (limpiarComentario(m.comentario) || m.motivo)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {!auditoriaQ.isLoading && filtrados.length === 0 && (
        <div style={{
          background: 'var(--bg-card, #fff)', border: '1px solid var(--border, #e2e8f0)',
          borderRadius: 12, padding: '48px 24px', textAlign: 'center', color: 'var(--txt-3, #94a3b8)', fontSize: 13,
        }}>
          Sin movimientos registrados
        </div>
      )}

      <ModalExport
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        movimientos={(auditoriaExportQ.data || []).map(m => ({ ...m, tipo: m.estado === 'CANCELADO' ? 'envio_cancelado' : m.tipo?.toLowerCase() }))}
        sedes={sedes}
        loading={auditoriaExportQ.isLoading}
      />
    </div>
  );
}