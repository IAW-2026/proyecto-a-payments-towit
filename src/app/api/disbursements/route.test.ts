import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { getPaymentsUser } from '@/db/queries/users';
import { db } from '@/db';

// ---------------------------------------------------------------------------
// 1. MOCKS DE INFRAESTRUCTURA
// ---------------------------------------------------------------------------

// 1.A: Mockeamos la búsqueda del usuario (Conductor)
vi.mock('@/db/queries/users', () => ({
    getPaymentsUser: vi.fn(),
}));

// 1.B: Mockeamos el objeto interno de la transacción `tx`
const mockTx = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    for: vi.fn(), // Modificaremos su valor de retorno en cada test
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
};

// 1.C: Mockeamos Drizzle ORM y forzamos a que `db.transaction` ejecute el callback pasando nuestro `mockTx`
vi.mock('@/db', () => ({
    db: {
        transaction: vi.fn(async (callback) => {
            return await callback(mockTx);
        }),
    },
}));

// ---------------------------------------------------------------------------
// 2. UTILIDADES DE PRUEBA (Test Helpers)
// ---------------------------------------------------------------------------

const MOCK_SECRET = 'test_super_secret';
process.env.INTERNAL_API_SECRET = MOCK_SECRET;

function createMockRequest(body: Record<string, any>, authHeader: string | null = `Bearer ${MOCK_SECRET}`) {
    const headers = new Headers();
    if (authHeader) headers.set('Authorization', authHeader);

    return new NextRequest('http://localhost:3000/api/disbursements', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
}

// ---------------------------------------------------------------------------
// 3. SUITE DE PRUEBAS
// ---------------------------------------------------------------------------

describe('POST /api/disbursements', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Por defecto, simulamos que el usuario siempre existe en los tests que lleguen a esa línea
        vi.mocked(getPaymentsUser).mockResolvedValue({ userId: 1, balance: '100.00', is_banned: false });
    });

    // --- GRUPO 1: Validaciones de Entrada ---

    it('Debe retornar 401 si no se envía el header de autorización', async () => {
        const req = createMockRequest({ clerkId: 'c_1', tripId: 't_1', feePercentage: 15 }, null);
        const response = await POST(req);
        expect(response.status).toBe(401);
    });

    it('Debe retornar 400 si faltan parámetros requeridos', async () => {
        const req = createMockRequest({ clerkId: 'c_1', tripId: 't_1' }); // Falta feePercentage
        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Missing required parameters');
    });

    it('Debe retornar 400 si el porcentaje de comisión es inválido', async () => {
        const req = createMockRequest({ clerkId: 'c_1', tripId: 't_1', feePercentage: 150 });
        const response = await POST(req);
        expect(response.status).toBe(400);
    });

    // --- GRUPO 2: Validaciones de Negocio y Base de Datos ---

    it('Debe retornar 404 si el conductor no existe en la base de datos local', async () => {
        // Arrange
        vi.mocked(getPaymentsUser).mockResolvedValue(null);
        const req = createMockRequest({ clerkId: 'c_fantasma', tripId: 't_1', feePercentage: 15 });

        // Act
        const response = await POST(req);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(404);
        expect(data.error).toBe('Driver not found in database');
    });

    it('Debe retornar 404 si no se encuentra un pago registrado para ese viaje', async () => {
        // Arrange
        mockTx.for.mockResolvedValue([]); // Simula que el SELECT FOR UPDATE no encontró nada
        const req = createMockRequest({ clerkId: 'c_1', tripId: 't_1', feePercentage: 15 });

        // Act
        const response = await POST(req);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(404);
        expect(data.error).toBe('Trip payment not found');
    });

    it('Debe retornar 400 si el pago existe pero su estado NO es COMPLETED (Ej: PENDING)', async () => {
        // Arrange
        mockTx.for.mockResolvedValue([{ amount: '5000', status: 'PENDING' }]);
        const req = createMockRequest({ clerkId: 'c_1', tripId: 't_1', feePercentage: 15 });

        // Act
        const response = await POST(req);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toContain('Cannot disburse. Payment status is PENDING');
    });

    it('Debe retornar 409 si ocurre un doble intento de liquidación (Error de Unique Constraint)', async () => {
        // Arrange
        const req = createMockRequest({ clerkId: 'c_1', tripId: 't_1', feePercentage: 15 });

        // Aquí hacemos fallar la transacción entera imitando un error nativo de Postgres (23505)
        vi.mocked(db.transaction).mockRejectedValueOnce({ code: '23505' });

        // Act
        const response = await POST(req);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(409);
        expect(data.error).toBe('Conflict: The trip has already been disbursed.');
    });

    it('Debe retornar 201 y procesar la transacción si todo es correcto (Happy Path)', async () => {
        // Arrange
        mockTx.for.mockResolvedValue([{ amount: '5000', status: 'COMPLETED' }]);
        const req = createMockRequest({ clerkId: 'c_1', tripId: 't_1', feePercentage: 15 });

        // Act
        const response = await POST(req);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(201);
        expect(data.message).toBe('Disbursement successful');

        // Verificamos que se ejecutó el insert y las dos actualizaciones dentro de la transacción
        expect(mockTx.insert).toHaveBeenCalledTimes(1);
        expect(mockTx.update).toHaveBeenCalledTimes(2); // Uno para balance (users) y otro para el status (payments)
    });
});