// Qué ve cada rol del panel administrador.
// SUPERVISOR = supervisor de técnicos: solo mira cómo trabajan los técnicos de su sede
// (órdenes, técnicos, mapa, reportes) y puede asignar / cambiar el técnico de una orden.
// GERENTE = administrador general: solo lectura, todas las sedes (elige una arriba).

export const esSupervisor = (usuario) => usuario?.rol === 'SUPERVISOR';
export const esGerente    = (usuario) => usuario?.rol === 'GERENTE';
// Quien no puede cambiar nada (se ocultan los botones de escritura; el backend igual lo rechaza)
export const soloLectura  = (usuario) => usuario?.rol === 'GERENTE';

export const ETIQUETA_ROL = {
  ADMIN:      'Administrador',
  SECRETARIA: 'Secretaría',
  SUPERVISOR: 'Supervisor',
  GERENTE:    'Administrador general',
};

const RUTAS_SUPERVISOR = ['/', '/ordenes', '/tecnicos', '/mapa', '/reportes', '/programar', '/perfil'];
// '/almacen' cubre Dashboard, Inventario, Buscar equipo, Devoluciones y Reportes del almacén
const RUTAS_GERENTE    = ['/', '/ordenes', '/clientes', '/mapa', '/reportes', '/planes', '/almacen', '/perfil'];

const coincide = (rutas, pathname) =>
  rutas.some(r => r === '/' ? pathname === '/' : pathname === r || pathname.startsWith(r + '/'));

// ¿Este usuario puede abrir esta ruta del panel?
export function rutaPermitida(usuario, pathname) {
  if (esSupervisor(usuario)) return coincide(RUTAS_SUPERVISOR, pathname);
  if (esGerente(usuario))    return coincide(RUTAS_GERENTE, pathname);
  return true;
}
