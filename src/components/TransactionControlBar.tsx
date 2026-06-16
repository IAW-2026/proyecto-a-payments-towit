"use client";

import React from "react";
import SearchBar from "./SearchBar";
import Dropdown from "./Dropdown";
import { TransactionStatus } from "@/types/transaction";

const SORT_OPTIONS = [
    { label: "Más recientes primero", value: "created_desc" },
    { label: "Más antiguos primero", value: "created_asc" },
    { label: "Modificación reciente", value: "updated_desc" },
    { label: "Modificación antigua", value: "updated_asc" },
    { label: "Mayor precio", value: "amount_desc" },
    { label: "Menor precio", value: "amount_asc" },
];

const statusTranslations: Record<TransactionStatus, string> = {
    PENDING: "Pendiente",
    COMPLETED: "Completado",
    FAILED: "Fallido",
    REFUNDED: "Reembolsado",
    CANCELLED: "Cancelado",
    DISBURSED: "Liquidado"
};

const STATUS_OPTIONS = Object.entries(statusTranslations).map(([key, value]) => ({
    label: value,
    value: key,
}));

export default function TransactionControlBar() {
    return (
        <div className="w-full max-w-4xl mx-auto mb-8">
            
            {/* EL PODER DE CSS GRID 
                - grid-cols-1: Móviles (1 columna)
                - sm:grid-cols-2: Tablets (2 columnas)
                - md:grid-cols-4: Pantallas grandes (4 columnas)
            */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
                
                {/* 1. BUSCADOR */}
                {/* En tablet (sm) ocupa las 2 columnas disponibles.
                    En escritorio (md) ocupa 2 de las 4 columnas disponibles (el 50%). */}
                <div className="sm:col-span-2 md:col-span-2 w-full">
                    <SearchBar />
                </div>

                {/* 2. FILTRO DE ESTADO */}
                {/* Siempre ocupa 1 columna de su cuadrícula actual */}
                <div className="col-span-1 w-full">
                    <Dropdown 
                        mode="filter"
                        paramKey="status"
                        placeholder="Filtrar por estado..."
                        options={STATUS_OPTIONS}
                        icon={
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                        }
                    />
                </div>

                {/* 3. ORDENAMIENTO */}
                {/* Siempre ocupa 1 columna de su cuadrícula actual */}
                <div className="col-span-1 w-full">
                    <Dropdown 
                        mode="sort"
                        paramKey="sort"
                        placeholder="Ordenar por..."
                        options={SORT_OPTIONS}
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