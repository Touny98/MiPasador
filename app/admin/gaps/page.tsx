'use client';

import { supabase } from '@/lib/utils/supabase';
import { resolveGap } from './actions';
import { useState, useEffect } from 'react';

export default function GapsPage() {
  const [gaps, setGaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchGaps();
  }, []);

  const fetchGaps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('queries')
        .select(`
          id,
          search_term,
          results_count,
          created_at,
          conversations!inner (
            user_whatsapp_id,
            user_name
          )
        `)
        .eq('resolved_bool', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGaps(data || []);
    } catch (error) {
      console.error('Error fetching gaps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    setUpdating(prev => new Set(prev).add(id));
    try {
      await resolveGap(id);
      // Remove the resolved gap from the list
      setGaps(prev => prev.filter(gap => gap.id !== id));
    } catch (error) {
      console.error('Error marking gap as resolved:', error);
    } finally {
      setUpdating(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (loading) {
    return <div className="p-6">Cargando gaps...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gaps Pendientes</h1>
      <p className="mb-6 text-gray-600">
        Consultas que no han sido resueltas (resolved_bool = false)
      </p>

      {gaps.length === 0 ? (
        <p className="text-center text-gray-500">No hay gaps pendientes.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Término de Búsqueda
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resultados
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {gaps.map(gap => (
                <tr key={gap.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {gap.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4">
                    {gap.conversations?.user_name || gap.conversations?.user_whatsapp_id || 'Anónimo'}
                  </td>
                  <td className="px-6 py-4 break-words max-w-40">
                    {gap.search_term}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {gap.results_count}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {new Date(gap.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center space-x-2">
                    {updating.has(gap.id) ? (
                      <button
                        disabled
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm animate-pulse"
                      >
                        Marcando...
                      </button>
                    ) : (
                      <button
                        onClick={() => handleResolve(gap.id)}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors"
                      >
                        Marcar como Resuelto
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}