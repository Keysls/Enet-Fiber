-- Traspasos de material entre técnicos de la misma sede (directo, sin aceptación).
-- metros_sueltos alimenta el saldo en metros de los medibles (ver utils/traspasos.js).
-- Idempotente. Aplicar desde isp-backend:
--   npx prisma db execute --file prisma/sql/20261118_traspasos_tecnicos.sql --schema prisma/schema.prisma

CREATE TABLE IF NOT EXISTS "traspasos_tecnicos" (
  "id"                 SERIAL       PRIMARY KEY,
  "sede_id"            TEXT         NOT NULL,
  "tecnico_origen_id"  TEXT         NOT NULL,
  "tecnico_destino_id" TEXT         NOT NULL,
  "registrado_por"     TEXT,
  "comentario"         TEXT,
  "fecha"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "traspasos_tecnicos_distintos" CHECK ("tecnico_origen_id" <> "tecnico_destino_id")
);
CREATE INDEX IF NOT EXISTS "traspasos_tecnicos_tecnico_origen_id_idx"  ON "traspasos_tecnicos"("tecnico_origen_id");
CREATE INDEX IF NOT EXISTS "traspasos_tecnicos_tecnico_destino_id_idx" ON "traspasos_tecnicos"("tecnico_destino_id");
CREATE INDEX IF NOT EXISTS "traspasos_tecnicos_sede_id_idx"            ON "traspasos_tecnicos"("sede_id");

CREATE TABLE IF NOT EXISTS "traspaso_tecnico_detalles" (
  "id"               SERIAL      PRIMARY KEY,
  "traspaso_id"      INTEGER     NOT NULL REFERENCES "traspasos_tecnicos"("id") ON DELETE CASCADE,
  "producto_id"      INTEGER     NOT NULL,
  "tipo"             VARCHAR(10) NOT NULL,               -- ONU | METROS | CANTIDAD
  "cantidad"         INTEGER     NOT NULL CHECK ("cantidad" > 0), -- und, metros o 1 por ONU
  "rollos_completos" INTEGER     NOT NULL DEFAULT 0,      -- medibles: rollos movidos en la asignación
  "metros_sueltos"   INTEGER     NOT NULL DEFAULT 0,      -- medibles: metros que van al libro
  "onu_id"           INTEGER,
  "codigo_pon"       TEXT
);
CREATE INDEX IF NOT EXISTS "traspaso_tecnico_detalles_traspaso_id_idx" ON "traspaso_tecnico_detalles"("traspaso_id");
CREATE INDEX IF NOT EXISTS "traspaso_tecnico_detalles_producto_id_idx" ON "traspaso_tecnico_detalles"("producto_id");
