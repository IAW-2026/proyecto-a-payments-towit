"use client";

import React from "react";
import SearchBar from "./SearchBar";
import Dropdown from "./Dropdown";
import { TransactionStatus } from "@/types/transaction";

export type TransactionType = "payments" | "disbursements" | "refunds";

interface TransactionControlBarProps {
    type?: TransactionType; // opcional con "payments" por defecto
}

// 2. Definimos las opciones base y específicas de ordenamiento
const BASE_SORT_OPTIONS = [
    { label: "Más recientes primero", value: "created_desc" },
    { label: "Más antiguos primero", value: "created_asc" },
    { label: "Mayor precio", value: "amount_desc" },
    { label: "Menor precio", value: "amount_asc" },
];

const MODIFICATION_SORT_OPTIONS = [
    { label: "Modificación reciente", value: "updated_desc" },
    { label: "Modificación antigua", value: "updated_asc" },
];

// Diccionario de ordenamiento por tipo
const SORT_OPTIONS_MAP: Record<TransactionType, { label: string; value: string }[]> = {
    payments: [...BASE_SORT_OPTIONS, ...MODIFICATION_SORT_OPTIONS],
    disbursements: BASE_SORT_OPTIONS,
    refunds: BASE_SORT_OPTIONS,
};

// 3. Centralizamos las traducciones
const statusTranslations: Record<TransactionStatus, string> = {
    PENDING: "Pendiente",
    COMPLETED: "Completado",
    FAILED: "Fallido",
    REFUNDED: "Reembolsado",
    CANCELLED: "Cancelado",
    DISBURSED: "Liquidado"
};

// Función de utilidad (Helper) para construir las opciones fácilmente
const buildStatusOptions = (statuses: TransactionStatus[]) => 
    statuses.map(status => ({
        label: statusTranslations[status],
        value: status,
    }));

// Diccionario de estados por tipo
const STATUS_OPTIONS_MAP: Record<TransactionType, { label: string; value: string }[]> = {
    payments: buildStatusOptions(["PENDING", "COMPLETED", "FAILED", "REFUNDED", "CANCELLED", "DISBURSED"]),
    disbursements: buildStatusOptions(["COMPLETED", "FAILED"]),
    refunds: buildStatusOptions(["COMPLETED", "FAILED"]),
};

export default function TransactionControlBar({ type = "payments" }: TransactionControlBarProps) {
    // Obtenemos las configuraciones correspondientes en tiempo de ejecución (O(1))
    const currentSortOptions = SORT_OPTIONS_MAP[type];
    const currentStatusOptions = STATUS_OPTIONS_MAP[type];

    return (
        <div className="w-full max-w-4xl mx-auto mb-8">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
                
                {/* 1. BUSCADOR */}
                <div className="sm:col-span-2 md:col-span-2 w-full">
                    <SearchBar />
                </div>

                {/* 2. FILTRO DE ESTADO */}
                <div className="col-span-1 w-full">
                    <Dropdown 
                        mode="filter"
                        paramKey="status"
                        placeholder="Filtrar por estado..."
                        options={currentStatusOptions}
                        icon={
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                        }
                    />
                </div>

                {/* 3. ORDENAMIENTO */}
                <div className="col-span-1 w-full">
                    <Dropdown 
                        mode="sort"
                        paramKey="sort"
                        placeholder="Ordenar por..."
                        options={currentSortOptions}
                        icon={
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                            </svg>
                        }
                    />
                </div>
                
            </div>
        </div>
    );
}