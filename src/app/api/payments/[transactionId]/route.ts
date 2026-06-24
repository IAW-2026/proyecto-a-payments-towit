import { NextRequest, NextResponse } from "next/server";
import { cancelPaymentSafely } from "@/services/payment.service"; // Ajustá el path según tu proyecto
import { authenticateRequest } from "@/app/lib/auth";

// Definimos la interfaz para los parámetros dinámicos de la ruta
interface RouteContext {
    params: Promise<{
        transactionId: string;
    }>;
}

export async function DELETE(req: NextRequest, context: RouteContext) {
    try {
        // 1. Autorización: Proteger el endpoint (Reutilizando tu lógica de seguridad)
        const authError = authenticateRequest(req);
        if (authError) return authError;

        // 2. Validación de parámetros de entrada
        const { transactionId } = await context.params;
        if (!transactionId) {
            return NextResponse.json(
                { error: "TransactionId is required in request" },
                { status: 400 } // Bad Request
            );
        }

        // 3. Ejecución de la Lógica de Negocio (Reutilizada del Server Action)
        const result = await cancelPaymentSafely(transactionId);

        // 4. Mapeo de la respuesta interna a Códigos HTTP Estándar
        if (result.success) {
            return NextResponse.json(
                { message: result.message },
                { status: 200 } // OK
            );
        }

        // Manejo de errores de negocio esperados
        switch (result.errorCode) {
            case "PAYMENT_NOT_FOUND":
                return NextResponse.json(
                    { error: result.message, code: result.errorCode },
                    { status: 404 } // Not Found
                );

            case "ACTIVE_DISBURSEMENT_EXISTS":
            case "ACTIVE_REFUND_EXISTS":
                return NextResponse.json(
                    { error: result.message, code: result.errorCode },
                    { status: 409 } // Conflict: El estado actual del recurso impide la acción
                );

            case "DATABASE_ERROR":
                return NextResponse.json(
                    { error: result.message, code: result.errorCode },
                    { status: 500 } // Internal Server Error
                );

            default:
                // Fallback para códigos no mapeados
                return NextResponse.json(
                    { error: result.message || "Unknown error processing the request", code: "UKNOWN_ERROR" },
                    { status: 400 }
                );
        }

    } catch (error) {
        // 5. Captura de errores críticos no controlados (Ej: caída de DB, errores de sintaxis)
        return NextResponse.json(
            { error: "Error interno del servidor crítico." },
            { status: 500 }
        );
    }
}
