'use server'

import { auth } from "@clerk/nextjs/server";
import { cancelPaymentSafely } from "@/services/payment.service";
import { cancelDisbursementSafely } from "@/services/disbursement.service";
import { cancelRefundSafely } from "@/services/refund.service";
import { revalidatePath } from "next/cache";

async function checkAdminAuth() {
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
        return { authorized: false, message: "No autorizado. Inicia sesión." };
    }

    const isAdmin = sessionClaims?.role === "admin";
    if (!isAdmin) {
        console.warn(`[Seguridad] Intento de acceso administrativo denegado para el usuario ${userId}.`);
        return { authorized: false, message: "Acceso denegado. Se requieren permisos de administrador." };
    }

    return { authorized: true, userId };
}

export async function adminCancelPaymentAction(transactionId: string) {
    const authCheck = await checkAdminAuth();
    if (!authCheck.authorized) return { success: false, message: authCheck.message };

    try {
        const result = await cancelPaymentSafely(transactionId);
        if (result.success) revalidatePath("/admin/payments");
        return result;
    } catch (error) {
        console.error("Critical error in adminCancelPaymentAction:", error);
        return { success: false, message: "Error interno del servidor." };
    }
}

export async function adminCancelDisbursementAction(transactionId: string) {
    const authCheck = await checkAdminAuth();
    if (!authCheck.authorized) return { success: false, message: authCheck.message };

    try {
        const result = await cancelDisbursementSafely(transactionId);
        if (result.success) revalidatePath("/admin/disbursements");
        return result;
    } catch (error) {
        console.error("Critical error in adminCancelDisbursementAction:", error);
        return { success: false, message: "Error interno del servidor." };
    }
}

export async function adminCancelRefundAction(transactionId: string) {
    const authCheck = await checkAdminAuth();
    if (!authCheck.authorized) return { success: false, message: authCheck.message };

    try {
        const result = await cancelRefundSafely(transactionId);
        if (result.success) revalidatePath("/admin/refunds");
        return result;
    } catch (error) {
        console.error("Critical error in adminCancelRefundAction:", error);
        return { success: false, message: "Error interno del servidor." };
    }
}