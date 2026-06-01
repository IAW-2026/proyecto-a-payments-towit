// src/app/page.tsx
import { Show, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import TransactionCard from "@/components/TransactionCard";
import { Suspense } from "react";
import UserBalanceCard from "@/components/UserBalanceCard";
import UserBalanceSkeleton from "@/components/UserBalanceSkeleton";
import { ReadCookieUserInformation } from "./lib/auth";
import { auth } from "@clerk/nextjs/server";

export default async function HomePage() {
	const { userId } = await auth();
	
	return (
		<div className="min-h-[calc(100vh-16rem)] overflow-hidden">
			<main className="container mx-auto px-4 pt-6 pb-16 md:pt-10 md:pb-24 flex flex-col items-center">
                {!userId ? (
                    <PublicHeroSection />
                ) : (
                    <PrivateDashboardSection />
                )}
			</main>
		</div>
	);
}

function PublicHeroSection() {
	return (
		<div className="flex flex-col items-center text-center w-full max-w-3xl mx-auto">
			<div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800 mb-8">
				<svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
				</svg>
				Infraestructura Segura de Pagos
			</div>

			<h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 break-words">
				Gestión financiera centralizada para <span className="text-blue-600">TowIt</span>
			</h1>

			<p className="text-base sm:text-lg md:text-xl text-slate-600 mb-12">
				El subsistema de <strong className="font-semibold text-slate-800">TowIt Payments</strong> es el centro de control donde auditamos, procesamos y visualizamos todas las transacciones generadas en los viajes.
			</p>

			<div className="w-full mb-12">
				<TransactionCard
					tripId={"1723123"}
					entityName={"Carlos Alberto Solari"}
					amount={14760}
					status={"COMPLETED"}
					type={"DISBURSEMENT"}
				/>
			</div>

			<div className="text-center">
				<p className="text-slate-500 mb-4 text-sm sm:text-base">Inicia sesión con tu cuenta corporativa para acceder a tu historial de transacciones.</p>
				<SignInButton mode="modal">
					<button className="bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors shadow-sm whitespace-nowrap">
						Acceder al Sistema
					</button>
				</SignInButton>
			</div>
		</div>
	);
}

async function PrivateDashboardSection() {
	const paymentsUser = await ReadCookieUserInformation("/");

	return (
		<section className="w-full max-w-4xl flex flex-col items-center mx-auto">
			<Suspense fallback={<UserBalanceSkeleton />}>
				{/* Ahora TypeScript no se queja del nulo porque la función garantiza la devolución */}
				<UserBalanceCard userId={paymentsUser.id_user} />
			</Suspense>

			<div className="w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
				<div className="flex-1">
					<h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
						¡Qué bueno verte de nuevo!
					</h1>
					<p className="text-slate-500 text-sm md:text-base">
						Has ingresado correctamente a la plataforma de administración financiera de TowIt. Selecciona el módulo directo al que necesitas redirigirte.
					</p>
				</div>
			</div>

			<div className="w-full flex flex-col gap-4">
				<h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 pl-2">Acceso directo a módulos</h2>

				{/* Enlace a Pagos */}
				<Link href="/payments" className="group block w-full focus:outline-none">
					<div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between shadow-sm transition-all duration-200 hover:border-blue-200 hover:shadow-md active:scale-[0.99]">
						<div className="flex items-center gap-4">
							<div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
								<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<div>
								<h3 className="font-bold text-slate-900 text-base">Módulo de Pagos</h3>
								<p className="text-xs text-slate-500">Auditoría de cobros recibidos de clientes por viajes</p>
							</div>
						</div>
						<svg className="w-5 h-5 text-slate-400 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
						</svg>
					</div>
				</Link>

                {/* Los otros enlaces se mantienen igual... (Disbursements, Refunds) */}
			</div>
		</section>
	);
}