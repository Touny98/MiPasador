"use client";

import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { useState, useEffect } from 'react';

export function ViajesContent() {
  const [viajes, setViajes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    estado: '',
    fechaDesde: '',
    fechaHasta: '',
  });

  useEffect(() => {
    fetchViajes();
  }, [filters]);

  async function fetchViajes() {
    setLoading(true);
    let query = supabaseAdmin
      .from('viajes')
      .select(`
        id,
        usuario_wa_id,
        pasadores!viajes_pasador_id_fkey(nombre_completo),
        direccion_origen,
        direccion_destino,
        peso,
        precio_ars,
        estado,
        completado_at,
        ratings!viajes_pasador_id_fkey(puntuacion)
      `);

    if (filters.estado) query = query.eq('estado', filters.estado);
    if (filters.fechaDesde) query = query.gte('creado_at', filters.fechaDesde);
    if (filters.fechaHasta) query = query.lte('creado_at', filters.fechaHasta);

    const { data, error } = await query.order('creado_at', { ascending: false });

    if (error) {
      console.error('Error fetching viajes:', error);
    } else {
      const processed = (data || []).map((v) => ({
        id: v.id,
        usuario: v.usuario_wa_id || '---',
        pasador: v.pasadores?.nombre_completo || '---',
        ruta: `${v.direccion_origen} → ${v.direccion_destino}`,
        peso: v.peso || 0,
        precio: v.precio_ars || 0,
        estado: v.estado,
        completado: v.completado_at ? new Date(v.completado_at).toLocaleString() : '---',
        rating:
          v.ratings && (v.ratings as unknown as any[]).length > 0
            ? (v.ratings as unknown as any[])[0]?.puntuacion
            : null,
      }));
      setViajes(processed);
    }

    setLoading(false);
  }

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Estado:</label>
          <select
            value={filters.estado}
            onChange={(e) => setFilters((prev) => ({ ...prev, estado: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="">Todos</option>
            <option value="asignado">Asignado</option>
            <option value="aceptado">Aceptado</option>
            <option value="en_camino">En Camino</option>
            <option value="completado">Completado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Fecha desde:</label>
          <input
            type="date"
            value={filters.fechaDesde}
            onChange={(e) => setFilters((prev) => ({ ...prev, fechaDesde: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-2">Fecha hasta:</label>
          <input
            type="date"
            value={filters.fechaHasta}
            onChange={(e) => setFilters((prev) => ({ ...prev, fechaHasta: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
      </div>

      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-4 text-left">ID</th>
            <th className="p-4 text-left">Usuario</th>
            <th className="p-4 text-left">Pasador</th>
            <th className="p-4 text-left">Ruta</th>
            <th className="p-4 text-center">Peso (kg)</th>
            <th className="p-4 text-center">Precio (ARS)</th>
            <th className="p-4 text-center">Comisión</th>
            <th className="p-4 text-center">Estado</th>
            <th className="p-4 text-center">Rating</th>
          </tr>
        </thead>
        <tbody>
          {viajes.map((v) => (
            <tr key={v.id} className="border-t">
              <td className="p-4">{v.id}</td>
              <td className="p-4">{v.usuario}</td>
              <td className="p-4">{v.pasador}</td>
              <td className="p-4">{v.ruta}</td>
              <td className="p-4 text-center">{v.peso}</td>
              <td className="p-4 text-center">${v.precio.toFixed(2)}</td>
              <td className="p-4 text-center">${(v.precio * 0.1).toFixed(2)}</td>
              <td className="p-4 text-center">
                <span className={`px-2 py-1 rounded text-xs ${
                  v.estado === 'asignado' ? 'bg-blue-100 text-blue-800'
                  : v.estado === 'aceptado' ? 'bg-yellow-100 text-yellow-800'
                  : v.estado === 'en_camino' ? 'bg-indigo-100 text-indigo-800'
                  : v.estado === 'completado' ? 'bg-green-100 text-green-800'
                  : v.estado === 'cancelado' ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
                }`}>
                  {v.estado}
                </span>
              </td>
              <td className="p-4 text-center">
                {v.rating !== null ? `${v.rating} ★` : 'Sin rating'}
              </td>
            </tr>
          ))}
          {viajes.length === 0 && (
            <tr>
              <td colSpan={9} className="p-4 text-center text-gray-500">No hay viajes</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
