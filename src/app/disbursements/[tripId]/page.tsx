// src/app/disbursements/[tripId]/page.tsx
import { db } from "@/db";
import { disbursements } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getPaymentsUser } from "@/app/lib/auth";
import { TransactionStatus } from "@/types/transaction";
import TransactionDetailsCard from "@/components/TransactionDetailsCard";
import Link from "next/link";

interface PageProps {
    params: Promise<{ tripId: string }>;
}

export default async function DisbursementDetailPage({ params }: PageProps) {
    const { tripId } = await params;

    // 1. Autenticación y obtención del usuario interno
    const internalUser = await getPaymentsUser(`/disbursements/${tripId}`);
    if (!internalUser) throw new Error("Error obteniendo el usuario interno");

    // 2. Consulta a la tabla de liquidaciones (Disbursements)
    const disbursementData = await db.query.disbursements.findFirst({
        where: and(
            eq(disbursements.trip_id, tripId),
            eq(disbursements.id_user, internalUser.id_user)
        ),
    });

    if (!disbursementData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <p className="text-xl text-slate-600 font-semibold">
                    No se encontró una liquidación registrada para este viaje.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col items-center justify-center p-4 gap-6">
            
            <div className="text-center space-y-2 mt-4 sm:mt-0">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    Resumen de Liquidación
                </h1>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                    Acá podés verificar el estado de la transacción de fondos salientes y las comisiones de plataforma aplicadas.
                </p>
            </div>

            {/* Inyección Limpia de Datos mediante Spread Operator */}
            <div className="w-full max-w-2xl">
                <TransactionDetailsCard 
                    type="DISBURSEMENT" 
                    {...disbursementData} 
                    status={disbursementData.status as TransactionStatus} 
                />
            </div>

            {/* Navegación Optimizada del lado del Cliente (Next.js Link) */}
            <div className="flex justify-center w-full max-w-2xl mt-2 mb-8">
                <Link 
                    href="/disbursements" 
                    className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl shadow-sm hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all text-center text-sm w-full sm:w-auto min-w-[200px]"
                >
                    Volver a mis liquidaciones
                </Link>
            </div>
        </div>
    );
}