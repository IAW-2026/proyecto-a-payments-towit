import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, payments, refunds } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getPaymentsUser } from "@/db/queries/users";
import { getFilteredRefunds, GetRefundsParams, processRefundTransaction } from "@/services/refund.service";

interface RefundPayload {
    tripId: string;
    clerkId: string;
    refundType: "TOTAL" | "PARTIAL";
}

interface TransactionResult {
    status: number;
    body: {
        message?: string;
        error?: string;
    };
}

export async function POST(req: NextRequest) {
    try {
        const authError = requestAuthorization(req);
        if (authError) return authError;

        const body = await req.json();
        const payloadError = validateRefundPayload(body);
        if (payloadError) return payloadError;
        const { tripId, clerkId, refundType } = body as RefundPayload;


        const user = await getPaymentsUser(clerkId);
        if (!user) {
            return NextResponse.json({ error: "User not found." }, { status: 404 });
        }

        if (user.is_banned) {
            return NextResponse.json({ error: "User is banned from receiving refunds" }, { status: 403 });
        }

        // Business logic and state management 
        const result = await processRefundTransaction(user.userId, tripId, refundType);   

        return NextResponse.json(result.body, { status: result.status });

    } catch (error) {
        console.error("Critical error in /api/refunds:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
  try {
    // 1. Autenticación Server-to-Server (S2S) vía API Key
    const authError = requestAuthorization(req);
    if (authError) return authError;

    // 2. Extracción y parseo de parámetros HTTP
    const { searchParams } = new URL(req.url);
    
    // Armamos el objeto respetando el contrato estricto del servicio
    const params: GetRefundsParams = {
      page: Number(searchParams.get("page")) || 1,
      itemsPerPage: Number(searchParams.get("limit")) || 25,
      search: searchParams.get("search") || undefined,
      status: searchParams.get("status") || undefined,
      sort: searchParams.get("sort") || undefined,
      includeDeleted: true, 
    };

    // 3. Llamada a la capa de servicio
    const result = await getFilteredRefunds(params);

    // 4. Devolución de la respuesta
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("[GET /api/refunds] Error interno:", error);
    return NextResponse.json(
      { error: "Ocurrió un error interno en el servidor al procesar los reembolsos." }, 
      { status: 500 }
    );
  }
}

function requestAuthorization(req: NextRequest): NextResponse | null {
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "") || req.headers.get("x-api-key");
    const expectedSecret = process.env.INTERNAL_API_SECRET;

    if (!expectedSecret) {
        console.error("INTERNAL_API_SECRET is missing in environment variables.");
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    if (!authHeader || authHeader !== expectedSecret) {
        return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    return null;
}

function validateRefundPayload(payload: Partial<RefundPayload>): NextResponse | null {
    const { tripId, clerkId, refundType } = payload;

    if (!tripId || typeof tripId !== "string" || !clerkId || typeof clerkId !== "string") {
        return NextResponse.json(
            { error: "Invalid payload. 'tripId' and 'clerkId' must be provided as strings." },
            { status: 400 }
        );
    }

    if (!refundType || !["TOTAL", "PARTIAL"].includes(refundType)) {
        return NextResponse.json(
            { error: "Invalid payload. 'refundType' must be 'TOTAL' or 'PARTIAL'." },
            { status: 400 }
        );
    }

    return null;
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