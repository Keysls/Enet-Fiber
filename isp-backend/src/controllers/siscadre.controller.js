const prisma = require('../utils/prisma');
const mysql  = require('mysql2/promise');
const { encrypt, decrypt } = require('./siscadre/encryption');

// ── Mapear tipo de servicio Siscadre → enum TipoOrden ────────
// Copia independiente de detectarTipo() (excel.service.js) para que
// Siscadre no dependa del servicio de Excel — mismo comportamiento,
// validado con datos reales de producción.
function detectarTipoOrden(servicio) {
  if (!servicio) return null;
  const s = servicio.toUpperCase().trim();

  // ── INTERNET ─────────────────────────────────────────────────
  if (s === 'INSTALACION(I)'          || s === 'INSTALACIÓN(I)')          return 'INSTALACION_I';
  if (s === 'ALTA DE SERVICIO(I)')                                         return 'ALTA_SERVICIO_I';
  if (s === 'ATENCION NOC(I)'         || s === 'ANTENCION NOC(I)')        return 'ATENCION_NOC_I';
  if (s === 'AVERIA(I)'               || s === 'AVERÍA(I)')               return 'AVERIA_I';
  if (s === 'BAJA DE SERVICIO(I)')                                         return 'BAJA_SERVICIO_I';
  if (s === 'CAMBIO DE CONTRASEÑA(I)' || s === 'CAMBIO DE CONTRASENA(I)') return 'CAMBIO_CONTRASENA_I';
  if (s === 'CAMBIO DE DOMICILIO(I)')                                      return 'CAMBIO_DOMICILIO_I';
  if (s === 'CAMBIO DE EQUIPO(I)')                                         return 'CAMBIO_EQUIPO_I';
  if (s === 'CAMBIO DE PLAN(I)')                                           return 'CAMBIO_PLAN_I';
  if (s === 'CAMBIO DE TITULAR(I)')                                        return 'CAMBIO_TITULAR_I';
  if (s === 'CORTE A SOLICITUD(I)')                                        return 'CORTE_SOLICITUD_I';
  if (s === 'CORTE POR DEUDA(I)')                                          return 'CORTE_DEUDA_I';
  if (s === 'RECONEXION(I)'           || s === 'RECONEXIÓN(I)')           return 'RECONEXION_I';
  if (s === 'RETIRO DE EQUIPO(I)')                                         return 'RETIRO_EQUIPO_I';
  if (s === 'TRASLADO(I)')                                                 return 'TRASLADO_I';

  // ── CABLE ─────────────────────────────────────────────────────
  if (s === 'INSTALACION(C)'          || s === 'INSTALACIÓN(C)')          return 'INSTALACION_C';
  if (s === 'ALTA DE SERVICIO(C)')                                         return 'ALTA_SERVICIO_C';
  if (s === 'AVERIA(C)'               || s === 'AVERÍA(C)')               return 'AVERIA_C';
  if (s === 'CAMBIO DE DOMICILIO(C)')                                      return 'CAMBIO_DOMICILIO_C';
  if (s === 'CAMBIO DE PLAN(C)')                                           return 'CAMBIO_PLAN_C';
  if (s === 'CAMBIO DE TITULAR(C)')                                        return 'CAMBIO_TITULAR_C';
  if (s === 'CORTE A SOLICITUD(C)')                                        return 'CORTE_SOLICITUD_C';
  if (s === 'CORTE POR DEUDA(C)')                                          return 'CORTE_DEUDA_C';
  if (s === 'INSTALACION DE ANEXO(C)' || s === 'INSTALACIÓN DE ANEXO(C)') return 'INSTALACION_ANEXO_C';
  if (s === 'MIGRACION FTTH(C)'       || s === 'MIGRACIÓN FTTH(C)')       return 'MIGRACION_FTTH_C';
  if (s === 'RECONEXION(C)'           || s === 'RECONEXIÓN(C)')           return 'RECONEXION_C';
  if (s === 'RETIRO DE EQUIPO(C)')                                         return 'RETIRO_EQUIPO_C';
  if (s === 'SUPERVICION(C)'          || s === 'SUPERVISIÓN(C)'
                                      || s === 'SUPERVISION(C)')          return 'SUPERVISION_C';
  if (s === 'TRASLADO(C)')                                                 return 'TRASLADO_C';

  // ── DÚO (Internet + Cable) ────────────────────────────────────
  if (s === 'INSTALACION(D)'          || s === 'INSTALACIÓN(D)')          return 'INSTALACION_D';
  if (s === 'ALTA DE SERVICIO(D)')                                         return 'ALTA_SERVICIO_D';
  if (s === 'AVERIA(D)'               || s === 'AVERÍA(D)')               return 'AVERIA_D';
  if (s === 'CAMBIO DE DOMICILIO(D)')                                      return 'CAMBIO_DOMICILIO_D';
  if (s === 'CAMBIO DE EQUIPO(D)')                                         return 'CAMBIO_EQUIPO_D';
  if (s === 'CAMBIO DE PLAN(D)')                                           return 'CAMBIO_PLAN_D';
  if (s === 'CAMBIO DE TITULAR(D)')                                        return 'CAMBIO_TITULAR_D';
  if (s === 'CORTE A SOLICITUD(D)')                                        return 'CORTE_SOLICITUD_D';
  if (s === 'CORTE POR DEUDA(D)')                                          return 'CORTE_DEUDA_D';
  if (s === 'RECONEXION(D)'           || s === 'RECONEXIÓN(D)')           return 'RECONEXION_D';
  if (s === 'RETIRO DE EQUIPO(D)')                                         return 'RETIRO_EQUIPO_D';
  if (s === 'TRASLADO(D)')                                                 return 'TRASLADO_D';
  if (s === 'BAJA DE SERVICIO(D)')                                         return 'BAJA_SERVICIO_D';

  // ── Fallback por palabras clave ───────────────────────────────
  if (s.includes('INSTAL')    && s.includes('ANEXO') && s.includes('(C)')) return 'INSTALACION_ANEXO_C';
  if (s.includes('MIGRACI')   && s.includes('(C)'))  return 'MIGRACION_FTTH_C';
  if (s.includes('INSTAL')    && s.includes('(I)'))  return 'INSTALACION_I';
  if (s.includes('INSTAL')    && s.includes('(C)'))  return 'INSTALACION_C';
  if (s.includes('INSTAL')    && s.includes('(D)'))  return 'INSTALACION_D';
  if (s.includes('CAMBIO')    && s.includes('EQUIPO') && s.includes('(I)')) return 'CAMBIO_EQUIPO_I';
  if (s.includes('CAMBIO')    && s.includes('EQUIPO') && s.includes('(D)')) return 'CAMBIO_EQUIPO_D';
  if (s.includes('CAMBIO')    && s.includes('PLAN')  && s.includes('(I)')) return 'CAMBIO_PLAN_I';
  if (s.includes('CAMBIO')    && s.includes('PLAN')  && s.includes('(C)')) return 'CAMBIO_PLAN_C';
  if (s.includes('CAMBIO')    && s.includes('PLAN')  && s.includes('(D)')) return 'CAMBIO_PLAN_D';
  if (s.includes('AVERI')     && s.includes('(I)'))  return 'AVERIA_I';
  if (s.includes('AVERI')     && s.includes('(C)'))  return 'AVERIA_C';
  if (s.includes('AVERI')     && s.includes('(D)'))  return 'AVERIA_D';
  if (s.includes('RECONEX')   && s.includes('(I)'))  return 'RECONEXION_I';
  if (s.includes('RECONEX')   && s.includes('(C)'))  return 'RECONEXION_C';
  if (s.includes('RECONEX')   && s.includes('(D)'))  return 'RECONEXION_D';
  if (s.includes('TRASLADO')  && s.includes('(I)'))  return 'TRASLADO_I';
  if (s.includes('TRASLADO')  && s.includes('(C)'))  return 'TRASLADO_C';
  if (s.includes('TRASLADO')  && s.includes('(D)'))  return 'TRASLADO_D';
  if (s.includes('BAJA')      && s.includes('(I)'))  return 'BAJA_SERVICIO_I';
  if (s.includes('BAJA')      && s.includes('(D)'))  return 'BAJA_SERVICIO_D';
  if (s.includes('ALTA')      && s.includes('(I)'))  return 'ALTA_SERVICIO_I';
  if (s.includes('ALTA')      && s.includes('(C)'))  return 'ALTA_SERVICIO_C';
  if (s.includes('ALTA')      && s.includes('(D)'))  return 'ALTA_SERVICIO_D';
  if (s.includes('CORTE')     && s.includes('(I)'))  return 'CORTE_SOLICITUD_I';
  if (s.includes('CORTE')     && s.includes('(C)'))  return 'CORTE_SOLICITUD_C';
  if (s.includes('CORTE')     && s.includes('(D)'))  return 'CORTE_SOLICITUD_D';
  if (s.includes('RETIRO')    && s.includes('(I)'))  return 'RETIRO_EQUIPO_I';
  if (s.includes('RETIRO')    && s.includes('(C)'))  return 'RETIRO_EQUIPO_C';
  if (s.includes('RETIRO')    && s.includes('(D)'))  return 'RETIRO_EQUIPO_D';
  if (s.includes('NOC')       && s.includes('(I)'))  return 'ATENCION_NOC_I';
  if (s.includes('SUPERVI')   && s.includes('(C)'))  return 'SUPERVISION_C';

  return null; // Tipo no reconocido — no se importa, se reporta como error
}

