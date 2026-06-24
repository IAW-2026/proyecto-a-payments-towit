import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "./crypto";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "payments_internal_session";

export interface PaymentsUser {
    id_user: number;
    clerkId: string;
    email: string;
    fullName: string;
}

export async function ReadCookieUserInformation(currentPath: string = "/"): Promise<PaymentsUser> {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
        redirect("/");
    }

    const cookieStore = await cookies();
    const localSessionCookie = cookieStore.get(COOKIE_NAME);
    let dbUserId: number | null = null;

    if (localSessionCookie) {
        const rawCookieValue = decrypt(localSessionCookie.value);
        if (rawCookieValue) {
            const [cookieClerkId, cookieDbId] = rawCookieValue.split(":");
            if (cookieClerkId === userId && cookieDbId) {
                dbUserId = parseInt(cookieDbId, 10);
            }
        }
    }

    if (dbUserId === null || Number.isNaN(dbUserId)) {
        redirect(`/api/auth/sync?callback=${encodeURIComponent(currentPath)}`);
    }

    return {
        id_user: dbUserId,
        clerkId: userId,
        email: sessionClaims?.email || "sin-email@towit.com",
        fullName: sessionClaims?.fullName || "Usuario de TowIt",
    };
}

export function authenticateRequest(req: NextRequest): NextResponse | null {
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "") || req.headers.get("x-api-key");
    const expectedSecret = process.env.INTERNAL_API_SECRET;

    if (!expectedSecret) {
        console.error("CRITICAL: INTERNAL_API_SECRET is missing in environment variables.");
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    if (!authHeader || authHeader !== expectedSecret) {
        return NextResponse.json({ error: "Not authorized. Invalid credentials." }, { status: 401 });
    }

    return null;
}
