"use client";

import { useState, useEffect } from 'react';

export function PostulacionesContent() {
  const [postulaciones, setPostulaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos'); // todos, pendiente, lista_para_revision, requiere_correccion, aceptada, denegada
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
      if (!res.ok) {
        throw new Error('Failed to fetch postulaciones');
      }
      const data = await res.json();
      setPostulaciones(data);
    } catch (err) {
      console.error('Error fetching postulaciones:', err);
      // In a real app, you might show a toast
      setPostulaciones([]);
    } finally {
      setLoading(false);
    }
  }

  function handleVerPDF(id: number) {
    setModalData({ id, action: 'ver' });
  }

  async function handleAceptar(id: number) {
    setModalData({ id, action: 'aceptar' });
  }

  async function handleDenegar(id: number) {
    setModalData({ id, action: 'denegar' });
  }

  async function handleSolicitarCorreccion(id: number) {
    setModalData({ id, action: 'correccion' });
    // Reset correccion data
    setCorreccionData({ campos: [], observacion: '' });
  }

  // Modal handlers
  function closeModal() {
    setModalData(null);
    setCorreccionData({ campos: [], observacion: '' });
  }

  async function handleModalSubmit() {
    if (!modalData) return;

    const { id, action } = modalData;

    try {
      if (action === 'aceptar') {
        await fetch(`/api/admin/postulaciones`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id, action }),
        });
      } else if (action === 'denegar') {
        await fetch(`/api/admin/postulaciones`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id, action }),
        });
      } else if (action === 'correccion') {
        await fetch(`/api/admin/postulaciones`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id,
            action,
            campos: correccionData.campos,
            observacion: correccionData.observacion,
          }),
        });
      }

      closeModal();
      await fetchPostulaciones();
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error al procesar la solicitud');
    }
  }

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Postulaciones de Pasadores</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          className={`px-4 py-2 rounded bg-gray-200 ${
            filter === 'todos' ? 'bg-blue-500 text-white' : ''
          }`}
          onClick={() => setFilter('todos')}
        >
          Todos
        </button>
        <button
          className={`px-4 py-2 rounded bg-gray-200 ${
            filter === 'pendiente' ? 'bg-blue-500 text-white' : ''
          }`}
          onClick={() => setFilter('pendiente')}
        >
          Pendiente
        </button>
        <button
          className={`px-4 py-2 rounded bg-gray-200 ${
            filter === 'lista_para_revision' ? 'bg-blue-500 text-white' : ''
          }`}
          onClick={() => setFilter('lista_para_revision')}
        >
          Lista para revisión
        </button>
        <button
          className={`px-4 py-2 rounded bg-gray-200 ${
            filter === 'requiere_correccion' ? 'bg-blue-500 text-white' : ''
          }`}
          onClick={() => setFilter('requiere_correccion')}
        >
          Requieren corrección
        </button>
        <button
          className={`px-4 py-2 rounded bg-gray-200 ${
            filter === 'aceptada' ? 'bg-blue-500 text-white' : ''
          }`}
          onClick={() => setFilter('aceptada')}
        >
          Aceptadas
        </button>
        <button
          className={`px-4 py-2 rounded bg-gray-200 ${
            filter === 'denegada' ? 'bg-blue-500 text-white' : ''
          }`}
          onClick={() => setFilter('denegada')}
        >
          Denegadas
        </button>
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
                  p.estado === 'pendiente'
                    ? 'bg-yellow-100 text-yellow-800'
                    : p.estado === 'lista_para_revision'
                    ? 'bg-blue-100 text-blue-800'
                    : p.estado === 'requiere_correccion'
                    ? 'bg-orange-100 text-orange-800'
                    : p.estado === 'aceptada'
                    ? 'bg-green-100 text-green-800'
                    : p.estado === 'denegada'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
                >
                  {p.estado}
                </span>
              </td>
              <td className="p-4">
                {new Date(p.created_at).toLocaleDateString()}
              </td>
              <td className="p-4 text-center space-x-2">
                {[ 'ver', 'aceptar', 'denegar', 'correccion' ].map((action) => {
                  const isDisabled =
                    (action === 'aceptar' && p.estado !== 'pendiente') ||
                    (action === 'denegar' && p.estado !== 'pendiente') ||
                    (action === 'correccion' &&
                      ![ 'pendiente', 'lista_para_revision' ].includes(p.estado)) ||
                    (action === 'ver' && !p.pdf_url);

                  return (
                    <button
                      key={action}
                      onClick={() => {
                        if (action === 'ver') handleVerPDF(p.id);
                        if (action === 'aceptar') handleAceptar(p.id);
                        if (action === 'denegar') handleDenegar(p.id);
                        if (action === 'correccion')
                          handleSolicitarCorreccion(p.id);
                      }}
                      className={`px-3 py-1 rounded text-sm ${
                        isDisabled
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : action === 'ver'
                          ? 'bg-blue-500 text-white'
                          : action === 'aceptar'
                          ? 'bg-green-500 text-white'
                          : action === 'denegar'
                          ? 'bg-red-500 text-white'
                          : 'bg-yellow-500 text-white'
                      }`}
                      disabled={isDisabled}
                    >
                      {action === 'ver' && 'Ver PDF'}
                      {action === 'aceptar' && 'Aceptar'}
                      {action === 'denegar' && 'Denegar'}
                      {action === 'correccion' && 'Corregir'}
                    </button>
                  );
                })}
              </td>
            </tr>
          ))}
          {postulaciones.length === 0 && (
            <tr>
              <td colSpan={5} className="p-4 text-center text-gray-500">
                No hay postulaciones
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Modal */}
      {modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {modalData.action === 'ver' && 'Ver PDF'}
              {modalData.action === 'aceptar' && 'Aceptar Postulación'}
              {modalData.action === 'denegar' && 'Denegar Postulación'}
              {modalData.action === 'correccion' && 'Solicitar Corrección'}
            </h2>

            {modalData.action === 'ver' && (
              <div className="mb-4">
                <p className="mb-2">URL del PDF:</p>
                {postulaciones.find((p) => p.id === modalData.id)?.pdf_url ? (
                  <a
                    href={postulaciones.find((p) => p.id === modalData.id)?.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline"
                  >
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
                  <label className="block text-sm font-medium mb-2">
                    Campos a corregir:
                  </label>
                  <div className="space-x-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={correccionData.campos.includes('nombre')}
                        onChange={(e) => {
                          const campos = [...correccionData.campos];
                          if (e.target.checked) {
                            campos.push('nombre');
                          } else {
                            const index = campos.indexOf('nombre');
                            if (index > -1) campos.splice(index, 1);
                          }
                          setCorreccionData({
                            ...correccionData,
                            campos,
                          });
                        }}
                      />
                      Nombre
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={correccionData.campos.includes('dni')}
                        onChange={(e) => {
                          const campos = [...correccionData.campos];
                          if (e.target.checked) {
                            campos.push('dni');
                          } else {
                            const index = campos.indexOf('dni');
                            if (index > -1) campos.splice(index, 1);
                          }
                          setCorreccionData({
                            ...correccionData,
                            campos,
                          });
                        }}
                      />
                      DNI
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={correccionData.campos.includes('fotos')}
                        onChange={(e) => {
                          const campos = [...correccionData.campos];
                          if (e.target.checked) {
                            campos.push('fotos');
                          } else {
                            const index = campos.indexOf('fotos');
                            if (index > -1) campos.splice(index, 1);
                          }
                          setCorreccionData({
                            ...correccionData,
                            campos,
                          });
                        }}
                      />
                      Fotos
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Observación:
                  </label>
                  <textarea
                    value={correccionData.observacion}
                    onChange={(e) => {
                      setCorreccionData({
                        ...correccionData,
                        observacion: e.target.value,
                      });
                    }}
                    className="w-full p-2 border border-gray-300 rounded"
                    rows={4}
                    placeholder="Ingrese las correcciones necesarias..."
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleModalSubmit}
                className="px-4 py-2 bg-blue-500 text-white rounded"
                disabled={modalData.action === 'correccion' && correccionData.campos.length === 0}
              >
                {modalData.action === 'ver' && 'Cerrar'}
                {modalData.action === 'aceptar' && 'Aceptar'}
                {modalData.action === 'denegar' && 'Denegar'}
                {modalData.action === 'correccion' && 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}