import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { getPaymentsUser } from "@/db/queries/users";


interface PaymentPayload {
    tripId: string;
    clerkId: string;
    amount: number;
}

export async function POST(req: NextRequest) {
    try {
        // Authorize
        const authError = requestAuthorization(req);
        if (authError) return authError;

        // Parse and Validate Data
        const body = await req.json();
        const validationError = requestDataValidation(body);
        if (validationError) return validationError;
        
        const { tripId, clerkId, amount } = body as PaymentPayload;

        const newTransactionId = await executePaymentInsertion(tripId, clerkId, amount);
        if (!newTransactionId) {
            console.warn(`Payment for tripId ${tripId} already exists. ClerkId: ${clerkId}, Amount: ${amount}`);
            return NextResponse.json(
                { error: "Payment already exists." },
                { status: 409 }
            );
        }

        return NextResponse.json(
            {
                message: "Transaction created successfully",
                transaction_id: newTransactionId
            },
            { status: 201 }
        );

    } catch (error) {
        console.error("Critical error in /api/payments:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

function requestAuthorization(req: NextRequest): NextResponse | null {
    const authHeader = req.headers.get("authorization");
    const expectedSecret = process.env.INTERNAL_API_SECRET;

    if (!expectedSecret) {
        console.error("Falta configurar INTERNAL_API_SECRET en el entorno.");
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    return null;
}

function requestDataValidation(payload: Partial<PaymentPayload>): NextResponse | null {
    const { tripId, clerkId, amount } = payload;

    if (!tripId || typeof tripId !== "string" || !clerkId || typeof clerkId !== "string" || typeof amount !== "number") {
        return NextResponse.json(
            { error: "Invalid payload. tripId (string), clerkId (string) and amount (number) are required." },
            { status: 400 }
        );
    }

    if (amount <= 0) {
        return NextResponse.json({ error: "The amount must be greater than 0" }, { status: 400 });
    }

    return null;
}

async function executePaymentInsertion(tripId: string, clerkId: string, amount: number): Promise<string | null> {
    const user = await getPaymentsUser(clerkId);
    if (!user) {
        throw new Error(`El usuario de Clerk ${clerkId} no existe en la base de datos local.`);
    }
    
    const result = await db.insert(payments).values({
        trip_id: tripId,
        id_user: user.userId,
        amount: amount.toString(),
        status: "PENDING",
        external_id: null,
    }).onConflictDoNothing({ target: payments.trip_id })
    .returning({
        transactionId: payments.transaction_id,
    });

    if (result.length === 0) {
        return null; 
    }

    return result[0].transactionId;
}