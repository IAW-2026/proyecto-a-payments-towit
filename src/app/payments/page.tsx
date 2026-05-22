import React from "react";
import Link from "next/link";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getPaymentsUser } from "@/app/lib/auth";
import TransactionCard from "@/components/TransactionCard";

export const dynamic = "force-dynamic";

const ITEMS_PER_PAGE = 5;

// Definición de tipos para Next.js 16
type SearchParams = Promise<{ page?: string }>;

interface DashboardProps {
  searchParams: SearchParams;
}

export default async function PaymentsPage({ searchParams }: DashboardProps) {
  // 1. Esperamos los parámetros de la URL y calculamos la página actual
  const resolvedParams = await searchParams;
  const currentPage = Math.max(1, Number(resolvedParams.page) || 1);
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  // 2. Obtenemos el ID del usuario autenticado de forma segura
  const paymentsUser = await getPaymentsUser();

  // 3. Consultamos a Neon trayendo 5 elementos + 1 extra para verificar si hay una página siguiente
  const userPayments = await db.query.payments.findMany({
    where: eq(payments.id_user, paymentsUser.id_user),
    orderBy: [desc(payments.created_at)],
    limit: ITEMS_PER_PAGE + 1, 
    offset: offset,
  });

  // Verificamos si existe una página posterior evaluando el elemento extra
  const hasNextPage = userPayments.length > ITEMS_PER_PAGE;
  
  // Recortamos el array para quedarnos únicamente con los 5 correspondientes a la página actual
  const displayPayments = userPayments.slice(0, ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      
      {/* ENCABEZADO MINIMALISTA */}
      <div className="bg-white border-b border-slate-200 py-8 mb-10">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 mb-3">
            Panel de Control
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            Mis Pagos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Historial de cobros y liquidaciones filtrados cronológicamente.
          </p>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <main className="container mx-auto px-4 max-w-4xl">
        <div className="w-full flex flex-col items-center gap-6">
          
          {/* LISTADO DE TARJETA COMO BOTONES */}
          <div className="w-full flex flex-col items-center gap-6">
            {displayPayments.map((tx) => (
              <Link
                href={`/payments/${tx.trip_id}`}
                key={tx.trip_id}
                className="w-full flex justify-center group focus:outline-none"
              >
                {/* Agregamos efectos interactivos sobre la tarjeta:
                  - shadow-md por defecto y shadow-xl al pasar el mouse.
                  - Un sutil escalado táctil para smartphones (active:scale-[0.99]).
                */}
                <div className="w-full transition-all duration-200 hover:-translate-y-1 active:scale-[0.99] group-hover:shadow-xl rounded-2xl">
                  <TransactionCard
                    tripId={tx.trip_id || "S/D"}
                    entityName={paymentsUser.fullName} // Metadata de presentación
                    amount={tx.amount}
                    status={tx.status || "PENDING"}
                    type={ "PAYMENT" }
                  />
                </div>
              </Link>
            ))}
          </div>

          {/* ESTADO VACÍO */}
          {displayPayments.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed w-full">
              <p className="text-slate-500 font-medium">No se encontraron transacciones en esta página.</p>
              {currentPage > 1 && (
                <Link href="/payments?page=1" className="text-blue-600 text-sm font-semibold hover:underline mt-2 inline-block">
                  Volver a la página 1
                </Link>
              )}
            </div>
          )}

          {/* CONTROLES DE PAGINACIÓN RESPONSIVOS */}
          {userPayments.length > 0 && (
            <div className="w-full flex items-center justify-between border-t border-slate-200 pt-6 mt-4">
              
              {/* Botón Anterior */}
              {currentPage > 1 ? (
                <Link
                  href={`/payments?page=${currentPage - 1}`}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
                >
                  <svg className="w-5 h-5 mr-2 -ml-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Anterior
                </Link>
              ) : (
                <div className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-300 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed select-none">
                  <svg className="w-5 h-5 mr-2 -ml-1 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Anterior
                </div>
              )}

              {/* Indicador de Página Central */}
              <span className="text-sm font-semibold text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm">
                Página {currentPage}
              </span>

              {/* Botón Siguiente */}
              {hasNextPage ? (
                <Link
                  href={`/payments?page=${currentPage + 1}`}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
                >
                  Siguiente
                  <svg className="w-5 h-5 ml-2 -mr-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              ) : (
                <div className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-300 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed select-none">
                  Siguiente
                  <svg className="w-5 h-5 ml-2 -mr-1 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              )}

            </div>
          )}

        </div>
      </main>
    </div>
  );
}