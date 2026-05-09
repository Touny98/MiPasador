'use client';

import { createProduct, deleteProduct, updateProduct, aprobarProducto, rechazarProducto, fetchCategories } from './actions';
import { CategoriesManager } from './_components/CategoriesManager';
import { supabase } from '@/lib/utils/supabase/client';
import { useState, useEffect } from 'react';
import React from 'react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingProduct, setViewingProduct] = useState<any | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const createFileRef = React.useRef<HTMLInputElement>(null);
  const editFileRef = React.useRef<HTMLInputElement>(null);
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
      const fd = new FormData();
      fd.append('merchant_id', formData.merchant_id);
      fd.append('name', formData.name);
      fd.append('description', formData.description);
      fd.append('sku', formData.sku);
      fd.append('category', formData.category);
      fd.append('subcategory', formData.subcategory);
      fd.append('stock_actual', formData.stock_actual);
      fd.append('precio_ars', formData.precio_ars);
      const file = createFileRef.current?.files?.[0];
      if (file) fd.append('image_file', file);
      await createProduct(fd);
      setFormData({ merchant_id: '', name: '', description: '', sku: '', category: '', subcategory: '', stock: '', stock_actual: '', precio_ars: '' });
      if (createFileRef.current) createFileRef.current.value = '';
      await fetchProducts();
    } catch (err) {
      console.error('Error creating product:', err);
      alert('Error al crear el producto. Revisá la consola.');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('merchant_id', formData.merchant_id);
      fd.append('name', formData.name);
      fd.append('description', formData.description);
      fd.append('sku', formData.sku);
      fd.append('category', formData.category);
      fd.append('subcategory', formData.subcategory);
      fd.append('stock_actual', formData.stock_actual);
      fd.append('precio_ars', formData.precio_ars);
      const file = editFileRef.current?.files?.[0];
      if (file) fd.append('image_file', file);
      await updateProduct(id, fd);
      setEditingId(null);
      if (editFileRef.current) editFileRef.current.value = '';
      await fetchProducts();
    } catch (err) {
      console.error('Error updating product:', err);
      alert('Error al guardar los cambios.');
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
                ref={createFileRef}
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
                          <input ref={editFileRef} type="file" name="image_file" accept="image/*" className="w-full px-3 py-2 border rounded" />
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
                          onClick={() => setViewingProduct(product)}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                        >
                          Ver
                        </button>
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

      {/* Product View Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="relative h-64 sm:h-80 bg-gray-100">
              {viewingProduct.image_url ? (
                <img 
                  src={viewingProduct.image_url} 
                  alt={viewingProduct.name} 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-5xl">📦</span>
                </div>
              )}
              <button 
                onClick={() => setViewingProduct(null)}
                className="absolute top-4 right-4 bg-white/80 backdrop-blur-md p-2 rounded-full shadow-lg hover:bg-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 bg-blue-100 text-blue-700">
                    {viewingProduct.merchants?.name || 'Comercio desconocido'}
                  </span>
                  <h2 className="text-3xl font-bold text-gray-900 leading-tight">
                    {viewingProduct.name}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-green-600">
                    ${viewingProduct.precio_ars || 0}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">PRECIO ARS</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Stock</p>
                  <p className="text-lg font-semibold text-gray-800">{viewingProduct.stock_actual ?? viewingProduct.stock ?? 0}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">SKU</p>
                  <p className="text-lg font-semibold text-gray-800">{viewingProduct.sku || '—'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Categoría</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{viewingProduct.category || '—'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Estado</p>
                  <p className={`text-sm font-semibold ${
                    viewingProduct.moderation_status === 'approved' ? 'text-green-600' : 
                    viewingProduct.moderation_status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {viewingProduct.moderation_status === 'approved' ? 'Aprobado' : 
                     viewingProduct.moderation_status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <p className="text-xs text-gray-500 uppercase font-bold mb-2">Descripción</p>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 min-h-[100px]">
                  <p className="text-gray-700 leading-relaxed italic">
                    {viewingProduct.description || 'Sin descripción disponible.'}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setViewingProduct(null)}
                  className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}