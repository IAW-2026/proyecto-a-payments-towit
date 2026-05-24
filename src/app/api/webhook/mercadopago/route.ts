import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { client } from "@/app/lib/mercadoPago";
import crypto from "crypto";

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

export async function POST(req: NextRequest) {
    try {
        const url = new URL(req.url);

        // ============================================================================
        // FASE PREVIA: FILTRO DE SILENCIAMIENTO ESTRICTO
        // Ignoramos el sistema viejo IPN (topic) y nos quedamos solo con Webhooks (type)
        // ============================================================================
        if (url.searchParams.has("topic")) {
            console.log("[Webhook MP] 🤫 Silenciando notificación IPN o merchant_order antigua.");
            return new NextResponse("Ignored: Legacy IPN", { status: 200 });
        }

        // ============================================================================
        // FASE 0: VERIFICACIÓN CRIPTOGRÁFICA
        // ============================================================================
        const xSignature = req.headers.get("x-signature");
        const xRequestId = req.headers.get("x-request-id");
        
        // EXTRACCIÓN ESTRICTA: Solo usamos data.id. Si no viene, no es un Webhook válido.
        const dataIdUrl = url.searchParams.get("data.id");

        if (!xSignature || !xRequestId || !dataIdUrl) {
            console.warn("[Webhook MP] 🛑 Bloqueado: Faltan parámetros de seguridad en la URL o Headers.");
            return new NextResponse("Missing Security Parameters", { status: 400 });
        }

        const parts = xSignature.split(',');
        let ts = "";
        let hash = "";

        parts.forEach(part => {
            const [key, value] = part.split('=');
            if (key && value) {
                if (key.trim() === 'ts') ts = value.trim();
                else if (key.trim() === 'v1') hash = value.trim();
            }
        });

        const secret = process.env.MP_WEBHOOK_SECRET?.trim(); // El .trim() evita errores por espacios vacíos
        
        if (!secret) {
            console.error("❌ ERROR: MP_WEBHOOK_SECRET no está configurado.");
            return new NextResponse("Internal Error", { status: 500 });
        }

        const manifest = `id:${dataIdUrl};request-id:${xRequestId};ts:${ts};`;
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(manifest);
        const calculatedSha = hmac.digest('hex');

        if (calculatedSha !== hash) {
            console.error(`[CRÍTICO MP] 🚨 Firma inválida detectada para data.id: ${dataIdUrl}`);
            return new NextResponse("Unauthorized", { status: 403 });
        }

        // ============================================================================
        // FASE 1: FILTROS DE EVENTO
        // ============================================================================
        const body = (await req.json()) as MercadoPagoWebhookPayload;

        if (body.type !== "payment") {
            return new NextResponse("Ignored: Not a payment event", { status: 200 });
        }

        // ============================================================================
        // FASE 2: ZERO TRUST & AUDITORÍA DE ESTADO
        // ============================================================================
        const paymentClient = new Payment(client);
        let realPaymentData;

        try {
            realPaymentData = await paymentClient.get({ id: dataIdUrl });
        } catch (mpError) {
            console.warn(`[ESCUDO MP] ID de pago inexistente en MP: ${dataIdUrl}`);
            return new NextResponse("OK: Handled", { status: 200 });
        }

        const transactionId = realPaymentData.external_reference;

        if (!transactionId) {
            console.warn(`[Webhook MP] Pago ignorado: Sin external_reference. MP ID: ${dataIdUrl}`);
            return new NextResponse("OK: No external reference", { status: 200 });
        }

        const dbTransaction = await db.query.payments.findFirst({
            where: eq(payments.transaction_id, transactionId)
        });
        
        if (!dbTransaction) {
            console.error(`[ALERTA MP] Transacción inexistente en BD: ${transactionId}`);
            return new NextResponse("OK", { status: 200 });
        }

        if (Number(realPaymentData.transaction_amount) !== Number(dbTransaction.amount)) {
            console.error(`[CRÍTICO MP] Alteración de monto. Transacción: ${transactionId}`);
            return new NextResponse("OK", { status: 200 });
        }

        // ============================================================================
        // FASE 3: LÓGICA DE NEGOCIO Y ACTUALIZACIÓN
        // ============================================================================
        let internalStatus: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" = "PENDING";
        
        switch (realPaymentData.status) {
            case "approved":
                internalStatus = "COMPLETED";
                break;
            case "rejected":
            case "cancelled":
                internalStatus = "FAILED";
                break;
            case "refunded":
                internalStatus = "REFUNDED";
                break;
        }

        if (dbTransaction.status === internalStatus && dbTransaction.external_id === dataIdUrl) {
            return new NextResponse("OK: Status already synced", { status: 200 });
        }

        await db.update(payments)
            .set({
                status: internalStatus,
                external_id: dataIdUrl,
            })
            .where(eq(payments.transaction_id, transactionId));

        console.log(`[Webhook MP] ✅ Éxito: Viaje ${dbTransaction.trip_id} actualizado a ${internalStatus}`);

        return new NextResponse("Webhook processed successfully", { status: 200 });

    } catch (error) {
        console.error(`[Webhook MP] Error interno:`, error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}