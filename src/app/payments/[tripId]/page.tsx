// src/app/payments/[tripId]/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getPaymentsUserId } from "@/db/queries/users";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { client } from "@/app/lib/mercadoPago";
import { getPaymentsUser } from "@/app/lib/auth";
import MercadoPagoButton from "@/components/MercadoPagoButton";
import { TransactionStatus } from "@/types/transaction";
import TransactionDetailsCard from "@/components/TransactionDetailsCard";
import Link from "next/dist/client/link";


interface PageProps {
    params: Promise<{ tripId: string }>;
}

export default async function TripPaymentPage({ params }: PageProps) {
    const { tripId } = await params;

    // If userId is not found, show a message (CHANGE IT LATER TO A NICE 404 PAGE)
    const internalUser = await getPaymentsUser(`/payments/${tripId}`);
    if (!internalUser) throw new Error("Error obteniendo el usuario interno");


    const payment = await db.query.payments.findFirst({
        where: and(
            eq(payments.trip_id, tripId),
            eq(payments.id_user, internalUser.id_user)
        ),
    });

    // If transaction is not found, show a message (CHANGE IT LATER TO A NICE 404 PAGE)
    if (!payment) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <p className="text-xl text-slate-600 font-semibold">No se encontró una transacción para este viaje.</p>
            </div>
        );
    }

    // Pay via Mercado Pago if the payment is pending
    if (payment.status === "PENDING") {
        let preferenceId: string;
        
        try {
            const preference = new Preference(client);
            
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL as string;

            console.log("URL DE NOTIFICACION:", baseUrl);

            const result = await preference.create({
                body: {
                    notification_url: `${baseUrl}/api/webhook/mercadopago`, 
                    items: [
                        {
                            id: payment.trip_id,
                            title: `Viaje TowIt #${payment.trip_id}`,
                            quantity: 1,
                            unit_price: Number(payment.amount),
                            currency_id: "ARS", // Ajustar según tu país
                        }
                    ],
                    external_reference: payment.transaction_id,
                    back_urls: {
                        // A dónde vuelve el usuario tras pagar (vuelve a esta misma página)
                        success: `${baseUrl}/payments/${payment.trip_id}`,
                        failure: `${baseUrl}/payments/${payment.trip_id}`,
                        pending: `${baseUrl}/payments/${payment.trip_id}`,
                    },
                    auto_return: "approved",
                }
            });

            if (!result.id) return(
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <p className="text-xl text-slate-600 font-semibold">MercadoPago did not return a preference ID</p>
                </div>
            );
            preferenceId = result.id;

        } catch (error) {
            console.error("Error creando preferencia en Mercado Pago:", error);
            return <div>Error al conectar con la pasarela de pagos.</div>;
        }
        
        return (
            <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-md w-full text-center">
                    <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Finalizar Pago</h1>
                    <p className="text-sm text-slate-500 mb-6">Viaje de auditoría correspondiente al identificador #{payment.trip_id}</p>
                    
                    <div className="bg-slate-50 rounded-2xl p-5 mb-8 flex justify-between items-center border border-slate-100">
                        <span className="text-slate-500 text-sm font-medium">Monto del servicio:</span>
                        <span className="text-2xl font-black text-slate-900">${payment.amount}</span>
                    </div>

                    {/* El botón embebido de Mercado Pago */}
                    <div className="w-full min-h-[48px]">
                        <MercadoPagoButton 
                            preferenceId={preferenceId} 
                            publicKey={process.env.MP_PUBLIC_KEY as string} 
                            />
                    </div>
                </div>
            </div>
        );
    }else {
        return (
            <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col items-center justify-center p-4 gap-6">
                
                <div className="text-center space-y-2 mt-4 sm:mt-0">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        Resumen de Transacción
                    </h1>
                    <p className="text-slate-500 text-sm max-w-md mx-auto">
                        Aquí podés verificar el estado actual y los registros analíticos detallados del cobro correspondiente a este viaje.
                    </p>
                </div>

                <div className="w-full max-w-2xl">
                    <TransactionDetailsCard 
                        type="PAYMENT" 
                        {...payment} 
                        status={payment.status as TransactionStatus} 
                    />
                </div>

                <div className="flex justify-center w-full max-w-2xl mt-2 mb-8">
                    <Link 
                        href="/payments" 
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl shadow-sm hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all text-center text-sm w-full sm:w-auto min-w-[200px]"
                    >
                        Volver a mis pagos
                    </Link>
                </div>
            </div>
        );
    }
}