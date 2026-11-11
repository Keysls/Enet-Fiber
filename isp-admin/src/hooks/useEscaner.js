import { useEffect, useRef } from 'react';

// Una pistola USB funciona como un teclado: escribe el código de golpe y cierra
// con Enter. Se reconoce por la velocidad, así no hace falta poner el cursor en
// ningún campo. Se mide con la hora de cada pulsación (e.timeStamp), no con la hora
// en que se procesa: si la página está ocupada, las teclas llegan juntas o tarde y
// la lectura se partiría en dos códigos falsos.
const MAX_MS_ENTRE_TECLAS = 100;
const MIN_LARGO_CODIGO = 4;

// Devuelve el campo a como estaba: los caracteres de la pistola entran antes de
// saber que es una lectura (en un select incluso cambian la opción). No se bloquean
// al vuelo para no comerle letras a quien teclea rápido.
function restaurarCampo(campo, valor) {
  if (!campo || !('value' in campo) || campo.value === valor) return;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(campo), 'value')?.set;
  if (!setter) return;
  setter.call(campo, valor);
  campo.dispatchEvent(new Event(campo.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
}

// Llama a `onEscaneo(codigo)` con cada lectura mientras `activo` sea true.
// Los campos con data-escaner-libre reciben la lectura como texto normal.
export function useEscaner(onEscaneo, activo = true) {
  const callback = useRef(onEscaneo);
  callback.current = onEscaneo;

  useEffect(() => {
    if (!activo) return undefined;
    const lectura = { texto: '', ultima: 0, campo: null, valor: '' };
    const reiniciar = () => { lectura.texto = ''; lectura.campo = null; };

    const onKeyDown = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.target.closest?.('[data-escaner-libre]')) return;
      const ahora = e.timeStamp;
      const seguido = lectura.texto !== '' && ahora - lectura.ultima <= MAX_MS_ENTRE_TECLAS;

      if (e.key === 'Enter') {
        if (seguido && lectura.texto.length >= MIN_LARGO_CODIGO) {
          e.preventDefault();
          e.stopPropagation();
          restaurarCampo(lectura.campo, lectura.valor);
          const codigo = lectura.texto.trim();
          reiniciar();
          callback.current(codigo);
        } else reiniciar();
        return;
      }
      // La pistola pulsa Shift en las mayúsculas: no corta la lectura
      if (e.key === 'Shift') { if (seguido) lectura.ultima = ahora; return; }
      if (e.key.length !== 1) return;

      if (!seguido) {
        lectura.texto = '';
        lectura.campo = e.target;
        lectura.valor = e.target.value;
      }
      lectura.texto += e.key;
      lectura.ultima = ahora;
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [activo]);
}

// Pitido de error: quien escanea suele estar mirando la caja, no la pantalla
export function pitidoError() {
  try {
    const audio = new (window.AudioContext || window.webkitAudioContext)();
    const tono = audio.createOscillator();
    tono.type = 'square';
    tono.frequency.value = 220;
    tono.connect(audio.destination);
    tono.onended = () => audio.close();
    tono.start();
    tono.stop(audio.currentTime + 0.25);
  } catch { /* sin audio */ }
}
