"use client";

import { useState, useEffect } from 'react';

export function ReputacionContent() {
  const [data, setData] = useState<{
    distribution: { [key: number]: number };
    lowRated: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReputacion();
  }, []);

  async function fetchReputacion() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reputacion');
      if (!res.ok) throw new Error('Failed to fetch reputation data');
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching reputation:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Distribución de Calificaciones</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(data?.distribution || {}).map(([star, count]) => (
            <div key={star} className="text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-2xl font-bold text-gray-800">{star} ★</div>
              <div className="text-sm text-gray-500">{count} viajes</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold mb-4 text-red-600">Pasadores con Baja Reputación (&lt; 3.5)</h2>
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Nombre</th>
              <th className="p-4 text-left">DNI</th>
              <th className="p-4 text-center">Promedio Reputación</th>
            </tr>
          </thead>
          <tbody>
            {data?.lowRated && data.lowRated.length > 0 ? (
              data.lowRated.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-4">{p.nombre_completo}</td>
                  <td className="p-4">{p.dni}</td>
                  <td className="p-4 text-center font-bold text-red-500">
                    {p.reputacion_promedio?.toFixed(2) || '---'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-500">
                  No hay pasadores con reputación baja.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
