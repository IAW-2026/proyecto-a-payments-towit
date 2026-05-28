import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export type userInformation = {
    userId: number;
    balance: string;
}

export async function getPaymentsUser(clerkId: string): Promise<userInformation | null> {
    // No race conditions since clerkId is unique and we do an upsert
    const [dbUser] = await db.insert(users)
        .values({ id_clerk: clerkId })
        .onConflictDoUpdate({
            target: users.id_clerk,
            set: { id_clerk: sql`EXCLUDED.clerk_id` } 
        })
        .returning();

    return { userId: dbUser.id_user, balance: dbUser.balance };
}