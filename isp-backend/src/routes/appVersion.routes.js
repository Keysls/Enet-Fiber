const router = require('express').Router();
const ctrl   = require('../controllers/appVersion.controller');
const { authMiddleware, requireRol } = require('../middleware/auth.middleware');

router.use(authMiddleware);

// Lectura — cualquier rol autenticado (la app móvil del técnico la consulta al iniciar)
router.get('/ultima', ctrl.obtenerUltima);

// Publicar versión nueva — solo SUPERADMIN
router.post('/', requireRol('SUPERADMIN'), ctrl.publicarVersion);

module.exports = router;
