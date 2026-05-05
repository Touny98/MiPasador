"use client";

import Link from 'next/link';
import { useState } from 'react';

const navLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/merchants', label: 'Comercios' },
  { href: '/admin/products', label: 'Productos' },
  { href: '/admin/gaps', label: 'Gaps' },
  { href: '/admin/reservations', label: 'Reservas' },
  { href: '/admin/pasadores', label: 'Pasadores' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile sidebar button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden p-4 bg-gray-900 text-white rounded-b lg:hidden"
      >
        {/* Hamburger icon */}
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`w-56 bg-gray-900 text-white flex flex-col ${isSidebarOpen ? 'block' : 'hidden'} md:block`}
      >
        <div className="px-6 py-5 border-b border-gray-700">
          <span className="text-lg font-bold">Mi Pasador</span>
          <span className="block text-xs text-gray-400 mt-0.5">Admin</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 bg-gray-50 overflow-auto">{children}</main>
    </div>
  );
}
