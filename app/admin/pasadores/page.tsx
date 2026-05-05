import { supabaseAdmin } from '@/lib/utils/supabase/admin';
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
    let query = supabaseAdmin.from('pasadores').select('*');

    if (search) {
      query = query.or(`nombre_completo.ilike.%${search}%,dni.ilike.%${search}%`);
    }

    const { data, error } = await query.order('nombre_completo');

    if (error) {
      console.error('Error fetching pasadores:', error);
    } else {
      setPasadores(data || []);
    }

    setLoading(false);
  }

  async function handleToggleActivo(id: number, currentActivo: boolean) {
    const { error } = await supabaseAdmin
      .from('pasadores')
      .update({ activo: !currentActivo })
      .eq('id', id);

    if (error) {
      console.error('Error updating activo:', error);
      // In a real app, show a toast
    } else {
      // Optimistic update
      setPasadores(
        pasadores.map((p) =>
          p.id === id ? { ...p, activo: !currentActivo } : p
        )
      );
    }
  }

  async function handleSuspender(id: number) {
    // We'll suspend by setting activo to false and maybe adding a reason?
    // For simplicity, just set activo to false
    const { error } = await supabaseAdmin
      .from('pasadores')
      .update({ activo: false })
      .eq('id', id);

    if (error) {
      console.error('Error suspending pasador:', error);
    } else {
      setPasadores(
        pasadores.map((p) =>
          p.id === id ? { ...p, activo: false } : p
        )
      );
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