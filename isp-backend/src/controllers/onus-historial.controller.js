// GET /api/onus/historial?codigo=OPTI5779ED2F
// Dónde está una ONU ahora y todo lo que le pasó, juntando lo que el sistema
// guarda en cada tabla (inventario, asignaciones, instalaciones, OLT,
// devoluciones, retiros, revisiones, envíos, salidas directas y logs).
// Solo lectura: cualquier administrador ve el historial completo aunque la
// ONU haya pasado por otras sedes, porque los equipos se mueven entre sedes.
const prisma = require('../utils/prisma');
const { tablaDisponible } = require('../utils/onuMovimientos');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_EN_TEXTO = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const normalizar = (v) => String(v || '').trim().toUpperCase();
const nombreCompleto = (u) => (u ? `${u.nombre || ''} ${u.apellido || ''}`.trim() : null);
const ci = (codigos) => ({ in: codigos, mode: 'insensitive' });

const TITULO_MOVIMIENTO = {
  REGISTRO:            'Registrada en el inventario',
  CAMBIO_CODIGO:       'Se corrigió el código',
  SALIDA_DIRECTA:      'Salió por salida directa',
  REINGRESO:           'Reingresada (volvió de salida directa)',
  ENVIO:               'Enviada a otra sede',
  ENVIO_RECIBIDO:      'Envío recibido',
  ENVIO_CANCELADO:     'Envío cancelado (volvió al origen)',
  REINGRESO_MALOGRADA: 'Reingresada (estaba malograda)',
};

const ACCION_LOG = {
  AUTORIZAR_ONU_MANUAL: 'Autorizada a mano en la OLT',
  AUTORIZAR_ONU:        'Autorizada en la OLT',
};
const accionLegible = (a) => ACCION_LOG[a] || a.toLowerCase().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

