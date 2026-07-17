const prisma = require('../utils/prisma');
const mysql  = require('mysql2/promise');
const { encrypt, decrypt } = require('./siscadre/encryption');
const { upsertContratoDesdeOrden, wanHeredableDelContrato } = require('./ordenes.controller');
const { TIPOS_NOC_TECNICO } = require('../utils/tipoOrden');


// Mismos tipos que ordenes.controller.js — que el NOC completa manualmente sin técnico
const TIPOS_NOC_COMPLETA = [
  'CORTE_DEUDA_I', 'CORTE_SOLICITUD_I',
  'CAMBIO_TITULAR_I', 'CAMBIO_PLAN_I', 'CAMBIO_CONTRASENA_I',
  'ALTA_SERVICIO_I', 'BAJA_SERVICIO_I', 'ATENCION_NOC_I',
  'CORTE_DEUDA_D', 'CORTE_SOLICITUD_D',
  'CAMBIO_TITULAR_D', 'CAMBIO_PLAN_D',
  'ALTA_SERVICIO_D', 'BAJA_SERVICIO_D',
];

const TIPOS_NOC = [...TIPOS_NOC_TECNICO, ...TIPOS_NOC_COMPLETA];

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
// ── Listar todas las conexiones Siscadre de una sede ──────────
const listarConexiones = async (req, res, next) => {
  try {
    const { sedeId } = req.params;

    if (req.usuario.rol !== 'SUPERADMIN' && sedeId !== req.usuario.sedeId) {
      return res.status(403).json({ error: 'No tienes acceso a esta sede' });
    }

    const conexiones = await prisma.siscadreConexion.findMany({ where: { sedeId },
      select: {
        id:               true,
        tipoServicio:     true,
        siscadreHost:     true,
        siscadrePort:     true,
        siscadreUser:     true,
        siscadreDatabase: true,
        siscadreScript:   true,
        siscadreLastSync: true,
        activo:           true,
      },
      orderBy: { tipoServicio: 'asc' },
    });
    res.json(conexiones);
  } catch (err) { next(err); }
};

// ── Guardar (crear o actualizar) UNA conexión Siscadre ────────
const guardarConexion = async (req, res, next) => {
  try {
    const { sedeId } = req.params;
    const { tipoServicio, host, port, user, password, database, script } = req.body;

    if (!tipoServicio || !['INTERNET', 'CABLE', 'MIXTO'].includes(tipoServicio)) {
      return res.status(400).json({ error: 'tipoServicio debe ser INTERNET, CABLE o MIXTO' });
    }
    if (!host || !user || !database) {
      return res.status(400).json({ error: 'Host, usuario y base de datos son obligatorios' });
    }

    const existente = await prisma.siscadreConexion.findUnique({
      where: { sedeId_tipoServicio: { sedeId, tipoServicio } },
      select: { id: true },
    });

    const dataBase = {
      siscadreHost:     host,
      siscadrePort:     port ? Number(port) : 3306,
      siscadreUser:     user,
      siscadreDatabase: database,
      siscadreScript:   script || null,
    };

    if (existente) {
      await prisma.siscadreConexion.update({
        where: { id: existente.id },
        data:  { ...dataBase, ...(password && { siscadrePassword: encrypt(password) }) },
      });
    } else {
      if (!password) {
        return res.status(400).json({ error: 'La contraseña es obligatoria para una conexión nueva' });
      }
      await prisma.siscadreConexion.create({
        data: { sedeId, tipoServicio, ...dataBase, siscadrePassword: encrypt(password) },
      });
    }

    res.json({ ok: true, mensaje: 'Conexión guardada' });
  } catch (err) { next(err); }
};

