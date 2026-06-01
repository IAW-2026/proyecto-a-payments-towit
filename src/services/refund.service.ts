import { db } from "@/db";
import { users, payments, refunds } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";

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
                .where(and(eq(payments.trip_id, tripId), isNull(payments.deleted_at)))
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
                .where(and(eq(refunds.trip_id, tripId), isNull(refunds.deleted_at)));

            if (existingRefund) {
                return { status: 409, body: { error: "Refund already processed for this trip." } };
            }

            await tx.insert(refunds).values({
                trip_id: tripId,
                id_user: userId,
                amount: paymentRecord.amount, 
                refund_type: refundType,
                external_id: null,
                status: "COMPLETED",
                deleted_at: null
            });

            await tx.update(users)
                .set({ balance: sql`${users.balance} + ${paymentRecord.amount}` })
                .where(eq(users.id_user, userId));
            
            await tx.update(payments)
                .set({ status: "REFUNDED", updated_at: new Date()})
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

export async function cancelRefundSafely(transactionId: string) {
  try {
    return await db.transaction(async (tx) => {
      const records = await tx.select()
        .from(refunds)
        .where(and(eq(refunds.transaction_id, transactionId), isNull(refunds.deleted_at)))
        .limit(1)
        .for('update');

      const record = records[0];

      if (!record) {
        return { success: false, message: "Refund not found or already cancelled." };
      }

      // If the refund was already completed, reverse the balance change
      if (record.status === "COMPLETED") {
        await tx.update(users)
          .set({ balance: sql`${users.balance} - ${record.amount}` })
          .where(eq(users.id_user, record.id_user));
      }

      await tx.update(refunds)
        .set({ deleted_at: new Date(), status: 'CANCELLED' })
        .where(eq(refunds.transaction_id, transactionId));

      return { success: true, message: "Refund cancelled successfully." };
    });
  } catch (error) {
    console.error(`[Service Error] Failed to cancel refund ${transactionId}:`, error);
    return { success: false, message: "Internal error in the database while cancelling the refund." };
  }
}