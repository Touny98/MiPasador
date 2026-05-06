'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/utils/supabase/client';
import { acceptPostulacionComercio, denyPostulacionComercio } from '../actions';

type Postulacion = {
  id: string;
  nombre_completo: string | null;
  nombre_negocio: string | null;
  dni: string | null;
  categoria_productos: string | null;
  direccion: string | null;
  foto_local_url: string | null;
  estado: string | null;
  wa_user_id: string;
  created_at: string | null;
};

const estadoBadge: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aceptada: 'bg-green-100 text-green-800',
  denegada: 'bg-red-100 text-red-800',
};

export function PostulacionesComercioContent() {
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const [processing, setProcessing] = useState<string | null>(null);
  const [fotoModal, setFotoModal] = useState<string | null>(null);

  useEffect(() => {
    fetchPostulaciones();
  }, [filter]);

  async function fetchPostulaciones() {
    setLoading(true);
    let query = supabase
      .from('postulaciones_comercio')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter !== 'todos') {
      query = query.eq('estado', filter);
    }

    const { data, error } = await query;
    if (error) console.error('Error fetching postulaciones comercio:', error);
    setPostulaciones((data as Postulacion[]) || []);
    setLoading(false);
  }

  async function handleAccept(id: string) {
    setProcessing(id);
    try {
      await acceptPostulacionComercio(id);
      await fetchPostulaciones();
    } catch {
      alert('Error al aceptar la postulación');
    } finally {
      setProcessing(null);
    }
  }

  async function handleDeny(id: string) {
    setProcessing(id);
    try {
      await denyPostulacionComercio(id);
      await fetchPostulaciones();
    } catch {
      alert('Error al denegar la postulación');
    } finally {
      setProcessing(null);
    }
  }

  const filterButtons = [
    { value: 'todos', label: 'Todas' },
    { value: 'pendiente', label: 'Pendientes' },
    { value: 'aceptada', label: 'Aceptadas' },
    { value: 'denegada', label: 'Denegadas' },
  ];

  if (loading) return <div className="py-6">Cargando...</div>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {filterButtons.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-2 rounded text-sm ${filter === value ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left text-sm">Nombre</th>
              <th className="p-3 text-left text-sm">Negocio</th>
              <th className="p-3 text-left text-sm">Categoría</th>
              <th className="p-3 text-left text-sm">Dirección</th>
              <th className="p-3 text-left text-sm">DNI</th>
              <th className="p-3 text-left text-sm">Foto</th>
              <th className="p-3 text-left text-sm">Estado</th>
              <th className="p-3 text-left text-sm">Fecha</th>
              <th className="p-3 text-center text-sm">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {postulaciones.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-4 text-center text-gray-500">
                  No hay postulaciones
                </td>
              </tr>
            ) : (
              postulaciones.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 text-sm">{p.nombre_completo || '—'}</td>
                  <td className="p-3 text-sm font-medium">{p.nombre_negocio || '—'}</td>
                  <td className="p-3 text-sm">{p.categoria_productos || '—'}</td>
                  <td className="p-3 text-sm">{p.direccion || '—'}</td>
                  <td className="p-3 text-sm">{p.dni || '—'}</td>
                  <td className="p-3 text-sm">
                    {p.foto_local_url ? (
                      <button
                        onClick={() => setFotoModal(p.foto_local_url!)}
                        className="text-blue-500 underline text-xs"
                      >
                        Ver foto
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${estadoBadge[p.estado || ''] || 'bg-gray-100 text-gray-800'}`}>
                      {p.estado || '—'}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-gray-500">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('es-AR') : '—'}
                  </td>
                  <td className="p-3 text-center space-x-2">
                    <button
                      onClick={() => handleAccept(p.id)}
                      disabled={p.estado !== 'pendiente' || processing === p.id}
                      className="bg-green-500 text-white px-3 py-1 rounded text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Aceptar
                    </button>
                    <button
                      onClick={() => handleDeny(p.id)}
                      disabled={p.estado !== 'pendiente' || processing === p.id}
                      className="bg-red-500 text-white px-3 py-1 rounded text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Denegar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {fotoModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
          onClick={() => setFotoModal(null)}
        >
          <div className="relative max-w-lg w-full p-4" onClick={(e) => e.stopPropagation()}>
            <img src={fotoModal} alt="Foto del local" className="w-full rounded-lg shadow-xl" />
            <button
              onClick={() => setFotoModal(null)}
              className="absolute top-2 right-2 bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
