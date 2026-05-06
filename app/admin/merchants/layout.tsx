"use client";

import { useState } from 'react';
import { MerchantsContent } from './_components/MerchantsContent';
import { PostulacionesComercioContent } from './_components/PostulacionesComercioContent';

export default function MerchantsLayout({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState('lista');

  const tabs = [
    { id: 'lista', label: 'Lista de Comercios', component: MerchantsContent },
    { id: 'postulaciones', label: 'Postulaciones', component: PostulacionesComercioContent },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gestión de Comercios</h1>

      <div className="flex border-b mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {(() => {
          const ActiveComponent = tabs.find(t => t.id === activeTab)?.component;
          return ActiveComponent ? <ActiveComponent /> : null;
        })()}
      </div>
    </div>
  );
}
