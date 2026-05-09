"use client";

import { useState, useEffect } from 'react';
import { fetchPasadores, togglePasadorActivo, deletePasador } from '../actions';

export function PasadoresContent() {
  const [pasadores, setPasadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPasadores();
  }, []);

  async function loadPasadores() {
    setLoading(true);
    try {
      const data = await fetchPasadores();
      setPasadores(data || []);
    } catch (err) {
      console.error('Error fetching pasadores:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActivo(id: number, currentActivo: boolean) {
    // Optimistic update
    setPasadores(pasadores.map((p) => (p.id === id ? { ...p, activo: !currentActivo } : p)));
    const res = await togglePasadorActivo(id, currentActivo);
    if (!res.success) {
      // Revert on failure
      setPasadores(pasadores.map((p) => (p.id === id ? { ...p, activo: currentActivo } : p)));
      alert(res.error);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('¿Seguro que deseas eliminar a este pasador?')) return;
    
    // Optimistic delete
    const previous = [...pasadores];
    setPasadores(pasadores.filter((p) => p.id !== id));
    
    const res = await deletePasador(id);
    if (!res.success) {
      // Revert on failure
      setPasadores(previous);
      alert(res.error);
    }
  }

  const filteredPasadores = pasadores.filter((p) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      (p.nombre_completo?.toLowerCase().includes(searchLower) ?? false) ||
      (p.dni?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div>
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
          {filteredPasadores.map((p) => (
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
                    onChange={() => handleToggleActivo(p.id, p.activo)}
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
                  onClick={() => handleDelete(p.id)}
                  className="px-3 py-1 rounded text-sm bg-red-500 text-white hover:bg-red-600"
                >
                  Borrar
                </button>
              </td>
            </tr>
          ))}
          {filteredPasadores.length === 0 && (
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