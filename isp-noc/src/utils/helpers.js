import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export const fmtFecha = (d) => {
  if (!d) return '—';
  try { return format(typeof d === 'string' ? parseISO(d) : d, 'dd/MM/yyyy', { locale: es }); }
  catch { return d; }
};

export const fmtFechaHora = (d) => {
  if (!d) return '—';
  try { return format(typeof d === 'string' ? parseISO(d) : d, 'dd/MM/yyyy HH:mm', { locale: es }); }
  catch { return d; }
};

export const minutosDesde = (fecha) =>
  fecha ? Math.round((Date.now() - new Date(fecha)) / 60000) : null;

export const fmtMinutos = (min) => {
  if (min === null || min === undefined) return '—';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}min`;
};

export const TIPO_LABEL = {
  // ── Internet ──────────────────────────────────────────────
  INSTALACION_I:      'Instalación Internet',
  ALTA_SERVICIO_I:    'Alta de Servicio Internet',
  ATENCION_NOC_I:     'Atención NOC',
  AVERIA_I:           'Avería Internet',
  BAJA_SERVICIO_I:    'Baja de Servicio Internet',
  CAMBIO_CONTRASENA_I:'Cambio de Contraseña',
  CAMBIO_DOMICILIO_I: 'Cambio de Domicilio Internet',
  CAMBIO_EQUIPO_I:    'Cambio de Equipo Internet',
  CAMBIO_PLAN_I:      'Cambio de Plan Internet',
  CAMBIO_TITULAR_I:   'Cambio de Titular Internet',
  CORTE_SOLICITUD_I:  'Corte a Solicitud Internet',
  CORTE_DEUDA_I:      'Corte por Deuda Internet',
  RECONEXION_I:       'Reconexión Internet',
  RETIRO_EQUIPO_I:    'Retiro de Equipo Internet',
  TRASLADO_I:         'Traslado Internet',
  // ── Cable ─────────────────────────────────────────────────
  INSTALACION_C:      'Instalación Cable',
  ALTA_SERVICIO_C:    'Alta de Servicio Cable',
  AVERIA_C:           'Avería Cable',
  CAMBIO_DOMICILIO_C: 'Cambio de Domicilio Cable',
  CAMBIO_PLAN_C:      'Cambio de Plan Cable',
  CAMBIO_TITULAR_C:   'Cambio de Titular Cable',
  CORTE_SOLICITUD_C:  'Corte a Solicitud Cable',
  CORTE_DEUDA_C:      'Corte por Deuda Cable',
  INSTALACION_ANEXO_C:'Instalación de Anexo',
  MIGRACION_FTTH_C:   'Migración FTTH',
  RECONEXION_C:       'Reconexión Cable',
  RETIRO_EQUIPO_C:    'Retiro de Equipo Cable',
  SUPERVISION_C:      'Supervisión Cable',
  TRASLADO_C:         'Traslado Cable',
  // ── Dúo (Internet + Cable) ─────────────────────────────────
  INSTALACION_D:       'Instalación Dúo',
  ALTA_SERVICIO_D:     'Alta de Servicio Dúo',
  AVERIA_D:            'Avería Dúo',
  BAJA_SERVICIO_D:     'Baja de Servicio Dúo',
  CAMBIO_DOMICILIO_D:  'Cambio de Domicilio Dúo',
  CAMBIO_EQUIPO_D:     'Cambio de Equipo Dúo',
  CAMBIO_PLAN_D:       'Cambio de Plan Dúo',
  CAMBIO_TITULAR_D:    'Cambio de Titular Dúo',
  CORTE_SOLICITUD_D:   'Corte a Solicitud Dúo',
  CORTE_DEUDA_D:       'Corte por Deuda Dúo',
  RECONEXION_D:        'Reconexión Dúo',
  RETIRO_EQUIPO_D:     'Retiro de Equipo Dúo',
  TRASLADO_D:          'Traslado Dúo',
};

export const TIPO_COLOR = {
  // ── Internet ──────────────────────────────────────────────
  INSTALACION_I:      '#3b82f6',
  ALTA_SERVICIO_I:    '#0ea5e9',
  ATENCION_NOC_I:     '#6366f1',
  AVERIA_I:           '#ef4444',
  BAJA_SERVICIO_I:    '#64748b',
  CAMBIO_CONTRASENA_I:'#f59e0b',
  CAMBIO_DOMICILIO_I: '#8b5cf6',
  CAMBIO_EQUIPO_I:    '#06b6d4',
  CAMBIO_PLAN_I:      '#10b981',
  CAMBIO_TITULAR_I:   '#a78bfa',
  CORTE_SOLICITUD_I:  '#f97316',
  CORTE_DEUDA_I:      '#dc2626',
  RECONEXION_I:       '#f59e0b',
  RETIRO_EQUIPO_I:    '#94a3b8',
  TRASLADO_I:         '#14b8a6',
  // ── Cable ─────────────────────────────────────────────────
  INSTALACION_C:      '#8b5cf6',
  ALTA_SERVICIO_C:    '#7c3aed',
  AVERIA_C:           '#ec4899',
  CAMBIO_DOMICILIO_C: '#a855f7',
  CAMBIO_PLAN_C:      '#d946ef',
  CAMBIO_TITULAR_C:   '#c084fc',
  CORTE_SOLICITUD_C:  '#f97316',
  CORTE_DEUDA_C:      '#dc2626',
  INSTALACION_ANEXO_C:'#6d28d9',
  MIGRACION_FTTH_C:   '#059669',
  RECONEXION_C:       '#a855f7',
  RETIRO_EQUIPO_C:    '#94a3b8',
  SUPERVISION_C:      '#0284c7',
  TRASLADO_C:         '#0d9488',
  // ── Dúo (Internet + Cable) ─────────────────────────────────
  INSTALACION_D:       '#f97316',
  ALTA_SERVICIO_D:     '#fb923c',
  AVERIA_D:            '#ea580c',
  BAJA_SERVICIO_D:     '#64748b',
  CAMBIO_DOMICILIO_D:  '#f59e0b',
  CAMBIO_EQUIPO_D:     '#fbbf24',
  CAMBIO_PLAN_D:       '#d97706',
  CAMBIO_TITULAR_D:    '#fcd34d',
  CORTE_SOLICITUD_D:   '#ef4444',
  CORTE_DEUDA_D:       '#dc2626',
  RECONEXION_D:        '#f59e0b',
  RETIRO_EQUIPO_D:     '#94a3b8',
  TRASLADO_D:          '#f97316',
};

// Tipos de Internet que pasan por el flujo NOC + técnico
// Fuente única de verdad para Monitor, Seguimiento y Pendientes
export const TIPOS_INTERNET_TECNICO = [
  'INSTALACION_I',
  'CAMBIO_EQUIPO_I',
  'AVERIA_I',
  'RECONEXION_I',
  'TRASLADO_I',
  'CAMBIO_DOMICILIO_I',
];

export const TIPOS_DUO_TECNICO = [
  'INSTALACION_D',
  'CAMBIO_EQUIPO_D',
  'AVERIA_D',
  'RECONEXION_D',
  'TRASLADO_D',
  'CAMBIO_DOMICILIO_D',
];


export const TIPOS_INTERNET = [
  'INSTALACION_I', 'ALTA_SERVICIO_I', 'ATENCION_NOC_I', 'AVERIA_I',
  'BAJA_SERVICIO_I', 'CAMBIO_CONTRASENA_I', 'CAMBIO_DOMICILIO_I',
  'CAMBIO_EQUIPO_I', 'CAMBIO_PLAN_I', 'CAMBIO_TITULAR_I',
  'CORTE_SOLICITUD_I', 'CORTE_DEUDA_I', 'RECONEXION_I',
  'RETIRO_EQUIPO_I', 'TRASLADO_I',
];

export const TIPOS_CABLE = [
  'INSTALACION_C', 'ALTA_SERVICIO_C', 'AVERIA_C', 'CAMBIO_DOMICILIO_C',
  'CAMBIO_PLAN_C', 'CAMBIO_TITULAR_C', 'CORTE_SOLICITUD_C', 'CORTE_DEUDA_C',
  'INSTALACION_ANEXO_C', 'MIGRACION_FTTH_C', 'RECONEXION_C',
  'RETIRO_EQUIPO_C', 'SUPERVISION_C', 'TRASLADO_C',
];

export const TIPOS_DUO = [
  'INSTALACION_D', 'ALTA_SERVICIO_D', 'AVERIA_D', 'BAJA_SERVICIO_D',
  'CAMBIO_DOMICILIO_D', 'CAMBIO_EQUIPO_D', 'CAMBIO_PLAN_D', 'CAMBIO_TITULAR_D',
  'CORTE_SOLICITUD_D', 'CORTE_DEUDA_D', 'RECONEXION_D',
  'RETIRO_EQUIPO_D', 'TRASLADO_D',
];

export const ESTADO_CONFIG = {
  PENDIENTE_NOC:     { label: 'Esperando NOC', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: '📋' },
  PENDIENTE_TECNICO: { label: 'Pendiente',     color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: '👷' },
  ACEPTADA:          { label: 'Aceptada',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  icon: '✅' },
  EN_PROCESO:        { label: 'En proceso',    color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',   icon: '🔧' },
  COMPLETADA:        { label: 'Completada',    color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   icon: '✔️' },
  CANCELADA:         { label: 'Cancelada',     color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: '✖️' },
  REPROGRAMADA:      { label: 'Reprogramada',  color: '#a855f7', bg: 'rgba(168,85,247,0.1)',  icon: '📅' },
};

export const ESTADO_CONTRATO_CONFIG = {
  ACTIVO:         { label: 'ACTIVO',         color: '#15803d', bg: '#dcfce7' },
  EN_INSTALACION: { label: 'EN INSTALACIÓN', color: '#b45309', bg: '#fef3c7' },
  CORTADO:        { label: 'CORTADO',        color: '#b91c1c', bg: '#fee2e2' },
  BAJA:           { label: 'BAJA',           color: '#404040', bg: '#e5e5e5' },
  SIN_ACTIVIDAD:  { label: 'SIN ACTIVIDAD',  color: '#737373', bg: '#f5f5f5' },
};

export const waLink = (cel, msg = '') =>
  `https://wa.me/51${cel?.replace(/\D/g, '')}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`;

