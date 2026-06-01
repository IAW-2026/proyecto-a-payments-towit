'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface PaginationControlsProps {
	totalPages: number;
	currentPage: number;
}

export default function PaginationControls({ totalPages, currentPage }: PaginationControlsProps) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const router = useRouter();

	// Función pura para construir la nueva URL sin perder otros filtros que puedan existir
	const createPageURL = (pageNumber: number | string) => {
		const params = new URLSearchParams(searchParams);
		params.set('page', pageNumber.toString());
		return `${pathname}?${params.toString()}`;
	};

	const isFirstPage = currentPage <= 1;
	const isLastPage = currentPage >= totalPages || totalPages === 0;

	return (
		<div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 mt-4 rounded-xl shadow-sm">
			<div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
				<div>
					<p className="text-sm text-gray-700">
						Página <span className="font-semibold">{currentPage}</span> de{' '}
						<span className="font-semibold">{totalPages || 1}</span>
					</p>
				</div>
				<div>
					<nav className="inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
						<button
							onClick={() => router.push(createPageURL(currentPage - 1))}
							disabled={isFirstPage}
							className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							Anterior
						</button>
						<button
							onClick={() => router.push(createPageURL(currentPage + 1))}
							disabled={isLastPage}
							className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							Siguiente
						</button>
					</nav>
				</div>
			</div>

			{/* Versión Móvil */}
			<div className="flex flex-1 justify-between sm:hidden">
				<button
					onClick={() => router.push(createPageURL(currentPage - 1))}
					disabled={isFirstPage}
					className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
				>
					Anterior
				</button>
				<button
					onClick={() => router.push(createPageURL(currentPage + 1))}
					disabled={isLastPage}
					className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
				>
					Siguiente
				</button>
			</div>
		</div>
	);
}