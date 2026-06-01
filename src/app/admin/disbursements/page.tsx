import { db } from "@/db";
import { disbursements } from "@/db/schema";
import { desc, isNull, sql } from "drizzle-orm";
import DisbursementsClient from "./DisbursementsClient";
import PaginationControls from "@/components/admin/PaginationControls";

export const dynamic = 'force-dynamic';

interface PageProps {
 	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminDisbursementsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  
  const page = Number(searchParams.page) || 1;
  const limit = Number(searchParams.limit) || 25;
  const offset = (page - 1) * limit;

  const [paginatedDisbursements, [{ totalCount }]] = await Promise.all([
    db.select()
      .from(disbursements)
      .orderBy(desc(disbursements.created_at))
      .limit(limit)
      .offset(offset),
    
    db.select({ totalCount: sql<number>`count(*)` })
      .from(disbursements)
  ]);

  const totalPages = Math.ceil(Number(totalCount) / limit);

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Liquidaciones</h1>
        <p className="text-gray-500 text-sm mt-1">Pagos emitidos a conductores. Selecciona una fila para revertir.</p>
      </div>
      <DisbursementsClient data={paginatedDisbursements} />

      {totalPages > 0 && (
        <PaginationControls totalPages={totalPages} currentPage={page} />
      )}
    </div>
  );
}