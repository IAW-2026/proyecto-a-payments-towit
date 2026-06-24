import { NextRequest, NextResponse } from "next/server";
import { cancelDisbursementSafely } from "@/services/disbursement.service";
import { authenticateRequest } from "@/app/lib/auth";

interface RouteContext {
    params: Promise<{
        transactionId: string;
    }>;
}

export async function DELETE(req: NextRequest, context: RouteContext) {
    try {
        // 1. Autorización
        const authError = authenticateRequest(req);
        if (authError) return authError;

        // 2. Validación de parámetros
        const { transactionId } = await context.params;
        if (!transactionId) {
            return NextResponse.json(
                { error: "TransactionId is required in request URL" },
                { status: 400 } // Bad Request
            );
        }

        // 3. Ejecución de la Lógica de Negocio
        const result = await cancelDisbursementSafely(transactionId);

        // 4. Mapeo de la respuesta a Códigos HTTP Estándar
        if (result.success) {
            return NextResponse.json(
                { message: result.message },
                { status: 200 } // OK
            );
        }

        // Inferencia de errores basada en el mensaje del servicio
        const errorMessage = result.message?.toLowerCase() || "";

        if (errorMessage.includes("not found")) {
            return NextResponse.json(
                { error: result.message, code: "DISBURSEMENT_NOT_FOUND" },
                { status: 404 } // Not Found
            );
        }

        if (errorMessage.includes("database") || errorMessage.includes("internal")) {
            return NextResponse.json(
                { error: result.message, code: "DATABASE_ERROR" },
                { status: 500 } // Internal Server Error
            );
        }

        // Fallback genérico para errores de negocio no contemplados
        return NextResponse.json(
            { error: result.message || "Error al procesar la cancelación del desembolso." },
            { status: 400 }
        );

    } catch (error) {
        return NextResponse.json(
            { error: "Error interno del servidor crítico." },
            { status: 500 }
        );
    }
}
