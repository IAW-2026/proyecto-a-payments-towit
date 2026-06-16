"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";

export default function SearchBar() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    // Inicializamos el estado con el valor actual de la URL (si el usuario recarga la página, no se borra lo que buscó)
    const [searchTerm, setSearchTerm] = useState(searchParams.get("search")?.toString() || "");

    const handleSearch = (e: React.SubmitEvent<HTMLFormElement>) => {
        // Prevenimos que la página se recargue por completo (comportamiento por defecto del form)
        e.preventDefault();
        
        // Clonamos los parámetros actuales por si hay otros en la URL (ej: ?page=2&sort=asc)
        const params = new URLSearchParams(searchParams);
        
        if (searchTerm.trim()) {
            params.set("search", searchTerm.trim());
        } else {
            params.delete("search"); // Si borró todo, quitamos el parámetro para mantener la URL limpia
        }
        
        // Usamos replace en lugar de push para no llenar el historial del navegador con cada búsqueda
        replace(`${pathname}?${params.toString()}`);
    };

    return (
        <form 
            onSubmit={handleSearch} 
            className="relative w-full max-w-md mx-auto group"
        >
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar registros..."
                className="block w-full pl-4 pr-12 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm hover:shadow-md"
            />
            
            <button 
                type="submit" 
                className="absolute inset-y-0 right-0 pr-3 pl-2 flex items-center text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none rounded-r-2xl"
                aria-label="Buscar"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </button>
        </form>
    );
}