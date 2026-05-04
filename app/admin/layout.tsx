import Link from 'next/link';

const navLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/merchants', label: 'Comercios' },
  { href: '/admin/products', label: 'Productos' },
  { href: '/admin/gaps', label: 'Gaps' },
  { href: '/admin/reservations', label: 'Reservas' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
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
