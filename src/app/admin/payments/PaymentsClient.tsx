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
    { header: "Viaje (Trip ID)", 
      accessorKey: "trip_id",
      hiddenOnMobile: true
    },
    { 
      header: "Usuario ID", 
      accessorKey: "id_user", 
      hiddenOnMobile: true 
    },
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
      header: "ID Externo", 
      cell: (row) => (
        <span className="font-mono text-xs text-gray-400">
          {row.external_id ? row.external_id : 'N/A'}
        </span>
      ),
      hiddenOnMobile: true 
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
    },
    { 
      header: "Borrado en", 
      cell: (row) => (
        row.deleted_at ? (
          <time suppressHydrationWarning className="text-red-500 font-medium">
            {new Date(row.deleted_at).toLocaleString(undefined, { day: '2-digit', month: 'short' })}
          </time> 
        ) : <span className="text-gray-300">-</span>
      ),
      hiddenOnMobile: true 
    },
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