import JSZip from 'jszip';

// Plantilla: public/plantillas/requerimiento.xlsx (hoja "Hoja1")
// Filas de ítems de la plantilla: 21..33 (13 filas). Si hay más ítems se insertan filas
// clonando el estilo de la fila 32 y se desplaza todo lo que está debajo.
const PRIMERA_FILA_ITEMS = 21;
const ULTIMA_FILA_ITEMS  = 33;
const FILAS_PLANTILLA    = ULTIMA_FILA_ITEMS - PRIMERA_FILA_ITEMS + 1;
const NOMBRE_FIRMA_PLANTILLA = 'ROGER DAVID JULON DAVILA ';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const celdaTexto  = (ref, s, t) => `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(t)}</t></is></c>`;
const celdaNumero = (ref, s, n) => `<c r="${ref}" s="${s}"><v>${n}</v></c>`;
const celdaVacia  = (ref, s)    => `<c r="${ref}" s="${s}"/>`;

function setCelda(filaXml, ref, construir) {
  const re = new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>[\\s\\S]*?</c>)`);
  const m = filaXml.match(re);
  if (!m) throw new Error(`La plantilla no tiene la celda ${ref}`);
  const estilo = (m[1].match(/\bs="(\d+)"/) || [])[1] || '0';
  return filaXml.replace(re, () => construir(estilo));
}

function cambiarNumeroFila(filaXml, nuevo) {
  return filaXml
    .replace(/(<row\b[^>]*?\br=")\d+(")/, `$1${nuevo}$2`)
    .replace(/<c r="([A-Z]+)\d+"/g, `<c r="$1${nuevo}"`);
}

const numeroDeFila = (filaXml) => Number(filaXml.match(/<row\b[^>]*?\br="(\d+)"/)[1]);

function serialExcel(fecha) {
  return Math.round((Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);
}

// La plantilla mezcla estilos entre filas de ítems; todas usan los de una fila de referencia.
const FILA_ESTILO_REFERENCIA = 22;
const COLUMNAS_ITEM = ['B', 'C', 'D', 'E', 'F', 'G'];

function estilosDeFila(filaXml, fila) {
  const est = {};
  for (const col of COLUMNAS_ITEM) {
    const m = filaXml.match(new RegExp(`<c r="${col}${fila}"[^>]*?\\bs="(\\d+)"`));
    est[col] = m ? m[1] : '0';
  }
  return est;
}

function llenarItem(filaXml, fila, k, item, est) {
  const celdas = {
    B: item ? celdaNumero(`B${fila}`, est.B, k) : celdaVacia(`B${fila}`, est.B),
    C: item ? celdaTexto(`C${fila}`, est.C, String(item.descripcion || '').toUpperCase()) : celdaVacia(`C${fila}`, est.C),
    D: celdaVacia(`D${fila}`, est.D),
    E: celdaVacia(`E${fila}`, est.E),
    F: item ? celdaNumero(`F${fila}`, est.F, Number(item.cantidad)) : celdaVacia(`F${fila}`, est.F),
    G: item && item.observacion?.trim() ? celdaTexto(`G${fila}`, est.G, item.observacion.trim().toUpperCase()) : celdaVacia(`G${fila}`, est.G),
  };
  let x = filaXml;
  for (const col of COLUMNAS_ITEM) x = setCelda(x, `${col}${fila}`, () => celdas[col]);
  return x;
}

/**
 * Genera el .xlsx del requerimiento a partir de la plantilla.
 * items: [{ descripcion, cantidad, observacion }]
 */
export async function generarRequerimientoXlsx({ plantilla, items, asunto, observacionFinal, numero, sede, de, fecha, lema }) {
  const validos = (items || []).filter(i => i.descripcion && Number(i.cantidad) > 0);
  if (validos.length === 0) throw new Error('Agrega al menos un producto con cantidad');

  const zip = await JSZip.loadAsync(plantilla);
  const extra = Math.max(0, validos.length - FILAS_PLANTILLA);

  // ── Hoja ─────────────────────────────────────────────────
  let hoja = await zip.file('xl/worksheets/sheet1.xml').async('string');
  const ini = hoja.indexOf('<sheetData>') + '<sheetData>'.length;
  const fin = hoja.indexOf('</sheetData>');
  const filasOriginales = [...hoja.slice(ini, fin).matchAll(/<row\b[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g)].map(m => m[0]);
  const filas = new Map(filasOriginales.map(f => [numeroDeFila(f), f]));

  const editar = (n, fn) => filas.set(n, fn(filas.get(n)));

  editar(2,  (f) => setCelda(f, 'E2',  (s) => celdaTexto('E2',  s, `REQUERIMIENTO- ${numero}`)));
  // Lema del año (B3): si va vacío, la línea se quita; si no, sale entre comillas como en la plantilla
  const textoLema = String(lema ?? '').trim().replace(/^[“"]+|[”"]+\.?$/g, '').trim();
  editar(3,  (f) => setCelda(f, 'B3', (s) => (textoLema ? celdaTexto('B3', s, `“${textoLema.toUpperCase()}”.`) : celdaVacia('B3', s))));
  editar(12, (f) => setCelda(f, 'C12', (s) => celdaTexto('C12', s, String(de || '').toUpperCase())));
  editar(14, (f) => {
    let x = setCelda(f, 'C14', (s) => celdaTexto('C14', s, String(sede || '').toUpperCase()));
    return setCelda(x, 'G14', (s) => celdaNumero('G14', s, serialExcel(fecha || new Date())));
  });
  editar(16, (f) => setCelda(f, 'C16', (s) => celdaTexto('C16', s, String(asunto || '').toUpperCase())));
  editar(35, (f) => setCelda(f, 'B35', (s) => celdaTexto('B35', s, `**OBSERVACION:   ${observacionFinal || ''}`)));

  // Ítems en las filas de la plantilla (la fila 33 queda como última)
  const filasPlantillaItems = [];
  for (let r = PRIMERA_FILA_ITEMS; r <= ULTIMA_FILA_ITEMS; r++) filasPlantillaItems.push(r);
  const filaModeloClon = filas.get(ULTIMA_FILA_ITEMS - 1);

  // 1) desplazar todo lo que está desde la fila 33 hacia abajo
  const finales = new Map();
  for (const [r, f] of [...filas.entries()].sort((a, b) => a[0] - b[0])) {
    if (extra > 0 && r >= ULTIMA_FILA_ITEMS) finales.set(r + extra, cambiarNumeroFila(f, r + extra));
    else finales.set(r, f);
  }
  // 2) insertar clones de la fila 32 en 33..32+extra
  for (let i = 0; i < extra; i++) finales.set(ULTIMA_FILA_ITEMS + i, cambiarNumeroFila(filaModeloClon, ULTIMA_FILA_ITEMS + i));

  // 3) llenar ítems
  const estilos = estilosDeFila(filas.get(FILA_ESTILO_REFERENCIA), FILA_ESTILO_REFERENCIA);
  const totalFilasItems = Math.max(FILAS_PLANTILLA, validos.length);
  for (let k = 1; k <= totalFilasItems; k++) {
    const fila = PRIMERA_FILA_ITEMS + k - 1;
    finales.set(fila, llenarItem(finales.get(fila), fila, k, validos[k - 1] || null, estilos));
  }

  const nuevasFilas = [...finales.entries()].sort((a, b) => a[0] - b[0]).map(([, f]) => f).join('');
  let resto = hoja.slice(fin);

  // celdas combinadas (desde la fila 33 se desplazan)
  resto = resto.replace(/<mergeCell ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"\/>/g, (m, c1, r1, c2, r2) => {
    const a = Number(r1), b = Number(r2);
    return `<mergeCell ref="${c1}${a >= ULTIMA_FILA_ITEMS ? a + extra : a}:${c2}${b >= ULTIMA_FILA_ITEMS ? b + extra : b}"/>`;
  });

  // Con filas extra todo se ajusta a una sola hoja (evita una 2.ª página casi vacía con la marca de agua)
  if (extra > 0) {
    resto = resto.replace(/<pageSetup\b([^>]*?)\sscale="\d+"/, '<pageSetup$1 fitToWidth="1" fitToHeight="1"');
  }

  let cabecera = hoja.slice(0, ini).replace(/<dimension ref="([A-Z]+\d+):([A-Z]+)(\d+)"\/>/, (m, a, c, r) => `<dimension ref="${a}:${c}${Number(r) + extra}"/>`);
  if (extra > 0) cabecera = cabecera.replace('<dimension', '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension');
  hoja = cabecera + nuevasFilas + resto;
  zip.file('xl/worksheets/sheet1.xml', hoja);

  // ── Dibujos: quitar firma/sello de la plantilla, poner el nombre y desplazar ──
  let dibujo = await zip.file('xl/drawings/drawing1.xml').async('string');
  dibujo = dibujo.replace(/<xdr:twoCellAnchor[\s\S]*?<\/xdr:twoCellAnchor>/g, (anclaje) => {
    if (/name="Imagen 11"|name="Imagen 2"/.test(anclaje)) return '';
    return extra > 0
      ? anclaje.replace(/<xdr:row>(\d+)<\/xdr:row>/g, (m, r) => `<xdr:row>${Number(r) >= ULTIMA_FILA_ITEMS - 1 ? Number(r) + extra : r}</xdr:row>`)
      : anclaje;
  });
  dibujo = dibujo.split(NOMBRE_FIRMA_PLANTILLA).join(esc(String(de || '').toUpperCase()));
  zip.file('xl/drawings/drawing1.xml', dibujo);

  // ── Área de impresión ─────────────────────────────────────
  if (extra > 0) {
    let libro = await zip.file('xl/workbook.xml').async('string');
    libro = libro.replace(/(Print_Area"[^>]*>Hoja1!\$A\$1:\$H\$)(\d+)/, (m, p, r) => `${p}${Number(r) + extra}`);
    zip.file('xl/workbook.xml', libro);
  }

  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function nombreArchivoRequerimiento(sede, fecha = new Date()) {
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  return `REQUERIMIENTO ${dd}-${mm}-${fecha.getFullYear()} ${String(sede || '').toUpperCase()}.xlsx`.replace(/[\\/:*?"<>|]/g, '');
}

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Pide dónde guardar (Chrome/Edge) y escribe el archivo ahí; si el navegador no lo soporta,
 * hace la descarga normal. Devuelve false si el usuario cancela el diálogo.
 */
export async function descargarRequerimientoExcel(opciones) {
  const fecha = opciones.fecha || new Date();
  const nombre = nombreArchivoRequerimiento(opciones.sede, fecha);

  // El selector debe abrirse de inmediato, mientras el clic del usuario sigue siendo válido
  let manejador = null;
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      manejador = await window.showSaveFilePicker({
        suggestedName: nombre,
        types: [{ description: 'Libro de Excel', accept: { [MIME_XLSX]: ['.xlsx'] } }],
      });
    } catch (e) {
      if (e?.name === 'AbortError') return false;
    }
  }

  const resp = await fetch('/plantillas/requerimiento.xlsx');
  if (!resp.ok) throw new Error('No se pudo cargar la plantilla del requerimiento');
  const plantilla = await resp.arrayBuffer();
  const bytes = await generarRequerimientoXlsx({ ...opciones, plantilla, fecha });
  const blob = new Blob([bytes], { type: MIME_XLSX });

  if (manejador) {
    const escritura = await manejador.createWritable();
    await escritura.write(blob);
    await escritura.close();
    return true;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}