// ── Eliminar una conexión ──────────────────────────────────────
const eliminarConexion = async (req, res, next) => {
  try {
    await prisma.siscadreConexion.delete({ where: { id: req.params.id } });
    res.json({ ok: true, mensaje: 'Conexión eliminada' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Conexión no encontrada' });
    next(err);
  }
};

// ── Probar conexión ───────────────────────────────────────────
const probarConexion = async (req, res, next) => {
  let conn;
  try {
    const { id } = req.params; // puede ser 'nueva' si aún no se guardó la conexión
    const { host, port, user, password, database } = req.body;

    let passwordFinal = password;

    // Solo buscar el password guardado si hay un id real (conexión existente)
    if (!passwordFinal && id && id !== 'nueva') {
      const conexion = await prisma.siscadreConexion.findUnique({
        where: { id },
        select: { siscadrePassword: true },
      });
      passwordFinal = conexion?.siscadrePassword ? decrypt(conexion.siscadrePassword) : null;
    }

    if (!host || !user || !passwordFinal || !database) {
      return res.status(400).json({ error: 'Completa todos los campos, incluyendo la contraseña' });
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
// ── Ejecutar el sync de UNA conexión específica ───────────────
async function sincronizarConexion(conexion, sedeId) {
  let conn;
  const resultado = { tipoServicio: conexion.tipoServicio, nuevas: 0, existentes: 0, errores: 0, total: 0, detalles: [] };

  try {
    conn = await mysql.createConnection({
      host:           conexion.siscadreHost,
      port:           conexion.siscadrePort || 3306,
      user:           conexion.siscadreUser,
      password:       decrypt(conexion.siscadrePassword),
      database:       conexion.siscadreDatabase,
      connectTimeout: 15000,
    });

    if (!conexion.siscadreScript) {
      resultado.errorConexion = 'Esta conexión no tiene un script SQL configurado';
      return resultado;
    }

    const [rows] = await conn.execute(conexion.siscadreScript);
    resultado.total = rows.length;

    for (const row of rows) {
      const codigoCompleto = String(row['NÚMERO DE ORDEN']);
      // nServicio = últimos 4 dígitos, igual que el histórico del Excel
      const nServicio = codigoCompleto.slice(-4);

      const servicio  = row['SERVICIO'];
      const tipoOrden = detectarTipoOrden(servicio);

      // DESPUÉS:
        if (!tipoOrden) {
          resultado.errores++;
          resultado.detalles.push({
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
          resultado.existentes++;
          resultado.detalles.push({ codigo: codigoCompleto, estado: 'existe' });
          continue;
        }

        const mensualidadStr = String(row['MENSUALIDAD'] || '0')
          .replace('S/ ', '')
          .replace(/,/g, '');
        const mensualidad = mensualidadStr === 'S/N' ? null : (parseFloat(mensualidadStr) || null);

        const numeroContrato = String(row['NÚMERO DE CONTRATO'] || '').trim();
        const abonado    = row['ABONADO']                || 'S/N';
        const dni        = row['DOCUMENTO DE IDENTIDAD'] || null;
        const celular    = row['TELÉFONO']               || null;
        const direccion  = row['DIRECCIÓN']              || 'S/D';
        const referencia = row['REFERENCIA']             || null;
        const sector     = row['SECTOR']                 || null;

        // Asegurar que el contrato exista antes de crear la orden
        // (misma lógica que confirmarExcel en contratos.controller.js)
        // Reutiliza exactamente la misma lógica que usa el import de Excel
        await upsertContratoDesdeOrden(prisma, {
          contrato:   numeroContrato,
          tipoOrden,
          abonado,
          dni,
          celular,
          direccion,
          referencia,
          sector,
        }, sedeId);

        // Verificar si el contrato ya tiene WAN registrada de una instalación previa
        const wanHeredada = await wanHeredableDelContrato(prisma, numeroContrato, tipoOrden, sedeId);

        // ── Resolver plan desde mensualidad (misma lógica que confirmarExcel) ──
          let planId = null;
          let mbps   = null;

          if (mensualidad != null && !isNaN(mensualidad)) {
            const esInternet = tipoOrden.endsWith('_I');
            const esDuo      = tipoOrden.endsWith('_D');

            if (esInternet || esDuo) {
              const tipoServicioPlan = esInternet ? 'INTERNET' : 'DUO';
              const plan = await prisma.planInternet.findFirst({
                where: { sedeId, activo: true, precio: { equals: mensualidad }, tipoServicio: tipoServicioPlan },
              });
              if (plan) {
                planId = plan.id;
                mbps   = plan.mbps;
              }
            }
          }

          // Actualizar mbps en el contrato si se resolvió un plan
          if (numeroContrato && planId) {
            await prisma.contrato.update({
              where: { numero_sedeId_tipoServicio: { numero: numeroContrato, sedeId, tipoServicio: (tipoOrden.endsWith('_I') ? 'INTERNET' : tipoOrden.endsWith('_C') ? 'CABLE' : 'DUO') } },
              data:  { mbps, planId },
            });
          }

        const estadoFinal = wanHeredada
          ? 'PENDIENTE_TECNICO'
          : (TIPOS_NOC.includes(tipoOrden) ? 'PENDIENTE_NOC' : 'PENDIENTE_TECNICO');

        const tipoServicioOrden = tipoOrden.endsWith('_I') ? 'INTERNET'
          : tipoOrden.endsWith('_C') ? 'CABLE'
          : tipoOrden.endsWith('_D') ? 'DUO'
          : null;

        await prisma.ordenServicio.create({
          data: {
            nServicio,
            codigoSiscadre: codigoCompleto,
            sedeId,
            estado: estadoFinal,
            tipoOrden,
            tipoServicio: tipoServicioOrden,
            fechaServicio: parsearFecha(row['FECHA CREA']),
            abonado,
            dni,
            direccion,
            referencia,
            sector,
            celular: celular || 'S/N',
            observacion: row['OBSERVACIÓN INICIAL'] || null,
            contrato: numeroContrato || null,
            mensualidad,
            ...(mbps   != null && { mbps }),
            ...(planId != null && { planId }),
            ...(wanHeredada && {
              ipWan:   wanHeredada.ipWan,
              mascara: wanHeredada.mascara,
              gateway: wanHeredada.gateway,
            }),
          },
        });

        resultado.nuevas++;
        resultado.detalles.push({ codigo: codigoCompleto, estado: 'importada' });
      
      } catch (err) {
        if (err.code === 'P2002') {
            resultado.existentes++;
            resultado.detalles.push({ codigo: codigoCompleto, estado: 'existe' });
          } else {
          throw err;
        }
      }
    }

    await prisma.siscadreConexion.update({
      where: { id: conexion.id },
      data:  { siscadreLastSync: new Date() },
    });

  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
      resultado.errorConexion = 'No se pudo conectar al servidor de Siscadre';
    } else {
      throw err;
    }
  } finally {
    if (conn) await conn.end().catch(() => {});
  }

  return resultado;
}

// ── POST /api/siscadre/:sedeId/sync ───────────────────────────
// Sincroniza TODAS las conexiones activas de la sede
const sincronizar = async (req, res, next) => {
  try {
    const { sedeId } = req.params;

    if (req.usuario.rol !== 'SUPERADMIN' && sedeId !== req.usuario.sedeId) {
      return res.status(403).json({ error: 'No tienes acceso a esta sede' });
    }

    const conexiones = await prisma.siscadreConexion.findMany({
      where: { sedeId, activo: true },
    });

    if (conexiones.length === 0) {
      return res.status(400).json({ error: 'Esta sede no tiene ninguna conexión Siscadre configurada' });
    }

    const resultados = [];
    for (const conexion of conexiones) {
      resultados.push(await sincronizarConexion(conexion, sedeId));
    }

    const totales = resultados.reduce((acc, r) => ({
      total:      acc.total      + r.total,
      nuevas:     acc.nuevas     + r.nuevas,
      existentes: acc.existentes + r.existentes,
      errores:    acc.errores    + r.errores,
    }), { total: 0, nuevas: 0, existentes: 0, errores: 0 });

    res.json({ ok: true, ...totales, syncAt: new Date(), porConexion: resultados });

  } catch (err) { next(err); }
};

module.exports = { listarConexiones, guardarConexion, eliminarConexion, probarConexion, sincronizar };