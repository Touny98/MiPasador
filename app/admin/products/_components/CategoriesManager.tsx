'use client';

import { useState, useEffect } from 'react';
import { fetchCategories, createCategory, deleteCategory } from '../actions';

export function CategoriesManager({ onUpdate }: { onUpdate?: () => void }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [parentId, setParentId] = useState<string>('');

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    const data = await fetchCategories();
    setCategories(data);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await createCategory(newName, parentId ? parseInt(parentId) : null);
      setNewName('');
      setParentId('');
      await loadCategories();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert('Error al crear categoría');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Seguro quieres eliminar esta categoría? (Se borrarán sus subcategorías)')) return;
    try {
      await deleteCategory(id);
      await loadCategories();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert('Error al eliminar');
    }
  }

  const mainCategories = categories.filter(c => !c.parent_id);

  if (loading) return <div className="text-sm text-gray-500">Cargando categorías...</div>;

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        📂 Gestión de Categorías
      </h2>

      <form onSubmit={handleCreate} className="mb-6 flex flex-wrap gap-4 items-end bg-gray-50 p-4 rounded-lg">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ej: Ropa de Invierno"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Es subcategoría de...</label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">(Categoría Principal)</option>
            {mainCategories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          ➕ Crear
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mainCategories.map(cat => (
          <div key={cat.id} className="border border-gray-100 rounded-lg p-4 hover:border-blue-100 transition-colors">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-gray-800">{cat.name}</span>
              <button
                onClick={() => handleDelete(cat.id)}
                className="text-gray-300 hover:text-red-500 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1 pl-4 border-l-2 border-gray-50">
              {categories
                .filter(sub => sub.parent_id === cat.id)
                .map(sub => (
                  <div key={sub.id} className="flex justify-between items-center text-sm text-gray-600">
                    <span>{sub.name}</span>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="text-gray-300 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
