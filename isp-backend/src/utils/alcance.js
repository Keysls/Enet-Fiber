// Rol GERENTE ("Administrador general"): solo lectura, ve todas las sedes.
// Elige una sede con ?sedeId= (o ?sede_id=); sin ella ve todas.
const esGerente = (u) => u?.rol === 'GERENTE';

const sedePedida = (req) => req.query.sedeId || req.query.sede_id || undefined;

module.exports = { esGerente, sedePedida };
