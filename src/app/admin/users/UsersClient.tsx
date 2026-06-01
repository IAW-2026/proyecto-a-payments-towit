'use client'

import React from "react";
import DataView, { ColumnDef } from "@/components/admin/DataView";

interface UsersClientProps {
  data: any[]; 
}

export default function UsersClient({ data }: UsersClientProps) {
  const columns: ColumnDef<any>[] = [
    { header: "ID Interno", accessorKey: "id_user" },
    { 
      header: "Clerk ID", 
      cell: (row) => <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{row.id_clerk}</span> 
    },
    { 
      header: "Balance (Billetera)", 
      cell: (row) => {
        const balance = Number(row.balance);
        return (
          <span className={`font-semibold ${balance < 0 ? 'text-red-600' : balance > 0 ? 'text-green-600' : 'text-gray-600'}`}>
            ${balance.toFixed(2)}
          </span>
        );
      }
    }
  ];

  // Observa que NO pasamos la propiedad 'actions'. 
  // El componente DataView renderizará la tabla sin checkboxes de selección.
  return <DataView title="Directorio de Cuentas" data={data} columns={columns} keyExtractor={(row) => String(row.id_user)} />;
}