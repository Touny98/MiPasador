'use client';

import { createMerchant, deleteMerchant, updateMerchant } from './actions';
import { supabase } from '@/lib/utils/supabase';
import { useState, useEffect } from 'react';

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone_number: '',
  });

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching merchants:', error);
    } else {
      setMerchants(data || []);
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      await createMerchant(formData);
      setFormData({ name: '', address: '', phone_number: '' });
      await fetchMerchants();
    } catch (err) {
      // Error already logged in action
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    setEditingId(id);
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      await updateMerchant(id, formData);
      setEditingId(null);
      setFormData({ name: '', address: '', phone_number: '' });
      await fetchMerchants();
    } catch (err) {
      // Error already logged in action
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMerchant(id);
      await fetchMerchants();
    } catch (err) {
      // Error already logged in action
    }
  };

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Comercios Administración</h1>

      {/* Create Form */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Crear Nuevo Comercio</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Dirección</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Teléfono</label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {creating ? 'Creando...' : 'Crear Comercio'}
          </button>
        </form>
      </div>

      {/* Merchants List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dirección
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teléfono
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {merchants.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No se encontraron comercios.
                </td>
              </tr>
            ) : (
              merchants.map((merchant) => (
                <tr key={merchant.id} className="hover:bg-gray-50">
                  {editingId === merchant.id ? (
                    <>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          name="name"
                          defaultValue={merchant.name}
                          className="w-full px-3 py-2 border rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          name="address"
                          defaultValue={merchant.address}
                          className="w-full px-3 py-2 border rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="tel"
                          name="phone_number"
                          defaultValue={merchant.phone_number}
                          className="w-full px-3 py-2 border rounded"
                        />
                      </td>
                      <td className="px-6 py-4 space-x-2">
                        <button
                          onClick={(e) => handleUpdate(e, merchant.id)}
                          className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                        >
                          Actualizar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="bg-gray-500 text-white px-3 py-1 rounded text-sm"
                        >
                          Cancelar
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4">{merchant.name}</td>
                      <td className="px-6 py-4">{merchant.address}</td>
                      <td className="px-6 py-4">{merchant.phone_number}</td>
                      <td className="px-6 py-4 space-x-2">
                        <button
                          onClick={() => {
                            setEditingId(merchant.id);
                            setFormData({
                              name: merchant.name,
                              address: merchant.address,
                              phone_number: merchant.phone_number,
                            });
                          }}
                          className="bg-yellow-500 text-white px-3 py-1 rounded text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(merchant.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                        >
                          Eliminar
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}