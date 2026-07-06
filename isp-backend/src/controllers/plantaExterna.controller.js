const prisma = require('../utils/prisma');

// ── GET /api/planta-externa ───────────────────────────────────
const listar = async (req, res, next) => {
  try {
    const { rol, sedeId: miSede } = req.usuario;
    const { tipo, estado } = req.query;

    const where = {
      ...(rol === 'ADMIN' || rol === 'SECRETARIA' ? { sedeId: miSede } : {}),
      ...(tipo   && { tipo }),
      ...(estado && { estado }),
    };

    const trabajos = await prisma.trabajoPlantaExterna.findMany({
  where,
  include: {
    tecnicos: {
      include: {
        tecnico: {
          include: { usuario: { select: { nombre: true, apellido: true } } },
        },
      },
    },
    consumos: { select: { id: true } }, // solo para contar
    sede: { select: { nombre: true } },
  },
  orderBy: { createdAt: 'desc' },
});

    res.json(trabajos);
  } catch (err) { next(err); }
};

// ── GET /api/planta-externa/:id ───────────────────────────────
const obtener = async (req, res, next) => {
  try {
    const trabajo = await prisma.trabajoPlantaExterna.findUnique({
      where: { id: req.params.id },
      include: {
        tecnicos: {
          include: {
            tecnico: {
              include: { usuario: { select: { nombre: true, apellido: true } } },
            },
          },
        },
        sede: { select: { nombre: true } },
      },
    });

    if (!trabajo) return res.status(404).json({ error: 'Trabajo no encontrado' });

    if (['ADMIN', 'SECRETARIA'].includes(req.usuario.rol) && trabajo.sedeId !== req.usuario.sedeId)
      return res.status(403).json({ error: 'No tienes acceso a este trabajo' });

    // Consumos registrados por el técnico vinculados a este trabajo
    const consumos = await prisma.consumoTecnico.findMany({
      where: { trabajoPEId: req.params.id },
      include: {
        producto: {
          select: { nombre: true, unidad: true, esMedible: true, metrosPorUnidad: true },
        },
      },
      orderBy: { fecha: 'desc' },
    });

    res.json({ ...trabajo, consumos });
  } catch (err) { next(err); }
};

// ── POST /api/planta-externa ──────────────────────────────────
// Técnico crea desde la app / Admin desde el panel
const crear = async (req, res, next) => {
  try {
    const { tipo, nombre, descripcion, ubicacion, fechaInicio, tecnicoIds = [] } = req.body;

    if (!tipo || !nombre)
      return res.status(400).json({ error: 'tipo y nombre son obligatorios' });

    if (!['PROYECTO', 'AVERIA_MASIVA', 'MANTENIMIENTO'].includes(tipo))
      return res.status(400).json({ error: 'tipo inválido' });

    if (tipo === 'AVERIA_MASIVA' && !ubicacion)
      return res.status(400).json({ error: 'ubicacion es obligatoria para AVERIA_MASIVA' });

    // Determinar sedeId — técnico usa la suya, admin usa la suya
    const sedeId = req.usuario.sedeId;
    if (!sedeId) return res.status(400).json({ error: 'Tu usuario no tiene sede asignada' });

    // Si el que crea es TECNICO, agregarlo automáticamente
    let tecnicosFinales = [...new Set(tecnicoIds)];
    if (req.usuario.rol === 'TECNICO') {
      const tecnico = await prisma.tecnico.findUnique({
        where: { usuarioId: req.usuario.id },
        select: { id: true },
      });
      if (tecnico && !tecnicosFinales.includes(tecnico.id)) {
        tecnicosFinales.unshift(tecnico.id);
      }
    }

    // Validar que los técnicos existan y sean de la misma sede
    if (tecnicosFinales.length > 0) {
      const tecnicos = await prisma.tecnico.findMany({
        where: { id: { in: tecnicosFinales } },
        include: { usuario: { select: { sedeId: true } } },
      });
      const foraneos = tecnicos.filter(t => t.usuario.sedeId !== sedeId);
      if (foraneos.length > 0)
        return res.status(400).json({ error: 'Uno o más técnicos no pertenecen a esta sede' });
    }

    const trabajo = await prisma.trabajoPlantaExterna.create({
      data: {
        tipo,
        nombre,
        descripcion: descripcion || null,
        ubicacion:   ubicacion   || null,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : new Date(),
        sedeId,
        creadoPor: req.usuario.id,
        tecnicos: {
          create: tecnicosFinales.map(id => ({ tecnicoId: id })),
        },
      },
      include: {
        tecnicos: {
          include: {
            tecnico: {
              include: { usuario: { select: { nombre: true, apellido: true } } },
            },
          },
        },
      },
    });

    res.status(201).json(trabajo);
  } catch (err) { next(err); }
};

