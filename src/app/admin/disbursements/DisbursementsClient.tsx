'use client'

import React from "react";
import DataView, { ColumnDef, ActionDef } from "@/components/admin/DataView";
import { adminCancelDisbursementAction } from "../actions";

interface DisbursementsClientProps {
  data: any[]; 
}

export default function DisbursementsClient({ data }: DisbursementsClientProps) {
  const columns: ColumnDef<any>[] = [
    { header: "ID Trans.", cell: (row) => <span className="font-mono text-xs text-gray-500">{row.transaction_id.split('-')[0]}...</span> },
    { header: "Viaje", accessorKey: "trip_id" },
    { header: "Alias/CBU", accessorKey: "payment_alias" },
    { header: "Monto", cell: (row) => <span className="font-semibold text-gray-900">${Number(row.amount).toFixed(2)}</span> },
    { header: "Comisión (Fee)", cell: (row) => <span className="text-gray-600">${Number(row.platform_fee).toFixed(2)}</span> },
    { 
      header: "Estado", 
      cell: (row) => (
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${row.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' : row.status === 'REVERSED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
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
      label: "Revertir Liquidación",
      variant: "danger",
      requireSelection: true,
      onAction: async (selectedId: string) => {
        if (!window.confirm("¿Seguro que deseas revertir esta liquidación? Si ya fue pagada, se le generará una deuda al conductor.")) {
          return { success: false, message: "Operación cancelada" };
        }
        return await adminCancelDisbursementAction(selectedId);
      }
    }
  ];

  return <DataView title="Registro de Liquidaciones" data={data} columns={columns} actions={actions} keyExtractor={(row) => row.transaction_id} />;
}