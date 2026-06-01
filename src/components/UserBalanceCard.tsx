import React from "react";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function UserBalanceCard({ userId }: { userId: number }) {
    const [userRecord] = await db
        .select({ balance: users.balance })
        .from(users)
        .where(eq(users.id_user, userId))
        .limit(1);

    const rawBalance = userRecord ? Number(userRecord.balance) : 0;

    const formattedBalance = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
    }).format(rawBalance);

    return (
        <div className="w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 group">
            
            {/* Bloque de Texto Minimalista */}
            <div className="flex flex-col">
                <span className="text-slate-500 text-xs sm:text-sm font-bold uppercase tracking-widest mb-1.5">
                    Balance Disponible
                </span>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                        {formattedBalance}
                    </span>
                    <span className="text-slate-400 font-medium text-sm sm:text-base uppercase">
                        ARS
                    </span>
                </div>
            </div>

            {/* Ícono Discreto pero Profesional */}
            <div className="hidden sm:flex p-4 bg-slate-50 rounded-2xl border border-slate-100 self-start md:self-auto flex-shrink-0 group-hover:bg-indigo-50 group-hover:border-indigo-100 group-hover:text-indigo-600 transition-colors duration-200 text-slate-400">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
        </div>
    );
}