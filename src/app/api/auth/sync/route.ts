import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "payments_internal_session";
const COOKIE_EXPIRATION = 60 * 60; // 1 hora

export async function GET(request: Request) {    
    const session = await auth();
    if (!session || !session.userId) {
        redirect("/");
    }

    const currentClerkId = session.userId;
    
    const { searchParams } = new URL(request.url);
    const callbackUrl = searchParams.get("callback") || "/dashboard";

    let dbUser = await db.query.users.findFirst({
        where: eq(users.id_clerk, currentClerkId),
    });

    if (!dbUser) {
        try {
            const [newUser] = await db.insert(users).values({
                id_clerk: currentClerkId,
            }).returning();
            dbUser = newUser;
        } catch (error) {
            console.error("Error crítico durante la creación lazy del usuario:", error);
            return new Response("Error interno del servidor", { status: 500 });
        }
    }

    const secureCookieValue = `${currentClerkId}:${dbUser.id_user}`;
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