// ── Parsear fecha "dd/mm/yyyy" → Date ────────────────────────
function parsearFecha(fechaStr) {
  if (!fechaStr) return new Date();
  const partes = String(fechaStr).split('/');
  if (partes.length !== 3) return new Date();
  const [dia, mes, anio] = partes;
  const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
  return isNaN(fecha.getTime()) ? new Date() : fecha;
}

// ── Obtener config Siscadre de una sede ───────────────────────
const obtenerConfig = async (req, res, next) => {
  try {
    const { sedeId } = req.params;
    const sede = await prisma.sede.findUnique({
      where: { id: sedeId },
      select: {
        id:               true,
        nombre:           true,
        siscadreHost:     true,
        siscadrePort:     true,
        siscadreUser:     true,
        siscadreDatabase: true,
        siscadreScript:   true,
        siscadreLastSync: true,
      },
    });
    if (!sede) return res.status(404).json({ error: 'Sede no encontrada' });
    res.json(sede);
  } catch (err) { next(err); }
};

// ── Guardar config Siscadre ───────────────────────────────────
const guardarConfig = async (req, res, next) => {
  try {
    const { sedeId } = req.params;
    const { host, port, user, password, database, script } = req.body;

    if (!host || !user || !database) {
      return res.status(400).json({ error: 'Host, usuario y base de datos son obligatorios' });
    }

    const dataUpdate = {
      siscadreHost:     host,
      siscadrePort:     port ? Number(port) : 3306,
      siscadreUser:     user,
      siscadreDatabase: database,
      siscadreScript:   script || null,
    };

    if (password) {
      dataUpdate.siscadrePassword = encrypt(password);
    }

    await prisma.sede.update({
      where: { id: sedeId },
      data:  dataUpdate,
    });

    res.json({ ok: true, mensaje: 'Configuración guardada' });
  } catch (err) { next(err); }
};