async function buscarHistorial(req, res, next) {
  try {
    const codigo = normalizar(req.query.codigo);
    if (codigo.length < 4) return res.status(400).json({ error: 'Escribe o escanea al menos 4 caracteres del código' });

    const onu = await prisma.onu.findFirst({
      where:   { codigoPon: { equals: codigo, mode: 'insensitive' } },
      include: { producto: { select: { nombre: true } }, tecnico: { select: { usuario: { select: { nombre: true, apellido: true } } } } },
    });

    // Códigos parecidos: contienen lo buscado o están contenidos en él
    // (sirve para ver duplicados con un carácter de más, como OPTI577A0F371)
    const parecidas = await prisma.$queryRaw`
      SELECT o.id, o.codigo_pon AS "codigoPon", s.nombre AS sede, p.nombre AS producto
      FROM onus o
      LEFT JOIN sedes s ON s.id = o.sede_id
      LEFT JOIN productos p ON p.id = o.producto_id
      WHERE o.codigo_pon IS NOT NULL
        AND UPPER(o.codigo_pon) <> ${codigo}
        AND (UPPER(o.codigo_pon) LIKE '%' || ${codigo} || '%'
             OR (LENGTH(o.codigo_pon) >= 8 AND ${codigo} LIKE '%' || UPPER(o.codigo_pon) || '%'))
      ORDER BY o.codigo_pon
      LIMIT 15`;

    // Todos los códigos que tuvo esta ONU (si se corrigió, lo anterior quedó con el código viejo)
    const hayMovimientos = await tablaDisponible();
    const codigos = new Set([codigo]);
    if (onu && hayMovimientos) {
      const cambios = await prisma.onuMovimiento.findMany({ where: { onuId: onu.id }, select: { codigoPon: true } });
      cambios.forEach(c => codigos.add(normalizar(c.codigoPon)));
    }
    const lista = [...codigos];

    const [entregas, consumos, configs, recojos, recicladas, entradas, movimientos, logs] = await Promise.all([
      prisma.entregaTecnico.findMany({ where: { codigoPon: ci(lista) } }),
      prisma.consumoTecnico.findMany({ where: { codigoPon: ci(lista) } }),
      prisma.configOnu.findMany({
        where:   { serialNumber: ci(lista) },
        include: {
          olts: { select: { nombre: true } },
          instalacion: { select: { orden: { select: {
            id: true, nServicio: true, abonado: true, contrato: true, direccion: true, tipoOrden: true, estado: true, sedeId: true,
            tecnico: { select: { usuario: { select: { nombre: true, apellido: true } } } },
          } } } },
        },
      }),
      prisma.recojo.findMany({ where: { codigoPon: ci(lista) } }),
      prisma.onuReciclada.findMany({ where: { codigoPon: ci(lista) } }),
      prisma.entradaStock.findMany({ where: { OR: lista.map(c => ({ comentario: { contains: c, mode: 'insensitive' } })) } }),
      hayMovimientos
        ? prisma.onuMovimiento.findMany({ where: { OR: [{ codigoPon: ci(lista) }, ...(onu ? [{ onuId: onu.id }] : [])] } })
        : [],
      prisma.$queryRaw`
        SELECT id, accion, "usuarioId", "createdAt", detalles
        FROM log_actividad
        WHERE detalles::text ILIKE ${'%' + codigo + '%'}
        ORDER BY "createdAt" DESC
        LIMIT 30`,
    ]);

    // Si se buscó un código que después se corrigió, sugerir el código actual
    if (!onu) {
      const corregidas = [...new Set(movimientos.filter(m => m.tipo === 'CAMBIO_CODIGO' && m.onuId).map(m => m.onuId))];
      if (corregidas.length) {
        const actuales = await prisma.onu.findMany({
          where:  { id: { in: corregidas }, codigoPon: { not: null } },
          select: { id: true, codigoPon: true, sede: { select: { nombre: true } }, producto: { select: { nombre: true } } },
        });
        for (const a of actuales) {
          if (!parecidas.some(p => p.id === a.id)) parecidas.unshift({ id: a.id, codigoPon: a.codigoPon, sede: a.sede?.nombre || null, producto: a.producto?.nombre || null });
        }
      }
    }

    // ── Nombres de sedes, usuarios, técnicos y órdenes ──────────
    // A qué devolución pertenece cada recojo de devolución. La nota "Devuelto en
    // devolucion #N" se pisa con el comentario de la revisión, así que si ya no
    // está se busca la devolución del mismo técnico creada en ese momento.
    const devolucionIds = new Set();
    const devolucionDeRecojo = new Map();
    const sinNumero = [];
    for (const r of recojos) {
      if (r.grupoOrden) continue;
      const m = /devolucion #(\d+)/i.exec(r.comentario || '');
      if (m) { devolucionDeRecojo.set(r.id, Number(m[1])); devolucionIds.add(Number(m[1])); }
      else if (r.createdAt) sinNumero.push(r);
    }
    if (sinNumero.length > 0) {
      const candidatas = await prisma.devolucionTecnico.findMany({
        where: { OR: sinNumero.map(r => ({ tecnicoId: r.tecnicoId,
          createdAt: { gte: new Date(r.createdAt.getTime() - 60_000), lte: new Date(r.createdAt.getTime() + 5_000) } })) },
        select: { id: true, tecnicoId: true, createdAt: true },
      });
      for (const r of sinNumero) {
        const cerca = candidatas
          .filter(d => d.tecnicoId === r.tecnicoId)
          .sort((a, b) => Math.abs(a.createdAt - r.createdAt) - Math.abs(b.createdAt - r.createdAt))[0];
        if (cerca && Math.abs(cerca.createdAt - r.createdAt) <= 60_000) { devolucionDeRecojo.set(r.id, cerca.id); devolucionIds.add(cerca.id); }
      }
    }
    const estadoMarca = /^(envio_pendiente|devolucion_pendiente|revision_pendiente)#(\d+)$/.exec(onu?.cliente || '');
    if (estadoMarca && estadoMarca[1] !== 'envio_pendiente') devolucionIds.add(Number(estadoMarca[2]));

    const ordenIds = new Set();
    for (const c of consumos) { const m = UUID_EN_TEXTO.exec(c.descripcion || ''); if (m) ordenIds.add(m[1]); }
    for (const r of recojos) if (r.grupoOrden && UUID.test(r.grupoOrden)) ordenIds.add(r.grupoOrden);
    if (onu?.cliente && UUID.test(onu.cliente)) ordenIds.add(onu.cliente);

    const envioIds = new Set(movimientos.filter(m => m.tipo.startsWith('ENVIO')).map(m => Number(m.referencia)).filter(Boolean));
    if (estadoMarca?.[1] === 'envio_pendiente') envioIds.add(Number(estadoMarca[2]));

    const [devoluciones, ordenes, envios] = await Promise.all([
      prisma.devolucionTecnico.findMany({ where: { id: { in: [...devolucionIds] } } }),
      prisma.ordenServicio.findMany({
        where:  { id: { in: [...ordenIds] } },
        select: { id: true, nServicio: true, abonado: true, contrato: true, direccion: true, tipoOrden: true, estado: true, sedeId: true,
                  tecnico: { select: { usuario: { select: { nombre: true, apellido: true } } } } },
      }),
      prisma.envio.findMany({ where: { id: { in: [...envioIds] } } }),
    ]);
    const ordenPorId = new Map(ordenes.map(o => [o.id, o]));
    const devPorId = new Map(devoluciones.map(d => [d.id, d]));
    const envioPorId = new Map(envios.map(e => [e.id, e]));

    const tecnicoIds = new Set([
      ...entregas.map(e => e.tecnicoId), ...consumos.map(c => c.tecnicoId), ...recojos.map(r => r.tecnicoId),
      ...devoluciones.map(d => d.tecnicoId),
    ].filter(Boolean));
    const usuarioIds = new Set([
      ...entregas.map(e => e.registradoPor), ...entradas.map(e => e.registradoPor), ...recicladas.map(r => r.revisadoPor),
      ...recojos.map(r => r.registradoPor), ...devoluciones.map(d => d.revisadoPor), ...movimientos.map(m => m.usuarioId),
      ...logs.map(l => l.usuarioId), ...envios.map(e => e.usuarioId),
    ].filter(v => v && UUID.test(String(v))).map(String));

    const [tecnicos, usuarios, sedes] = await Promise.all([
      prisma.tecnico.findMany({ where: { id: { in: [...tecnicoIds] } }, select: { id: true, usuario: { select: { nombre: true, apellido: true } } } }),
      prisma.usuario.findMany({ where: { id: { in: [...usuarioIds] } }, select: { id: true, nombre: true, apellido: true } }),
      prisma.sede.findMany({ select: { id: true, nombre: true } }),
    ]);
    const tecnico = new Map(tecnicos.map(t => [t.id, nombreCompleto(t.usuario)]));
    const usuario = new Map(usuarios.map(u => [u.id, nombreCompleto(u)]));
    const sede = new Map(sedes.map(s => [s.id, s.nombre]));
    const quien = (id) => (id ? usuario.get(String(id)) || null : null);
    const textoOrden = (o) => o ? [`Orden N° ${o.nServicio}`, o.abonado, o.contrato && `contrato ${o.contrato}`].filter(Boolean).join(' · ') : null;

    // ── Línea de tiempo ─────────────────────────────────────────
    const eventos = [];
    const agregar = (e) => { if (e.fecha) eventos.push({ ...e, fecha: new Date(e.fecha) }); };

    const hayRegistroAnotado = movimientos.some(m => m.tipo === 'REGISTRO');
    if (onu?.createdAt && !hayRegistroAnotado) {
      agregar({ fecha: onu.createdAt, tipo: 'registro', titulo: 'Registrada en el sistema' });
    }

    for (const m of movimientos) {
      const destino = m.sedeDestinoId ? sede.get(m.sedeDestinoId) : null;
      const origen = m.sedeId ? sede.get(m.sedeId) : null;
      let titulo = TITULO_MOVIMIENTO[m.tipo] || m.tipo;
      if (m.tipo === 'ENVIO' && destino) titulo = `Enviada a ${destino}`;
      if (m.tipo === 'ENVIO_RECIBIDO' && destino) titulo = `Recibida en ${destino}`;
      agregar({
        fecha: m.fecha, tipo: m.tipo.toLowerCase(), titulo,
        detalle: m.tipo === 'ENVIO' || m.tipo === 'ENVIO_RECIBIDO' || m.tipo === 'ENVIO_CANCELADO'
          ? [origen && destino && `${origen} → ${destino}`, m.detalle].filter(Boolean).join(' · ')
          : m.detalle,
        sede: m.tipo.startsWith('ENVIO') ? null : origen,
        usuario: quien(m.usuarioId),
      });
    }

    for (const e of entregas) {
      agregar({ fecha: e.fecha, tipo: 'asignacion', titulo: `Asignada al técnico ${tecnico.get(e.tecnicoId) || ''}`.trim(),
        sede: sede.get(e.sedeId) || null, usuario: quien(e.registradoPor) });
    }

    for (const c of consumos) {
      const m = UUID_EN_TEXTO.exec(c.descripcion || '');
      const o = m ? ordenPorId.get(m[1]) : null;
      agregar({ fecha: c.fecha, tipo: 'consumo',
        titulo: o ? 'Instalada en un cliente' : `Usada por el técnico (${c.motivo || 'consumo'})`,
        detalle: o ? textoOrden(o) : c.descripcion, sede: o ? sede.get(o.sedeId) : null,
        usuario: tecnico.get(c.tecnicoId) || null });
    }

    for (const c of configs) {
      const o = c.instalacion?.orden;
      const olt = [c.olts?.nombre, c.puertoOlt && `puerto ${c.puertoOlt}`, c.onuIdOlt && `ONU ${c.onuIdOlt}`, c.vlan && `VLAN ${c.vlan}`].filter(Boolean).join(' · ');
      const autorizada = c.estadoOlt === 'AUTORIZADA';
      agregar({ fecha: c.fechaAutorizacion || c.createdAt, tipo: 'olt',
        titulo: autorizada ? 'Autorizada en la OLT' : `En la OLT: ${String(c.estadoOlt || 'sin autorizar').toLowerCase().replace(/_/g, ' ')}`,
        detalle: [textoOrden(o), olt, c.errorOlt && `Error: ${c.errorOlt}`].filter(Boolean).join(' · '),
        sede: o ? sede.get(o.sedeId) : null, usuario: nombreCompleto(o?.tecnico?.usuario) });
    }

    for (const r of recojos) {
      const tec = tecnico.get(r.tecnicoId) || 'el técnico';
      if (r.grupoOrden) {
        // Retiro en casa de un cliente (grupoOrden = la orden)
        const o = ordenPorId.get(r.grupoOrden);
        agregar({ fecha: r.createdAt, tipo: 'retiro', titulo: `Retirada de un cliente por ${tec}`,
          detalle: o ? textoOrden(o) : (r.estado === 'en_mano' ? 'Todavía la tiene el técnico' : null) });
      } else {
        // Devolución del técnico (sin orden)
        const devId = devolucionDeRecojo.get(r.id);
        agregar({ fecha: r.createdAt, tipo: 'devolucion', titulo: `Devuelta por ${tec}${devId ? ` (devolución #${devId})` : ''}` });
      }
    }

    for (const d of devoluciones) {
      if (!d.fechaRevision || d.estado === 'pendiente') continue;
      agregar({ fecha: d.fechaRevision, tipo: 'devolucion',
        titulo: d.estado === 'rechazado' ? `Devolución #${d.id} rechazada (volvió al técnico)` : `Devolución #${d.id} aprobada`,
        detalle: d.estado === 'rechazado' ? d.comentario : null, sede: sede.get(d.sedeId) || null, usuario: quien(d.revisadoPor) });
    }

    for (const r of recicladas) {
      const titulo = { malogrado: 'Revisada: malograda', revision: 'Revisada: en buen estado (retiro de cliente)', reingresado: 'Revisada: malograda (después se reingresó)' }[r.estado]
        || `Revisada: ${r.estado}`;
      agregar({ fecha: r.createdAt, tipo: r.estado === 'malogrado' || r.estado === 'reingresado' ? 'malogrado' : 'revision',
        titulo, detalle: r.comentario, sede: sede.get(r.sedeId) || null, usuario: quien(r.revisadoPor) });
    }

    // Los reingresos dejan además una entrada de stock: si ya está el movimiento
    // anotado se muestra uno solo; en los de antes, la entrada es lo único que hay
    const yaAnotado = (tipo, fecha) => movimientos.some(m => m.tipo === tipo && Math.abs(new Date(m.fecha) - new Date(fecha)) < 10_000);
    for (const e of entradas) {
      const c = e.comentario || '';
      let tipo = 'entrada', titulo = 'Entrada al stock';
      if (/revisado OK/i.test(c)) { tipo = 'revision'; titulo = 'Revisada: en buen estado, volvió al stock'; }
      else if (/^Reingreso de equipo malogrado/i.test(c)) {
        if (yaAnotado('REINGRESO_MALOGRADA', e.fecha)) continue;
        tipo = 'reingreso_malograda'; titulo = TITULO_MOVIMIENTO.REINGRESO_MALOGRADA;
      } else if (/^Reingreso de ONU tras salida directa/i.test(c)) {
        if (yaAnotado('REINGRESO', e.fecha)) continue;
        tipo = 'reingreso'; titulo = TITULO_MOVIMIENTO.REINGRESO;
      }
      agregar({ fecha: e.fecha, tipo, titulo, detalle: c, sede: sede.get(e.sedeId) || null, usuario: quien(e.registradoPor) });
    }

    for (const l of logs) {
      // Las autorizaciones ya salen de la OLT (config_onu); el log solo suma lo que falte
      if (/AUTORIZAR/.test(l.accion) && configs.length > 0) continue;
      agregar({ fecha: l.createdAt, tipo: 'log', titulo: accionLegible(l.accion), usuario: quien(l.usuarioId) });
    }

    eventos.sort((a, b) => a.fecha - b.fecha);

    // ── Dónde está ahora ────────────────────────────────────────
    let estado = null;
    if (onu) {
      const enSede = sede.get(onu.sedeId) || null;
      const tecActual = nombreCompleto(onu.tecnico?.usuario);
      if (onu.cliente && UUID.test(onu.cliente)) {
        const o = ordenPorId.get(onu.cliente);
        const cfg = configs.find(c => c.instalacion?.orden?.id === onu.cliente) || configs[configs.length - 1];
        estado = { tipo: 'instalada', titulo: 'Instalada en un cliente', sede: o ? sede.get(o.sedeId) : enSede,
          cliente: o ? { abonado: o.abonado, contrato: o.contrato, direccion: o.direccion, orden: o.nServicio, tecnico: nombreCompleto(o.tecnico?.usuario) } : null,
          olt: cfg ? { nombre: cfg.olts?.nombre || null, puerto: cfg.puertoOlt, onuId: cfg.onuIdOlt, vlan: cfg.vlan, estado: cfg.estadoOlt } : null };
      } else if (estadoMarca?.[1] === 'envio_pendiente') {
        const e = envioPorId.get(Number(estadoMarca[2]));
        estado = { tipo: 'en_camino', titulo: `En camino a ${e ? sede.get(e.sedeId) : enSede}`,
          detalle: e ? `Envío N° ${e.id} · guía ${e.guia} · sale de ${sede.get(e.sedeOrigenId) || '—'} · falta que la sede destino confirme el envío` : 'Falta que la sede destino confirme el envío',
          sede: enSede };
      } else if (estadoMarca?.[1] === 'devolucion_pendiente') {
        estado = { tipo: 'devolucion', titulo: 'Devuelta por el técnico', detalle: `Falta aprobar la devolución #${estadoMarca[2]}`, sede: enSede };
      } else if (estadoMarca?.[1] === 'revision_pendiente') {
        estado = { tipo: 'revision', titulo: 'Esperando revisión', detalle: `Devolución #${estadoMarca[2]} aprobada: falta marcarla como Bueno o Malogrado en Devoluciones`, sede: enSede };
      } else if (onu.tecnicoId) {
        estado = { tipo: 'tecnico', titulo: `En manos de ${tecActual || 'un técnico'}`, sede: enSede };
      } else if (onu.salidaDirecta) {
        const malograda = recicladas.some(r => r.estado === 'malogrado');
        estado = malograda
          ? { tipo: 'malogrado', titulo: 'Malograda', detalle: 'Fuera de stock por estar malograda', sede: enSede }
          : { tipo: 'salida', titulo: 'Salió por salida directa', detalle: 'Ya no está en el stock de la sede', sede: enSede };
      } else if (onu.cliente) {
        estado = { tipo: 'otro', titulo: 'Estado sin reconocer', detalle: onu.cliente, sede: enSede };
      } else {
        estado = { tipo: 'almacen', titulo: `En almacén de ${enSede || 'la sede'}`, detalle: 'Disponible para asignar', sede: enSede };
      }
    }

    res.json({
      codigo,
      encontrada: !!onu,
      onu: onu ? { id: onu.id, codigoPon: onu.codigoPon, producto: onu.producto?.nombre || null, sede: sede.get(onu.sedeId) || null, registrada: onu.createdAt } : null,
      estado,
      eventos,
      parecidas,
      historialCompleto: hayMovimientos,
    });
  } catch (err) { next(err); }
}

module.exports = { buscarHistorial };
