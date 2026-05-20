// src/app/dashboard/page.tsx
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getPaymentsUserId } from "../lib/auth";
import { get } from "http";

export default async function DashboardPage() {
  // Obtenemos todos los datos del usuario directamente en el servidor
  const user = await currentUser();

  // Redoble de seguridad por si acaso
  if (!user) {
    redirect("/");
  }

  const userId = await getPaymentsUserId();

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <header className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm mb-8">
        <h1 className="text-xl font-bold">Panel de Transacciones</h1>
        {/* El botón de perfil para que pueda cerrar sesión */}
        <UserButton /> 
      </header>

      <main className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl mb-4">
          Bienvenido de nuevo, {user.firstName || "Usuario"}
        </h2>
        <p className="text-gray-600 mb-4">
          Tu ID de Clerk es: <code className="bg-gray-100 p-1 rounded">{user.id}</code>\n
          Tu ID de usuario es  <code className="bg-gray-100 p-1 rounded">{userId}</code>
        </p>
        <p className="text-gray-600">
          Email principal: {user.emailAddresses[0]?.emailAddress}
        </p>
        
        {/* Acá más adelante vas a hacer el fetch a Neon para traer los pagos */}
      </main>
    </div>
  );
}