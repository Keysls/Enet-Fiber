-- Sedes que apoyan a otras con sus técnicos (idempotente: se puede correr varias veces).
-- Ej.: Nueva Cajamarca apoya a Naranjillo → sus técnicos y su admin ven, toman
-- y sincronizan las órdenes de Naranjillo. Una sede puede apoyar a varias.
-- Aplicar con:
--   npx prisma db execute --file prisma/sql/20261027_sede_apoyo.sql --schema prisma/schema.prisma

CREATE TABLE IF NOT EXISTS "sedes_apoyo" (
  "sede_id"         TEXT         NOT NULL,
  "sede_apoyada_id" TEXT         NOT NULL,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sedes_apoyo_pkey" PRIMARY KEY ("sede_id", "sede_apoyada_id")
);

CREATE INDEX IF NOT EXISTS "sedes_apoyo_sede_apoyada_id_idx" ON "sedes_apoyo"("sede_apoyada_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sedes_apoyo_sede_id_fkey') THEN
    ALTER TABLE "sedes_apoyo"
      ADD CONSTRAINT "sedes_apoyo_sede_id_fkey"
      FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sedes_apoyo_sede_apoyada_id_fkey') THEN
    ALTER TABLE "sedes_apoyo"
      ADD CONSTRAINT "sedes_apoyo_sede_apoyada_id_fkey"
      FOREIGN KEY ("sede_apoyada_id") REFERENCES "sedes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
