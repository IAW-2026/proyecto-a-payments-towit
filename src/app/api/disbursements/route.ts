// src/app/api/disbursements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, payments, disbursements } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { TransactionStatus } from "@/types/transaction";
import { getPaymentsUser } from "@/db/queries/users";

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
                .where(eq(payments.trip_id, tripId))
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
                payment_alias: "billetera.interna.towit", 
                status: "COMPLETED",
            });

            await tx.update(users)
                .set({ 
                    balance: sql`${users.balance} + ${netAmount.toFixed(2)}` 
                })
                .where(eq(users.id_user, driver.userId));
            

            await tx.update(payments)
                .set({ 
                    status: "DISBURSED", // Actualizamos a nuestro nuevo estado terminal
                    updated_at: new Date()
                })
                .where(eq(payments.trip_id, tripId));


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