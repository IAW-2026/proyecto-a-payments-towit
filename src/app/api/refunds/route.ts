import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, payments, refunds } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getPaymentsUser } from "@/db/queries/users";

// --- Types & Interfaces ---

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
        const result = await executeSafeRefundProcess(user.userId, trip_id, refund_type, reason);

        return NextResponse.json(result.body, { status: result.status });

    } catch (error) {
        console.error("Critical error in /api/refunds:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

async function executeSafeRefundProcess(
    userId: number,
    tripId: string,
    refundType: "TOTAL" | "PARTIAL",
    reason: string
): Promise<TransactionResult> {
    
    // The entire business flow is wrapped in a single ACID transaction
    return await db.transaction(async (tx) => {
        
        // 1. FETCH WITH WRITE LOCK
        // This locks the specific payment row.
        const [paymentRecord] = await tx.select()
            .from(payments)
            .where(eq(payments.trip_id, tripId))
            .for('update');

        if (!paymentRecord) {
            return { status: 404, body: { error: "Payment for this trip not found." } };
        }

        // 2. STATE A: Payment is PENDING -> Transition to CANCELLED
        if (paymentRecord.status === "PENDING") {
            await tx.update(payments)
                .set({ 
                    status: "CANCELLED", 
                    updated_at: new Date() 
                })
                .where(eq(payments.transaction_id, paymentRecord.transaction_id));
            
            return { 
                status: 200, 
                body: { message: "Payment was pending and has been cancelled. No balance changes applied." } 
            };
        }

        // 3. STATE B: Payment is COMPLETED -> Process Financial Refund
        if (paymentRecord.status === "COMPLETED") {
            
            // Check for existing refunds to ensure idempotency
            const [existingRefund] = await tx.select()
                .from(refunds)
                .where(eq(refunds.trip_id, tripId));

            if (existingRefund) {
                return { status: 409, body: { error: "Refund already processed for this trip." } };
            }

            // Create the refund log
            await tx.insert(refunds).values({
                trip_id: tripId,
                id_user: userId,
                amount: paymentRecord.amount, 
                refund_type: refundType,
                // reason: reason, // Uncomment if 'reason' is added to schema.ts in the future
                external_id: null,
            });

            // Safely credit the user's internal balance
            await tx.update(users)
                .set({ 
                    balance: sql`${users.balance} + ${paymentRecord.amount}` 
                })
                .where(eq(users.id_user, userId));
            
            // Mark original payment as REFUNDED
            await tx.update(payments)
                .set({ 
                    status: "REFUNDED", 
                    updated_at: new Date() 
                })
                .where(eq(payments.transaction_id, paymentRecord.transaction_id));

            return { 
                status: 201, 
                body: { message: "Refund processed successfully. Balance credited." } 
            };
        }

        // Invalid states (e.g., already CANCELLED, REFUNDED, FAILED)
        return { 
            status: 400, 
            body: { error: `Cannot process refund. Current payment status is: ${paymentRecord.status}` } 
        };
        
    });
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