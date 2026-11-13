-- Rol nuevo: gerente / administrador general (solo lectura, ve todas las sedes y elige una
-- desde el selector del panel). Se crea desde Usuarios del NOC, sin sede. Se puede correr más de una vez.
ALTER TYPE "Rol" ADD VALUE IF NOT EXISTS 'GERENTE';
