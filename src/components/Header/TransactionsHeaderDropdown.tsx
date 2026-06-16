import Link from "next/link";
import React from "react";

export default function TransactionsHeaderDropdown() {
  return (
    <div className="relative group">
      <button className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 py-2 transition-colors focus:outline-none">
        Mis transacciones
        {/* Flecha que rota al hacer hover */}
        <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform duration-200 group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Contenedor del menú desplegable */}
      <div className="absolute top-full right-[-20px] sm:right-auto sm:left-0 pt-2 w-48 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col p-1.5">
          
          <Link href="/payments" className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            Pagos
          </Link>
          
          <Link href="/disbursements" className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
            Liquidaciones
          </Link>
          
          <Link href="/refunds" className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-600"></span>
            Reembolsos
          </Link>
          
        </div>
      </div>
    </div>
  );
}