const jwt    = require('jsonwebtoken');
const prisma = require('../utils/prisma');

// Únicas escrituras que puede hacer un GERENTE (su propia sesión y cuenta)
const ESCRITURAS_PERMITIDAS_GERENTE = new Set([
  'POST /api/auth/logout',
  'PATCH /api/auth/cambiar-password',
  'POST /api/auth/2fa/generar',
  'POST /api/auth/2fa/activar',
  'POST /api/auth/2fa/desactivar',
  'PATCH /api/usuarios/perfil',
]);

// ── Verifica JWT y adjunta el usuario al request ──────────────
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const sesion = await prisma.tokenSesion.findUnique({
      where:   { token },
      include: { usuario: { include: { sede: true } } },
    });

    if (!sesion || !sesion.activo || sesion.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Sesión expirada o inválida' });
    }

    if (!sesion.usuario.activo) {
      return res.status(401).json({ error: 'Usuario desactivado' });
    }

    // GERENTE (administrador general) es solo de consulta: cualquier escritura se rechaza aquí,
    // salvo salir de sesión y lo de su propia cuenta (contraseña, 2FA, perfil).
    if (sesion.usuario.rol === 'GERENTE' && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const ruta = req.originalUrl.split('?')[0].replace(/\/+$/, '');
      if (!ESCRITURAS_PERMITIDAS_GERENTE.has(`${req.method} ${ruta}`))
        return res.status(403).json({ error: 'Tu cuenta es solo de consulta' });
    }

    req.usuario = sesion.usuario;
    req.token   = token;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError')  return res.status(401).json({ error: 'Token inválido' });
    if (err.name === 'TokenExpiredError')  return res.status(401).json({ error: 'Token expirado' });
    next(err);
  }
};

// ── Verifica que el usuario tenga uno de los roles permitidos ─
const requireRol = (...roles) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    next();
  };
};

// ── Helpers de rol ────────────────────────────────────────────

// Roles que acceden al panel NOC
const esNoc = (rol) => ['SUPERADMIN', 'OPERADOR_NOC'].includes(rol);

// Roles que acceden al panel Admin (superadmin puede ver todos)
const esAdmin = (rol) => ['SUPERADMIN', 'ADMIN'].includes(rol);

// Solo el superadmin gestiona sedes y usuarios NOC/ADMIN
const esSuperAdmin = (rol) => rol === 'SUPERADMIN';

module.exports = { authMiddleware, requireRol, esNoc, esAdmin, esSuperAdmin };