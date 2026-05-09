'use client';

import { createProduct, deleteProduct, updateProduct, aprobarProducto, rechazarProducto, fetchCategories } from './actions';
import { CategoriesManager } from './_components/CategoriesManager';
import { supabase } from '@/lib/utils/supabase/client';
import { useState, useEffect } from 'react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    merchant_id: '',
    name: '',
    description: '',
    sku: '',
    category: '',
    subcategory: '',
    stock: '',
    stock_actual: '',
    precio_ars: '',
  });

  useEffect(() => {
    fetchMerchants();
    fetchProducts();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const data = await fetchCategories();
    setCategories(data || []);
  };

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
        sku: '',
        category: '',
        subcategory: '',
        stock: '',
        stock_actual: '',
        precio_ars: '',
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

      <CategoriesManager onUpdate={loadCategories} />

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
              <label className="block text-sm font-medium mb-1">Precio ARS ($)</label>
              <input
                type="number"
                step="0.01"
                name="precio_ars"
                value={formData.precio_ars}
                onChange={(e) => setFormData({ ...formData, precio_ars: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Imagen (opcional)</label>
              <input
                type="file"
                name="image_file"
                accept="image/*"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Categoría</label>
              <select
                name="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Selecciona una categoría</option>
                {categories.filter(c => !c.parent_id).map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Subcategoría</label>
              <select
                name="subcategory"
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Selecciona una subcategoría</option>
                {categories
                  .filter(c => {
                    const parent = categories.find(p => p.name === formData.category);
                    return parent && c.parent_id === parent.id;
                  })
                  .map(sub => (
                    <option key={sub.id} value={sub.name}>{sub.name}</option>
                  ))
                }
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Stock disponible</label>
              <input
                type="number"
                name="stock_actual"
                value={formData.stock_actual}
                onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })}
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
                Precio ARS
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Moderación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No se encontraron productos.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  {editingId === product.id ? (
                    <>
                    <td colSpan={6} className="p-0">
                      <form onSubmit={(e) => handleUpdate(e, product.id)} className="bg-white border-2 border-blue-200 rounded-xl p-6 m-2 shadow-sm">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                          <h3 className="text-lg font-bold text-gray-800">Editar Producto: {product.name}</h3>
                          <button type="button" onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">✕ Cerrar</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Nombre</label>
                            <input type="text" name="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="w-full px-3 py-2 border rounded" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Comercio</label>
                            <select name="merchant_id" value={formData.merchant_id} onChange={(e) => setFormData({...formData, merchant_id: e.target.value})} className="w-full px-3 py-2 border rounded">
                              <option value="">Selecciona un comercio</option>
                              {merchants.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Categoría</label>
                            <select
                              name="category"
                              value={formData.category}
                              onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                              className="w-full px-3 py-2 border rounded"
                            >
                              <option value="">Selecciona una categoría</option>
                              {categories.filter(c => !c.parent_id).map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Subcategoría</label>
                            <select
                              name="subcategory"
                              value={formData.subcategory}
                              onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                              className="w-full px-3 py-2 border rounded"
                            >
                              <option value="">Selecciona una subcategoría</option>
                              {categories
                                .filter(c => {
                                  const parent = categories.find(p => p.name === formData.category);
                                  return parent && c.parent_id === parent.id;
                                })
                                .map(sub => (
                                  <option key={sub.id} value={sub.name}>{sub.name}</option>
                                ))
                              }
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Precio ARS</label>
                            <input type="number" step="0.01" name="precio_ars" value={formData.precio_ars} onChange={(e) => setFormData({...formData, precio_ars: e.target.value})} required className="w-full px-3 py-2 border rounded" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Stock disponible</label>
                            <input type="number" name="stock_actual" value={formData.stock_actual} onChange={(e) => setFormData({...formData, stock_actual: e.target.value})} className="w-full px-3 py-2 border rounded" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">SKU</label>
                            <input type="text" name="sku" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} className="w-full px-3 py-2 border rounded" />
                          </div>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-1">Imagen (dejar vacío para no cambiar la actual)</label>
                          <input type="file" name="image_file" accept="image/*" className="w-full px-3 py-2 border rounded" />
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-1">Descripción</label>
                          <textarea name="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} className="w-full px-3 py-2 border rounded" />
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">Cancelar</button>
                          <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700">Guardar Cambios</button>
                        </div>
                      </form>
                    </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        {product.merchants ? product.merchants.name : ''}
                      </td>
                      <td className="px-6 py-4">{product.name}</td>
                      <td className="px-6 py-4">
                        {product.precio_ars ? `$${product.precio_ars}` : '—'}
                      </td>
                      <td className="px-6 py-4">{product.stock_actual ?? product.stock ?? 0}</td>
                      <td className="px-6 py-4 text-sm">
                        {product.moderation_status === 'pending' && (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Pendiente</span>
                        )}
                        {product.moderation_status === 'approved' && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Aprobado</span>
                        )}
                        {product.moderation_status === 'rejected' && (
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded">Rechazado</span>
                        )}
                        {product.moderation_status === 'pending' && (
                          <div className="mt-2 space-x-2">
                            <button onClick={async () => { await aprobarProducto(product.id); await fetchProducts(); }} className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Aprobar</button>
                            <button onClick={async () => { await rechazarProducto(product.id); await fetchProducts(); }} className="text-xs bg-red-500 text-white px-2 py-1 rounded">Rechazar</button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 space-x-2">
                        <button
                          onClick={() => {
                            setEditingId(product.id);
                            setFormData({
                              merchant_id: product.merchant_id,
                              name: product.name,
                              description: product.description,
                              sku: product.sku,
                              category: product.category,
                              subcategory: product.subcategory ?? '',
                              stock: product.stock,
                              stock_actual: product.stock_actual ?? '',
                              precio_ars: product.precio_ars ?? '',
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