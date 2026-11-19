const { Prisma } = require('@prisma/client');
const prisma = require('./prisma');

// Traspasos de material entre técnicos (prisma/sql/20261118_traspasos_tecnicos.sql).
//
// Si la tabla todavía no existe (código desplegado antes de correr el SQL) el neto
// de metros es 0 y todo sigue como antes. Se revisa con `prisma` global ANTES de
// leer, porque dentro de una transacción un error de "tabla no existe" la aborta.
let existe = null;
let revisadaEn = 0;

async function tablaTraspasos() {
  if (existe === true) return true;
  if (existe === false && Date.now() - revisadaEn < 60_000) return false;
  try {
    const [r] = await prisma.$queryRaw`SELECT to_regclass('public.traspaso_tecnico_detalles') IS NOT NULL AS ok`;
    existe = !!r?.ok;
  } catch {
    existe = false;
  }
  revisadaEn = Date.now();
  return existe;
}

// Metros sueltos netos de un técnico por producto: recibidos − enviados.
// db = prisma o tx. Devuelve { [productoId]: neto } ({} si no hay tabla).
async function netoMetrosTraspaso(db, tecnicoId, { sedeId } = {}) {
  if (!tecnicoId || !(await tablaTraspasos())) return {};
  const filtroSede = sedeId ? Prisma.sql`AND t.sede_id = ${sedeId}` : Prisma.empty;
  const filas = await db.$queryRaw`
    SELECT d.producto_id AS "productoId",
           SUM(CASE WHEN t.tecnico_destino_id = ${tecnicoId} THEN d.metros_sueltos ELSE -d.metros_sueltos END)::int AS neto
    FROM traspaso_tecnico_detalles d
    JOIN traspasos_tecnicos t ON t.id = d.traspaso_id
    WHERE (t.tecnico_origen_id = ${tecnicoId} OR t.tecnico_destino_id = ${tecnicoId})
      AND d.metros_sueltos <> 0
      ${filtroSede}
    GROUP BY d.producto_id`;
  const neto = {};
  for (const f of filas) neto[f.productoId] = Number(f.neto);
  return neto;
}

// Lo que un técnico puede pasar a otro (lo usan el GET del modal y el POST, para
// que el tope sea el mismo en los dos). Todo filtrado por la sede del traspaso.
async function saldoTraspasable(db, { tecnicoId, sedeId }) {
  const [asignaciones, consumos, recojos, devoluciones, onusFilas, recojosOnu, neto] = await Promise.all([
    db.asignacionTecnico.findMany({
      where: { tecnicoId, sedeId },
      include: { producto: { select: { id: true, nombre: true, codigo: true, unidad: true, esMedible: true, metrosPorUnidad: true } } },
      orderBy: { fecha: 'desc' },
    }),
    // Sin filtro de sede a propósito: es el criterio más prudente (el menor de los dos saldos)
    db.consumoTecnico.groupBy({ by: ['productoId'], where: { tecnicoId }, _sum: { cantidad: true } }),
    db.recojo.groupBy({ by: ['productoId'], where: { tecnicoId, estado: 'en_mano' }, _count: { _all: true } }),
    db.devolucionDetalle.groupBy({
      by: ['productoId'],
      where: { devolucion: { tecnicoId, estado: 'pendiente' } },
      _sum: { cantidad: true },
    }),
    db.onu.findMany({
      where: { tecnicoId, sedeId },
      select: { id: true, codigoPon: true, productoId: true, cliente: true, salidaDirecta: true, producto: { select: { nombre: true } } },
      orderBy: { id: 'asc' },
    }),
    db.recojo.findMany({ where: { tecnicoId, estado: 'en_mano', codigoPon: { not: null } }, select: { codigoPon: true } }),
    netoMetrosTraspaso(db, tecnicoId, { sedeId }),
  ]);

  const gastado = Object.fromEntries(consumos.map(g => [g.productoId, Number(g._sum.cantidad || 0)]));
  const retirados = Object.fromEntries(recojos.filter(r => r.productoId != null).map(r => [r.productoId, r._count._all]));
  const enDev = Object.fromEntries(devoluciones.map(g => [g.productoId, Number(g._sum.cantidad || 0)]));
  const productosOnu = new Set(onusFilas.map(o => o.productoId));
  const codigosRecojo = new Set(recojosOnu.map(r => String(r.codigoPon).trim().toUpperCase()));

  const items = [];
  for (const a of asignaciones) {
    const p = a.producto;
    if (productosOnu.has(a.productoId)) continue;   // se pasa por código
    const asig = Number(a.cantidad);
    const medible = !!(p.esMedible && p.metrosPorUnidad);
    const mpu = medible ? p.metrosPorUnidad : 1;
    const gast = gastado[a.productoId] || 0;
    const dev = enDev[a.productoId] || 0;
    const ret = medible ? 0 : (retirados[a.productoId] || 0);
    const bruto = Math.floor(asig * mpu + (medible ? (neto[a.productoId] || 0) : 0) - gast - dev * mpu - ret);
    items.push({
      productoId: a.productoId,
      nombre: p.nombre,
      codigo: p.codigo,
      tipo: medible ? 'METROS' : 'CANTIDAD',
      unidad: medible ? 'm' : (p.unidad || 'und'),
      metrosPorUnidad: medible ? p.metrosPorUnidad : null,
      asignado: asig,
      disponible: Math.max(0, bruto),
      deuda: bruto < 0 ? -bruto : 0,
      retirados: ret,
      enDevolucion: dev * mpu,
      enDevolucionRollos: medible ? dev : 0,
    });
  }

  const onus = [];
  const onusBloqueadas = [];
  for (const o of onusFilas) {
    if (!o.codigoPon || o.cliente || o.salidaDirecta) continue;
    if (codigosRecojo.has(String(o.codigoPon).trim().toUpperCase())) {
      onusBloqueadas.push({ id: o.id, codigoPon: o.codigoPon, productoId: o.productoId, producto: o.producto.nombre, motivo: 'retirada de un cliente' });
    } else {
      onus.push({ id: o.id, codigoPon: o.codigoPon, productoId: o.productoId, producto: o.producto.nombre });
    }
  }

  return { items, onus, onusBloqueadas, productosOnu: [...productosOnu] };
}

module.exports = { tablaTraspasos, netoMetrosTraspaso, saldoTraspasable };
