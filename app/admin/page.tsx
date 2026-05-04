'use client';

import { supabase } from '@/lib/utils/supabase/client';
import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalQueries: 0,
    resolvedQueries: 0,
    pendingGaps: 0,
    resolutionRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Total queries
      const { count: totalQueries, error: totalError } = await supabase
        .from('queries')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // Resolved queries (resolved_bool = true)
      const { count: resolvedQueries, error: resolvedError } = await supabase
        .from('queries')
        .select('*', { count: 'exact', head: true })
        .eq('resolved_bool', true);

      if (resolvedError) throw resolvedError;

      const total = totalQueries ?? 0;
      const resolved = resolvedQueries ?? 0;
      const pendingGaps = total - resolved;
      const resolutionRate = total > 0 ? Math.round(resolved / total * 100) : 0;

      setStats({
        totalQueries: totalQueries || 0,
        resolvedQueries: resolvedQueries || 0,
        pendingGaps,
        resolutionRate
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full border-4 border-b-4 border-blue-500 w-12 h-12"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Consultas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-700">Total de Consultas</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.totalQueries}</p>
            </div>
            <div className="text-indigo-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m2 0a2 2 0 110-4 2 2 0 010 4zm-6 0a2 2 0 100-4 2 2 0 000 4zM3 9h18"></path>
              </svg>
            </div>
          </div>
        </div>

        {/* Consultas Resueltas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-700">Consultas Resueltas</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.resolvedQueries}</p>
            </div>
            <div className="text-green-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 001.946.806 3.42 3.42 0 001.946.806 3.42 3.42 0 001.946.806 3.42 3.42 0 001.946.806 3.42 3.42 0 001.946.806 3.42 3.42 0 001.946.806M3 9l9 9"></path>
              </svg>
            </div>
          </div>
        </div>

        {/* Gaps Pendientes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-700">Gaps Pendientes</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingGaps}</p>
            </div>
            <div className="text-yellow-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>

        {/* Tasa de Resolución */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-700">Tasa de Resolución</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.resolutionRate}%</p>
            </div>
            <div className="text-blue-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2zm0 10c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2zm0-6c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Accesos Rápidos</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <a href="/admin/merchants" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Gestión de Comercios</h3>
            <p className="text-gray-600">Crear, editar y eliminar comercios</p>
          </a>
          <a href="/admin/products" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Gestión de Productos</h3>
            <p className="text-gray-600">Crear, editar y eliminar productos</p>
          </a>
          <a href="/admin/gaps" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Gaps Pendientes</h3>
            <p className="text-gray-600">Ver y marcar consultas como resueltas</p>
          </a>
        </div>
      </div>
    </div>
  );
}