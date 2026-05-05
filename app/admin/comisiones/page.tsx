import { supabaseAdmin } from '@/lib/utils/supabase/admin';
import { useState, useEffect } from 'react';

export default function ComisionesPage() {
  const [comisiones, setComisiones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPasador, setFilterPasador] = useState(''); // search by pasador name or dni

  useEffect(() => {
    fetchComisiones();
  }, [filterPasador]);

  async function fetchComisiones() {
    setLoading(true);
    let query = supabaseAdmin
      .from('comisiones')
      .select(`
        id,
        fecha,
        total_viajes,
        monto_comision,
        link_pago,
        pasadores!comisiones_pasador_id_fkey(nombre_completo, dni)
      `)
      .order('fecha', { ascending: false });

    if (filterPasador) {
      query = query.or(
        `pasadores.nombre_completo.ilike.%${filterPasador}%,pasadores.dni.ilike.%${filterPasador}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching comisiones:', error);
    } else {
      // Process data to flatten the pasador relation
      const processed = (data || []).map((c) => ({
        id: c.id,
        fecha: c.fecha ? new Date(c.fecha).toLocaleDateString() : '---',
        total_viajes: c.total_viajes || 0,
        monto: c.monto_comision || 0,
        link_pago: c.link_pago || '',
        pasador: c.pasadores?.nombre_completo || '---',
        dni: c.pasadores?.dni || '---',
      }));
      setComisiones(processed);
    }

    setLoading(false);
  }

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Comisiones de Pasadores</h1>

      <div className="mb-4">
        <input
          type="text"
          value={filterPasador}
          onChange={(e) => setFilterPasador(e.target.value)}
          placeholder="Buscar pasador por nombre o DNI..."
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>

      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-4 text-left">Pasador</th>
            <th className="p-4 text-left">DNI</th>
            <th className="p-4 text-center">Fecha</th>
            <th className="p-4 text-center">Total Viajes</th>
            <th className="p-4 text-center">Monto Comisión (ARS)</th>
            <th className="p-4 text-center">Link de Pago</th>
          </tr>
        </thead>
        <tbody>
          {comisiones.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-4">{c.pasador}</td>
              <td className="p-4">{c.dni}</td>
              <td className="p-4 text-center">{c.fecha}</td>
              <td className="p-4 text-center">{c.total_viajes}</td>
              <td className="p-4 text-center">${c.monto.toFixed(2)}</td>
              <td className="p-4 text-center">
                {c.link_pago ? (
                  <a
                    href={c.link_pago}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline"
                  >
                    Ver pago
                  </a>
                ) : (
                  <span className="text-gray-500">Sin link</span>
                )}
              </td>
            </tr>
          ))}
          {comisiones.length === 0 && (
            <tr>
              <td colSpan={6} className="p-4 text-center text-gray-500">
                No hay comisiones
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}