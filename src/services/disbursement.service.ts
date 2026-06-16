import { TransactionStatus } from "@/types/transaction";
import { db } from "@/db";
import { disbursements, payments, users } from "@/db/schema";
import { eq, isNull, and, sql, SQL, ilike, desc, asc } from "drizzle-orm";

interface ServiceResponse {
  success: boolean;
  message?: string;
}

interface GetDisbursementsParams {
    userId: number;
    search?: string;
    status?: string;
    sort?: string;
    page: number;
    itemsPerPage: number;
}


export async function getFilteredDisbursements(params: GetDisbursementsParams) {
    const { userId, search, status, sort, page, itemsPerPage } = params;
    
    const offset = (page - 1) * itemsPerPage;

    const whereConditions: SQL[] = [
        eq(disbursements.id_user, userId),
        isNull(disbursements.deleted_at)
    ];

    if (status) {
        whereConditions.push(eq(disbursements.status, status as TransactionStatus));
    }
    if (search) {
        whereConditions.push(ilike(disbursements.trip_id, `%${search}%`));
    }

    // Dynamic ordering based on sort parameter
    // As the disbursements table doesn't have updated_at, we will use created_at for sorting by date
    let orderByCondition;
    switch (sort) {
        case "amount_desc": orderByCondition = desc(disbursements.amount); break;
        case "amount_asc":  orderByCondition = asc(disbursements.amount); break;
        case "created_asc": orderByCondition = asc(disbursements.created_at); break;
        case "updated_desc":orderByCondition = desc(disbursements.created_at); break;
        case "updated_asc": orderByCondition = asc(disbursements.created_at); break;
        case "created_desc":
        default:
            orderByCondition = desc(disbursements.created_at);
            break;
    }

    const data = await db.query.disbursements.findMany({
        where: and(...whereConditions),
        orderBy: [orderByCondition],
        limit: itemsPerPage + 1, 
        offset: offset,
    });

    const hasNextPage = data.length > itemsPerPage;
    const displayDisbursements = data.slice(0, itemsPerPage);

    return {
        disbursements: displayDisbursements,
        hasNextPage
    };
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

      await tx.update(payments)
        .set({ 
          status: "COMPLETED", // Volvemos al estado anterior para permitir reintentos o cancelaciones posteriores
          updated_at: new Date(),
          deleted_at: null
        })
        .where(and(eq(payments.trip_id, record.trip_id), isNull(payments.deleted_at)));

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