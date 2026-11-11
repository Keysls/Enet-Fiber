const prisma = require('./prisma');

// Anota los movimientos de las ONUs en onu_movimientos para el historial.
//
// Si la tabla todavía no existe (código desplegado antes de correr
// prisma/sql/20261106_onu_movimientos.sql) no se anota nada y todo sigue
// funcionando como antes. Se revisa ANTES de escribir porque dentro de una
// transacción un error de "tabla no existe" la aborta entera.
let existe = null;        // true | false | null (sin revisar)
let revisadaEn = 0;

async function tablaDisponible() {
  if (existe === true) return true;
  if (existe === false && Date.now() - revisadaEn < 60_000) return false;
  try {
    const [r] = await prisma.$queryRaw`SELECT to_regclass('public.onu_movimientos') IS NOT NULL AS ok`;
    existe = !!r?.ok;
  } catch {
    existe = false;
  }
  revisadaEn = Date.now();
  return existe;
}

// onus: [{ id, codigoPon }] — las que no tienen código no se anotan (no hay cómo buscarlas)
// datos: { tipo, sedeId, sedeDestinoId, referencia, detalle, usuarioId, fecha }
async function anotarMovimientos(tx, onus, datos) {
  const conCodigo = (onus || []).filter(o => o?.codigoPon);
  if (conCodigo.length === 0 || !(await tablaDisponible())) return;
  await tx.onuMovimiento.createMany({
    data: conCodigo.map(o => ({
      onuId:         o.id ?? null,
      codigoPon:     o.codigoPon,
      tipo:          datos.tipo,
      sedeId:        datos.sedeId ?? null,
      sedeDestinoId: datos.sedeDestinoId ?? null,
      referencia:    datos.referencia != null ? String(datos.referencia) : null,
      detalle:       datos.detalle ?? null,
      usuarioId:     datos.usuarioId != null ? String(datos.usuarioId) : null,
      ...(datos.fecha && { fecha: datos.fecha }),
    })),
  });
}

const anotarMovimiento = (tx, onu, datos) => anotarMovimientos(tx, [onu], datos);

// Movimientos de un tipo para varias referencias: { [referencia]: [movimiento] }
async function movimientosPorReferencia(tipo, referencias) {
  const refs = [...new Set(referencias.map(String))];
  if (refs.length === 0 || !(await tablaDisponible())) return {};
  const filas = await prisma.onuMovimiento.findMany({
    where: { tipo, referencia: { in: refs } },
    orderBy: { id: 'asc' },
  });
  const porRef = {};
  for (const f of filas) (porRef[f.referencia] ||= []).push(f);
  return porRef;
}

module.exports = { tablaDisponible, anotarMovimiento, anotarMovimientos, movimientosPorReferencia };
