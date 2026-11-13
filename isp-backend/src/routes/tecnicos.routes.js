const router = require('express').Router();
const ctrl   = require('../controllers/tecnicos.controller');
const { authMiddleware, requireRol } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/ubicaciones', requireRol('SUPERADMIN', 'ADMIN', 'SECRETARIA', 'SUPERVISOR', 'GERENTE'), ctrl.obtenerUbicaciones);
router.patch('/mi-ubicacion', requireRol('TECNICO'), ctrl.reportarUbicacion);

router.get('/',    requireRol('SUPERADMIN', 'ADMIN', 'SECRETARIA', 'SUPERVISOR', 'GERENTE'), ctrl.listar);
router.get('/:id', requireRol('SUPERADMIN', 'ADMIN', 'SECRETARIA', 'SUPERVISOR'), ctrl.obtener);
router.post('/',                   requireRol('SUPERADMIN', 'ADMIN'), ctrl.crear);
router.put('/:id',                 requireRol('SUPERADMIN', 'ADMIN'), ctrl.actualizar);
router.post('/:id/reset-password', requireRol('SUPERADMIN', 'ADMIN'), ctrl.resetPassword);

module.exports = router;