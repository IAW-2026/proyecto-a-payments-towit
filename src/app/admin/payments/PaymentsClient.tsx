'use client'

import React from "react";
import DataView, { ColumnDef, ActionDef } from "@/components/admin/DataView";
import { adminCancelPaymentAction } from "../actions";

// Tipamos los datos que esperamos recibir del servidor
// Puedes importar el tipo de Drizzle si lo prefieres, o usar any para agilizar
interface PaymentsClientProps {
  data: any[]; 
}

export default function PaymentsClient({ data }: PaymentsClientProps) {
  // 1. Definimos las Columnas (Funciones en el cliente ✅)
  const columns: ColumnDef<any>[] = [
    { 
      header: "ID Transacción", 
      cell: (row) => <span className="font-mono text-xs text-gray-500">{row.transaction_id.split('-')[0]}...</span> 
    },
    { header: "Viaje (Trip ID)", accessorKey: "trip_id" },
    { 
      header: "Monto", 
      cell: (row) => <span className="font-semibold text-gray-900">${Number(row.amount).toFixed(2)}</span> 
    },
    { 
      header: "Estado", 
      cell: (row) => (
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${row.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {row.status}
        </span>
      )
    },
    { 
      header: "Fecha", 
      cell: (row) => (
        <time suppressHydrationWarning className="text-gray-500">
          {new Date(row.created_at).toLocaleString(undefined, { 
            day: '2-digit', 
            month: 'short', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </time> 
      )
    }
  ];

  const actions: ActionDef[] = [
    {
      label: "Anular Pago Seleccionado",
      variant: "danger",
      requireSelection: true,
      onAction: async (selectedId: string) => {
        const confirmMessage = "¿Estás seguro de que deseas anular este pago? Se validará que no haya liquidaciones asociadas.";
        if (!window.confirm(confirmMessage)) return { success: false, message: "Operación cancelada por el usuario" };
        
        return await adminCancelPaymentAction(selectedId);
      }
    }
  ];

  // 3. Renderizamos el componente genérico
  return (
    <DataView 
      title="Historial de Pagos Activos"
      data={data} 
      columns={columns} 
      actions={actions}
      keyExtractor={(row) => row.transaction_id} 
    />
  );
}