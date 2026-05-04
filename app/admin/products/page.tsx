'use client';

import { createProduct, deleteProduct, updateProduct } from './actions';
import { supabase } from '@/lib/utils/supabase';
import { useState, useEffect } from 'react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    merchant_id: '',
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    sku: '',
    category: '',
    stock: '',
    image_url: '',
  });

  useEffect(() => {
    fetchMerchants();
    fetchProducts();
  }, []);

  const fetchMerchants = async () => {
    const { data, error } = await supabase
      .from('merchants')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error fetching merchants:', error);
    } else {
      setMerchants(data || []);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*, merchants!inner(name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      await createProduct(formData);
      // Reset form
      setFormData({
        merchant_id: '',
        name: '',
        description: '',
        price: '',
        currency: 'USD',
        sku: '',
        category: '',
        stock: '',
        image_url: '',
      });
      await fetchProducts();
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
      await updateProduct(id, formData);
      setEditingId(null);
      // Reset form
      setFormData({
        merchant_id: '',
        name: '',
        description: '',
        price: '',
        currency: 'USD',
        sku: '',
        category: '',
        stock: '',
        image_url: '',
      });
      await fetchProducts();
    } catch (err) {
      // Error already logged in action
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id);
      await fetchProducts();
    } catch (err) {
      // Error already logged in action
    }
  };

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Productos Administración</h1>

      {/* Create Form */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Crear Nuevo Producto</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Comercio</label>
              <select
                name="merchant_id"
                value={formData.merchant_id}
                onChange={(e) => setFormData({ ...formData, merchant_id: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Selecciona un comercio</option>
                {merchants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Precio</label>
              <input
                type="number"
                step="0.01"
                name="price"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Moneda</label>
              <input
                type="text"
                name="currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">SKU</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Categoría</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Stock</label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">URL de Imagen</label>
              <input
                type="text"
                name="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {creating ? 'Creando...' : 'Crear Producto'}
          </button>
        </form>
      </div>

      {/* Products List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Comercio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Precio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.length === 0 ? (
              <tr>
                <td colspan="5" className="px-6 py-4 text-center text-gray-500">
                  No se encontraron productos.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  {editingId === product.id ? (
                    <>
                      <td className="px-6 py-4">
                        <select
                          name="merchant_id"
                          defaultValue={product.merchant_id}
                          className="w-full px-3 py-2 border rounded"
                        >
                          <option value="">Selecciona un comercio</option>
                          {merchants.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          name="name"
                          defaultValue={product.name}
                          className="w-full px-3 py-2 border rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          step="0.01"
                          name="price"
                          defaultValue={product.price}
                          className="w-full px-3 py-2 border rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          name="stock"
                          defaultValue={product.stock}
                          className="w-full px-3 py-2 border rounded"
                        />
                      </td>
                      <td className="px-6 py-4 space-x-2">
                        <button
                          onClick={(e) => handleUpdate(e, product.id)}
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
                      <td className="px-6 py-4">
                        {product.merchants ? product.merchants.name : ''}
                      </td>
                      <td className="px-6 py-4">{product.name}</td>
                      <td className="px-6 py-4">
                        {product.price ? `$${parseFloat(product.price).toFixed(2)}` : ''}
                      </td>
                      <td className="px-6 py-4">{product.stock}</td>
                      <td className="px-6 py-4 space-x-2">
                        <button
                          onClick={() => {
                            setEditingId(product.id);
                            setFormData({
                              merchant_id: product.merchant_id,
                              name: product.name,
                              description: product.description,
                              price: product.price,
                              currency: product.currency,
                              sku: product.sku,
                              category: product.category,
                              stock: product.stock,
                              image_url: product.image_url,
                            });
                          }}
                          className="bg-yellow-500 text-white px-3 py-1 rounded text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
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