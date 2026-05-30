import { db } from "@/db";
import { users, payments, refunds } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

interface TransactionResult {
    status: number;
    body: { message?: string; error?: string; };
}

export async function processRefundTransaction(
    userId: number,
    tripId: string,
    refundType: "TOTAL" | "PARTIAL",
    reason: string,
    isLateWebhook: boolean = false,
    externalTx?: any, // Inyección de dependencia de la transacción (puedes tiparlo mejor según tu config de Drizzle)
    preFetchedPayment?: any
): Promise<TransactionResult> {
    
    // Extraemos toda la lógica interna a una función que recibe el ejecutor (tx)
    const executeLogic = async (tx: any) => {
        let paymentRecord = preFetchedPayment;
        
        if (!paymentRecord) {
            const [fetched] = await tx.select()
                .from(payments)
                .where(eq(payments.trip_id, tripId))
                .for('update');
            paymentRecord = fetched;
        }

        if (!paymentRecord) {
            return { status: 404, body: { error: "Payment for this trip not found." } };
        }

        const isValidStatus = paymentRecord.status === "COMPLETED" || (isLateWebhook && paymentRecord.status === "CANCELLED");

        if (paymentRecord.status === "PENDING" && !isLateWebhook) {
            await tx.update(payments)
                .set({ status: "CANCELLED", updated_at: new Date() })
                .where(eq(payments.transaction_id, paymentRecord.transaction_id));
            
            return { status: 200, body: { message: "Payment was pending and has been cancelled." } };
        }

        if (isValidStatus) {
            const [existingRefund] = await tx.select()
                .from(refunds)
                .where(eq(refunds.trip_id, tripId));

            if (existingRefund) {
                return { status: 409, body: { error: "Refund already processed for this trip." } };
            }

            await tx.insert(refunds).values({
                trip_id: tripId,
                id_user: userId,
                amount: paymentRecord.amount, 
                refund_type: refundType,
                external_id: null,
                status: "COMPLETED"
            });

            await tx.update(users)
                .set({ balance: sql`${users.balance} + ${paymentRecord.amount}` })
                .where(eq(users.id_user, userId));
            
            await tx.update(payments)
                .set({ status: "REFUNDED", updated_at: new Date() })
                .where(eq(payments.transaction_id, paymentRecord.transaction_id));

            return { status: 201, body: { message: "Refund processed successfully. Balance credited." } };
        }

        return { status: 400, body: { error: `Cannot process refund. Current payment status is: ${paymentRecord.status}` } };
    };

    // If we already have a transaction (like in the MercadoPago webhook), we use it. If not (like in the API endpoint), we create a new one.
    if (externalTx) {
        return await executeLogic(externalTx);
    } else {
        return await db.transaction(executeLogic);
    }
}