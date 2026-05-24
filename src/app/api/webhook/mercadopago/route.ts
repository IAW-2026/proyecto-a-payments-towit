import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Payment } from "mercadopago";
import { client } from "@/app/lib/mercadoPago";
import crypto from "crypto";

interface MercadoPagoWebhookPayload {
    id: number;
    live_mode: boolean;
    type: string;
    action: string;
    data: { id: string };
}

type InternalPaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";

export async function POST(req: NextRequest) {
    try {
        const url = new URL(req.url);

        // Anti noise filter to ignore legacy IPN calls that don't have the expected query parameters
        if (url.searchParams.has("topic")) {
            return createResponse("Ignored: Legacy IPN");
        }

        const dataId = url.searchParams.get("data.id");
        if (!dataId) {
            return createResponse("Missing data.id", 400);
        }

        // Cryptographic security check to ensure the request is genuinely from Mercado Pago
        if (!authenticateWebhookSignature(req, dataId)) {
            return createResponse("Unauthorized", 403);
        }

        // Payload validation to ensure we only process payment events
        const body = (await req.json()) as MercadoPagoWebhookPayload;
        if (body.type !== "payment") {
            return createResponse("Ignored: Not a payment event", 200);
        }

        await processMercadoPagoPayment(dataId);

        return createResponse("Webhook processed successfully");

    } catch (error) {
        console.error(`[Webhook MP] Error interno:`, error);
        return createResponse("Internal Server Error", 500);
    }
}


function createResponse(message: string, status: number = 200): NextResponse {
    if (status !== 200)
        console.warn(`[Webhook MP] ${message} (Status: ${status})`);
    return new NextResponse(message, { status });
}

// Validates that request genuinely comes from Mercado Pago using HMAC SHA-256
function authenticateWebhookSignature(req: NextRequest, dataId: string): boolean {
    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id");
    const secret = process.env.MP_WEBHOOK_SECRET?.trim();
    
    if (!xSignature || !xRequestId || !secret) {
        console.error("Lacking required headers or secret for webhook authentication");
        return false;
    }

    let ts = "";
    let expectedHash = "";

    xSignature.split(',').forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) {
            if (key.trim() === 'ts')
                ts = value.trim();
            else if (key.trim() === 'v1')
                expectedHash = value.trim();
        }
    });

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const calculatedHash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    if (calculatedHash !== expectedHash) {
        console.error(`[CRITICAL MP] Invalid signature for data.id: ${dataId}`);
        return false;
    }

    return true;
}

// Validates the payment with Mercado Pago API and updates the database accordingly
async function processMercadoPagoPayment(mpPaymentId: string): Promise<void> {
    const paymentClient = new Payment(client);
    let realPaymentData;
    try {
        realPaymentData = await paymentClient.get({ id: mpPaymentId });
    } catch (error) {
        console.warn(`[ESCUDO MP] Inexistent payment in MP: ${mpPaymentId}`);
        return; //Early return
    }

    const transactionId = realPaymentData.external_reference;
    if (!transactionId) {
        console.warn(`[Webhook MP] Ignored payment: No external_reference. MP ID: ${mpPaymentId}`);
        return;
    }

    // Buscamos la transacción en Neon
    const dbTransaction = await db.query.payments.findFirst({
        where: eq(payments.transaction_id, transactionId)
    });    
    if (!dbTransaction) {
        console.error(`[ALERTA MP] Inexistent transaction in DB: ${transactionId}`);
        return;
    }

    // Verify amount to prevent tampering
    if (Number(realPaymentData.transaction_amount) !== Number(dbTransaction.amount)) {
        console.error(`[CRITICAL MP] Amount mismatch for transaction: ${transactionId}`);
        return;
    }

    // Change only if there's a real change
    const newStatus = mapMercadoPagoStatus(realPaymentData.status);
    if (dbTransaction.status === newStatus && dbTransaction.external_id === mpPaymentId) {
        return;
    }
    await db.update(payments)
        .set({
            status: newStatus,
            external_id: mpPaymentId,
        })
        .where(eq(payments.transaction_id, transactionId));

    console.log(`[Webhook MP] Successfully updated transaction ${transactionId} to status ${newStatus}`);
}

// Translates raw Mercado Pago status to our internal payment status domain
function mapMercadoPagoStatus(mpStatus: string | undefined): InternalPaymentStatus {
    switch (mpStatus) {
        case "approved": return "COMPLETED";
        case "rejected":
        case "cancelled": return "FAILED";
        case "refunded": return "REFUNDED";
        default: return "PENDING";
    }
}