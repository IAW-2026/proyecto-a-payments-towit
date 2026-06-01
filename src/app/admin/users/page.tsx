import { db } from "@/db";
import { users } from "@/db/schema";
import UsersClient from "./UsersClient";
import { desc, sql } from "drizzle-orm";
import PaginationControls from "@/components/admin/PaginationControls";

export const dynamic = 'force-dynamic';

interface PageProps {
 	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminUsersPage(props: PageProps) {
  const searchParams = await props.searchParams;
	
	const page = Number(searchParams.page) || 1;
	const limit = Number(searchParams.limit) || 25; // 25 por defecto como pediste
	const offset = (page - 1) * limit;
  
  const [paginatedUsers, [{ totalCount }]] = await Promise.all([
    db.select()
    .from(users)
    .orderBy(desc(users.id_user))
    .limit(limit)
    .offset(offset),
    
    db.select({ totalCount: sql<number>`count(*)` })
    .from(users)
  ]);

  const totalPages = Math.ceil(Number(totalCount) / limit);

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
        <p className="text-gray-500 text-sm mt-1">Directorio de usuarios registrados en el sistema financiero.</p>
      </div>
      <UsersClient data={paginatedUsers} />

      {totalPages > 0 && (
                  <PaginationControls totalPages={totalPages} currentPage={page} />
      )}
    </div>
  );
}