import { db } from "@/db";
import { payments, disbursements, refunds } from "@/db/schema";
import { and, desc, asc, eq, isNull, ilike, SQL, or, sql } from "drizzle-orm";
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

export interface GetPaymentsParams {
    userId?: number;
    search?: string;
    status?: string;
    sort?: string;
    page: number;
    itemsPerPage: number;
    includeDeleted?: boolean; // Permite unificar las consultas del cliente y del Control Plane
}

export async function getFilteredPayments(params: GetPaymentsParams) {
    const { 
        userId, 
        search, 
        status = "ALL", 
        sort, 
        page = 1, 
        itemsPerPage = 25, 
        includeDeleted = false 
    } = params;

    const offset = (page - 1) * itemsPerPage;
    const conditions: SQL[] = [];

    // 1. Filtro por Usuario
    if (userId) {
        conditions.push(eq(payments.id_user, userId));
    }

    // 2. Filtro de Borrado Lógico (Soft Delete)
    if (!includeDeleted) {
        conditions.push(isNull(payments.deleted_at));
    }

    // 3. Filtro por Estado
    if (status && status !== "ALL") {
        conditions.push(eq(payments.status, status as TransactionStatus));
    }

    // 4. Filtro de Búsqueda (Search) - Unificado con la búsqueda avanzada
    if (search) {
        const searchTerm = `%${search}%`;
        conditions.push(
            or(
                ilike(payments.trip_id, searchTerm),
                ilike(sql`${payments.transaction_id}::text`, searchTerm)
            )!
        );
    }

    // Empaquetamos todas las condiciones de forma segura
    const whereClause = conditions.length > 0 ? and(...conditions) : sql`1=1`;

    // 5. Armado dinámico de la cláusula ORDER BY
    let orderByClause;
    switch (sort) {
        case "amount_desc": orderByClause = desc(payments.amount); break;
        case "amount_asc": orderByClause = asc(payments.amount); break;
        case "created_asc": orderByClause = asc(payments.created_at); break;
        case "updated_desc": orderByClause = desc(payments.updated_at); break;
        case "updated_asc": orderByClause = asc(payments.updated_at); break;
        case "created_desc":
        default:
            orderByClause = desc(payments.created_at);
            break;
    }

    // 6. Ejecución concurrente (Data + Count)
    const [data, [{ totalCount }]] = await Promise.all([
        db.select()
            .from(payments)
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(itemsPerPage)
            .offset(offset),

        db.select({ totalCount: sql<number>`count(*)` })
            .from(payments)
            .where(whereClause)
    ]);

    const count = Number(totalCount);
    const totalPages = Math.ceil(count / itemsPerPage);
    const hasNextPage = page < totalPages;

    // 7. Retorno Unificado (Soporta clientes legacy y nuevos endpoints)
    return {
        // Firmas Legacy (Client-side usage)
        payments: data,
        hasNextPage,
        
        // Firmas Modernas (Control Plane / API usage)
        data,
        meta: {
            totalCount: count,
            page,
            limit: itemsPerPage,
            totalPages,
        }
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
                    message: `Action denied: There is an active refund for this trip (Ref ID: ${activeRefunds[0].transaction_id.split('-')[0]}). Revert the refund first.`,
                    errorCode: "ACTIVE_REFUND_EXISTS"
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