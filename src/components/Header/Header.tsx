"use client"

import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import React from "react";
import TransactionsHeaderDropdown from "./TransactionsHeaderDropdown";

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
            
            <TransactionsHeaderDropdown />
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