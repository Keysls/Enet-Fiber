const prisma = require('../utils/prisma');

// ── GET /api/app-version/ultima?plataforma=android ────────────
// Consultado por la app móvil al iniciar para saber si hay una
// versión más nueva publicada que la que tiene instalada.
const obtenerUltima = async (req, res, next) => {
  try {
    const plataforma = req.query.plataforma || 'android';
    const ultima = await prisma.appVersion.findFirst({
      where:   { plataforma },
      orderBy: { versionCode: 'desc' },
    });
    if (!ultima) return res.json({ hayVersion: false });
    res.json({ hayVersion: true, ...ultima });
  } catch (err) { next(err); }
};

// ── POST /api/app-version — publicar una versión nueva ────────
// Solo SUPERADMIN. El APK ya debe estar subido a Firebase Storage
// (u otro hosting) — acá solo se registra la URL y los metadatos.
const publicarVersion = async (req, res, next) => {
  try {
    const {
      plataforma = 'android',
      versionCode, versionName, apkUrl,
      notas, esObligatoria,
    } = req.body;

    if (!versionCode || !versionName || !apkUrl) {
      return res.status(400).json({ error: 'versionCode, versionName y apkUrl son obligatorios' });
    }

    const nueva = await prisma.appVersion.create({
      data: {
        plataforma,
        versionCode:   Number(versionCode),
        versionName:   String(versionName),
        apkUrl:        String(apkUrl),
        notas:         notas || null,
        esObligatoria: esObligatoria === true,
        publicadoPor:  req.usuario?.id || null,
      },
    });

    res.status(201).json(nueva);
  } catch (err) { next(err); }
};

module.exports = { obtenerUltima, publicarVersion };
