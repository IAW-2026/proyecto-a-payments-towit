// src/app/refunds/[tripId]/page.tsx
import { db } from "@/db";
import { refunds } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ReadCookieUserInformation } from "@/app/lib/auth";
import { TransactionStatus } from "@/types/transaction";
import TransactionDetailsCard from "@/components/TransactionDetailsCard";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
    params: Promise<{ tripId: string }>;
}

export default async function RefundDetailPage({ params }: PageProps) {
    const { tripId } = await params;

    const internalUser = await ReadCookieUserInformation(`/refunds/${tripId}`);
    if (!internalUser) throw new Error("Error obteniendo el usuario interno");

    const refundData = await db.query.refunds.findFirst({
        where: and(
            eq(refunds.trip_id, tripId),
            eq(refunds.id_user, internalUser.id_user)
        ),
    });

    if (!refundData) {
        notFound();
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col items-center justify-center p-4 gap-6">
            
            <div className="text-center space-y-2 mt-4 sm:mt-0">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    Resumen de Reintegro
                </h1>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                    Acá podés auditar el estado del reembolso de dinero y si corresponde a una devolución parcial o total.
                </p>
            </div>

            <div className="w-full max-w-2xl">
                <TransactionDetailsCard 
                    type="REFUND" 
                    {...refundData} 
                    status={refundData.status as TransactionStatus} 
                />
            </div>

            <div className="flex justify-center w-full max-w-2xl mt-2 mb-8">
                <Link 
                    href="/refunds" 
                    className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl shadow-sm hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all text-center text-sm w-full sm:w-auto min-w-[200px]"
                >
                    Volver a mis reembolsos
                </Link>
            </div>
        </div>
    );
}