// ── Probar conexión ───────────────────────────────────────────
const probarConexion = async (req, res, next) => {
  let conn;
  try {
    const { sedeId } = req.params;
    const { host, port, user, password, database } = req.body;

    let passwordFinal = password;

    if (!passwordFinal) {
      const sede = await prisma.sede.findUnique({
        where: { id: sedeId },
        select: { siscadrePassword: true },
      });
      passwordFinal = sede?.siscadrePassword ? decrypt(sede.siscadrePassword) : null;
    }

    if (!host || !user || !passwordFinal || !database) {
      return res.status(400).json({ error: 'Completa todos los campos' });
    }

    conn = await mysql.createConnection({
      host,
      port: Number(port) || 3306,
      user,
      password: passwordFinal,
      database,
      connectTimeout: 8000,
    });

    await conn.ping();
    res.json({ ok: true, mensaje: '✅ Conexión exitosa a Siscadre' });
  } catch (err) {
    res.status(400).json({ error: `No se pudo conectar: ${err.message}` });
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
};

// ── Sincronizar órdenes desde Siscadre ───────────────────────
const sincronizar = async (req, res, next) => {
  let conn;
  try {
    const { sedeId } = req.params;

    const sede = await prisma.sede.findUnique({
      where: { id: sedeId },
      select: {
        siscadreHost:     true,
        siscadrePort:     true,
        siscadreUser:     true,
        siscadrePassword: true,
        siscadreDatabase: true,
        siscadreScript:   true,
      },
    });

    if (!sede?.siscadreHost) {
      return res.status(400).json({ error: 'Esta sede no tiene configuración de Siscadre' });
    }

    conn = await mysql.createConnection({
      host:           sede.siscadreHost,
      port:           sede.siscadrePort || 3306,
      user:           sede.siscadreUser,
      password:       decrypt(sede.siscadrePassword),
      database:       sede.siscadreDatabase,
      connectTimeout: 15000,
    });

    if (!sede.siscadreScript) {
      return res.status(400).json({ error: 'Esta sede no tiene un script SQL configurado. Configúralo desde Sedes → Siscadre.' });
    }

    const script = sede.siscadreScript;

    const [rows] = await conn.execute(script);

    let nuevas     = 0;
    let existentes = 0;
    let errores    = 0;
    const detalles = [];

    for (const row of rows) {
      const codigoCompleto = String(row['NÚMERO DE ORDEN']);
      // nServicio = últimos 4 dígitos, igual que el histórico del Excel
      const nServicio = codigoCompleto.slice(-4);

      const servicio  = row['SERVICIO'];
      const tipoOrden = detectarTipoOrden(servicio);

      if (!tipoOrden) {
        errores++;
        detalles.push({
          codigo: codigoCompleto,
          estado: 'error',
          motivo: `Servicio no reconocido: "${servicio}"`,
        });
        continue;
      }

      try {
        const existe = await prisma.ordenServicio.findFirst({
          where: { codigoSiscadre: codigoCompleto, sedeId },
          select: { id: true },
        });

        if (existe) {
          existentes++;
          detalles.push({ codigo: codigoCompleto, estado: 'existe' });
          continue;
        }

        const mensualidadStr = String(row['MENSUALIDAD'] || '0')
          .replace('S/ ', '')
          .replace(/,/g, '');
        const mensualidad = mensualidadStr === 'S/N' ? null : (parseFloat(mensualidadStr) || null);

        await prisma.ordenServicio.create({
          data: {
            nServicio,
            codigoSiscadre: codigoCompleto,
            sedeId,
            estado:        'PENDIENTE_NOC',
            tipoOrden,
            fechaServicio: parsearFecha(row['FECHA CREA']),
            abonado:       row['ABONADO']                 || 'S/N',
            dni:           row['DOCUMENTO DE IDENTIDAD']  || null,
            direccion:     row['DIRECCIÓN']               || 'S/D',
            referencia:    row['REFERENCIA']              || null,
            sector:        row['SECTOR']                  || null,
            celular:       row['TELÉFONO']                || 'S/N',
            observacion:   row['OBSERVACIÓN INICIAL']     || null,
            contrato:      String(row['NÚMERO DE CONTRATO'] || ''),
            mensualidad,
          },
        });

        nuevas++;
        detalles.push({ codigo: codigoCompleto, estado: 'importada' });

      } catch (err) {
        if (err.code === 'P2002') {
          existentes++;
          detalles.push({ codigo: codigoCompleto, estado: 'existe' });
        } else {
          throw err;
        }
      }
    }

    await prisma.sede.update({
      where: { id: sedeId },
      data:  { siscadreLastSync: new Date() },
    });

    res.json({
      ok:         true,
      total:      rows.length,
      nuevas,
      existentes,
      errores,
      syncAt:     new Date(),
      detalles,
    });

  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
      return res.status(400).json({ error: 'No se pudo conectar al servidor de Siscadre' });
    }
    next(err);
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
};

module.exports = { guardarConfig, obtenerConfig, probarConexion, sincronizar };