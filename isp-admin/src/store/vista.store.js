import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { queryClient } from '../queryClient';

// Sede que el gerente (administrador general) está mirando.
// null = "Todas las sedes". Solo se usa con rol GERENTE; los demás roles tienen su sede fija.
export const useVistaStore = create(persist(
  (set) => ({
    sedeId: null,
    setSede: (sedeId) => {
      set({ sedeId: sedeId || null });
      // Cambió la sede: todo lo que estaba en caché es de la anterior
      queryClient.resetQueries();
    },
    reset: () => set({ sedeId: null }),
  }),
  { name: 'admin_sede_vista' },
));
