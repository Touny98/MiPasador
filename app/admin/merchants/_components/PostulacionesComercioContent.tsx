'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/utils/supabase/client';
import { FichaComercioModal, type PostulacionComercio } from './FichaComercioModal';

const estadoBadge: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aceptada: 'bg-green-100 text-green-800',
  denegada: 'bg-red-100 text-red-800',
  requiere_modificacion: 'bg-purple-100 text-purple-800',
};

const filterButtons = [
  { value: 'todos', label: 'Todas' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'requiere_modificacion', label: 'Con correcciones' },
  { value: 'aceptada', label: 'Aceptadas' },
  { value: 'denegada', label: 'Denegadas' },
];

export function PostulacionesComercioContent() {
  const [postulaciones, setPostulaciones] = useState<PostulacionComercio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const [selected, setSelected] = useState<PostulacionComercio | null>(null);

  useEffect(() => { fetchPostulaciones(); }, [filter]);

  async function fetchPostulaciones() {
    setLoading(true);
    let query = supabase
      .from('postulaciones_comercio')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter !== 'todos') query = query.eq('estado', filter);

    const { data, error } = await query;
    if (error) console.error('Error fetching postulaciones comercio:', error);
    setPostulaciones((data as PostulacionComercio[]) || []);
    setLoading(false);
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
              {['Nombre', 'Negocio', 'Categoría', 'Dirección', 'Estado', 'Fecha', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-widest uppercase text-gray-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {postulaciones.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  No hay postulaciones
                </td>
              </tr>
            ) : (
              postulaciones.map(p => (
                <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-sm">{p.nombre_completo || '—'}</td>
                  <td className="px-4 py-3 text-sm font-medium">{p.nombre_negocio || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.categoria_productos || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-[160px] truncate">{p.direccion || '—'}</td>
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
        <FichaComercioModal
          postulacion={selected}
          onClose={() => setSelected(null)}
          onRefresh={fetchPostulaciones}
        />
      )}
    </div>
  );
}
