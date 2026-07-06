const router = require('express').Router();
const ctrl   = require('../controllers/siscadre.controller');
const { authMiddleware, requireRol } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/:sedeId/config', requireRol('SUPERADMIN', 'ADMIN', 'OPERADOR_NOC'),                    ctrl.obtenerConfig);
router.post('/:sedeId/config', requireRol('SUPERADMIN'),                                            ctrl.guardarConfig);
router.post('/:sedeId/probar', requireRol('SUPERADMIN'),                                            ctrl.probarConexion);
router.post('/:sedeId/sync',   requireRol('SUPERADMIN', 'ADMIN', 'SECRETARIA', 'OPERADOR_NOC'),     ctrl.sincronizar);

module.exports = router;