-- Rol nuevo: supervisor de técnicos (ve órdenes, técnicos, mapa y reportes de su sede
-- y puede asignar / cambiar el técnico de una orden). Se puede correr más de una vez.
ALTER TYPE "Rol" ADD VALUE IF NOT EXISTS 'SUPERVISOR';
