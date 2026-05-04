'use client';

import { supabase } from '@/lib/utils/supabase/client';
import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalQueries: 0,
    resolvedQueries: 0,
    pendingGaps: 0,
    resolutionRate: 0,
    queriesPerDay: [0, 0, 0, 0, 0, 0, 0], // Last 7 days
    topSearchedKeywords: [] as string[],
    topMerchants: [] as string[], // Will need to fetch merchant names separately
    conversionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [merchantNames, setMerchantNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchStats();
    fetchMerchantNames();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/admin/metrics');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      setStats({
        totalQueries: data.totalQueries,
        resolvedQueries: data.resolvedQueries,
        pendingGaps: data.pendingGaps,
        resolutionRate: data.resolutionRate,
        queriesPerDay: data.queriesPerDay,
        topSearchedKeywords: data.topSearchedKeywords,
        topMerchants: data.topMerchants,
        conversionRate: data.conversionRate
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMerchantNames = async () => {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('id, name');

      if (error) throw error;

      const namesMap: Record<string, string> = {};
      data?.forEach((merchant: any) => {
        namesMap[merchant.id] = merchant.name;
      });
      setMerchantNames(namesMap);
    } catch (error) {
      console.error('Error fetching merchant names:', error);
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

  // Format dates for labels (last 7 days)
  const getDateLabels = () => {
    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    }
    return labels;
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 001.946.806 3.42 3.42 0 001.946.806 3.42 3.42 0 001.946.806 3.42 3.42 0 001.946.806M3 9l9 9"></path>
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

        {/* Consultas por Día (Últimos 7 días) */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-700">Consultas por Día</h3>
              <p className="text-sm font-medium text-gray-500">Últimos 7 días</p>
            </div>
          </div>
          <div className="h-36">
            {/* Simple bar chart using divs */}
            <div className="h-full flex items-end gap-1">
              {stats.queriesPerDay.map((count, index) => {
                const maxVal = Math.max(...stats.queriesPerDay, 1);
                const heightPct = Math.round(Math.min((count / maxVal) * 100, 100));
                return (
                  <div key={index} className="flex-1 flex flex-col justify-end relative h-full">
                    {count > 0 && (
                      <span className="text-center text-xs text-blue-700 mb-0.5">{count}</span>
                    )}
                    <div
                      className="bg-blue-500 w-full rounded-t"
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                    ></div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              {getDateLabels().map((label, index) => (
                <span key={index}>{label}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Top 5 Palabras Más Buscadas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-700">Top 5 Palabras Buscadas</h3>
              <p className="text-sm font-medium text-gray-500">Desde búsquedas recientes</p>
            </div>
          </div>
          <div className="space-y-2">
            {stats.topSearchedKeywords.map((keyword, index) => (
              <div key={index} className="flex justify-between px-3 py-2 bg-gray-50 rounded">
                <span className="font-medium">{keyword}</span>
                <span className="text-gray-600">#{index + 1}</span>
              </div>
            ))}
            {stats.topSearchedKeywords.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No hay datos suficientes
              </div>
            )}
          </div>
        </div>

        {/* Top 5 Comercios con Más Resultados Mostrados */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-700">Top Comercios</h3>
              <p className="text-sm font-medium text-gray-500">Por resultados mostrados</p>
            </div>
          </div>
          <div className="space-y-2">
            {stats.topMerchants.map((merchantId, index) => (
              <div key={index} className="flex justify-between px-3 py-2 bg-gray-50 rounded">
                <span className="font-medium">
                  {merchantNames[merchantId] || merchantId}
                </span>
                <span className="text-gray-600">#{index + 1}</span>
              </div>
            ))}
            {stats.topMerchants.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No hay datos suficientes
              </div>
            )}
          </div>
        </div>

        {/* Tasa de Conversión: Consultas que terminaron en reserva */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-700">Tasa de Conversión</h3>
              <p className="text-sm font-medium text-gray-500">Consultas → Reservas</p>
            </div>
            <div className="text-purple-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 001.946.806 3.42 3.42 0 001.946.806 3.42 3.42 0 001.946.806 3.42 3.42 0 001.946.806 3.42 3.42 0 001.946.806M3 9l9 9"></path>
              </svg>
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-bold text-gray-900">{stats.conversionRate}%</p>
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