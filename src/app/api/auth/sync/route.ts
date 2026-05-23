import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encrypt } from "@/app/lib/crypto";
import { getPaymentsUserId } from "@/db/queries/users";

const COOKIE_NAME = "payments_internal_session";
const COOKIE_EXPIRATION = 60 * 60; // 1 hora

export async function GET(request: Request) {    
    const session = await auth();
    if (!session || !session.userId) {
        redirect("/");
    }

    const currentClerkId = session.userId;
    
    const { searchParams } = new URL(request.url);
    const callbackUrl = searchParams.get("callback") || "/";

    let dbUserId = await getPaymentsUserId(currentClerkId);
    // Check later how to show an error message to the user instead of just returning a response with the error, maybe redirect to an error page or something like that
    if (dbUserId === null) {
        return new Response("Critical error during user id retrieval.", { status: 500 });
    }

    const rawCookieValue = `${currentClerkId}:${dbUserId}`;
    const secureCookieValue = encrypt(rawCookieValue);
    const cookieStore = await cookies();
    
    cookieStore.set(COOKIE_NAME, secureCookieValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: COOKIE_EXPIRATION
    });

    redirect(callbackUrl);
}