// src/components/TransactionDetailsCard.tsx
import React from "react";
import { TransactionDetailProps, TransactionStatus } from "@/types/transaction";


// If we add another transaction type, we only modify these dictionaries.
const THEME_CONFIG = {
    PAYMENT: {
        title: "Detalles del Pago",
        color: "blue",
        bg: "bg-blue-50",
        border: "border-blue-100",
        text: "text-blue-800",
        amountColor: "text-blue-600",
        icon: (
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
        )
    },
    DISBURSEMENT: {
        title: "Detalles del Desembolso",
        color: "emerald",
        bg: "bg-emerald-50",
        border: "border-emerald-100",
        text: "text-emerald-800",
        amountColor: "text-emerald-600",
        icon: (
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
        )
    },
    REFUND: {
        title: "Detalles del Reintegro",
        color: "orange",
        bg: "bg-orange-50",
        border: "border-orange-100",
        text: "text-orange-800",
        amountColor: "text-orange-600",
        icon: (
            <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
            </svg>
        )
    }
};

const STATUS_COLORS: Record<TransactionStatus, string> = {
    COMPLETED: "bg-green-100 text-green-800 border-green-200",
    FAILED: "bg-red-100 text-red-800 border-red-200",
    REFUNDED: "bg-orange-100 text-orange-800 border-orange-200",
    PENDING: "bg-slate-100 text-slate-700 border-slate-200",
    CANCELLED: "bg-slate-200 text-slate-800 border-slate-300",
    DISBURSED: "bg-emerald-100 text-emerald-800 border-emerald-200",
};


// Auxiliary functions
const formatCurrency = (val: string | number) => 
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(val));

const formatDate = (date: Date | string) => 
    new Date(date).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });

const DetailRow = ({ label, value, isMonospace = false }: { label: string, value: string, isMonospace?: boolean }) => (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 border-b border-slate-100 last:border-0 gap-1">
        <span className="text-slate-500 text-xs sm:text-sm font-semibold uppercase tracking-wider">{label}</span>
        <span className={`text-slate-900 text-sm break-all sm:break-normal ${isMonospace ? 'font-mono bg-slate-100 px-2 py-1 rounded-md' : 'font-medium'}`}>
            {value}
        </span>
    </div>
);


export default function TransactionDetailsCard(data: TransactionDetailProps) {
    const theme = THEME_CONFIG[data.type];
    const statusStyle = STATUS_COLORS[data.status] || STATUS_COLORS.PENDING;

    return (
        <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            
            {/* Cabecera (Header) */}
            <div className={`${theme.bg} border-b ${theme.border} p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 bg-white rounded-xl shadow-sm border ${theme.border}`}>
                        {theme.icon}
                    </div>
                    <h2 className={`text-lg sm:text-xl font-bold ${theme.text}`}>
                        {theme.title}
                    </h2>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider whitespace-nowrap ${statusStyle}`}>
                    {data.status}
                </span>
            </div>

            {/* Cuerpo (Body) */}
            <div className="p-5 sm:p-6 space-y-6">
                
                {/* Bloque Financiero Principal */}
                <div className="flex flex-col items-center justify-center py-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Monto Total</span>
                    <span className={`text-4xl sm:text-5xl font-black tracking-tight ${theme.amountColor}`}>
                        {formatCurrency(data.amount)}
                    </span>
                </div>

                {/* Detalles Generales (Compartidos) */}
                <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Información General</h3>
                    <DetailRow label="ID Transacción (Interno)" value={data.transaction_id} isMonospace />
                    <DetailRow label="Viaje (Trip ID)" value={data.trip_id} isMonospace />
                    <DetailRow label="Fecha de Creación" value={formatDate(data.created_at)} />
                </div>

                {/* Detalles Específicos (Renderizado Condicional Seguro gracias a TS) */}
                <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2 mt-4">Detalles Específicos</h3>
                    
                    {data.type === "PAYMENT" && (
                        <>
                            <DetailRow label="Última Actualización" value={formatDate(data.updated_at)} />
                            <DetailRow label="ID Pasarela (Mercado Pago)" value={data.external_id || "No registrado"} isMonospace />
                            {data.expiration_date && <DetailRow label="Fecha de Expiración" value={formatDate(data.expiration_date)} />}
                        </>
                    )}

                    {data.type === "DISBURSEMENT" && (
                        <>
                            <DetailRow label="Comisión de Plataforma" value={formatCurrency(data.platform_fee)} />
                        </>
                    )}

                    {data.type === "REFUND" && (
                        <>
                            <DetailRow label="Tipo de Reintegro" value={data.refund_type === "TOTAL" ? "Devolución Total" : "Devolución Parcial"} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}