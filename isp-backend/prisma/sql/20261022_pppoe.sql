-- Soporte PPPoE en contratos y órdenes (idempotente: se puede correr varias veces).
-- Aplicar con:
--   npx prisma db execute --file prisma/sql/20261022_pppoe.sql --schema prisma/schema.prisma

ALTER TABLE "contratos"
  ADD COLUMN IF NOT EXISTS "usaPppoe"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "pppoeUser"     TEXT,
  ADD COLUMN IF NOT EXISTS "pppoePassword" TEXT;

ALTER TABLE "ordenes_servicio"
  ADD COLUMN IF NOT EXISTS "usaPppoe"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "pppoeUser"     TEXT,
  ADD COLUMN IF NOT EXISTS "pppoePassword" TEXT;
