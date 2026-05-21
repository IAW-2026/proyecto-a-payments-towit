// src/app/page.tsx
import { Show, SignInButton } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <div className="min-h-[calc(screen-16rem)]">
      {/* CONTENIDO PRINCIPAL (HERO & EXPLICACIÓN) */}
      <main className="container mx-auto px-4 py-16 md:py-24 flex flex-col items-center text-center">
        
        {/* Badge Informativo */}
        <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800 mb-8">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Infraestructura Segura de Pagos
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-3xl mb-6">
          Gestión financiera centralizada para <span className="text-blue-600">TowIt</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mb-12">
          El subsistema de <strong className="font-semibold text-slate-800">TowIt Payments</strong> es el centro de control donde auditamos, procesamos y visualizamos todas las transacciones generadas en los viajes. Desde los pagos de los clientes hasta las liquidaciones a nuestros conductores.
        </p>

        {/* MOCKUP VISUAL: EJEMPLO DE TRANSACCIÓN */}
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-left mb-16">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Detalle de Liquidación
            </h3>
            <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase rounded-full tracking-wider">
              Completado
            </span>
          </div>
          
          <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Emisor (Plataforma) */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 shadow-md">
                <span className="text-white font-bold text-2xl">T</span>
              </div>
              <p className="text-sm text-slate-500 font-medium">ORIGEN</p>
              <p className="text-lg font-bold text-slate-900">TowIt App</p>
              <p className="text-sm text-slate-500">Cuenta Recaudadora</p>
            </div>

            {/* Flecha y Monto */}
            <div className="flex flex-col items-center flex-1 px-4">
              <p className="text-3xl font-extrabold text-blue-600 mb-2">$ 45,000.00</p>
              <div className="flex items-center w-full max-w-[200px]">
                <div className="h-px bg-slate-300 flex-1"></div>
                <div className="bg-slate-100 border border-slate-300 rounded-full p-2 mx-2">
                  <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
                <div className="h-px bg-slate-300 flex-1"></div>
              </div>
              <p className="text-xs text-slate-400 mt-2 font-mono">ID: tx_5aB9...8f2C</p>
            </div>

            {/* Receptor (Conductor) */}
            <div className="flex flex-col items-center md:items-end text-center md:text-right flex-1">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 shadow-inner border border-blue-200">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500 font-medium">DESTINO</p>
              <p className="text-lg font-bold text-slate-900">Juan P. (Conductor)</p>
              <p className="text-sm text-slate-500">Viaje #TRP-8821</p>
            </div>
          </div>
        </div>

        {/* Call to Action Inferior condicional */}
        <Show when="signed-out">
          <div className="text-center">
            <p className="text-slate-500 mb-4">Inicia sesión con tu cuenta corporativa para acceder al panel de métricas.</p>
            <SignInButton mode="modal">
              <button className="bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors shadow-sm">
                Acceder al Sistema
              </button>
            </SignInButton>
          </div>
        </Show>
        
      </main>
    </div>
  );
}