"use client";

import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { useState, useEffect } from 'react';

export function TarifasContent() {
  const [tarifas, setTarifas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    ruta: '',
    peso_min: null,
    peso_max: null,
    precio_ars: null,
    activa: true,
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [rutasPredefinidas, setRutasPredefinidas] = useState<string[]>([]);

  useEffect(() => {
    fetchTarifas();
    // We'll hardcode some predefined routes for now
    setRutasPredefinidas([
      'Centro - Aeropuerto',
      'Centro - Terminal de Ómnibus',
      'Aeropuerto - Terminal de Ómnibus',
      'Zona Norte - Zona Sur',
      'Zona Este - Zona Oeste',
    ]);
  }, []);

  async function fetchTarifas() {
    setLoading(true);
    const { data, error } = await supabaseAdmin
      .from('tarifas_pasador')
      .select('*')
      .order('ruta');

    if (error) {
      console.error('Error fetching tarifas:', error);
    } else {
      setTarifas(data || []);
    }

    setLoading(false);
  }

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : false;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : type === 'number'
          ? (value === '' ? null : parseFloat(value))
          : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { ruta, peso_min, peso_max, precio_ars, activa } = form;

    if (!ruta || peso_min === null || peso_max === null || precio_ars === null) {
      alert('Por favor, complete todos los campos');
      return;
    }

    if (editId) {
      // Update
      const { error } = await supabaseAdmin
        .from('tarifas_pasador')
        .update({ ruta, peso_min, peso_max, precio_ars, activa })
        .eq('id', editId);

      if (error) {
        console.error('Error updating tarifa:', error);
      } else {
        setEditId(null);
        setForm({
          ruta: '',
          peso_min: null,
          peso_max: null,
          precio_ars: null,
          activa: true,
        });
      }
    } else {
      // Insert
      const { error } = await supabaseAdmin
        .from('tarifas_pasador')
        .insert({ ruta, peso_min, peso_max, precio_ars, activa });

      if (error) {
        console.error('Error inserting tarifa:', error);
      } else {
        setForm({
          ruta: '',
          peso_min: null,
          peso_max: null,
          precio_ars: null,
          activa: true,
        });
      }
    }

    await fetchTarifas();
  }

  function handleEdit(tarifa: any) {
    setEditId(tarifa.id);
    setForm({
      ruta: tarifa.ruta,
      peso_min: tarifa.peso_min,
      peso_max: tarifa.peso_max,
      precio_ars: tarifa.precio_ars,
      activa: tarifa.activa,
    });
  }

  async function handleDelete(id: number) {
    if (!window.confirm('¿Está seguro de eliminar esta tarifa?')) return;

    const { error } = await supabaseAdmin
      .from('tarifas_pasador')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting tarifa:', error);
    } else {
      await fetchTarifas();
    }
  }

  function handleCancelEdit() {
    setEditId(null);
    setForm({
      ruta: '',
      peso_min: null,
      peso_max: null,
      precio_ars: null,
      activa: true,
    });
  }

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Gestión de Tarifas</h1>

      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">
          {editId ? 'Editar Tarifa' : 'Nueva Tarifa'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Ruta:</label>
            <select
              name="ruta"
              value={form.ruta}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="">Seleccione una ruta</option>
              {rutasPredefinidas.map((ruta) => (
                <option key={ruta} value={ruta}>
                  {ruta}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Peso mínimo (kg):
              </label>
              <input
                type="number"
                name="peso_min"
                value={form.peso_min ?? ''}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded"
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Peso máximo (kg):
              </label>
              <input
                type="number"
                name="peso_max"
                value={form.peso_max ?? ''}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded"
                min="0"
                step="0.1"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Precio (ARS):
            </label>
            <input
              type="number"
              name="precio_ars"
              value={form.precio_ars ?? ''}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded"
              min="0"
              step="0.01"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              name="activa"
              checked={form.activa}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600"
            />
            <label className="ml-2 text-sm font-medium">Activa</label>
          </div>
        </form>
        {editId ? (
          <button
            type="button"
            onClick={handleCancelEdit}
            className="mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded"
          >
            Cancelar edición
          </button>
        ) : null}
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Tarifas Existentes</h2>
      </div>

      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-4 text-left">Ruta</th>
            <th className="p-4 text-center">Peso Min</th>
            <th className="p-4 text-center">Peso Max</th>
            <th className="p-4 text-center">Precio (ARS)</th>
            <th className="p-4 text-center">Activa</th>
            <th className="p-4 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {tarifas.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="p-4">{t.ruta}</td>
              <td className="p-4 text-center">{t.peso_min}</td>
              <td className="p-4 text-center">{t.peso_max}</td>
              <td className="p-4 text-center">${t.precio_ars.toFixed(2)}</td>
              <td className="p-4 text-center">
                <span className={`px-2 py-1 rounded text-xs ${
                  t.activa ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
                >
                  {t.activa ? 'Sí' : 'No'}
                </span>
              </td>
              <td className="p-4 text-center space-x-2">
                <button
                  onClick={() => handleEdit(t)}
                  className="px-3 py-1 rounded text-sm bg-blue-500 text-white hover:bg-blue-600"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="px-3 py-1 rounded text-sm bg-red-500 text-white hover:bg-red-600"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
          {tarifas.length === 0 && (
            <tr>
              <td colSpan={6} className="p-4 text-center text-gray-500">
                No hay tarifas
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function TarifasPage() {
  return <TarifasContent />;
}