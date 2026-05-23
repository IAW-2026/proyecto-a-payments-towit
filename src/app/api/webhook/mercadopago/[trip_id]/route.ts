import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { client } from "@/app/lib/mercadoPago";

// Tipamos los parámetros dinámicos de la ruta de Next.js
interface WebhookParams {
    params: Promise<{ tripId: string }>;
}

interface MercadoPagoWebhookPayload {
    id: number;
    live_mode: boolean;
    type: string;
    date_created: string;
    user_id: number;
    api_version: string;
    action: string;
    data: {
        id: string;
    };
}

export async function POST(req: NextRequest, { params }: WebhookParams) {
    const { tripId } = await params;

    try {
        const body = (await req.json()) as MercadoPagoWebhookPayload;

        // ============================================================================
        // FASE 1: FILTROS DE EVENTO (Bouncer Pattern)
        // Rechazamos pacíficamente lo que no nos interesa sin gastar recursos.
        // Siempre devolvemos 200 OK para que MP no intente reenviarlo.
        // ============================================================================

        // Filtro A: ¿Es un evento de pago?
        if (body.type !== "payment") {
            console.log(`[Webhook MP] Ignorado: Evento recibido de tipo '${body.type}' para viaje ${tripId}`);
            return new NextResponse("Ignored: Not a payment event", { status: 200 });
        }

        // Filtro B: ¿Es una actualización? (Ignoramos 'payment.created')
        if (body.action !== "payment.updated") {
            console.log(`[Webhook MP] Ignorado: Evento de acción '${body.action}' para viaje ${tripId}`);
            return new NextResponse("Ignored: Not an update action", { status: 200 });
        }

        // Filtro C: ¿Viene el ID del pago en el payload?
        const mpPaymentId = body.data?.id;
        if (!mpPaymentId) {
            console.warn(`[Webhook MP] Payload malformado recibido para viaje ${tripId}`);
            return new NextResponse("Ignored: Missing payment ID", { status: 200 });
        }

        // ============================================================================
        // FASE 2: ZERO TRUST & AUDITORÍA DE SEGURIDAD
        // Jamás confiamos en el JSON recibido. Vamos a la fuente oficial.
        // ============================================================================

        const paymentClient = new Payment(client);
        let realPaymentData;

        try {
            // Vamos a MP a buscar la verdad absoluta
            realPaymentData = await paymentClient.get({ id: mpPaymentId });
        } catch (mpError) {
            // Si Mercado Pago tira error (ej: 404), el ID es un invento del atacante.
            console.warn(`[ESCUDO MP] Ataque bloqueado. ID de pago inexistente: ${mpPaymentId}`);
            // Silenciamos al atacante devolviendo 200 OK para que MP no intente re-enviar.
            return new NextResponse("OK: Handled", { status: 200 });
        }

        // Buscamos la transacción original en nuestra base de datos
        const dbTransaction = await db.query.payments.findFirst({
            where: eq(payments.trip_id, tripId)
        });

        // 🛡️ Barrera de Seguridad 1: Existencia
        if (!dbTransaction) {
            console.error(`[ALERTA MP] Intento de actualizar viaje inexistente: ${tripId}`);
            return new NextResponse("OK", { status: 200 });
        }

        // 🛡️ Barrera de Seguridad 2: Prevención de Inyección (Replay Attack)
        // Validamos que el pago en MP fue creado ESPECÍFICAMENTE para esta transacción
        if (realPaymentData.external_reference !== dbTransaction.transaction_id) {
            console.error(`[CRÍTICO MP] Inyección detectada. Viaje: ${tripId} | MP ID: ${mpPaymentId}`);
            return new NextResponse("OK", { status: 200 }); 
        }

        // 🛡️ Barrera de Seguridad 3: Integridad de Montos
        // Previene que alteren el link de pago para pagar menos dinero
        if (Number(realPaymentData.transaction_amount) !== Number(dbTransaction.amount)) {
            console.error(`[CRÍTICO MP] Alteración de monto detectada. Viaje: ${tripId}`);
            return new NextResponse("OK", { status: 200 });
        }

        // ============================================================================
        // FASE 3: LÓGICA DE NEGOCIO Y ACTUALIZACIÓN
        // ============================================================================

        // Mapeamos el estado real de Mercado Pago a los estados de nuestra tabla
        let internalStatus: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" = "PENDING";
        
        switch (realPaymentData.status) {
            case "approved":
                internalStatus = "COMPLETED";
                break;
            case "rejected":
                internalStatus = "FAILED";
                break;
            case "cancelled":
                internalStatus = "FAILED";
                break;
            case "refunded":
                internalStatus = "REFUNDED";
                break;
        }

        // Evitamos hacer queries innecesarias si el estado no cambió
        if (dbTransaction.status === internalStatus && dbTransaction.external_id === mpPaymentId) {
            return new NextResponse("OK: Status already synced", { status: 200 });
        }

        // Actualizamos de forma segura la base de datos
        await db.update(payments)
            .set({
                status: internalStatus,
                external_id: mpPaymentId,
            })
            .where(eq(payments.trip_id, tripId));

        console.log(`[Webhook MP] Éxito: Viaje ${tripId} actualizado a ${internalStatus}`);

        // -----------------------------------------------------------------
        // TODO: ESPACIO PARA MICROSERVICIOS
        // Si internalStatus === 'COMPLETED', notificar al sistema de viajes.
        // -----------------------------------------------------------------

        return new NextResponse("Webhook processed successfully", { status: 200 });

    } catch (error) {
        console.error(`[Webhook MP] Error interno procesando viaje ${tripId}:`, error);
        
        // ⚠️ Solo devolvemos 500 si falla nuestra infraestructura (ej: base de datos caída).
        // Esto le indica a Mercado Pago que debe volver a intentar enviar este Webhook más tarde.
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}