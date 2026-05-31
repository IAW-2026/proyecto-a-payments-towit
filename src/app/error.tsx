'use client'; // Obligatorio para Error Boundaries en Next.js

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Aquí puedes registrar el error en un servicio externo como Sentry
    console.error('[TowIt Error Boundary]:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 py-12">
      <div className="max-w-md w-full bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center">
        {/* Ícono de advertencia sutil */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 mb-6">
          <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-3">
          Algo no salió como esperábamos
        </h2>
        <p className="text-sm text-gray-500 mb-8">
          Ha ocurrido un error inesperado al procesar tu solicitud. El equipo técnico ha sido notificado automáticamente.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full rounded-md bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black transition-colors"
          >
            Intentar nuevamente
          </button>
          
          <Link
            href="/"
            className="w-full rounded-md bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
          >
            Regresar al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}