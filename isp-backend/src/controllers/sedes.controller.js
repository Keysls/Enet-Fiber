const prisma = require('../utils/prisma');
const { apoyosDeSedes, tablaNoExiste } = require('../utils/sedeApoyo');

// GET /api/sedes
// SUPERADMIN → todas | ADMIN → solo la suya
const listar = async (req, res, next) => {
  try {
    // para_envio=true permite al ADMIN ver todas las sedes activas (elegir destino de envío)
    const paraEnvio = req.query.para_envio === 'true';
    const where = req.usuario.rol === 'ADMIN' && !paraEnvio
      ? { id: req.usuario.sedeId }
      : {};

    const sedes = await prisma.sede.findMany({
      where,
      include: {
        _count: {
          select: { usuarios: true, ordenes: true },
        },
      },
      // Sede principal primero, luego alfabético
      orderBy: [{ esPrincipal: 'desc' }, { nombre: 'asc' }],
    });

    // Sedes que apoya cada una con sus técnicos, como lista plana [{ id, nombre }]
    const apoyos = await apoyosDeSedes(sedes.map(s => s.id));
    res.json(sedes.map(s => ({ ...s, apoyaASedes: apoyos[s.id] })));
  } catch (err) { next(err); }
};

// GET /api/sedes/:id
const obtener = async (req, res, next) => {
  try {
    // ADMIN solo puede ver su propia sede
    if (req.usuario.rol === 'ADMIN' && req.params.id !== req.usuario.sedeId) {
      return res.status(403).json({ error: 'No tienes acceso a esta sede' });
    }

    const sede = await prisma.sede.findUnique({
      where:   { id: req.params.id },
      include: {
        usuarios: {
          where:  { rol: 'ADMIN' },
          select: { id: true, nombre: true, apellido: true, email: true, activo: true },
        },
        _count: { select: { ordenes: true } },
      },
    });

    if (!sede) return res.status(404).json({ error: 'Sede no encontrada' });
    res.json(sede);
  } catch (err) { next(err); }
};

// POST /api/sedes — solo SUPERADMIN
const crear = async (req, res, next) => {
  try {
    const { nombre, ciudad, esPrincipal } = req.body;

    if (!nombre || !ciudad)
      return res.status(400).json({ error: 'nombre y ciudad son requeridos' });

    const sede = await prisma.$transaction(async (tx) => {
      // Solo puede haber una sede principal — quitar la marca a las demás
      if (esPrincipal === true) {
        await tx.sede.updateMany({ where: { esPrincipal: true }, data: { esPrincipal: false } });
      }

      return tx.sede.create({
        data: {
          nombre: nombre.trim(),
          ciudad: ciudad.trim(),
          ...(esPrincipal === true && { esPrincipal: true }),
        },
      });
    });

    await prisma.logActividad.create({
      data: {
        usuarioId:  req.usuario.id,
        accion:     'CREAR_SEDE',
        tabla:      'sedes',
        registroId: sede.id,
        detalles:   { nombre, ciudad, esPrincipal: sede.esPrincipal },
        ip:         req.ip,
      },
    });

    res.status(201).json(sede);
  } catch (err) { next(err); }
};

// PUT /api/sedes/:id — solo SUPERADMIN
const actualizar = async (req, res, next) => {
  try {
    const { nombre, ciudad, activo, esPrincipal, puedeEnviarStock, correoReceptor, correoEmisor, correoEmisorPass } = req.body;
    let { apoyaASedes } = req.body;

    // Si aún no se corrió la migración de sedes_apoyo, una lista vacía se ignora
    // (el NOC la manda al editar cualquier sede) y una con sedes avisa qué falta.
    if (apoyaASedes !== undefined) {
      const hayTabla = await prisma.sedeApoyo.count().then(() => true, (err) => {
        if (tablaNoExiste(err)) return false;
        throw err;
      });
      if (!hayTabla) {
        if (Array.isArray(apoyaASedes) && apoyaASedes.filter(Boolean).length > 0)
          return res.status(400).json({ error: 'Falta aplicar la migración 20261027_sede_apoyo.sql en la base de datos para poder vincular sedes.' });
        apoyaASedes = undefined;
      }
    }

    const sede = await prisma.$transaction(async (tx) => {
      const actual = await tx.sede.findUnique({ where: { id: req.params.id } });
      if (!actual) {
        const error = new Error('Sede no encontrada');
        error.status = 404;
        throw error;
      }

      // No se puede desactivar la sede principal
      if (actual.esPrincipal && activo === false) {
        const error = new Error('No puedes desactivar la sede principal. Marca otra sede como principal primero.');
        error.status = 400;
        throw error;
      }

      // Sedes a las que apoya con sus técnicos (reemplaza la lista completa):
      // no a sí misma, solo sedes que existen y no a una que ya apoya a esta
      if (apoyaASedes !== undefined) {
        const falla = (msg) => { const error = new Error(msg); error.status = 400; throw error; };
        if (!Array.isArray(apoyaASedes)) falla('apoyaASedes debe ser una lista de sedes');
        const ids = [...new Set(apoyaASedes.filter(Boolean))];
        if (ids.includes(req.params.id)) falla('Una sede no puede apoyarse a sí misma');

        if (ids.length > 0) {
          const existentes = await tx.sede.findMany({ where: { id: { in: ids } }, select: { id: true } });
          if (existentes.length !== ids.length) falla('Alguna de las sedes a apoyar no existe');
          const reciproca = await tx.sedeApoyo.findFirst({
            where:  { sedeId: { in: ids }, sedeApoyadaId: req.params.id },
            select: { sede: { select: { nombre: true } } },
          });
          if (reciproca) falla(`${reciproca.sede.nombre} ya apoya a esta sede. El apoyo es en un solo sentido.`);
        }

        await tx.sedeApoyo.deleteMany({ where: { sedeId: req.params.id, sedeApoyadaId: { notIn: ids } } });
        await tx.sedeApoyo.createMany({
          data: ids.map(sedeApoyadaId => ({ sedeId: req.params.id, sedeApoyadaId })),
          skipDuplicates: true,
        });
      }

      // Si se marca como principal, quitar la marca a las demás
      if (esPrincipal === true) {
        await tx.sede.updateMany({
          where: { id: { not: req.params.id }, esPrincipal: true },
          data:  { esPrincipal: false },
        });
      }

      return tx.sede.update({
        where: { id: req.params.id },
        data: {
          ...(nombre           !== undefined && { nombre:          nombre.trim() }),
          ...(ciudad           !== undefined && { ciudad:          ciudad.trim() }),
          ...(activo           !== undefined && { activo }),
          ...(esPrincipal      === true      && { esPrincipal:     true }),
          ...(puedeEnviarStock !== undefined && { puedeEnviarStock }),
          ...(correoReceptor   !== undefined && { correoReceptor: correoReceptor?.trim() || null }),
          ...(correoEmisor     !== undefined && { correoEmisor: correoEmisor?.trim() || null }),
          ...(correoEmisorPass !== undefined && { correoEmisorPass: correoEmisorPass ? require('./olt/encryption').encrypt(correoEmisorPass) : null }),        },
      });
    });

    if (apoyaASedes === undefined) return res.json(sede);
    const apoyos = await apoyosDeSedes([sede.id]);
    res.json({ ...sede, apoyaASedes: apoyos[sede.id] });
  } catch (err) { next(err); }
};

module.exports = { listar, obtener, crear, actualizar };