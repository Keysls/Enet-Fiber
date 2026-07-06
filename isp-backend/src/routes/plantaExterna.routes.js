const router = require('express').Router();
const ctrl = require('../controllers/plantaExterna.controller');
const { authMiddleware, requireRol } = require('../middleware/auth.middleware');

router.use(authMiddleware);

// ── Listar y obtener ──────────────────────────────────────────
router.get('/',    requireRol('SUPERADMIN', 'ADMIN', 'OPERADOR_NOC', 'SECRETARIA', 'TECNICO'), ctrl.listar);
router.get('/:id', requireRol('SUPERADMIN', 'ADMIN', 'OPERADOR_NOC', 'SECRETARIA', 'TECNICO'), ctrl.obtener);

// ── Crear (técnico desde app / admin desde panel) ─────────────
router.post('/', requireRol('SUPERADMIN', 'ADMIN', 'OPERADOR_NOC', 'TECNICO'), ctrl.crear);

// ── Editar mientras EN_CURSO ──────────────────────────────────
router.patch('/:id', requireRol('SUPERADMIN', 'ADMIN', 'OPERADOR_NOC', 'TECNICO'), ctrl.editar);

// ── Agregar material (técnico desde su inventario) ────────────
router.post('/:id/material', requireRol('TECNICO', 'SUPERADMIN', 'ADMIN'), ctrl.agregarMaterial);

// ── Completar trabajo ─────────────────────────────────────────
router.post('/:id/completar', requireRol('SUPERADMIN', 'ADMIN', 'OPERADOR_NOC', 'TECNICO'), ctrl.completar);

// ── Agregar técnico adicional (solo admin) ────────────────────
router.post('/:id/tecnico', requireRol('SUPERADMIN', 'ADMIN', 'OPERADOR_NOC'), ctrl.agregarTecnico);

module.exports = router;