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
        // ============================================================================
        // FASE 0: VERIFICACIÓN CRIPTOGRÁFICA (HMAC SHA-256)
        // Autenticamos que el mensaje provenga legítimamente de Mercado Pago
        // ============================================================================
        
        // 1. Extraemos los headers requeridos
        const xSignature = req.headers.get("x-signature");
        const xRequestId = req.headers.get("x-request-id");
        
        // 2. Extraemos el data.id de los query params de la URL
        const url = new URL(req.url);
        const dataIdUrl = url.searchParams.get("data.id");

        if (!xSignature || !xRequestId || !dataIdUrl) {
            console.warn("[Webhook MP] Bloqueado: Faltan headers o parámetros de seguridad.");
            return new NextResponse("Missing Security Parameters", { status: 400 });
        }

        // 3. Parseamos el header x-signature para sacar el timestamp (ts) y el hash (v1)
        const parts = xSignature.split(',');
        let ts = "";
        let hash = "";

        parts.forEach(part => {
            const [key, value] = part.split('=');
            if (key && value) {
                const trimmedKey = key.trim();
                const trimmedValue = value.trim();
                if (trimmedKey === 'ts') ts = trimmedValue;
                else if (trimmedKey === 'v1') hash = trimmedValue;
            }
        });

        // 4. Obtenemos nuestra clave secreta
        const secret = process.env.MP_WEBHOOK_SECRET;
        if (!secret) {
            throw new Error("MP_WEBHOOK_SECRET no está configurado en las variables de entorno");
        }

        // 5. Construimos el string manifiesto siguiendo la plantilla oficial
        const manifest = `id:${dataIdUrl};request-id:${xRequestId};ts:${ts};`;

        // 6. Generamos el hash en nuestro servidor
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(manifest);
        const calculatedSha = hmac.digest('hex');

        // 7. Comparamos los hashes. Si no coinciden, es un intento de hackeo.
        if (calculatedSha !== hash) {
            console.error(`[CRÍTICO MP] Firma inválida detectada. Posible ataque bloqueado.`);
            // Devolvemos 403 Forbidden porque falló la autenticación.
            return new NextResponse("Unauthorized", { status: 403 });
        }

        // ============================================================================
        // FASE 1: FILTROS DE EVENTO (Bouncer Pattern)
        // ============================================================================
        const body = (await req.json()) as MercadoPagoWebhookPayload;

        if (body.type !== "payment") {
            return new NextResponse("Ignored: Not a payment event", { status: 200 });
        }

        if (body.action !== "payment.updated" && body.action !== "payment.created") {
            return new NextResponse("Ignored: Event action not relevant", { status: 200 });
        }

        const mpPaymentId = body.data?.id;
        if (!mpPaymentId) {
            return new NextResponse("Ignored: Missing payment ID", { status: 200 });
        }

        // ============================================================================
        // FASE 2: ZERO TRUST & AUDITORÍA DE ESTADO
        // ============================================================================
        const paymentClient = new Payment(client);
        let realPaymentData;

        try {
            realPaymentData = await paymentClient.get({ id: mpPaymentId });
        } catch (mpError) {
            console.warn(`[ESCUDO MP] ID de pago inexistente en MP: ${mpPaymentId}`);
            return new NextResponse("OK: Handled", { status: 200 });
        }

        const transactionId = realPaymentData.external_reference;

        if (!transactionId) {
            console.warn(`[Webhook MP] Pago ignorado: Sin external_reference. MP ID: ${mpPaymentId}`);
            return new NextResponse("OK: No external reference", { status: 200 });
        }

        const dbTransaction = await db.query.payments.findFirst({
            where: eq(payments.transaction_id, transactionId)
        });
        
        // 🛡️ Barrera de Existencia
        if (!dbTransaction) {
            console.error(`[ALERTA MP] Transacción inexistente: ${transactionId}`);
            return new NextResponse("OK", { status: 200 });
        }

        // 🛡️ Barrera de Integridad de Montos
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

        if (dbTransaction.status === internalStatus && dbTransaction.external_id === mpPaymentId) {
            return new NextResponse("OK: Status already synced", { status: 200 });
        }

        await db.update(payments)
            .set({
                status: internalStatus,
                external_id: mpPaymentId,
            })
            .where(eq(payments.transaction_id, transactionId));

        console.log(`[Webhook MP] Éxito: Viaje ${dbTransaction.trip_id} actualizado a ${internalStatus}`);

        return new NextResponse("Webhook processed successfully", { status: 200 });

    } catch (error) {
        console.error(`[Webhook MP] Error interno:`, error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}