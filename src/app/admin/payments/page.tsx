import { db } from "@/db";
import { payments } from "@/db/schema";
import { desc, isNull, sql } from "drizzle-orm";
import PaymentsClient from "./PaymentsClient"; // Importamos el Client Wrapper
import PaginationControls from "@/components/admin/PaginationControls";

export const dynamic = 'force-dynamic';

interface PageProps {
 	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminPaymentsPage(props: PageProps) {
	const searchParams = await props.searchParams;
	
	const page = Number(searchParams.page) || 1;
	const limit = Number(searchParams.limit) || 25; // 25 por defecto como pediste
	const offset = (page - 1) * limit;
	
	
	const [paginatedPayments, [{ totalCount }]] = await Promise.all([
		db.select()
		.from(payments)
		.where(isNull(payments.deleted_at))
		.orderBy(desc(payments.created_at))
		.limit(limit)
		.offset(offset),
		
		db.select({ totalCount: sql<number>`count(*)` })
		.from(payments)
		.where(isNull(payments.deleted_at))
 	 ]);

	const totalPages = Math.ceil(Number(totalCount) / limit);


	return (
		<div className="max-w-7xl mx-auto p-8">
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">Gestión de Pagos</h1>
				<p className="text-gray-500 text-sm mt-1">Selecciona una fila para aplicar operaciones.</p>
			</div>

			<PaymentsClient data={paginatedPayments} />

			{totalPages > 0 && (
        		<PaginationControls totalPages={totalPages} currentPage={page} />
     		)}
		</div>
	);
}