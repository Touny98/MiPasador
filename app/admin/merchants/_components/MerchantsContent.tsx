'use client';

import { createMerchant, deleteMerchant, updateMerchant } from '../actions';
import { supabase } from '@/lib/utils/supabase/client';
import { useState, useEffect } from 'react';

export function MerchantsContent() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone_number: '',
    titular: '',
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
      const fd = new FormData(e.currentTarget as HTMLFormElement);
      await createMerchant(fd);
      setFormData({ name: '', address: '', phone_number: '', titular: '' });
      setShowCreate(false);
      await fetchMerchants();
    } catch {
      // Error already logged in action
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    setEditingId(id);
    try {
      const fd = new FormData(e.currentTarget as HTMLFormElement);
      await updateMerchant(id, fd);
      setEditingId(null);
      setFormData({ name: '', address: '', phone_number: '', titular: '' });
      await fetchMerchants();
    } catch {
      // Error already logged in action
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMerchant(id);
      await fetchMerchants();
    } catch {
      // Error already logged in action
    }
  };

  if (loading) return <div className="py-6">Cargando...</div>;

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-bold">Comercios Registrados</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          {showCreate ? '✕ Cancelar' : '➕ Cargar Comercio Manualmente'}
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 p-6 bg-white border border-blue-100 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Cargar Nuevo Comercio</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Nombre del Negocio</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Titular del Negocio</label>
                <input
                  type="text"
                  name="titular"
                  value={formData.titular}
                  onChange={(e) => setFormData({ ...formData, titular: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Dirección</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Teléfono / WhatsApp</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={creating}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {creating ? 'Guardando...' : 'Guardar Comercio'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Negocio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titular</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dirección</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WhatsApp</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Acciones</th>
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
                    <td colSpan={5} className="px-6 py-4">
                      <form onSubmit={(e) => handleUpdate(e, merchant.id)} className="bg-blue-50 p-4 rounded-lg space-y-4 shadow-inner">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input type="text" name="name" defaultValue={merchant.name} placeholder="Negocio" className="border rounded px-3 py-2 w-full" />
                          <input type="text" name="titular" defaultValue={merchant.titular} placeholder="Titular" className="border rounded px-3 py-2 w-full" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input type="text" name="address" defaultValue={merchant.address} placeholder="Dirección" className="border rounded px-3 py-2 w-full" />
                          <input type="tel" name="phone_number" defaultValue={merchant.phone_number} placeholder="WhatsApp" className="border rounded px-3 py-2 w-full" />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setEditingId(null)} className="bg-gray-400 text-white px-4 py-1.5 rounded text-sm hover:bg-gray-500">Cancelar</button>
                          <button type="submit" className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700 font-medium">Guardar Cambios</button>
                        </div>
                      </form>
                    </td>
                  ) : (
                    <>
                      <td className="px-6 py-4 font-medium text-gray-900">{merchant.name}</td>
                      <td className="px-6 py-4 text-gray-600">{merchant.titular || '—'}</td>
                      <td className="px-6 py-4 text-gray-500 text-sm">{merchant.address}</td>
                      <td className="px-6 py-4 text-gray-500 text-sm">{merchant.phone_number}</td>
                      <td className="px-6 py-4 space-x-2 text-right">
                        <button
                          onClick={() => setEditingId(merchant.id)}
                          className="text-blue-600 hover:text-blue-900 font-medium text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => { if(confirm('¿Borrar comercio?')) handleDelete(merchant.id) }}
                          className="text-red-600 hover:text-red-900 font-medium text-sm"
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
