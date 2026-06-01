import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, payments, refunds } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getPaymentsUser } from "@/db/queries/users";
import { processRefundTransaction } from "@/services/refund.service";

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

        // Business logic and state management 
        const result = await processRefundTransaction(user.userId, tripId, refundType);   

        return NextResponse.json(result.body, { status: result.status });

    } catch (error) {
        console.error("Critical error in /api/refunds:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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