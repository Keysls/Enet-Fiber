// Fechas en hora de Perú (UTC-5, sin horario de verano).
//
// El servidor y la base trabajan en UTC. Un texto como "2026-11-05T23:25:43" o
// "2026-11-05" sin zona horaria lo arman los paneles con la hora de Perú, pero
// `new Date()` en el servidor lo leería como UTC y lo correría 5 horas: lo de
// las 7 pm en adelante caía en el día siguiente.
const ZONA_PERU = '-05:00';

const tieneZona = (s) => /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(s);

// Fecha y hora que manda un panel. Sin valor → null.
function fechaDelPanel(valor) {
  if (valor == null || valor === '') return null;
  if (valor instanceof Date) return valor;
  const s = String(valor).trim();
  if (tieneZona(s)) return new Date(s);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00${ZONA_PERU}`);
  return new Date(`${s}${ZONA_PERU}`);
}

// Para filtros "desde / hasta" con un día "YYYY-MM-DD"
// (si llega una fecha con hora, se respeta tal cual)
const esDia = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v).trim());
const inicioDiaPeru = (dia) => esDia(dia) ? new Date(`${String(dia).trim()}T00:00:00.000${ZONA_PERU}`) : fechaDelPanel(dia);
const finDiaPeru    = (dia) => esDia(dia) ? new Date(`${String(dia).trim()}T23:59:59.999${ZONA_PERU}`) : fechaDelPanel(dia);

// "YYYY-MM-DD" de hoy en Perú
function hoyPeru(ahora = new Date()) {
  return new Date(ahora.getTime() - 5 * 3600_000).toISOString().slice(0, 10);
}

module.exports = { fechaDelPanel, inicioDiaPeru, finDiaPeru, hoyPeru };
