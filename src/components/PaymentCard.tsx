// src/components/PaymentCard.tsx
import React from "react";

// 1. Definición estricta de las propiedades que recibe el componente
export interface PaymentCardProps {
  tripId: string;
  clientName: string;
  amount: number | string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | string;
}

export default function PaymentCard({
  tripId,
  clientName,
  amount,
  status,
}: PaymentCardProps) {
  
  // 2. Formateador profesional de moneda (Pesos Argentinos)
  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(Number(val));
  };

  // 3. Diccionario dinámico para los colores y textos del estado
  const getStatusConfig = (currentStatus: string) => {
    const config: Record<string, { label: string; classes: string }> = {
      COMPLETED: { label: "Completado", classes: "bg-green-100 text-green-700" },
      PENDING:   { label: "Pendiente", classes: "bg-amber-100 text-amber-700" },
      FAILED:    { label: "Fallido", classes: "bg-red-100 text-red-700" },
      CANCELLED: { label: "Cancelado", classes: "bg-slate-200 text-slate-700" },
    };

    // Retorna la configuración o un valor por defecto si el estado no coincide
    return config[currentStatus] || { 
      label: currentStatus, 
      classes: "bg-slate-100 text-slate-700" 
    };
  };

  const statusStyle = getStatusConfig(status);

  // 4. Renderizado de la Interfaz
  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-left mb-16 transition-all hover:shadow-2xl">
      
      {/* CABECERA */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Pago de viaje
        </h3>
        <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-full tracking-wider ${statusStyle.classes}`}>
          {statusStyle.label}
        </span>
      </div>
      
      {/* CUERPO DEL COMPROBANTE */}
      <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Emisor (Conductor) */}
        <div className="flex flex-col items-center md:items-end text-center md:text-right flex-1">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 shadow-inner border border-blue-200">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500 font-medium">DESTINO</p>
          <p className="text-lg font-bold text-slate-900">{clientName}</p>
          <p className="text-sm text-slate-500">Viaje #{tripId}</p>
        </div>

        {/* Centro: Flecha y Monto (Dinámico) */}
        <div className="flex flex-col items-center flex-1 px-4">
          <p className="text-3xl font-extrabold text-blue-600 mb-2">
            {formatCurrency(amount)}
          </p>
          <div className="flex items-center w-full max-w-[200px]">
            <div className="h-px bg-slate-300 flex-1"></div>
            <div className="bg-slate-100 border border-slate-300 rounded-full p-2 mx-2">
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
            <div className="h-px bg-slate-300 flex-1"></div>
          </div>
        </div>

        {/* Receptor (Cuenta centralizada, fija) */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1">
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 shadow-md">
            <span className="text-white font-bold text-2xl">T</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">ORIGEN</p>
          <p className="text-lg font-bold text-slate-900">TowIt App</p>
          <p className="text-sm text-slate-500">Cuenta Recaudadora</p>
        </div>

      </div>
    </div>
  );
}