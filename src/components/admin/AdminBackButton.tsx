'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminBackButton() {
  const pathname = usePathname();

  if (pathname === "/admin" || pathname === "/admin/") {
    return null;
  }

  return (
    // 👇 MAGIA RESPONSIVE: 
    // flex justify-center (Lo centra en móviles)
    // sm:justify-start (Lo devuelve a la izquierda a partir de tablets/escritorio)
    <div className="mb-6 flex justify-center sm:justify-start">
      <Link 
        href="/admin" 
        className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <svg className="w-5 h-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver al Panel Principal
      </Link>
    </div>
  );
}