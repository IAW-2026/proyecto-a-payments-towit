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
        //Payment data dump, later replace it with a component.
        const statusColors: Record<string, string> = {
            COMPLETED: "bg-green-100 text-green-800 border-green-200",
            FAILED: "bg-red-100 text-red-800 border-red-200",
            REFUNDED: "bg-orange-100 text-orange-800 border-orange-200",
        };
        const statusStyle = statusColors[payment.status] || "bg-slate-100 text-slate-800 border-slate-200";

        return (
            <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-xl w-full">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">Detalles de la Transacción</h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${statusStyle}`}>
                            {payment.status}
                        </span>
                    </div>

                    <div className="space-y-4 text-sm">
                        {/* Bloque de IDs */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                            <div className="flex flex-col">
                                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Transaction ID (Interno)</span>
                                <span className="font-mono text-slate-900 break-all">{payment.transaction_id}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">ID de Mercado Pago</span>
                                <span className="font-mono text-slate-900">{payment.external_id || "No registrado"}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Trip ID</span>
                                <span className="font-mono text-slate-900">{payment.trip_id}</span>
                            </div>
                        </div>

                        {/* Bloque Financiero */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                            <span className="text-slate-500 font-semibold uppercase tracking-wider text-xs">Monto Total</span>
                            <span className="text-xl font-black text-slate-900">${payment.amount}</span>
                        </div>

                        {/* Bloque de Tiempos */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="block text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Creado el</span>
                                <span className="text-slate-900">{payment.created_at?.toLocaleString('es-AR')}</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="block text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Última act.</span>
                                <span className="text-slate-900">{payment.updated_at?.toLocaleString('es-AR')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}