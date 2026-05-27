import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export type userInformation = {
    userId: number;
    balance: string;
}

export async function getPaymentsUser(clerkId: string): Promise<userInformation | null> {
    let dbUser = await db.query.users.findFirst({
        where: eq(users.id_clerk, clerkId),
    });

    if (!dbUser) {
        try {
            const [newUser] = await db.insert(users).values({
                id_clerk: clerkId,
            }).returning();
            dbUser = newUser;
        } catch (error) {
            console.error("Critical error during lazy creation of user:", error);
            return null;
        }
    }

    return { userId: dbUser.id_user, balance: dbUser.balance };
}