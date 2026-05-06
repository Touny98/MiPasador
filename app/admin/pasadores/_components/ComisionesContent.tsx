"use client";

import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { useState, useEffect } from 'react';

export function ComisionesContent() {
  const [comisiones, setComisiones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPasador, setFilterPasador] = useState('');

  useEffect(() => {
    fetchComisiones();
  }, [filterPasador]);

  async function markAsPaid(id: number, currentStatus: boolean) {
    try {
      const res = await fetch(`/api/admin/comisiones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, pagado: !currentStatus }),
      });
      if (!res.ok) throw new Error('Failed to update payment status');
      await fetchComisiones();
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert('Error al actualizar el estado de pago');
    }
  }

  async function fetchComisiones() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/comisiones?filterPasador=${filterPasador}`);
      if (!res.ok) {
        throw new Error('Failed to fetch comisiones');
      }
      const data = await res.json();

      const processed = (data || []).map((c: any) => ({
        id: c.id,
        fecha: c.fecha ? new Date(c.fecha).toLocaleDateString() : '---',
        total_viajes: c.total_viajes || 0,
        monto: c.monto_comision || 0,
        link_pago: c.link_pago || '',
        pagado: c.pagado,
        pasador: c.pasadores?.nombre_completo || '---',
        dni: c.pasadores?.dni || '---',
      }));
      setComisiones(processed);
    } catch (error) {
      console.error('Error fetching comisiones:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          value={filterPasador}
          onChange={(e) => setFilterPasador(e.target.value)}
          placeholder="Buscar pasador por nombre o DNI..."
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>

      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-4 text-left">Pasador</th>
            <th className="p-4 text-left">DNI</th>
            <th className="p-4 text-center">Fecha</th>
            <th className="p-4 text-center">Total Viajes</th>
            <th className="p-4 text-center">Monto Comisión (ARS)</th>
            <th className="p-4 text-center">Estado</th>
            <th className="p-4 text-center">Link de Pago</th>
          </tr>
        </thead>
        <tbody>
          {comisiones.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-4">{c.pasador}</td>
              <td className="p-4">{c.dni}</td>
              <td className="p-4 text-center">{c.fecha}</td>
              <td className="p-4 text-center">{c.total_viajes}</td>
              <td className="p-4 text-center">${c.monto.toFixed(2)}</td>
              <td className="p-4 text-center">
                {c.pagado ? (
                  <span className="px-2 py-1 rounded bg-green-100 text-green-800">Pagado</span>
                ) : (
                  <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">Pendiente</span>
                )}
                <button
                  onClick={() => markAsPaid(c.id, c.pagado)}
                  className="ml-2 px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
                >
                  {c.pagado ? 'Desmarcar' : 'Marcar Pagado'}
                </button>
              </td>
              <td className="p-4 text-center">
                {c.link_pago ? (
                  <a href={c.link_pago} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                    Ver pago
                  </a>
                ) : (
                  <span className="text-gray-500">Sin link</span>
                )}
              </td>
            </tr>
          ))}
          {comisiones.length === 0 && (
            <tr>
              <td colSpan={7} className="p-4 text-center text-gray-500">No hay comisiones</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
