import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { Payment } from "mercadopago";
import { client } from "@/app/lib/mercadoPago";
import crypto from "crypto";
import { processRefundTransaction } from "@/services/refund.service";
import { notifyClientTransactionStatus } from "@/services/client-system-api.service";

interface MercadoPagoWebhookPayload {
    id: number;
    live_mode: boolean;
    type: string;
    action: string;
    data: { id: string };
}

interface PaymentOutcome {
    shouldNotify: boolean;
    tripId?: string;
    transactionId?: string;
    status?: InternalPaymentStatus;
    amount?: number;
}

type InternalPaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";

export async function POST(req: NextRequest) {
    try {
        const url = new URL(req.url);

        // Anti noise filter to ignore legacy IPN calls that don't have the expected query parameters
        if (url.searchParams.has("topic")) 
            return createResponse("Ignored: Legacy IPN");

        const dataId = url.searchParams.get("data.id");
        if (!dataId) 
            return createResponse("Missing data.id", 400);

        // Cryptographic security check to ensure the request is genuinely from Mercado Pago
        if (!authenticateWebhookSignature(req, dataId)) 
            return createResponse("Unauthorized", 403);

        // Payload validation to ensure we only process payment events
        const body = (await req.json()) as MercadoPagoWebhookPayload;
        if (body.type !== "payment")
            return createResponse("Ignored: Not a payment event", 200);

        const outcome = await processMercadoPagoPayment(dataId);

        if (outcome && outcome.shouldNotify) {
            await notifyClientTransactionStatus({
                tripId: outcome.tripId!,
                status: outcome.status!
            });
        }

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
async function processMercadoPagoPayment(mpPaymentId: string): Promise<PaymentOutcome | null> {
    const realPaymentData = await fetchMercadoPagoData(mpPaymentId);
    if (!realPaymentData || !realPaymentData.external_reference || !realPaymentData.transaction_amount || !realPaymentData.status) 
        return null;

    const transactionId = realPaymentData.external_reference;
    const newStatus = mapMercadoPagoStatus(realPaymentData.status);
    const amount = realPaymentData.transaction_amount;

    return await db.transaction(async (tx) => {
        const dbPayment = await fetchPaymentForUpdate(tx, transactionId);
        if (!dbPayment) return null;

        if (!isAmountValid(amount, dbPayment.amount, transactionId)) return null;

        // 3. Delegamos a la Máquina de Estados
        return await applyPaymentStateMachine(tx, dbPayment, newStatus, mpPaymentId);
    });
}

async function applyPaymentStateMachine(
    tx: any, 
    dbPayment: any, 
    newStatus: InternalPaymentStatus, 
    mpPaymentId: string
): Promise<PaymentOutcome> {
    
    // Late payment scenario
    if (dbPayment.status === "CANCELLED" && newStatus === "COMPLETED") {
        return await executeAutoRefundAction(tx, dbPayment, mpPaymentId);
    }

    // Idempotency (without change)
    if (dbPayment.status === newStatus && dbPayment.external_id === mpPaymentId) {
        return { shouldNotify: false };
    }

    // Silent update scenario: status is the same but external_id has changed (e.g. MP reprocessed the payment and assigned a new ID)
    if (dbPayment.status === newStatus && dbPayment.external_id !== mpPaymentId) {
        return await executeSilentLinkAction(tx, dbPayment, mpPaymentId);
    }

    // Normal update flow
    return await executeStandardUpdateAction(tx, dbPayment, newStatus, mpPaymentId);
}


async function executeAutoRefundAction(tx: any, dbPayment: any, mpPaymentId: string): Promise<PaymentOutcome> {
    console.log(`[Webhook MP] Late payment detected. Initiating auto-refund for ${dbPayment.transaction_id}`);
    
    await tx.update(payments)
        .set({ external_id: mpPaymentId })
        .where(eq(payments.transaction_id, dbPayment.transaction_id));

    const refundResult = await processRefundTransaction(
        dbPayment.id_user,
        dbPayment.trip_id,
        "TOTAL",
        "Auto-Refund: Acreditación tardía",
        true,
        tx, 
        dbPayment 
    );

    if (refundResult.status !== 201) throw new Error(`Auto-refund falló con status ${refundResult.status}`);
    
    return { shouldNotify: false };
}

async function executeStandardUpdateAction(
    tx: any, 
    dbPayment: any, 
    newStatus: InternalPaymentStatus, 
    mpPaymentId: string
): Promise<PaymentOutcome> {
    
    await tx.update(payments)
        .set({
            status: newStatus,
            external_id: mpPaymentId,
            updated_at: new Date()
        })
        .where(eq(payments.transaction_id, dbPayment.transaction_id));

    console.log(`[Webhook MP] Successfully updated transaction ${dbPayment.transaction_id} to status ${newStatus}`);

    return {
        shouldNotify: true,
        tripId: dbPayment.trip_id,
        transactionId: dbPayment.transaction_id,
        status: newStatus,
        amount: Number(dbPayment.amount)
    };
}

async function executeSilentLinkAction(tx: any, dbPayment: any, mpPaymentId: string): Promise<PaymentOutcome> {
    
    await tx.update(payments)
        .set({
            external_id: mpPaymentId,
            updated_at: new Date()
        })
        .where(eq(payments.transaction_id, dbPayment.transaction_id));

    console.log(`[Webhook MP] Vinculación silenciosa: external_id ${mpPaymentId} enlazado a la transacción ${dbPayment.transaction_id} (Estado retenido en ${dbPayment.status})`);

    // Return this to not notify the client system
    return { shouldNotify: false };
}

//Utility functions

async function fetchMercadoPagoData(mpPaymentId: string) {
    const paymentClient = new Payment(client);
    try {
        const data = await paymentClient.get({ id: mpPaymentId });
        if (!data.external_reference) {
            console.warn(`[Webhook MP] Ignored payment: No external_reference. MP ID: ${mpPaymentId}`);
        }
        return data;
    } catch (error) {
        console.warn(`[ESCUDO MP] Inexistent payment in MP: ${mpPaymentId}`);
        return null;
    }
}

async function fetchPaymentForUpdate(tx: any, transactionId: string) {
    const record = await tx.select()
        .from(payments)
        .where(and(eq(payments.transaction_id, transactionId), isNull(payments.deleted_at)))
        .limit(1)
        .for('update')
        .then((res: any[]) => res[0]);
        
    if (!record) console.error(`[ALERTA MP] Inexistent transaction in DB: ${transactionId}`);
    return record;
}

function isAmountValid(mpAmount: number | string, dbAmount: number | string, transactionId: string): boolean {
    if (Number(mpAmount) !== Number(dbAmount)) {
        console.error(`[CRITICAL MP] Amount mismatch for transaction: ${transactionId}`);
        return false;
    }
    return true;
}



// Translates raw Mercado Pago status to our internal payment status domain
function mapMercadoPagoStatus(mpStatus: string | undefined): InternalPaymentStatus {
    switch (mpStatus) {
        case "approved": return "COMPLETED";
        case "rejected": return "FAILED";
        case "cancelled": return "FAILED";
        case "refunded": return "REFUNDED";
        default: return "PENDING";
    }
}