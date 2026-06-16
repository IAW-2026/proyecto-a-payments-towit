"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import React from "react";

interface Option {
    label: string;
    value: string;
}

interface DropdownProps {
    paramKey: string; // El nombre del parámetro en la URL (ej: "status" o "sort")
    mode: "filter" | "sort"; // Propiedad clave para separar lógica de negocio
    options: Option[];
    placeholder: string;
    icon?: React.ReactNode;
}

export default function Dropdown({ paramKey, mode, options, placeholder, icon }: DropdownProps) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const currentValue = searchParams.get(paramKey) || "";

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const params = new URLSearchParams(searchParams);
        const value = e.target.value;

        // 1. Actualizamos el valor en la URL
        if (value) {
            params.set(paramKey, value);
        } else {
            params.delete(paramKey);
        }

        // 2. Lógica de negocio basada en el prop 'mode'
        if (mode === "filter") {
            // Si el usuario cambia un FILTRO, reseteamos la paginación a 1 para evitar bugs de páginas vacías
            params.delete("page"); 
        } 
        // Si el mode === "sort", podríamos mantener la página actual o hacer otra lógica. 
        // Por consistencia en UX, a veces también se borra la página al ordenar.
        else if (mode === "sort") {
             params.delete("page"); 
        }

        // 3. Ejecutamos la navegación sin recargar la página
        replace(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="relative w-full">
            {icon && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    {icon}
                </div>
            )}
            <select
                value={currentValue}
                onChange={handleChange}
                className={`block w-full ${icon ? 'pl-10' : 'pl-4'} pr-10 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm hover:shadow-md appearance-none cursor-pointer`}
            >
                <option value="">{placeholder}</option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    );
}