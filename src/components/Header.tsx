"use client"

import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import React from "react";

interface HeaderProps {
  adminMenuSlot?: React.ReactNode;
}

export default function Header({ adminMenuSlot }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 min-w-[40px] rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold">
              T
            </div>
            
            <div className="hidden sm:block leading-tight">
              <div className="text-lg font-semibold text-gray-900">
                TowIt <span className="text-indigo-600">Payments</span>
              </div>
              <div className="text-xs text-gray-500">Sistema de pagos</div>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          {/* MENUES DESPLEGABLES: Solo se muestra si el usuario está logueado */}
          <Show when="signed-in">
            {adminMenuSlot}
            
            <div className="relative group">
              <button className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 py-2 transition-colors focus:outline-none">
                Mis transacciones
                {/* Flecha que rota al hacer hover */}
                <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform duration-200 group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* El contenedor del menú (Tiene pt-2 para crear un "puente" invisible y que no se pierda el hover) */}
              <div className="absolute top-full right-[-20px] sm:right-auto sm:left-0 pt-2 w-48 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col p-1.5">
                  
                  <Link href="/payments" className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    Pagos
                  </Link>
                  
                  <Link href="/disbursements" className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Liquidaciones
                  </Link>
                  
                  <Link href="/refunds" className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    Reembolsos
                  </Link>
                  
                </div>
              </div>
            </div>
          </Show>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="px-3 sm:px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-zinc-800 whitespace-nowrap transition-colors">
                Iniciar sesión
              </button>
            </SignInButton>
          </Show>

          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
        
      </div>
    </header>
  );
}