// src/app/api/disbursements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, payments, disbursements } from "@/db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";
import { TransactionStatus } from "@/types/transaction";
import { getPaymentsUser } from "@/db/queries/users";
import { getFilteredDisbursements, GetDisbursementsParams } from "@/services/disbursement.service";

interface DisbursementRequestBody {
    clerkId: string;
    tripId: string;
    feePercentage: number; // Se explicita que es un porcentaje (ej. 15 para 15%)
}

interface TransactionResult {
    status: number;
    body: {
        message?: string;
        error?: string;
    };
}

function isRequestAuthorized(req: NextRequest): boolean {
    // Busca la llave en los headers estándar de API o en Authorization
    const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
    const validKey = process.env.INTERNAL_API_SECRET;
    
    if (!validKey) {
        console.warn("Critical: INTERNAL_API_SECRET not configured.");
        return false;
    }
    
    return apiKey === validKey;
}

async function executeDisbursementTransaction(
    clerkId: string, 
    tripId: string, 
    feePercentage: number
): Promise<TransactionResult> {

    const driver = await getPaymentsUser(clerkId);
    if (!driver) {
        return { status: 404, body: { error: "Driver not found in database" } };
    }

    try {
        return await db.transaction(async (tx) => {            
            const [paymentRecord] = await tx.select()
                .from(payments)
                .where(and(eq(payments.trip_id, tripId), isNull(payments.deleted_at)))
                .for('update'); 

            if (!paymentRecord) {
                return { status: 404, body: { error: "Trip payment not found" } };
            }

            if (paymentRecord.status !== "COMPLETED") {
                return { status: 400, body: { error: `Cannot disburse. Payment status is ${paymentRecord.status}` } };
            }

            const platformFee = Number(paymentRecord.amount) * (feePercentage / 100);
            const netAmount = Number(paymentRecord.amount) - platformFee;

            // If trip is already disbursed, throws error 23055  
            await tx.insert(disbursements).values({
                trip_id: tripId,
                id_user: driver.userId,
                amount: netAmount.toFixed(2),
                platform_fee: platformFee.toFixed(2),
                status: "COMPLETED",
                deleted_at: null,
            });

            await tx.update(users)
                .set({ 
                    balance: sql`${users.balance} + ${netAmount.toFixed(2)}` 
                })
                .where(eq(users.id_user, driver.userId));
            

            await tx.update(payments)
                .set({ 
                    status: "DISBURSED", // Actualizamos a nuestro nuevo estado terminal
                    updated_at: new Date(),
                    deleted_at: null
                })
                .where(and(eq(payments.trip_id, tripId), isNull(payments.deleted_at)));


            return { status: 201, body: { message: "Disbursement successful" } };
        });

    } catch (error: any) {
        if (error.code === '23505' || (error.message && error.message.includes('unique constraint'))) {
            console.warn(`[Concurrency] Double disbursement attempt blocked for trip: ${tripId}`);
            return { status: 409, body: { error: "Conflict: The trip has already been disbursed." } };
        }

        console.error(`Critical DB error during disbursement for trip ${tripId}:`, error);
        return { status: 500, body: { error: "Internal server error during transaction" } };
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!isRequestAuthorized(req)) {
            return NextResponse.json({ error: "Missing or invalid API key" }, { status: 401 });
        }

        const body = (await req.json()) as DisbursementRequestBody;
        const { clerkId, tripId, feePercentage } = body;
        
        if (!clerkId || !tripId || feePercentage === undefined) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        if (feePercentage < 0 || feePercentage >= 100) {
            return NextResponse.json({ error: "Fee percentage must be between 0 and 99" }, { status: 400 });
        }

        const result = await executeDisbursementTransaction(clerkId, tripId, feePercentage);

        return NextResponse.json(result.body, { status: result.status });

    } catch (error: any) {
        console.error("Critical server error in POST /api/disbursements:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
  try {
    // 1. Autenticación Server-to-Server (S2S) vía API Key
    const authError = authenticateRequest(req);
    if (authError) 
      return authError;

    // 2. Extracción y parseo de parámetros HTTP
    const { searchParams } = new URL(req.url);
    
    // Armamos el objeto con la interfaz exacta del servicio
    const params: GetDisbursementsParams = {
      page: Number(searchParams.get("page")) || 1,
      itemsPerPage: Number(searchParams.get("limit")) || 25,
      search: searchParams.get("search") || undefined,
      status: searchParams.get("status") || undefined,
      sort: searchParams.get("sort") || undefined,
      includeDeleted: true, 
    };

    // 3. Llamada a la capa de servicio
    const result = await getFilteredDisbursements(params);

    // 4. Devolución de la respuesta
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("[GET /api/disbursements] Error interno:", error);
    return NextResponse.json(
      { error: "Ocurrió un error interno en el servidor al procesar las liquidaciones." }, 
      { status: 500 }
    );
  }
}

function authenticateRequest(req: NextRequest): NextResponse | null {
    const authHeader = req.headers.get("x-api-key");
    const expectedSecret = process.env.INTERNAL_API_SECRET;

    if (!expectedSecret) {
        console.error("INTERNAL_API_SECRET is not configured.");
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    if (!authHeader || authHeader !== expectedSecret) {
        return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    return null;
}