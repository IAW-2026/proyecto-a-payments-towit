// src/app/lib/auth.ts
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "./crypto";

const COOKIE_NAME = "payments_internal_session";

// We pass as a parameter the current route to redirect back to it.
export async function getPaymentsUserId(currentPath: string = "/dashboard"): Promise<number> {
    const session = await auth();
    if (!session || !session.userId) {
        redirect("/");
    }

    const currentClerkId = session.userId;
    const cookieStore = await cookies();
    const localSessionCookie = cookieStore.get(COOKIE_NAME);

    if (localSessionCookie) {
        const rawCookieValue = decrypt(localSessionCookie.value)
        
        if(rawCookieValue)
        {
            const [cookieClerkId, cookieDbId] = rawCookieValue.split(":");
            if (cookieClerkId === currentClerkId && cookieDbId) {
                return parseInt(cookieDbId, 10);
            }
        }
    }

    // If cookie is not valid or is not created
    redirect(`/api/auth/sync?callback=${encodeURIComponent(currentPath)}`);
}