// ── PATCH /api/planta-externa/:id ────────────────────────────
// Editar nombre, descripcion, ubicacion mientras EN_CURSO
const editar = async (req, res, next) => {
  try {
    const { nombre, descripcion, ubicacion } = req.body;

    const trabajo = await prisma.trabajoPlantaExterna.findUnique({
      where: { id: req.params.id },
    });

    if (!trabajo) return res.status(404).json({ error: 'Trabajo no encontrado' });
    if (trabajo.estado === 'COMPLETADO')
      return res.status(400).json({ error: 'No se puede editar un trabajo completado' });

    if (['ADMIN', 'SECRETARIA'].includes(req.usuario.rol) && trabajo.sedeId !== req.usuario.sedeId)
      return res.status(403).json({ error: 'No tienes acceso a este trabajo' });

    const actualizado = await prisma.trabajoPlantaExterna.update({
      where: { id: req.params.id },
      data: {
        ...(nombre      && { nombre }),
        ...(descripcion !== undefined && { descripcion }),
        ...(ubicacion   !== undefined && { ubicacion }),
      },
    });

    res.json(actualizado);
  } catch (err) { next(err); }
};

// ── POST /api/planta-externa/:id/material ────────────────────
const agregarMaterial = async (req, res, next) => {
  try {
    const { items, comentario } = req.body;
    // items: [{ productoId, cantidad }]

    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'Debe indicar al menos un item' });

    const trabajo = await prisma.trabajoPlantaExterna.findUnique({
      where: { id: req.params.id },
    });

    if (!trabajo) return res.status(404).json({ error: 'Trabajo no encontrado' });
    if (trabajo.estado === 'COMPLETADO')
      return res.status(400).json({ error: 'No se puede agregar material a un trabajo completado' });

    // Obtener el técnico desde el usuario logueado
    const tecnico = await prisma.tecnico.findUnique({
      where: { usuarioId: req.usuario.id },
      select: { id: true, sedeId: true },
    });
    if (!tecnico) return res.status(404).json({ error: 'Técnico no encontrado' });

    const itemsValidos = items
      .filter(i => i.productoId && Number(i.cantidad) > 0)
      .map(i => ({ productoId: Number(i.productoId), cantidad: Number(i.cantidad) }));

    if (itemsValidos.length === 0)
      return res.status(400).json({ error: 'Ningún item válido' });

    // Registrar consumos — igual que registrarConsumo pero con trabajoPEId
    await Promise.all(
      itemsValidos.map(i =>
        prisma.consumoTecnico.create({
          data: {
            tecnicoId:   tecnico.id,
            sedeId:      tecnico.sedeId,
            productoId:  i.productoId,
            cantidad:    i.cantidad,
            motivo:      'PLANTA_EXTERNA',
            descripcion: comentario || null,
            trabajoPEId: req.params.id,  // ← la única diferencia
          },
        })
      )
    );

    res.status(201).json({ ok: true, message: 'Material registrado correctamente' });
  } catch (err) { next(err); }
};

// ── POST /api/planta-externa/:id/completar ───────────────────
const completar = async (req, res, next) => {
  try {
    const trabajo = await prisma.trabajoPlantaExterna.findUnique({
      where: { id: req.params.id },
    });

    if (!trabajo) return res.status(404).json({ error: 'Trabajo no encontrado' });
    if (trabajo.estado === 'COMPLETADO')
      return res.status(400).json({ error: 'El trabajo ya está completado' });

    if (['ADMIN', 'SECRETARIA'].includes(req.usuario.rol) && trabajo.sedeId !== req.usuario.sedeId)
      return res.status(403).json({ error: 'No tienes acceso a este trabajo' });

    const actualizado = await prisma.trabajoPlantaExterna.update({
      where: { id: req.params.id },
      data: {
        estado:   'COMPLETADO',
        fechaFin: new Date(),
      },
    });

    res.json({ ok: true, trabajo: actualizado });
  } catch (err) { next(err); }
};

// ── POST /api/planta-externa/:id/tecnico ─────────────────────
// Admin agrega un técnico adicional al trabajo
const agregarTecnico = async (req, res, next) => {
  try {
    const { tecnicoId } = req.body;
    if (!tecnicoId) return res.status(400).json({ error: 'tecnicoId requerido' });

    const trabajo = await prisma.trabajoPlantaExterna.findUnique({
      where: { id: req.params.id },
    });

    if (!trabajo) return res.status(404).json({ error: 'Trabajo no encontrado' });
    if (trabajo.estado === 'COMPLETADO')
      return res.status(400).json({ error: 'No se puede modificar un trabajo completado' });

    // Verificar que el técnico sea de la misma sede
    const tecnico = await prisma.tecnico.findUnique({
      where: { id: tecnicoId },
      include: { usuario: { select: { sedeId: true, nombre: true, apellido: true } } },
    });

    if (!tecnico || !tecnico.activo)
      return res.status(404).json({ error: 'Técnico no encontrado' });

    if (tecnico.usuario.sedeId !== trabajo.sedeId)
      return res.status(400).json({ error: 'El técnico no pertenece a la sede de este trabajo' });

    await prisma.tecnicoEnTrabajoPE.create({
      data: { trabajoId: req.params.id, tecnicoId },
    });

    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2002')
      return res.status(400).json({ error: 'El técnico ya está asignado a este trabajo' });
    next(err);
  }
};

module.exports = {
  listar,
  obtener,
  crear,
  editar,
  agregarMaterial,
  completar,
  agregarTecnico,
};