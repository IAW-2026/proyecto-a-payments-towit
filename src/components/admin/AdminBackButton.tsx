'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminBackButton() {
  const pathname = usePathname();

  if (pathname === "/admin" || pathname === "/admin/") {
    return null;
  }

  return (
    // 👇 Quitamos el sm:justify-start y agregamos w-full por seguridad
    <div className="pb-6 flex justify-center w-full">
      <Link 
        href="/admin" 
        className="group inline-flex items-center px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-full shadow-sm hover:text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200 hover:shadow transition-all duration-200"
      >
        <svg 
            className="w-5 h-5 mr-2 text-slate-400 group-hover:text-indigo-600 transition-colors" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver al Panel Principal
      </Link>
    </div>
  );
}