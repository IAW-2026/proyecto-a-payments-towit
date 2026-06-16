import { db } from "@/db";
import { payments, disbursements, refunds } from "@/db/schema";
import { and, desc, asc, eq, isNull, ilike, SQL } from "drizzle-orm";
import { TransactionStatus } from "@/types/transaction";

export type PaymentErrorCode =
    | "PAYMENT_NOT_FOUND"
    | "ACTIVE_DISBURSEMENT_EXISTS"
    | "ACTIVE_REFUND_EXISTS"
    | "DATABASE_ERROR";

interface ServiceResponse {
    success: boolean;
    message?: string;
    errorCode?: PaymentErrorCode;
}

interface GetPaymentsParams {
    userId: number;
    search?: string;
    status?: string;
    sort?: string;
    page: number;
    itemsPerPage: number;
}

export async function getFilteredPayments(params: GetPaymentsParams) {
    const { userId, search, status, sort, page, itemsPerPage } = params;
    
    const offset = (page - 1) * itemsPerPage;

    // Dynamic construction of WHERE clause based on provided filters
    const whereConditions: SQL[] = [
        eq(payments.id_user, userId),
        isNull(payments.deleted_at)
    ];

    if (status) {
        whereConditions.push(eq(payments.status, status as TransactionStatus));
    }

    if (search) {
        whereConditions.push(ilike(payments.trip_id, `%${search}%`));
    }

    // Dynamic construction of ORDER BY clause
    let orderByCondition;
    switch (sort) {
        case "amount_desc": orderByCondition = desc(payments.amount); break;
        case "amount_asc":  orderByCondition = asc(payments.amount); break;
        case "created_asc": orderByCondition = asc(payments.created_at); break;
        case "updated_desc":orderByCondition = desc(payments.updated_at); break;
        case "updated_asc": orderByCondition = asc(payments.updated_at); break;
        case "created_desc":
        default:
            orderByCondition = desc(payments.created_at);
            break;
    }

    const data = await db.query.payments.findMany({
        where: and(...whereConditions),
        orderBy: [orderByCondition],
        limit: itemsPerPage + 1, 
        offset: offset,
    });

    const hasNextPage = data.length > itemsPerPage;
    const displayPayments = data.slice(0, itemsPerPage);

    return {
        payments: displayPayments,
        hasNextPage
    };
}

export async function cancelPaymentSafely(transactionId: string): Promise<ServiceResponse> {
  
    try {
        return await db.transaction(async (tx) => {

            const paymentRecords = await tx.select()
                .from(payments)
                .where(
                    and(
                        eq(payments.transaction_id, transactionId),
                        isNull(payments.deleted_at)
                    )
                )
                .limit(1)
                .for('update');

            const paymentRecord = paymentRecords[0];

            if (!paymentRecord) {
                return { success: false, message: "Payment is nonexistent or invalid", errorCode: "PAYMENT_NOT_FOUND" };
            }

            const activeDisbursements = await tx.select()
                .from(disbursements)
                .where(
                    and(
                        eq(disbursements.trip_id, paymentRecord.trip_id),
                        isNull(disbursements.deleted_at)
                    )
                )
                .limit(1);

            if (activeDisbursements.length > 0) {
                return {
                    success: false,
                    message: `Action denied: There is an active disbursement for this trip (Disbursement ID: ${activeDisbursements[0].transaction_id.split('-')[0]}). Revert the disbursement first.`,
                    errorCode: "ACTIVE_DISBURSEMENT_EXISTS"
                };
            }

            const activeRefunds = await tx.select()
                .from(refunds)
                .where(
                    and(
                        eq(refunds.trip_id, paymentRecord.trip_id),
                        isNull(refunds.deleted_at)
                    )
                )
                .limit(1);

            if (activeRefunds.length > 0) {
                return {
                    success: false,
                    message: `Action denied: There is an active refund for this trip (Ref ID: ${activeRefunds[0].transaction_id.split('-')[0]}). Revert the refund first.`
                    , errorCode: "ACTIVE_REFUND_EXISTS"
                };
            }


            await tx.update(payments)
                .set({
                    deleted_at: new Date(),
                    status: 'CANCELLED',
                    updated_at: new Date()
                })
                .where(eq(payments.transaction_id, transactionId));

            return { success: true, message: "Payment cancelled successfully." };
        });

    } catch (error) {
        console.error(`[Service Error] Failed to safely cancel payment ${transactionId}:`, error);
        return { success: false, message: "Internal database error while cancelling the payment.", errorCode: "DATABASE_ERROR" };
    }
}