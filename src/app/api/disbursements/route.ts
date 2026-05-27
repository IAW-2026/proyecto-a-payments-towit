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

function isRequestAuthorized(req: NextRequest): boolean {
    // Busca la llave en los headers estándar de API o en Authorization
    const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
    const validKey = process.env.INTERNAL_API_SECRET;
    
    if (!validKey) {
        console.warn("CRÍTICO: INTERNAL_API_SECRET no está configurada en el servidor.");
        return false;
    }
    
    return apiKey === validKey;
}

function calculateDisbursement(totalAmount: number, feePercentage: number) {
    if (feePercentage < 0 || feePercentage >= 100) {
        throw new Error("El porcentaje de comisión debe ser mayor a 0 y menor a 100.");
    }
    
    const platformFee = totalAmount * (feePercentage / 100);
    const netAmount = totalAmount - platformFee;
    
    return { 
        platformFee: Number(platformFee.toFixed(2)), 
        netAmount: Number(netAmount.toFixed(2)) 
    };
}

async function getTripContext(clerkId: string, tripId: string) {
    const driver = await getPaymentsUser(clerkId);

    const paymentRecord = await db.query.payments.findFirst({
        where: and(
            eq(payments.trip_id, tripId),
            eq(payments.status, "COMPLETED")
        )
    });

    const existingDisbursement = await db.query.disbursements.findFirst({
        where: and(
            eq(disbursements.trip_id, tripId),
            eq(disbursements.status, "COMPLETED")
        )
    });

    return { driver, paymentRecord, existingDisbursement };
}

async function executeDisbursementTransaction(
    userId: number, 
    tripId: string, 
    netAmount: number, 
    platformFee: number, 
): Promise<void> {

    // Queries don't have to be awaited since they will be executed in a batch
    const insertDisbursementQuery = db.insert(disbursements).values({
        trip_id: tripId,
        id_user: userId,
        amount: netAmount.toString(),
        platform_fee: platformFee.toString(),
        payment_alias: "billetera.interna.towit", 
        status: "COMPLETED" as TransactionStatus,
    });

    const updateBalanceQuery = db.update(users)
        .set({ 
            balance: sql`${users.balance} + ${netAmount}` 
        })
        .where(eq(users.id_user, userId));

    await db.batch([insertDisbursementQuery, updateBalanceQuery]);
}

export async function POST(req: NextRequest) {
    try {
        if (!isRequestAuthorized(req)) {
            return NextResponse.json({ error: "No autorizado. API Key inválida o faltante." }, { status: 401 });
        }

        // Parsing and structural validation
        const body = (await req.json()) as DisbursementRequestBody;
        const { clerkId, tripId, feePercentage } = body;
        if (!clerkId || !tripId || feePercentage === undefined) {
            return NextResponse.json({ error: "Faltan parámetros obligatorios (clerkId, tripId, feePercentage)" }, { status: 400 });
        }

        // Contextual validation
        const { driver, paymentRecord, existingDisbursement } = await getTripContext(clerkId, tripId);
        if (!driver) return NextResponse.json({ error: "Could not process driver" }, { status: 500 });
        if (!paymentRecord) return NextResponse.json({ error: "Trip payment not found" }, { status: 400 });
        if (existingDisbursement) return NextResponse.json({ error: "Trip already disbursed" }, { status: 409 });

        
        let calculation;
        try {
            calculation = calculateDisbursement(Number(paymentRecord.amount), feePercentage);
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }


        await executeDisbursementTransaction(
            driver.userId,
            tripId,
            calculation.netAmount,
            calculation.platformFee,
        );

        return NextResponse.json({
            message: "Disbursement successful",
        }, { status: 201 });

    } catch (error) {
        console.error("Critical error during disbursement:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}