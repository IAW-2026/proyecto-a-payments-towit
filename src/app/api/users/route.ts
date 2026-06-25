import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPaymentsUser } from "@/db/queries/users";
import { authenticateRequest } from "@/app/lib/auth";

interface BanPayload {
    clerkId: string;
    isBanned: boolean;
}

export async function PATCH(req: NextRequest) {
    try {
        const authError = authenticateRequest(req);
        if (authError) return authError;

        const body = await req.json();
        const { clerkId, isBanned } = body as BanPayload;

        if (!clerkId || typeof clerkId !== "string" || typeof isBanned !== "boolean") {
            return NextResponse.json(
                { error: "Invalid payload. 'clerkId' (string) and 'isBanned' (boolean) are required.", code: "VALIDATION_ERROR" },
                { status: 400 }
            );
        }

        // Upsert user si no existe en la db local
        const user = await getPaymentsUser(clerkId);
        if (!user) {
            return NextResponse.json({ error: "Could not fetch or create user", code: "NOT_FOUND" }, { status: 500 });
        }

        // Actualizamos el estado
        await db.update(users)
            .set({ is_banned: isBanned })
            .where(eq(users.id_clerk, clerkId));

        return NextResponse.json(
            { message: `User ban status updated to ${isBanned}` },
            { status: 200 }
        );

    } catch (error) {
        console.error("Critical error in /api/users/ban:", error);
        return NextResponse.json(
            { error: "Internal server error", code: "SERVER_ERROR" },
            { status: 500 }
        );
    }
}
