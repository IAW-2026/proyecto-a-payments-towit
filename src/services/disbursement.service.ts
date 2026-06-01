import { db } from "@/db";
import { disbursements, users } from "@/db/schema";
import { eq, isNull, and, sql } from "drizzle-orm";

interface ServiceResponse {
  success: boolean;
  message?: string;
}

export async function cancelDisbursementSafely(transactionId: string): Promise<ServiceResponse> {
  try {
    return await db.transaction(async (tx) => {
      const records = await tx.select()
        .from(disbursements)
        .where(and(eq(disbursements.transaction_id, transactionId), isNull(disbursements.deleted_at)))
        .limit(1)
        .for('update');

      const record = records[0];

      if (!record) {
        return { success: false, message: "Disbursement not found or already cancelled." };
      }

      if (record.status === 'COMPLETED') {
        await tx.update(users)
          .set({ 
            balance: sql`${users.balance} - ${record.amount}` 
          })
          .where(eq(users.id_user, record.id_user));
      }

      await tx.update(disbursements)
        .set({ 
          deleted_at: new Date(), 
          status: record.status === 'COMPLETED' ? 'REFUNDED' : 'CANCELLED' 
        })
        .where(eq(disbursements.transaction_id, transactionId));

      return { 
        success: true, 
        message: record.status === 'COMPLETED' 
          ? "Disbursement refunded successfully. The balance was deducted from the driver." 
          : "Pending disbursement cancelled successfully."
      };
    });
  } catch (error) {
    console.error(`[Service Error] Failed to cancel disbursement ${transactionId}:`, error);
    return { success: false, message: "Internal error in the database while cancelling the disbursement." };
  }
}