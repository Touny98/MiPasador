"use client";

import { useState } from 'react';
import { PostulacionesContent } from './_components/PostulacionesContent';
import { PasadoresContent } from './_components/PasadoresContent';
import { ViajesContent } from './_components/ViajesContent';
import { ComisionesContent } from './_components/ComisionesContent';
import { TarifasContent } from './_components/TarifasContent';
import { ReputacionContent } from './_components/ReputacionContent';

export default function PasadoresLayout({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState('lista');

  const tabs = [
    { id: 'lista', label: 'Lista de Pasadores', component: PasadoresContent },
    { id: 'viajes', label: 'Viajes', component: ViajesContent },
    { id: 'comisiones', label: 'Comisiones', component: ComisionesContent },
    { id: 'postulaciones', label: 'Postulaciones', component: PostulacionesContent },
    { id: 'tarifas', label: 'Tarifas', component: TarifasContent },
    { id: 'reputacion', label: 'Reputación', component: ReputacionContent },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gestión de Pasadores</h1>

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