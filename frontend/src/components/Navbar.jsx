import React from 'react';
import { LogOut, User, Store } from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-lg px-4 sm:px-6 py-3.5 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-indigo-600"><Store className="w-5 h-5" /></div>
        <div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight">SmartInventory</h1>
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Billing & Stock</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden sm:flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-2 rounded-full text-sm">
          <User className="w-4 h-4 text-indigo-300" />
          <span className="font-medium">{user?.name || 'Admin'}</span>
          <span className="text-[10px] uppercase text-slate-400">{user?.role}</span>
        </div>
        <button onClick={onLogout} className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition">
          <LogOut className="w-4 h-4" /><span>Logout</span>
        </button>
      </div>
    </header>
  );
}
