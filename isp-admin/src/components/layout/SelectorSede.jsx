import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { sedesApi } from '../../services/api';
import { useVistaStore } from '../../store/vista.store';

// Selector de sede del gerente: "Todas las sedes" + cada sede. Cambiarla refresca todo el panel.
export default function SelectorSede() {
  const sedeId  = useVistaStore(s => s.sedeId);
  const setSede = useVistaStore(s => s.setSede);
  const { data: sedes } = useQuery({
    queryKey: ['sedes'],
    queryFn:  () => sedesApi.listar().then(r => r.data),
    staleTime: 5 * 60_000,
  });

  return (
    <label className="selector-sede" title="Sede que estás viendo"
      style={{
        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0,
        height: 36, padding: '0 8px', borderRadius: 8,
        background: '#F4F8FC', border: '1px solid #E2ECF4', color: '#1E3A8A',
      }}>
      <Building2 size={15} style={{ flexShrink: 0 }} />
      <select
        aria-label="Sede"
        value={sedeId || ''}
        onChange={e => setSede(e.target.value)}
        style={{
          border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: 700, color: '#1E3A8A',
          minWidth: 0, maxWidth: 190, textOverflow: 'ellipsis',
        }}>
        <option value="">Todas las sedes</option>
        {(sedes || []).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
      </select>
    </label>
  );
}
