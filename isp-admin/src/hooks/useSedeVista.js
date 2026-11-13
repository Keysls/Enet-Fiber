import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store';
import { useVistaStore } from '../store/vista.store';
import { sedesApi } from '../services/api';
import { esGerente } from '../utils/permisos';

// Sede con la que se está trabajando en el panel.
// - Admin / secretaría / supervisor: su sede (fija).
// - Gerente: la que eligió en el selector de arriba, o ninguna ("Todas las sedes").
export function useSedeVista() {
  const usuario   = useAuthStore(s => s.usuario);
  const elegida   = useVistaStore(s => s.sedeId);
  const gerente   = esGerente(usuario);

  const { data: sedes } = useQuery({
    queryKey: ['sedes'],
    queryFn:  () => sedesApi.listar().then(r => r.data),
    enabled:  gerente && !!elegida,
  });

  if (!gerente) {
    return { sedeId: usuario?.sedeId, sedeNombre: usuario?.sede?.nombre || 'Mi sede', todas: false, gerente: false };
  }
  const sede = (sedes || []).find(s => s.id === elegida);
  return {
    sedeId:     elegida || undefined,
    sedeNombre: elegida ? (sede?.nombre || '') : 'Todas las sedes',
    sede,
    todas:      !elegida,
    gerente:    true,
  };
}
