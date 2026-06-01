import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, payments, refunds } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getPaymentsUser } from "@/db/queries/users";
import { processRefundTransaction } from "@/services/refund.service";

interface RefundPayload {
    trip_id: string;
    clerk_id: string;
    reason: string;
    refund_type: "TOTAL" | "PARTIAL";
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
        const { trip_id, clerk_id, reason, refund_type } = body as RefundPayload;


        const user = await getPaymentsUser(clerk_id);
        if (!user) {
            return NextResponse.json({ error: "User not found." }, { status: 404 });
        }

        // Business logic and state management 
        const result = await processRefundTransaction(user.userId, trip_id, refund_type);   

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
    const { trip_id, clerk_id, reason, refund_type } = payload;

    if (!trip_id || typeof trip_id !== "string" || !clerk_id || typeof clerk_id !== "string") {
        return NextResponse.json(
            { error: "Invalid payload. 'trip_id' and 'clerk_id' must be provided as strings." },
            { status: 400 }
        );
    }

    if (!refund_type || !["TOTAL", "PARTIAL"].includes(refund_type)) {
        return NextResponse.json(
            { error: "Invalid payload. 'refund_type' must be 'TOTAL' or 'PARTIAL'." },
            { status: 400 }
        );
    }

    if (!reason || typeof reason !== "string") {
        return NextResponse.json(
            { error: "Invalid payload. 'reason' is required." },
            { status: 400 }
        );
    }

    return null;
}