-- Historial de cada ONU: un registro por cada movimiento que hasta ahora no
-- quedaba anotado con el código (registro, cambio de código, salida directa,
-- envíos entre sedes, reingresos). Idempotente: se puede correr varias veces.
-- Aplicar con (desde la carpeta del backend):
--   npx prisma db execute --file prisma/sql/20261106_onu_movimientos.sql --schema prisma/schema.prisma

CREATE TABLE IF NOT EXISTS "onu_movimientos" (
  "id"              SERIAL       PRIMARY KEY,
  "onu_id"          INTEGER,
  "codigo_pon"      TEXT         NOT NULL,
  "tipo"            VARCHAR(30)  NOT NULL,
  "sede_id"         TEXT,
  "sede_destino_id" TEXT,
  "referencia"      VARCHAR(50),
  "detalle"         TEXT,
  "usuario_id"      TEXT,
  "fecha"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "onu_movimientos_codigo_pon_idx" ON "onu_movimientos"(UPPER("codigo_pon"));
CREATE INDEX IF NOT EXISTS "onu_movimientos_onu_id_idx"     ON "onu_movimientos"("onu_id");
CREATE INDEX IF NOT EXISTS "onu_movimientos_ref_idx"        ON "onu_movimientos"("tipo", "referencia");
