// src/controllers/olt/zte.parsers.js
// Replica ZteParsers.cs del OLTManager .NET

const ZteParsers = {

  // ── Parsear ONUs no autorizadas (uncfg) ──────────────────────
  // Replica ParseC300/ParseC600/Parse de ZteParsers.cs: comando y
  // formato de columnas distintos por modelo (no por firmware) —
  //   C300/C320 → "show gpon onu uncfg" → líneas "gpon-onu_1/3/7:1"
  //               columnas: Index | SN | State  (SN = partes[1])
  //   C600+     → "show pon onu uncfg"  → líneas "gpon_olt-1/4/8"
  //               columnas: Index | Model | SN | PW  (SN = partes[2])
  parseC300(output) {
    const resultado = [];
    if (!output) return resultado;

    for (const linea of output.split('\n')) {
      const l = linea.trim();
      if (!l.startsWith('gpon-onu_')) continue;

      const partes = l.split(/\s+/).filter(Boolean);
      if (partes.length < 2) continue;

      // partes[0] = "gpon-onu_1/3/7:1" → "1/3/7"
      const indice = partes[0].replace('gpon-onu_', '').split(':')[0];
      const segmentos = indice.split('/');
      if (segmentos.length < 3) continue;

      const [frame, tarjeta, puerto] = segmentos;
      resultado.push({
        numeroSerie: partes[1],
        frame, tarjeta, puerto,
        puertoCompleto: `${frame}/${tarjeta}/${puerto}`,
      });
    }
    return resultado;
  },

  parseC600(output) {
    const resultado = [];
    if (!output) return resultado;

    for (const linea of output.split('\n')) {
      const l = linea.trim();
      if (!l.startsWith('gpon_olt-')) continue;

      const partes = l.split(/\s+/).filter(Boolean);
      if (partes.length < 3) continue;

      // partes[0] = "gpon_olt-1/4/8" → "1/4/8"
      const indice = partes[0].replace('gpon_olt-', '');
      const segmentos = indice.split('/');
      if (segmentos.length < 3) continue;

      const [frame, tarjeta, puerto] = segmentos;
      resultado.push({
        numeroSerie: partes[2],
        modelo: partes[1],
        frame, tarjeta, puerto,
        puertoCompleto: `${frame}/${tarjeta}/${puerto}`,
      });
    }
    return resultado;
  },

  parsePendientes(output, modeloOlt) {
    const esC600Plus = ['C600', 'C610', 'C620'].includes((modeloOlt || '').toUpperCase());
    return esC600Plus ? this.parseC600(output) : this.parseC300(output);
  },

  // ── Parsear IDs usados en un puerto ──────────────────────────
  // Input: output de "show gpon onu state gpon-olt_1/slot/pon"
  parseIdsUsados(output) {
    if (!output) return [];

    const idsUsados = [];
    const regex = /gpon[-_]onu[\w\/-]*:(\d+)/gi;
    let match;
    while ((match = regex.exec(output)) !== null) {
      const id = parseInt(match[1], 10);
      if (!isNaN(id) && id >= 1 && id <= 128) idsUsados.push(id);
    }

    return [...new Set(idsUsados)].sort((a, b) => a - b);
  },

  // ── Parsear perfiles T-Cont ───────────────────────────────────
  // Input: output de "show gpon profile tcont"
  parseTcontPerfiles(output) {
    if (!output) return [];
    const resultado = [];
    const lineas    = output.split('\n');
    let id = 1;
    for (const linea of lineas) {
      const trim = linea.trim();
      if (!trim || trim.startsWith('---') || trim.startsWith('Profile')) continue;
      const match = trim.match(/^([A-Za-z0-9_\-\.]+)\s+\d+/);
      if (match) resultado.push({ id: id++, nombre: match[1] });
    }
    return resultado;
  },

  // ── Parsear tipos de ONU ──────────────────────────────────────
  // Input: output de "show gpon onu-type"
  parseOnuTypes(output) {
    if (!output) return [];
    const resultado = [];
    const lineas    = output.split('\n');
    let id = 1;
    for (const linea of lineas) {
      const trim = linea.trim();
      if (!trim || trim.startsWith('---') || trim.startsWith('Type')) continue;
      const match = trim.match(/^([A-Za-z0-9_\-\.]+)\s+\d+/);
      if (match && match[1].length > 2) resultado.push({ id: id++, nombre: match[1] });
    }
    return resultado;
  },
};

module.exports = { ZteParsers };