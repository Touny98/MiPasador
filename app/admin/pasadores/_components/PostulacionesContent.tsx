"use client";

import { useState, useEffect } from 'react';
import { FichaPasadorModal, type PostulacionPasador } from './FichaPasadorModal';

const estadoBadge: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  lista_para_revision: 'bg-blue-100 text-blue-800',
  requiere_correccion: 'bg-purple-100 text-purple-800',
  aceptada: 'bg-green-100 text-green-800',
  denegada: 'bg-red-100 text-red-800',
};

const filterButtons = [
  { value: 'todos', label: 'Todas' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'lista_para_revision', label: 'Lista para revisión' },
  { value: 'requiere_correccion', label: 'Requieren corrección' },
  { value: 'aceptada', label: 'Aceptadas' },
  { value: 'denegada', label: 'Denegadas' },
];

export function PostulacionesContent() {
  const [postulaciones, setPostulaciones] = useState<PostulacionPasador[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const [selected, setSelected] = useState<PostulacionPasador | null>(null);

  useEffect(() => { fetchPostulaciones(); }, [filter]);

  async function fetchPostulaciones() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/postulaciones?filter=${filter}`);
      if (!res.ok) throw new Error('Failed to fetch');
      setPostulaciones(await res.json());
    } catch (err) {
      console.error('Error fetching postulaciones:', err);
      setPostulaciones([]);
    } finally {
      setLoading(false);
    }
  }

  async function callAction(id: number, body: object) {
    const res = await fetch('/api/admin/postulaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    });
    if (!res.ok) throw new Error('Action failed');
    await fetchPostulaciones();
  }

  if (loading) return <div className="py-8 text-sm text-gray-400">Cargando...</div>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {filterButtons.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-100 rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Nombre', 'DNI', 'Estado', 'Fecha', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-widest uppercase text-gray-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {postulaciones.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                  No hay postulaciones
                </td>
              </tr>
            ) : (
              postulaciones.map(p => (
                <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{p.nombre_completo || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.dni || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoBadge[p.estado || ''] || 'bg-gray-100 text-gray-600'}`}>
                      {p.estado || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('es-AR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(p)}
                      className="px-3 py-1 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Ver ficha
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <FichaPasadorModal
          postulacion={selected}
          onClose={() => setSelected(null)}
          onAccept={() => callAction(selected.id, { action: 'aceptar' })}
          onDeny={() => callAction(selected.id, { action: 'denegar' })}
          onRequestMod={(campos, observacion) =>
            callAction(selected.id, { action: 'correccion', campos, observacion })
          }
        />
      )}
    </div>
  );
}
