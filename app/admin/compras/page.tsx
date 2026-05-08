"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/utils/supabase/client';

interface Compra {
  id: string;
  codigo_seguridad: string;
  wa_user_id: string;
  precio_ars: number;
  estado: string | null;
  solicito_pasador: boolean | null;
  created_at: string | null;
  producto_id: string | null;
  viaje_id: number | null;
  products?: { name: string } | null;
}

const estadoBadge: Record<string, string> = {
  pendiente_pago: 'bg-yellow-100 text-yellow-800',
  pagado: 'bg-blue-100 text-blue-800',
  en_preparacion: 'bg-indigo-100 text-indigo-800',
  listo_retirar: 'bg-purple-100 text-purple-800',
  en_viaje: 'bg-orange-100 text-orange-800',
  entregado: 'bg-green-100 text-green-800',
  cancelado: 'bg-gray-100 text-gray-600',
  expirado: 'bg-red-100 text-red-800',
};

const filterButtons = [
  { value: 'todos', label: 'Todas' },
  { value: 'pendiente_pago', label: 'Pendientes pago' },
  { value: 'pagado', label: 'Pagadas' },
  { value: 'listo_retirar', label: 'Listas retirar' },
  { value: 'en_viaje', label: 'En viaje' },
  { value: 'entregado', label: 'Entregadas' },
  { value: 'cancelado', label: 'Canceladas' },
];

export default function ComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCompras = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('compras')
      .select('*, products(name)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter !== 'todos') query = query.eq('estado', filter);

    const { data, error } = await query;
    if (error) console.error('Error fetching compras:', error);
    setCompras((data as Compra[]) || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchCompras(); }, [fetchCompras]);

  async function updateEstado(compraId: string, nuevoEstado: string) {
    setActionLoading(compraId);
    await supabase
      .from('compras')
      .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
      .eq('id', compraId);
    await fetchCompras();
    setActionLoading(null);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Compras</h1>

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

      {loading ? (
        <div className="py-8 text-sm text-gray-400">Cargando...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-100 rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Código', 'Producto', 'Comprador', 'Precio ARS', 'Pasador', 'Estado', 'Fecha', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold tracking-widest uppercase text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compras.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                    No hay compras
                  </td>
                </tr>
              ) : (
                compras.map(c => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono font-bold">{c.codigo_seguridad}</td>
                    <td className="px-4 py-3 text-sm">{c.products?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate">{c.wa_user_id}</td>
                    <td className="px-4 py-3 text-sm font-medium">${c.precio_ars.toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3 text-center">{c.solicito_pasador ? '✓' : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoBadge[c.estado ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                        {c.estado ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('es-AR') : '—'}
                    </td>
                    <td className="px-4 py-3 flex gap-1">
                      {c.estado === 'pagado' || c.estado === 'listo_retirar' || c.estado === 'en_viaje' ? (
                        <button
                          onClick={() => updateEstado(c.id, 'entregado')}
                          disabled={actionLoading === c.id}
                          className="px-2 py-1 text-xs bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-50"
                        >
                          Entregado
                        </button>
                      ) : null}
                      {c.estado === 'pendiente_pago' || c.estado === 'pagado' ? (
                        <button
                          onClick={() => updateEstado(c.id, 'cancelado')}
                          disabled={actionLoading === c.id}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
