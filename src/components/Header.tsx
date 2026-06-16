"use client"

import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import React from "react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      {/* px-4 en móvil, px-6 a partir de tablet (sm) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            {/* Se agrega min-w-[40px] para que flexbox nunca aplaste el logo */}
            <div className="w-10 h-10 min-w-[40px] rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold">
              T
            </div>
            
            {/* MAGIA RESPONSIVE: Oculto por defecto (móvil), visible como bloque a partir de 'sm' */}
            <div className="hidden sm:block leading-tight">
              <div className="text-lg font-semibold text-gray-900">
                TowIt <span className="text-indigo-600">Payments</span>
              </div>
              <div className="text-xs text-gray-500">Sistema de pagos</div>
            </div>
          </Link>
        </div>

        {/* gap-2 en móvil para ahorrar espacio, gap-4 en desktop */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
            Home
          </Link>

          <Show when="signed-out">
            <SignInButton mode="modal">
              {/* px-3 en móvil, px-4 en desktop. whitespace-nowrap evita que el texto baje de línea */}
              <button className="px-3 sm:px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-zinc-800 whitespace-nowrap">
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