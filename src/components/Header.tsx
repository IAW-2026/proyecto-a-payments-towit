"use client"

import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import React from "react";

export default function Header() {
  return (
    <header className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold">T</div>
            <div className="leading-tight">
              <div className="text-lg font-semibold text-gray-900">TowIt <span className="text-indigo-600">Payments</span></div>
              <div className="text-xs text-gray-500">Sistema de pagos</div>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-zinc-800">Iniciar sesión</button>
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
