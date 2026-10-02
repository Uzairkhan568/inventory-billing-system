import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, FileText, Settings, Store } from 'lucide-react';

const items = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Inventory', path: '/inventory', icon: Package, adminOnly: true },
  { name: 'New Bill', path: '/billing', icon: ShoppingCart },
  { name: 'Sales', path: '/sales', icon: FileText },
  { name: 'Settings', path: '/settings', icon: Settings, adminOnly: true }
];

export default function Sidebar({ user }) {
  const visibleItems = items.filter(item => !item.adminOnly || user?.role === 'admin');

  return (
    <>
      <aside className="hidden md:flex w-60 shrink-0 bg-white border-r border-slate-200 min-h-[calc(100vh-65px)] p-4 flex-col">
        <div className="mb-5 p-3 rounded-2xl bg-indigo-50 border border-indigo-100">
          <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm"><Store className="w-4 h-4" /> Retail Workspace</div>
          <p className="text-xs text-slate-500 mt-1 capitalize">Signed in as {user?.role || 'user'}</p>
        </div>
        <nav className="space-y-1.5">
          {visibleItems.map(({ name, path, icon: Icon }) => (
            <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => `flex items-center gap-3 px-3.5 py-3 rounded-xl transition font-medium text-sm ${isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Icon className="w-5 h-5" /> <span>{name}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <nav className="md:hidden sticky top-[65px] z-20 w-full overflow-x-auto bg-white border-b border-slate-200 flex p-2 gap-2">
        {visibleItems.map(({ name, path, icon: Icon }) => (
          <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => `shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            <Icon className="w-4 h-4" /> {name}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
