"use client";

import { useState, useEffect } from 'react';
import { fetchPasadores, togglePasadorActivo, deletePasador, createPasador } from '../actions';

export function PasadoresContent() {
  const [pasadores, setPasadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

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

    );
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const res = await createPasador(fd);
    if (res.success) {
      setShowCreate(false);
      loadPasadores();
    } else {
      alert(res.error);
    }
    setCreating(false);
  }

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o DNI..."
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 ml-4"
        >
          {showCreate ? '✕ Cancelar' : '➕ Cargar Pasador Manualmente'}
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 p-6 bg-white border border-blue-100 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Cargar Nuevo Pasador</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Nombre Completo</label>
                <input type="text" name="nombre_completo" required className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">DNI</label>
                <input type="text" name="dni" required className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">WhatsApp (ID)</label>
                <input type="text" name="wa_user_id" required placeholder="Ej: 54911..." className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={creating}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Guardando...' : 'Guardar Pasador'}
              </button>
            </div>
          </form>
        </div>
      )}

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
                  <span className="w-11 h-6 bg-red-500 rounded-full peer peer-checked:bg-green-500 transition-colors">
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