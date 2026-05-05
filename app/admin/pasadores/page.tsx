"use client";

import { useState, useEffect } from 'react';

export default function PasadoresPage() {
  const [pasadores, setPasadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPasadores();
  }, [search]);

  async function fetchPasadores() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/pasadores`);
      if (!res.ok) {
        throw new Error('Failed to fetch pasadores');
      }
      const data = await res.json();
      // Apply search filter on the client side for simplicity
      const filtered = data.filter((p: any) => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
          (p.nombre_completo?.toLowerCase().includes(searchLower) ?? false) ||
          (p.dni?.toLowerCase().includes(searchLower) ?? false)
        );
      });
      setPasadores(filtered);
    } catch (err) {
      console.error('Error fetching pasadores:', err);
      // Keep pasadores as empty array
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActivo(id: number, currentActivo: boolean) {
    try {
      const res = await fetch(`/api/admin/pasadores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          action: 'toggle',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to toggle activo');
      }

      const updatedPasador = await res.json();

      // Optimistic update
      setPasadores(
        pasadores.map((p) =>
          p.id === id ? { ...p, activo: updatedPasador.activo } : p
        )
      );
    } catch (err) {
      console.error('Error toggling activo:', err);
      // In a real app, show a toast
    }
  }

  async function handleSuspender(id: number) {
    try {
      const res = await fetch(`/api/admin/pasadores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          action: 'suspend',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to suspend pasador');
      }

      const updatedPasador = await res.json();

      setPasadores(
        pasadores.map((p) =>
          p.id === id ? { ...p, activo: updatedPasador.activo } : p
        )
      );
    } catch (err) {
      console.error('Error suspending pasador:', err);
      // In a real app, show a toast
    }
  }

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Lista de Pasadores</h1>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o DNI..."
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>

      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-4 text-left">Nombre</th>
            <th className="p-4 text-left">DNI</th>
            <th className="p-4 text-center">Reputación</th>
            <th className="p-4 text-center">Activo</th>
            <th className="p-4 text-center">Viajes Completados</th>
            <th className="p-4 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {pasadores.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-4">{p.nombre_completo || '---'}</td>
              <td className="p-4">{p.dni || '---'}</td>
              <td className="p-4 text-center">
                {p.reputacion_promedio !== null
                  ? `${p.reputacion_promedio.toFixed(1)} ★`
                  : 'Sin ratings'}
              </td>
              <td className="p-4 text-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={p.activo}
                    onChange={(e) => handleToggleActivo(p.id, e.target.checked)}
                    className="sr-only peer"
                  />
                  <span className="w-11 h-6 bg-gray-200 rounded-full peer">
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white ${
                        p.activo ? 'translate-x-5' : 'translate-x-0'
                      } transition-transform`}
                    />
                  </span>
                </label>
              </td>
              <td className="p-4 text-center">
                {p.cantidad_viajes_completados || 0}
              </td>
              <td className="p-4 text-center space-x-2">
                <button
                  onClick={() => handleSuspender(p.id)}
                  className="px-3 py-1 rounded text-sm bg-red-500 text-white hover:bg-red-600"
                >
                  Suspender
                </button>
              </td>
            </tr>
          ))}
          {pasadores.length === 0 && (
            <tr>
              <td colSpan={6} className="p-4 text-center text-gray-500">
                No hay pasadores
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}