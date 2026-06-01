import Link from "next/link";

export default function AdminHomePage() {
    const adminLinks = [
        { name: "Gestión de Usuarios", href: "/admin/users", description: "Ver y administrar cuentas de usuarios", icon: "👥" },
        { name: "Registro de Pagos", href: "/admin/payments", description: "Auditar transacciones entrantes", icon: "💳" },
        { name: "Liquidaciones", href: "/admin/disbursements", description: "Pagos realizados a conductores", icon: "🏦" },
        { name: "Reembolsos", href: "/admin/refunds", description: "Devoluciones a pasajeros", icon: "↩️" },
    ];

    return (
        <div className="max-w-7xl mx-auto p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
                <p className="text-gray-500 mt-2">Selecciona un módulo para gestionar los datos del sistema.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {adminLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="block p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-500 transition-all group"
                    >
                        <div className="text-4xl mb-4">{link.icon}</div>
                        <h2 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                            {link.name}
                        </h2>
                        <p className="text-sm text-gray-500 mt-2">{link.description}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}