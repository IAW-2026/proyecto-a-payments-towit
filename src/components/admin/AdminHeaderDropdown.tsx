import Link from "next/link";
import React from "react";

// Este código SOLO se ejecuta en el servidor. Nunca se envía el JS al cliente.
export default function AdminMenu() {
  return (
    <div className="relative group">
      <button className="flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:text-indigo-900 py-2 transition-colors focus:outline-none">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Admin
        <svg className="w-4 h-4 text-indigo-400 group-hover:text-indigo-700 transition-transform duration-200 group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className="absolute top-full right-[-20px] sm:right-auto sm:left-0 pt-2 w-52 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0">
        <div className="bg-white border border-indigo-100 rounded-2xl shadow-xl shadow-indigo-200/40 overflow-hidden flex flex-col p-1.5">
          <Link href="/admin/payments" className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Pagos Globales
          </Link>
          <Link href="/admin/disbursements" className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Liq. Globales
          </Link>
          <Link href="/admin/refunds" className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Reemb. Globales
          </Link>
          <div className="h-px bg-slate-100 my-1 mx-2"></div>
          <Link href="/admin/users" className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-all flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Gestión Usuarios
          </Link>
        </div>
      </div>
    </div>
  );
}