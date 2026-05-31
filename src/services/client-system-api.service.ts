interface ClientWebhookPayload {
    tripId: string;
    status: "COMPLETED" | "FAILED" | "CANCELLED" | "REFUNDED" | "PENDING";
}

export async function notifyClientTransactionStatus(payload: ClientWebhookPayload): Promise<boolean> {
    
    // TODO: Cuando el otro equipo termine su API, cambiar esta variable a la URL real
    const CLIENT_SYSTEM_API_URL = process.env.CLIENT_SYSTEM_URL; 

    if (!CLIENT_SYSTEM_API_URL) {
        // MOCK MODE 
        await new Promise(resolve => setTimeout(resolve, 300));
        
        return true;
    }

    try {
        const response = await fetch(CLIENT_SYSTEM_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.CLIENT_SYSTEM_SECRET}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error(`[CLIENT SYSTEM API ERROR] Status: ${response.status}`);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`[CLIENT SYSTEM API FATAL] Failed to notify Client System:`, error);
        return false;
    }
}