import Link from "next/link";
import React from "react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-base font-semibold text-indigo-600 uppercase tracking-wide">Error 404</p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          Página no encontrada
        </h1>
        <p className="mt-6 text-lg leading-7 text-gray-600">
          Lo sentimos, no pudimos encontrar la página que estás buscando. Es posible que el enlace sea incorrecto o que la ruta haya sido eliminada de TowIt Payments.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/"
            className="rounded-md bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
          >
            Volver al inicio
          </Link>
          <Link href="mailto:gschnaiderm@gmail.com?subject=Soporte%20TowIt%20Payments" className="text-sm font-semibold text-gray-900 hover:text-gray-600 transition-colors">
            Contactar soporte <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}