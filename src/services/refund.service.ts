import { TransactionStatus } from "@/types/transaction";
import { db } from "@/db";
import { users, payments, refunds } from "@/db/schema";
import { and, asc, desc, eq, isNull, ilike , SQL, sql, or } from "drizzle-orm";

import { ActionErrorCode } from "@/types/error";

interface TransactionResult {
    status: number;
    body: { message?: string; error?: string; code?: ActionErrorCode; };
}

export interface RefundResponse {
    transaction_id: string;
    trip_id: string;
    clerk_id: string;
    amount: string;
    refund_type: "TOTAL" | "PARTIAL";
    status: TransactionStatus;
    created_at: Date;
    deleted_at: Date | null;
}

export interface GetRefundsParams {
    userId?: number; 
    search?: string;
    status?: string;
    sort?: string;
    page: number;
    itemsPerPage: number;
    includeDeleted?: boolean; 
}

export async function getFilteredRefunds(params: GetRefundsParams) {
    const { 
        userId, 
        search, 
        status, 
        sort, 
        page = 1, 
        itemsPerPage = 25, 
        includeDeleted = false 
    } = params;
    
    const offset = (page - 1) * itemsPerPage;
    const conditions: SQL[] = [];

    // 1. Filtro por Usuario
    if (userId) {
        conditions.push(eq(refunds.id_user, userId));
    }

    // 2. Filtro de Borrado Lógico (Soft Delete)
    if (!includeDeleted) {
        conditions.push(isNull(refunds.deleted_at));
    }

    // 3. Filtro por Estado
    if (status && status !== "ALL") {
        conditions.push(eq(refunds.status, status as TransactionStatus));
    }

    // 4. Filtro de Búsqueda (Search) - Avanzado con soporte de UUID
    if (search) {
        const searchTerm = `%${search}%`;
        conditions.push(
            or(
                ilike(refunds.trip_id, searchTerm),
                ilike(sql`${refunds.transaction_id}::text`, searchTerm)
            )! // Usamos el "!" para evitar el falso positivo de TypeScript
        );
    }

    // Empaquetamos las condiciones de forma segura
    const whereClause = conditions.length > 0 ? and(...conditions)! : sql`1=1`;

    // 5. Armado dinámico de la cláusula ORDER BY
    // (refunds no tiene updated_at en el schema, usamos created_at)
    let orderByCondition;
    switch (sort) {
        case "amount_desc": orderByCondition = desc(refunds.amount); break;
        case "amount_asc":  orderByCondition = asc(refunds.amount); break;
        case "created_asc": orderByCondition = asc(refunds.created_at); break;
        case "created_desc":
        default:
            orderByCondition = desc(refunds.created_at);
            break;
    }

    // 6. Ejecución concurrente (Data + Count)
    const [data, [{ totalCount }]] = await Promise.all([
        db.select({
            transaction_id: refunds.transaction_id,
            trip_id: refunds.trip_id,
            clerk_id: users.id_clerk,
            amount: refunds.amount,
            refund_type: refunds.refund_type,
            status: refunds.status,
            created_at: refunds.created_at,
            deleted_at: refunds.deleted_at,
        })
            .from(refunds)
            .innerJoin(users, eq(refunds.id_user, users.id_user))
            .where(whereClause)
            .orderBy(orderByCondition)
            .limit(itemsPerPage)
            .offset(offset),

        db.select({ totalCount: sql<number>`count(*)` })
            .from(refunds)
            .innerJoin(users, eq(refunds.id_user, users.id_user))
            .where(whereClause)
    ]);

    const count = Number(totalCount);
    const totalPages = Math.ceil(count / itemsPerPage);
    const hasNextPage = page < totalPages;

    // 7. Retorno Unificado
    return {
        // Firmas Legacy (Client-side usage)
        refunds: data,
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



export async function processRefundTransaction(
    userId: number,
    tripId: string,
    refundType: "TOTAL" | "PARTIAL",
    isLateWebhook: boolean = false,
    externalTx?: any, // Inyección de dependencia de la transacción (puedes tiparlo mejor según tu config de Drizzle)
    preFetchedPayment?: any
): Promise<TransactionResult> {

    // Extraemos toda la lógica interna a una función que recibe el ejecutor (tx)
    const executeLogic = async (tx: any): Promise<TransactionResult> => {
        let paymentRecord = preFetchedPayment;

        if (!paymentRecord) {
            const [fetched] = await tx.select()
                .from(payments)
                .where(and(eq(payments.trip_id, tripId), isNull(payments.deleted_at)))
                .for('update');
            paymentRecord = fetched;
        }

        if (!paymentRecord) {
            return { status: 404, body: { error: "Payment for this trip not found.", code: "PAYMENT_NOT_FOUND" } };
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
                return { status: 409, body: { error: "Refund already processed for this trip.", code: "SERVER_ACTION_ERROR" } };
            }

            await tx.insert(refunds).values({
                trip_id: tripId,
                id_user: userId,
                amount: paymentRecord.amount,
                refund_type: refundType,
                status: "COMPLETED",
                deleted_at: null
            });

            await tx.update(users)
                .set({ balance: sql`${users.balance} + ${paymentRecord.amount}` })
                .where(eq(users.id_user, userId));

            await tx.update(payments)
                .set({ status: "REFUNDED", updated_at: new Date() })
                .where(eq(payments.transaction_id, paymentRecord.transaction_id));

            return { status: 201, body: { message: "Refund processed successfully. Balance credited." } };
        }

        return { status: 400, body: { error: `Cannot process refund. Current payment status is: ${paymentRecord.status}`, code: "SERVER_ACTION_ERROR" } };
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

            await tx.update(payments)
                .set({
                    status: "COMPLETED", // Volvemos al estado anterior para permitir reintentos o cancelaciones posteriores
                    updated_at: new Date(),
                    deleted_at: null
                })
                .where(and(eq(payments.trip_id, record.trip_id), isNull(payments.deleted_at)));

            return { success: true, message: "Refund cancelled successfully." };
        });
    } catch (error) {
        console.error(`[Service Error] Failed to cancel refund ${transactionId}:`, error);
        return { success: false, message: "Internal error in the database while cancelling the refund." };
    }
}