'use client'

import React, { useState } from "react";
import MessageModal, {MessageModalType} from "@/components/MessageModal";

// TIPOS GENÉRICOS 
export type ColumnDef<T> = {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  hiddenOnMobile?: boolean; 
};

export type ActionDef = {
  label: string;
  variant?: "primary" | "danger" | "warning";
  requireSelection?: boolean; // Si es true, el botón se deshabilita si no hay fila seleccionada
  onAction: (selectedId: string) => Promise<{ success: boolean; message?: string }>;
};

interface DataViewProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  actions?: ActionDef[];
  keyExtractor: (row: T) => string; // Función para extraer el ID único de la fila
  title?: string;
}

// --- COMPONENTE PRINCIPAL ---
export default function DataView<T>({ data, columns, actions = [], keyExtractor, title }: DataViewProps<T>) {
  // Estado para guardar el ID de la fila seleccionada (Single Selection)
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const toggleSelection = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  
  return (
    <div className="space-y-4">
      <DataToolbar selectedId={selectedId} actions={actions} title={title} />

      <DataTable 
        data={data} 
        columns={columns} 
        keyExtractor={keyExtractor} 
        selectedId={selectedId}
        onSelectRow={toggleSelection}
      />
    </div>
  );
}

function DataToolbar({ selectedId, actions, title }: { selectedId: string | null, actions: ActionDef[], title?: string }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));


  const handleActionClick = async (action: ActionDef) => {
    if (action.requireSelection && !selectedId) return;
    
    setIsProcessing(true);
    const result = await action.onAction(selectedId!);
    setIsProcessing(false);

    if (result.success) {
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Operación Exitosa',
        message: 'La operación se completó con éxito.'
      });
    } else {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Ocurrió un error al realizar la operación.'
      });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">{title || "Registros"}</h2>
      
      <div className="flex gap-3 mt-4 sm:mt-0">
        {actions.map((action, idx) => {
          const isDisabled = (action.requireSelection && !selectedId) || isProcessing;
          
          const baseStyles = "px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed";
          const colorStyles = action.variant === "danger" 
            ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
            : action.variant === "warning"
            ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
            : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200";

          return (
            <button
              key={idx}
              onClick={() => handleActionClick(action)}
              disabled={isDisabled}
              className={`${baseStyles} ${colorStyles}`}
            >
              {isProcessing && selectedId ? "Procesando..." : action.label}
            </button>
          );
        })}
      </div>


      <MessageModal
        isOpen={modalState.isOpen}
        type={modalState.type as MessageModalType}
        title={modalState.title}
        message={modalState.message}
        onClose={closeModal}
      />
      
    </div>
  );
}

// --- SUB-COMPONENTE: TABLE ---
function DataTable<T>({ data, columns, keyExtractor, selectedId, onSelectRow }: 
  { data: T[], columns: ColumnDef<T>[], keyExtractor: (row: T) => string, selectedId: string | null, onSelectRow: (id: string) => void }) {
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-6 py-4 w-12 text-center">Sel</th>
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  scope="col" 
                  className={`px-6 py-4 ${col.hiddenOnMobile ? 'hidden md:table-cell' : ''}`}>
                    {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-8 text-center text-sm text-gray-500">
                  No hay registros disponibles.
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const rowId = keyExtractor(row);
                const isSelected = selectedId === rowId;

                return (
                  <tr 
                    key={rowId} 
                    onClick={() => onSelectRow(rowId)}
                    className={`transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}
                  >
                    {/* Checkbox de selección */}
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="radio" 
                        checked={isSelected}
                        onChange={() => onSelectRow(rowId)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    {/* Celdas de datos */}
                    {columns.map((col, idx) => (
                      <td 
                        key={idx} 
                        className={`px-6 py-4 whitespace-nowrap text-sm text-gray-700 ${col.hiddenOnMobile ? 'hidden md:table-cell' : ''}`}
                      >
                        {col.cell ? col.cell(row) : String(row[col.accessorKey as keyof T] ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}