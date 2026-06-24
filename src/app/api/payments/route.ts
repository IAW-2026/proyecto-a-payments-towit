import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { getPaymentsUser } from "@/db/queries/users";
import { getFilteredPayments, GetPaymentsParams } from "@/services/payment.service";
import { authenticateRequest } from "@/app/lib/auth";


interface PaymentPayload {
    tripId: string;
    clerkId: string;
    amount: number;
}

export async function POST(req: NextRequest) {
    try {
        // Authorize
        const authError = authenticateRequest(req);
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

    } catch (error: any) {
        if (error.message === 'BANNED_USER') {
            return NextResponse.json(
                { error: "User is banned from making payments" },
                { status: 403 }
            );
        }
        console.error("Critical error in /api/payments:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
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

    if (user.is_banned) {
        throw new Error('BANNED_USER');
    }

    try {
        const result = await db.insert(payments).values({
            trip_id: tripId,
            id_user: user.userId,
            amount: amount.toString(),
            status: "PENDING",
            external_id: null,
            deleted_at: null,
        }).returning({
            transactionId: payments.transaction_id,
        });

        if (result.length === 0) {
            return null;
        }

        return result[0].transactionId;

    } catch (error: any) {
        if (error.code === '23505') {
            console.warn(`[DB] Intento de pago duplicado interceptado para el viaje: ${tripId}`);
            return null;
        }

        throw error;
    }
}

export async function GET(req: NextRequest) {
    try {
        // 1. Autorización
        const authError = authenticateRequest(req);
        if (authError) return authError;

        // 2. Extracción y parseo de parámetros HTTP
        const { searchParams } = new URL(req.url);

        // CORRECCIÓN: Adaptamos los nombres a la interfaz GetPaymentsParams
        const params: GetPaymentsParams = {
            page: Number(searchParams.get("page")) || 1,
            itemsPerPage: Number(searchParams.get("limit")) || 25,
            search: searchParams.get("search") || undefined,
            status: searchParams.get("status") || undefined,
            sort: searchParams.get("sort") || undefined,
            includeDeleted: true,
        };

        // 3. Llamada a la capa de servicio usando la función unificada
        const result = await getFilteredPayments(params);

        // 4. Devolución de la respuesta
        return NextResponse.json(result, { status: 200 });

    } catch (error) {
        console.error("[GET /api/payments] Error interno:", error);
        return NextResponse.json(
            { error: "Ocurrió un error interno en el servidor al procesar los pagos." },
            { status: 500 }
        );
    }
}
