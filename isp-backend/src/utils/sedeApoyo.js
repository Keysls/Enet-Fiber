const prisma = require('./prisma');

// Si la tabla sedes_apoyo aún no existe (código desplegado antes de correr
// prisma/sql/20261027_sede_apoyo.sql), se trata como "sin vínculos" para que
// el sistema siga funcionando igual que antes en vez de fallar.
const tablaNoExiste = (err) => err?.code === 'P2021' || /sedes_apoyo/.test(err?.message || '') && /does not exist|no existe/i.test(err?.message || '');

async function sinTabla(promesa, porDefecto) {
  try {
    return await promesa;
  } catch (err) {
    if (tablaNoExiste(err)) return porDefecto;
    throw err;
  }
}

// Sedes cuyas órdenes pueden atender los técnicos de `sedeId`:
// la propia primero y luego las que apoya (ej. Nueva Cajamarca → Naranjillo, Soritor).
// El apoyo es en un solo sentido: la sede apoyada no ve las órdenes de la que la apoya.
async function sedesQueAtiende(sedeId) {
  if (!sedeId) return [];
  const apoyos = await sinTabla(prisma.sedeApoyo.findMany({
    where:   { sedeId },
    select:  { sedeApoyadaId: true },
    orderBy: { createdAt: 'asc' },
  }), []);
  return [sedeId, ...apoyos.map(a => a.sedeApoyadaId)];
}

// Filtro Prisma por sede para listados. Sin sedes apoyadas devuelve `sedeId` tal cual,
// para que las sedes sin vínculo (o un usuario sin sede) filtren exactamente como antes.
async function filtroSedes(sedeId) {
  const sedes = await sedesQueAtiende(sedeId);
  return sedes.length > 1 ? { in: sedes } : sedeId;
}

// ¿Un técnico (o admin) de `sedeUsuarioId` puede atender una orden de `sedeOrdenId`?
// Misma regla de siempre (sedes iguales) más las sedes apoyadas.
async function puedeAtender(sedeUsuarioId, sedeOrdenId) {
  if (sedeUsuarioId === sedeOrdenId) return true;
  if (!sedeUsuarioId || !sedeOrdenId) return false;
  const apoyo = await sinTabla(prisma.sedeApoyo.findUnique({
    where:  { sedeId_sedeApoyadaId: { sedeId: sedeUsuarioId, sedeApoyadaId: sedeOrdenId } },
    select: { sedeId: true },
  }), null);
  return !!apoyo;
}

// Sedes que apoya cada una de `sedeIds`: { [sedeId]: [{ id, nombre }] }
async function apoyosDeSedes(sedeIds) {
  const apoyos = await sinTabla(prisma.sedeApoyo.findMany({
    where:   { sedeId: { in: sedeIds } },
    select:  { sedeId: true, sedeApoyada: { select: { id: true, nombre: true } } },
    orderBy: { createdAt: 'asc' },
  }), []);
  const porSede = Object.fromEntries(sedeIds.map(id => [id, []]));
  for (const a of apoyos) porSede[a.sedeId].push(a.sedeApoyada);
  return porSede;
}

module.exports = { sedesQueAtiende, filtroSedes, puedeAtender, apoyosDeSedes, tablaNoExiste };
