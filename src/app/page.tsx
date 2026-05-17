import { Show, SignInButton, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-50">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Proyecto Towit - Payments</h1>
        <p className="text-zinc-600">Sistema centralizado de pagos</p>
      </div>
      
      {/* Si NO hay sesión, mostramos el botón para abrir el modal de login */}
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="bg-black text-white px-6 py-2 rounded-md font-medium hover:bg-zinc-800 transition-colors">
            Iniciar Sesión
          </button>
        </SignInButton>
      </Show>

      {/* Si SÍ hay sesión, mostramos su foto de perfil */}
      <Show when="signed-in">
        <div className="flex flex-col items-center gap-4">
          <UserButton />
          <p className="text-sm text-zinc-500">Ya estás autenticado.</p>
        </div>
      </Show>
    </main>
  );
}
