const router = require('express').Router();
const ctrl   = require('../controllers/siscadre.controller');
const { authMiddleware, requireRol } = require('../middleware/auth.middleware');

router.use(authMiddleware);

// ── Conexiones (varias por sede) ──────────────────────────────
router.get('/:sedeId/conexiones',     requireRol('SUPERADMIN', 'ADMIN', 'OPERADOR_NOC', 'SECRETARIA'),  ctrl.listarConexiones);
router.post('/:sedeId/conexiones',    requireRol('SUPERADMIN'),                                         ctrl.guardarConexion);
router.delete('/conexiones/:id',      requireRol('SUPERADMIN'),                                         ctrl.eliminarConexion);
router.post('/conexiones/:id/probar', requireRol('SUPERADMIN'),                                         ctrl.probarConexion);

// ── Sincronizar (recorre todas las conexiones activas de la sede) ──
router.post('/:sedeId/sync', requireRol('SUPERADMIN', 'ADMIN', 'SECRETARIA', 'OPERADOR_NOC'), ctrl.sincronizar);

module.exports = router;