export function parsearTextoManual(texto) {
  const s = texto.trim();
  
  // Intentar separar por " - " o " – "
  const partes = s.split(/\s[-–]\s/);
  
  let abonado  = null;
  let contrato = null;
  let celular  = null;

  if (partes.length >= 2) {
    abonado  = partes[0].trim().toUpperCase();
    contrato = partes[1].trim().toUpperCase();
  } else {
    // Sin separador — todo es el nombre
    abonado = s.toUpperCase();
  }

  // Buscar celular (9 dígitos empezando en 9)
  const matchCel = s.match(/\b9\d{8}\b/);
  if (matchCel) celular = matchCel[0];

  return { abonado, contrato, celular };
}

/** CONSULTAR CON CLAUDE
 * Agrega sedeId a cualquier objeto de parámetros si hay una sede seleccionada.
 * Uso: withSede({ page: 1, limit: 15 }, sedeSeleccionada)
 */
export const withSede = (params = {}, sedeId = '') => ({
  ...params,
  ...(sedeId && { sedeId }),
});
// Hoy como "yyyy-MM-dd" en la hora de la computadora (no en UTC: desde las 7 pm
// de Perú, toISOString() ya devuelve el día siguiente)
export const hoyLocal = () => format(new Date(), 'yyyy-MM-dd');
