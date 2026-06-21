interface ClientWebhookPayload {
    tripId: string;
    status: "COMPLETED" | "FAILED" | "CANCELLED" | "REFUNDED" | "PENDING";
}

export async function notifyClientTransactionStatus(payload: ClientWebhookPayload): Promise<boolean> {
    
    // TODO: Cuando el otro equipo termine su API, cambiar esta variable a la URL real
    const CLIENT_SYSTEM_API_URL = process.env.CUSTOMER_SYSTEM_URL; 

    if (!CLIENT_SYSTEM_API_URL) {
        // MOCK MODE 
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log(`[MOCK CLIENT SYSTEM API] Payload:`, payload);

        return true;
    }

    try {
        const response = await fetch(`${CLIENT_SYSTEM_API_URL}/api/customer/trips/${payload.tripId}/payment-confirmation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.INTERNAL_API_SECRET}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error(`[CLIENT SYSTEM API ERROR] Status: ${response.status}`);
            return false;
        }

        console.log(`[CLIENT SYSTEM API] Successfully notified Client System for trip ${payload.tripId} with status ${payload.status}`);

        return true;
    } catch (error) {
        console.error(`[CLIENT SYSTEM API FATAL] Failed to notify Client System:`, error);
        return false;
    }
}