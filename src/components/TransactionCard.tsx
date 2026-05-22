// src/components/TransactionCard.tsx
import React from "react";

// Tipos extraídos para asegurar consistencia
export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | "REQUESTED";

interface BaseTransactionProps {
    tripId: string;
    entityName: string;
    amount: number | string;
    status: TransactionStatus | string;
}

interface StandardTransaction extends BaseTransactionProps {
    type: "PAYMENT" | "DISBURSEMENT";
}

interface RefundTransaction extends BaseTransactionProps {
    type: "REFUND";
    refundType: "TOTAL" | "PARTIAL";
}

export type TransactionCardProps = StandardTransaction | RefundTransaction;

export default function TransactionCard(props: TransactionCardProps) {

    const { tripId, entityName, amount, status, type } = props;

    const refundType = props.type === "REFUND" ? props.refundType : null;

    const formatCurrency = (val: string | number) => {
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
        }).format(Number(val));
    };

    // 1. Configuración de TIPO (Colores, Iconos y Textos)
    const typeConfig = {
        PAYMENT: {
            title: "Pago Recibido",
            theme: "blue",
            headerClasses: "bg-blue-50 border-blue-100 text-blue-800",
            amountClasses: "text-blue-600",
            icon: (
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            // Flujo de dinero en Pagos: Cliente -> Plataforma
            origin: { label: entityName, sub: `Viaje #${tripId}`, initial: entityName.charAt(0).toUpperCase() },
            destination: { label: "TowIt App", sub: "Cuenta Recaudadora", initial: "T" },
        },
        DISBURSEMENT: {
            title: "Liquidación a Conductor",
            theme: "purple",
            headerClasses: "bg-purple-50 border-purple-100 text-purple-800",
            amountClasses: "text-purple-600",
            icon: (
                <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            // Flujo de dinero en Liquidaciones: Plataforma -> Conductor
            origin: { label: "TowIt App", sub: "Cuenta de Fondos", initial: "T" },
            destination: { label: entityName, sub: `Viaje #${tripId}`, initial: entityName.charAt(0).toUpperCase() },
        },
        REFUND: {
            title: `Reembolso ${refundType === "PARTIAL" ? "Parcial" : "Total"}`,
            theme: "orange",
            headerClasses: "bg-orange-50 border-orange-100 text-orange-800",
            amountClasses: "text-orange-600",
            icon: (
                <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-3a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                </svg>
            ),
            // Flujo de dinero en Reembolsos: Plataforma -> Cliente
            origin: { label: "TowIt App", sub: "Devolución de Fondos", initial: "T" },
            destination: { label: entityName, sub: `Viaje #${tripId}`, initial: entityName.charAt(0).toUpperCase() },
        },
    };

    // 2. Configuración de ESTADO
    const getStatusConfig = (currentStatus: string) => {
        const config: Record<string, { label: string; classes: string }> = {
            COMPLETED: { label: "Completado", classes: "bg-green-100 text-green-700" },
            PENDING: { label: "Pendiente", classes: "bg-amber-100 text-amber-700" },
            FAILED: { label: "Fallido", classes: "bg-red-100 text-red-700" },
            CANCELLED: { label: "Cancelado", classes: "bg-slate-200 text-slate-700" },
            REQUESTED: { label: "Solicitado", classes: "bg-slate-100 text-slate-600" },
        };
        return config[currentStatus.toUpperCase()] || { label: currentStatus, classes: "bg-slate-100 text-slate-700" };
    };

    const activeTheme = typeConfig[type];
    const activeStatus = getStatusConfig(status);

    return (
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-left transition-all hover:shadow-xl">

            {/* CABECERA DINÁMICA */}
            <div className={`px-6 py-4 flex justify-between items-center border-b ${activeTheme.headerClasses}`}>
                <h3 className="font-semibold flex items-center gap-2">
                    {activeTheme.icon}
                    {activeTheme.title}
                </h3>
                <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-full tracking-wider ${activeStatus.classes}`}>
                    {activeStatus.label}
                </span>
            </div>

            {/* CUERPO DEL COMPROBANTE */}
            <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8">

                {/* ORIGEN DINÁMICO */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1">
                    <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 shadow-sm text-white font-bold text-2xl">
                        {activeTheme.origin.initial}
                    </div>
                    <p className="text-xs text-slate-400 font-medium tracking-wider uppercase mb-1">Origen</p>
                    <p className="text-lg font-bold text-slate-900">{activeTheme.origin.label}</p>
                    <p className="text-sm text-slate-500">{activeTheme.origin.sub}</p>
                </div>

                {/* CENTRO: MONTO DINÁMICO */}
                <div className="flex flex-col items-center flex-1 px-4">
                    <p className={`text-3xl font-extrabold mb-2 ${activeTheme.amountClasses}`}>
                        {formatCurrency(amount)}
                    </p>
                    <div className="flex items-center w-full max-w-[200px]">
                        <div className="h-px bg-slate-300 flex-1"></div>
                        <div className="bg-slate-100 border border-slate-300 rounded-full p-2 mx-2 text-slate-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </div>
                        <div className="h-px bg-slate-300 flex-1"></div>
                    </div>
                </div>

                {/* DESTINO DINÁMICO */}
                <div className="flex flex-col items-center md:items-end text-center md:text-right flex-1">
                    <div className={`w-16 h-16 bg-${activeTheme.theme}-100 rounded-full flex items-center justify-center mb-4 shadow-inner border border-${activeTheme.theme}-200 text-${activeTheme.theme}-600 font-bold text-2xl`}>
                        {activeTheme.destination.initial}
                    </div>
                    <p className="text-xs text-slate-400 font-medium tracking-wider uppercase mb-1">Destino</p>
                    <p className="text-lg font-bold text-slate-900">{activeTheme.destination.label}</p>
                    <p className="text-sm text-slate-500">{activeTheme.destination.sub}</p>
                </div>

            </div>
        </div>
    );
}