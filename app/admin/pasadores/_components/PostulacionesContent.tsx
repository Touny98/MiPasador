"use client";

import { useState, useEffect } from 'react';

export function PostulacionesContent() {
  const [postulaciones, setPostulaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const [modalData, setModalData] = useState<{ id: number; action: 'ver' | 'aceptar' | 'denegar' | 'correccion' } | null>(null);
  const [correccionData, setCorreccionData] = useState<{
    campos: string[];
    observacion: string;
  }>({ campos: [], observacion: '' });

  useEffect(() => {
    fetchPostulaciones();
  }, [filter]);

  async function fetchPostulaciones() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/postulaciones?filter=${filter}`);
      if (!res.ok) throw new Error('Failed to fetch postulaciones');
      const data = await res.json();
      setPostulaciones(data);
    } catch (err) {
      console.error('Error fetching postulaciones:', err);
      setPostulaciones([]);
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    setModalData(null);
    setCorreccionData({ campos: [], observacion: '' });
  }

  async function handleModalSubmit() {
    if (!modalData) return;
    const { id, action } = modalData;
    try {
      if (action === 'aceptar' || action === 'denegar') {
        await fetch('/api/admin/postulaciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, action }),
        });
      } else if (action === 'correccion') {
        await fetch('/api/admin/postulaciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, action, campos: correccionData.campos, observacion: correccionData.observacion }),
        });
      }
      closeModal();
      await fetchPostulaciones();
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error al procesar la solicitud');
    }
  }

  const filterButtons = [
    { value: 'todos', label: 'Todos' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'lista_para_revision', label: 'Lista para revisión' },
    { value: 'requiere_correccion', label: 'Requieren corrección' },
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
            className={`px-4 py-2 rounded text-sm ${filter === value ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-4 text-left">Nombre</th>
            <th className="p-4 text-left">DNI</th>
            <th className="p-4 text-left">Estado</th>
            <th className="p-4 text-left">Fecha</th>
            <th className="p-4 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {postulaciones.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-4">{p.nombre_completo || '---'}</td>
              <td className="p-4">{p.dni || '---'}</td>
              <td className="p-4">
                <span className={`px-2 py-1 rounded text-xs ${
                  p.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800'
                  : p.estado === 'lista_para_revision' ? 'bg-blue-100 text-blue-800'
                  : p.estado === 'requiere_correccion' ? 'bg-orange-100 text-orange-800'
                  : p.estado === 'aceptada' ? 'bg-green-100 text-green-800'
                  : p.estado === 'denegada' ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
                }`}>
                  {p.estado}
                </span>
              </td>
              <td className="p-4">{new Date(p.created_at).toLocaleDateString()}</td>
              <td className="p-4 text-center space-x-2">
                {(['ver', 'aceptar', 'denegar', 'correccion'] as const).map((action) => {
                  const isDisabled =
                    (action === 'aceptar' && p.estado !== 'pendiente') ||
                    (action === 'denegar' && p.estado !== 'pendiente') ||
                    (action === 'correccion' && !['pendiente', 'lista_para_revision'].includes(p.estado)) ||
                    (action === 'ver' && !p.pdf_url);
                  return (
                    <button
                      key={action}
                      onClick={() => setModalData({ id: p.id, action })}
                      disabled={isDisabled}
                      className={`px-3 py-1 rounded text-sm ${
                        isDisabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : action === 'ver' ? 'bg-blue-500 text-white'
                        : action === 'aceptar' ? 'bg-green-500 text-white'
                        : action === 'denegar' ? 'bg-red-500 text-white'
                        : 'bg-yellow-500 text-white'
                      }`}
                    >
                      {action === 'ver' ? 'Ver PDF' : action === 'aceptar' ? 'Aceptar' : action === 'denegar' ? 'Denegar' : 'Corregir'}
                    </button>
                  );
                })}
              </td>
            </tr>
          ))}
          {postulaciones.length === 0 && (
            <tr>
              <td colSpan={5} className="p-4 text-center text-gray-500">No hay postulaciones</td>
            </tr>
          )}
        </tbody>
      </table>

      {modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {modalData.action === 'ver' ? 'Ver PDF'
               : modalData.action === 'aceptar' ? 'Aceptar Postulación'
               : modalData.action === 'denegar' ? 'Denegar Postulación'
               : 'Solicitar Corrección'}
            </h2>

            {modalData.action === 'ver' && (
              <div className="mb-4">
                {postulaciones.find((p) => p.id === modalData.id)?.pdf_url ? (
                  <a href={postulaciones.find((p) => p.id === modalData.id)?.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                    Ver PDF
                  </a>
                ) : (
                  <span className="text-gray-500">No hay PDF disponible</span>
                )}
              </div>
            )}

            {modalData.action === 'correccion' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Campos a corregir:</label>
                  <div className="space-y-2">
                    {['nombre', 'dni', 'fotos'].map((campo) => (
                      <label key={campo} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={correccionData.campos.includes(campo)}
                          onChange={(e) => {
                            const campos = [...correccionData.campos];
                            if (e.target.checked) campos.push(campo);
                            else campos.splice(campos.indexOf(campo), 1);
                            setCorreccionData({ ...correccionData, campos });
                          }}
                        />
                        {campo.charAt(0).toUpperCase() + campo.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Observación:</label>
                  <textarea
                    value={correccionData.observacion}
                    onChange={(e) => setCorreccionData({ ...correccionData, observacion: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded"
                    rows={4}
                    placeholder="Ingrese las correcciones necesarias..."
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={closeModal} className="px-4 py-2 bg-gray-300 text-gray-800 rounded">
                Cancelar
              </button>
              <button
                onClick={handleModalSubmit}
                disabled={modalData.action === 'correccion' && correccionData.campos.length === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                {modalData.action === 'ver' ? 'Cerrar' : modalData.action === 'aceptar' ? 'Aceptar' : modalData.action === 'denegar' ? 'Denegar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
