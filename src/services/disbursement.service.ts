import { TransactionStatus } from "@/types/transaction";
import { db } from "@/db";
import { disbursements, payments, users } from "@/db/schema";
import { eq, isNull, and, sql, SQL, ilike, desc, asc, or } from "drizzle-orm";

interface ServiceResponse {
  success: boolean;
  message?: string;
}

export interface DisbursementResponse {
  transaction_id: string;
  trip_id: string;
  clerk_id: string;
  amount: string;
  platform_fee: string;
  status: TransactionStatus;
  created_at: Date;
  deleted_at: Date | null;
}

export interface GetDisbursementsParams {
  userId?: number; // Lo hacemos opcional para el panel de administración
  search?: string;
  status?: string;
  sort?: string;
  page: number;
  itemsPerPage: number;
  includeDeleted?: boolean; // Permite unificar consultas del cliente y del Control Plane
}

export async function getFilteredDisbursements(params: GetDisbursementsParams) {
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

  // 1. Filtro por Usuario (ahora es opcional)
  if (userId) {
    conditions.push(eq(disbursements.id_user, userId));
  }

  // 2. Filtro de Borrado Lógico (Soft Delete)
  if (!includeDeleted) {
    conditions.push(isNull(disbursements.deleted_at));
  }

  // 3. Filtro por Estado
  if (status && status !== "ALL") {
    conditions.push(eq(disbursements.status, status as TransactionStatus));
  }

  // 4. Filtro de Búsqueda (Search) - Avanzado con soporte de UUID
  if (search) {
    const searchTerm = `%${search}%`;
    conditions.push(
      or(
        ilike(disbursements.trip_id, searchTerm),
        ilike(sql`${disbursements.transaction_id}::text`, searchTerm)
      )! // Usamos el "!" para evitar el falso positivo de TypeScript
    );
  }

  // Empaquetamos las condiciones de forma segura
  const whereClause = conditions.length > 0 ? and(...conditions)! : sql`1=1`;

  // 5. Armado dinámico de la cláusula ORDER BY
  // (disbursements no tiene updated_at en el schema, usamos created_at)
  let orderByCondition;
  switch (sort) {
    case "amount_desc": orderByCondition = desc(disbursements.amount); break;
    case "amount_asc": orderByCondition = asc(disbursements.amount); break;
    case "created_asc": orderByCondition = asc(disbursements.created_at); break;
    case "created_desc":
    default:
      orderByCondition = desc(disbursements.created_at);
      break;
  }

  // 6. Ejecución concurrente (Data + Count)
  const [data, [{ totalCount }]] = await Promise.all([
    db.select({
      transaction_id: disbursements.transaction_id,
      trip_id: disbursements.trip_id,
      clerk_id: users.id_clerk,
      amount: disbursements.amount,
      platform_fee: disbursements.platform_fee,
      status: disbursements.status,
      created_at: disbursements.created_at,
      deleted_at: disbursements.deleted_at,
    })
      .from(disbursements)
      .innerJoin(users, eq(disbursements.id_user, users.id_user))
      .where(whereClause)
      .orderBy(orderByCondition)
      .limit(itemsPerPage)
      .offset(offset),

    db.select({ totalCount: sql<number>`count(*)` })
      .from(disbursements)
      .innerJoin(users, eq(disbursements.id_user, users.id_user))
      .where(whereClause)
  ]);

  const count = Number(totalCount);
  const totalPages = Math.ceil(count / itemsPerPage);
  const hasNextPage = page < totalPages;

  // 7. Retorno Unificado
  return {
    // Firmas Legacy (Client-side usage)
    disbursements: data,
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
          status: 'CANCELLED'
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