// Qué ve cada rol del panel administrador.
// SUPERVISOR = supervisor de técnicos: solo mira cómo trabajan los técnicos de su sede
// (órdenes, técnicos, mapa, reportes) y puede asignar / cambiar el técnico de una orden.

export const esSupervisor = (usuario) => usuario?.rol === 'SUPERVISOR';

const RUTAS_SUPERVISOR = ['/', '/ordenes', '/tecnicos', '/mapa', '/reportes', '/programar', '/perfil'];

// ¿Este usuario puede abrir esta ruta del panel?
export function rutaPermitida(usuario, pathname) {
  if (!esSupervisor(usuario)) return true;
  return RUTAS_SUPERVISOR.some(r => r === '/' ? pathname === '/' : pathname === r || pathname.startsWith(r + '/'));
}
