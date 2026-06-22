import { NextRequest, NextResponse } from "next/server";
import { cancelRefundSafely } from "@/services/refund.service";

interface RouteContext {
    params: Promise<{
        transactionId: string;
    }>;
}

export async function DELETE(req: NextRequest, context: RouteContext) {
    try {
        // 1. Autorización
        const authError = requestAuthorization(req);
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
        const result = await cancelRefundSafely(transactionId);

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
                { error: result.message, code: "REFUND_NOT_FOUND" },
                { status: 404 } // Not Found
            );
        }

        if (errorMessage.includes("database") || errorMessage.includes("internal")) {
            return NextResponse.json(
                { error: result.message, code: "DATABASE_ERROR" },
                { status: 500 } // Internal Server Error
            );
        }

        // Fallback genérico
        return NextResponse.json(
            { error: result.message || "Error al procesar la cancelación del reembolso." },
            { status: 400 } 
        );

    } catch (error) {
        return NextResponse.json(
            { error: "Error interno del servidor crítico." },
            { status: 500 }
        );
    }
}

function requestAuthorization(req: NextRequest): NextResponse | null {
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "") || req.headers.get("x-api-key");
    const expectedSecret = process.env.INTERNAL_API_SECRET;

    if (!expectedSecret) {
        console.error("CRITICAL: INTERNAL_API_SECRET no está configurado en el entorno.");
        return NextResponse.json({ error: "Error de configuración del servidor." }, { status: 500 });
    }

    if (!authHeader || authHeader !== expectedSecret) {
        return NextResponse.json({ error: "No autorizado. Credenciales inválidas." }, { status: 401 });
    }

    return null;
}