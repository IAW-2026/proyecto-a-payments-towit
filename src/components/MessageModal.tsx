"use client"

import React, { useEffect } from 'react';

// 1. Definimos los tipos permitidos.
export type MessageModalType = 'info' | 'success' | 'warning' | 'error';

interface MessageModalProps {
  isOpen: boolean;
  type?: MessageModalType;
  title: string;
  message: string;
  buttonText?: string;
  showBlur?: boolean; // NUEVO: Prop para controlar el blur
  onClose: () => void;
}

// 2. EL DICCIONARIO de estilos
const MODAL_CONFIG: Record<MessageModalType, { icon: React.ReactNode, iconBg: string, iconColor: string, buttonBg: string }> = {
  info: {
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    buttonBg: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-600',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  },
  success: {
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    buttonBg: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  error: {
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    buttonBg: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-600',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  warning: {
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    buttonBg: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-600',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  }
};

export default function MessageModal({ 
  isOpen, 
  type = 'info', 
  title, 
  message, 
  buttonText = "Aceptar", 
  showBlur = false, // NUEVO: Activado por defecto
  onClose 
}: MessageModalProps) {

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; }
  }, [isOpen]);

  if (!isOpen) return null;

  const config = MODAL_CONFIG[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* NUEVO: Agregamos lógica condicional a la clase del fondo oscuro */}
      <div 
        className={`absolute inset-0 bg-slate-900/40 transition-opacity ${showBlur ? 'backdrop-blur-sm' : ''}`} 
        onClick={onClose}
      ></div>

      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm p-6 transform transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Ícono dinámico */}
        <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full mb-4 ${config.iconBg}`}>
          <div className={config.iconColor}>
            {config.icon}
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
        </div>

        {/* Botón dinámico */}
        <div className="mt-6 flex justify-center w-full">
          <button
            type="button"
            className={`w-full inline-flex justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 active:scale-[0.98] ${config.buttonBg}`}
            onClick={onClose}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}