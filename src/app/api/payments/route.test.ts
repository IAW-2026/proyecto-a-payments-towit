import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route'; // Ajustá la ruta según donde tengas tu endpoint
import { db } from '@/db';

// 1. SIMULACIÓN (MOCKS) DE LA BASE DE DATOS Y DEPENDENCIAS
vi.mock('@/db', () => ({
    db: {
        query: {
            payments: {
                findFirst: vi.fn(),
            },
        },
        insert: vi.fn(() => ({
            values: vi.fn(() => ({
                returning: vi.fn(),
            })),
        })),
    },
}));

describe('POST /api/internal/payments', () => {
    // Configuramos el secreto antes de cada test para simular el entorno (.env)
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.INTERNAL_API_SECRET = 'test_secret_123';
    });

    // Helper para crear Requests rápidamente
    const createRequest = (body: any, authHeader: string | null = `Bearer test_secret_123`) => {
        return new NextRequest(new Request('http://localhost:3000/api/internal/payments', {
            method: 'POST',
            headers: authHeader ? { authorization: authHeader } : {},
            body: JSON.stringify(body),
        }));
    };

    // =========================================================
    // CASO 1: FALLO DE AUTORIZACIÓN (401)
    // =========================================================
    it('debería retornar 401 si el header de autorización es inválido o no existe', async () => {
        const req = createRequest({ tripId: 'TRP-1', clerkId: 1, amount: 100 }, 'Bearer INVALID_TOKEN');
        const res = await POST(req);
        
        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toBe('No autorizado');
    });

    // =========================================================
    // CASO 2: FALLO DE VALIDACIÓN DE DATOS (400)
    // =========================================================
    it('debería retornar 400 si falta algún campo obligatorio en el payload', async () => {
        // Falta amount y clerkId
        const req = createRequest({ tripId: 'TRP-1' }); 
        const res = await POST(req);
        
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('Invalid payload');
    });

    it('debería retornar 400 si el monto es negativo o cero', async () => {
        const req = createRequest({ tripId: 'TRP-1', clerkId: 1, amount: -500 });
        const res = await POST(req);
        
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe('The amount must be greater than 0');
    });

    // =========================================================
    // CASO 3: IDEMPOTENCIA / DUPLICADOS (409)
    // =========================================================
    it('debería retornar 409 si ya existe un pago para ese viaje', async () => {
        // Simulamos que la BD encuentra un pago existente
        vi.mocked(db.query.payments.findFirst).mockResolvedValueOnce({
            transaction_id: 'uuid-existente-123',
            status: 'PENDING',
        } as any);

        const req = createRequest({ tripId: 'TRP-1', clerkId: 1, amount: 100 });
        const res = await POST(req);
        
        expect(res.status).toBe(409);
        const data = await res.json();
        expect(data.message).toBe('Transaction for this trip already exists');
        expect(data.transaction_id).toBe('uuid-existente-123');
    });

    // =========================================================
    // CASO 4: EL CAMINO FELIZ / ÉXITO (201)
    // =========================================================
    it('debería crear la transacción y retornar 201 en un escenario válido', async () => {
        // 1. Simulamos que NO existe el viaje (devuelve null)
        vi.mocked(db.query.payments.findFirst).mockResolvedValueOnce(undefined);
        
        // 2. Simulamos la respuesta encadenada del insert().values().returning()
        const mockInsert = vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValueOnce([{ transactionId: 'nuevo-uuid-456' }]),
            }),
        });
        db.insert = mockInsert as any;

        const req = createRequest({ tripId: 'TRP-1', clerkId: 1, amount: 5000 });
        const res = await POST(req);
        
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.message).toBe('Transaction created successfully');
        expect(data.transaction_id).toBe('nuevo-uuid-456');
    });

    // =========================================================
    // CASO 5: BURBUJEO DE EXCEPCIONES (500)
    // =========================================================
    it('debería retornar 500 si ocurre un error catastrófico en la base de datos', async () => {
        // Simulamos que la BD se cae o lanza un error interno
        vi.mocked(db.query.payments.findFirst).mockRejectedValueOnce(new Error('DB Connection Timeout'));

        const req = createRequest({ tripId: 'TRP-1', clerkId: 1, amount: 100 });
        const res = await POST(req);
        
        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.error).toBe('Internal server error');
    });
});