'use client'

import React from "react";
import DataView, { ColumnDef, ActionDef } from "@/components/admin/DataView";
import { adminCancelRefundAction } from "../actions";

interface RefundsClientProps {
  data: any[]; 
}

export default function RefundsClient({ data }: RefundsClientProps) {
  const columns: ColumnDef<any>[] = [
    { header: "ID Ref.", cell: (row) => <span className="font-mono text-xs text-gray-500">{row.transaction_id.split('-')[0]}...</span> },
    { header: "Viaje", accessorKey: "trip_id" },
    { header: "Tipo", cell: (row) => <span className="font-medium text-purple-700">{row.refund_type}</span> },
    { header: "Motivo", accessorKey: "reason" },
    { header: "Monto", cell: (row) => <span className="font-semibold text-gray-900">${Number(row.amount).toFixed(2)}</span> },
    { header: "Estado", cell: (row) => (
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
      label: "Anular Reembolso",
      variant: "danger",
      requireSelection: true,
      onAction: async (selectedId: string) => {
        if (!window.confirm("¿Seguro que deseas anular este reembolso?")) return { success: false, message: "Cancelado" };
        return await adminCancelRefundAction(selectedId);
      }
    }
  ];

  return <DataView title="Registro de Reembolsos" data={data} columns={columns} actions={actions} keyExtractor={(row) => row.transaction_id} />;
}