import AdminBackButton from "@/components/admin/AdminBackButton";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const { userId, sessionClaims } = await auth();

    const isAdmin = sessionClaims?.role === "admin";

    if (!userId || !isAdmin) {
        notFound(); 
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <main>
                {children}
                <AdminBackButton />
            </main>
        </div>
    );
}