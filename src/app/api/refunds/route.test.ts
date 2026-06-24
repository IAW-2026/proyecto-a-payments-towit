import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { getPaymentsUser } from '@/db/queries/users';

// ---------------------------------------------------------------------------
// 1. MOCKS DE INFRAESTRUCTURA Y ESTADO (Hybrid Promise Mock)
// ---------------------------------------------------------------------------


vi.mock('@/db/queries/users', () => ({
    getPaymentsUser: vi.fn(),
}));

// Variables de estado para controlar qué devuelve la base de datos en cada test
let mockPaymentRecord: any[] = [];
let mockExistingRefund: any[] = [];

// El "Hybrid Promise Trick": Un objeto que sirve tanto para .where().for() como para await .where()
const mockWhereResult = {
    for: vi.fn(() => Promise.resolve(mockPaymentRecord)),
    then: (resolve: any) => resolve(mockExistingRefund), // Permite hacer `await tx...where()`
};

// Mock del objeto de transacción `tx`
const mockTx = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnValue(mockWhereResult),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
};

// Forzamos a db.transaction a ejecutar nuestro mockTx
vi.mock('@/db', () => ({
    db: {
        transaction: vi.fn(async (callback) => await callback(mockTx)),
    },
}));

// ---------------------------------------------------------------------------
// 2. UTILIDADES DE PRUEBA
// ---------------------------------------------------------------------------

const MOCK_SECRET = 'test_super_secret';
process.env.INTERNAL_API_SECRET = MOCK_SECRET;

function createMockRequest(body: Record<string, any>, authHeader: string | null = `Bearer ${MOCK_SECRET}`) {
    const headers = new Headers();
    if (authHeader) headers.set('Authorization', authHeader);
    
    return new NextRequest('http://localhost:3000/api/refunds', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
}

// ---------------------------------------------------------------------------
// 3. SUITE DE PRUEBAS
// ---------------------------------------------------------------------------

describe('POST /api/refunds', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
        // Estado por defecto: El usuario existe, no hay pagos ni reembolsos previos
        vi.mocked(getPaymentsUser).mockResolvedValue({ userId: 1, balance: '100.00', is_banned: false });
        mockPaymentRecord = [];
        mockExistingRefund = [];
    });

    // --- GRUPO 1: Validaciones de Estructura y Seguridad ---

    it('Debe retornar 401 si el header de autorización es incorrecto', async () => {
        const req = createMockRequest({ trip_id: 't_1', clerk_id: 'c_1', reason: 'Test', refund_type: 'TOTAL' }, 'Bearer token_invalido');
        const response = await POST(req);
        expect(response.status).toBe(401);
    });

    it('Debe retornar 400 si el refund_type no es TOTAL ni PARTIAL', async () => {
        const req = createMockRequest({ trip_id: 't_1', clerk_id: 'c_1', reason: 'Test', refund_type: 'INVALIDO' });
        const response = await POST(req);
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.error).toContain("must be 'TOTAL' or 'PARTIAL'");
    });

    // --- GRUPO 2: Máquina de Estados (State Machine) ---

    it('Debe retornar 404 si el pago original no existe en la base de datos', async () => {
        mockPaymentRecord = []; // El select().for() devuelve vacío
        const req = createMockRequest({ trip_id: 't_1', clerk_id: 'c_1', reason: 'Test', refund_type: 'TOTAL' });

        const response = await POST(req);
        expect(response.status).toBe(404);
    });

    it('ESTADO PENDING: Debe retornar 200 y cancelar el viaje sin alterar balance', async () => {
        mockPaymentRecord = [{ transaction_id: 'tx_123', status: 'PENDING', amount: '5000' }];
        const req = createMockRequest({ trip_id: 't_1', clerk_id: 'c_1', reason: 'Test', refund_type: 'TOTAL' });

        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toContain('Payment was pending and has been cancelled');
        
        // Verificamos que SOLO se hizo un update (para cambiar estado) y NO se insertó un log de refund
        expect(mockTx.update).toHaveBeenCalledTimes(1);
        expect(mockTx.insert).not.toHaveBeenCalled(); 
    });

    it('ESTADO COMPLETED (Doble Intento): Debe retornar 409 si el reembolso ya fue procesado', async () => {
        mockPaymentRecord = [{ transaction_id: 'tx_123', status: 'COMPLETED', amount: '5000' }];
        mockExistingRefund = [{ trip_id: 't_1' }]; // Simulamos que la segunda query encuentra un registro
        
        const req = createMockRequest({ trip_id: 't_1', clerk_id: 'c_1', reason: 'Test', refund_type: 'TOTAL' });

        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(409);
        expect(data.error).toBe('Refund already processed for this trip.');
    });

    it('ESTADO COMPLETED (Happy Path): Debe retornar 201 y procesar la devolución de dinero', async () => {
        mockPaymentRecord = [{ transaction_id: 'tx_123', status: 'COMPLETED', amount: '5000' }];
        mockExistingRefund = []; // No hay reembolsos previos
        
        const req = createMockRequest({ trip_id: 't_1', clerk_id: 'c_1', reason: 'Retraso', refund_type: 'PARTIAL' });

        const response = await POST(req);
        
        expect(response.status).toBe(201);
        
        // Verificamos que se cumplió la transaccionalidad ACID (3 operaciones)
        expect(mockTx.insert).toHaveBeenCalledTimes(1); // 1. Crea el récord del refund
        expect(mockTx.update).toHaveBeenCalledTimes(2); // 2. Actualiza balance del usuario, 3. Actualiza estado a REFUNDED
    });

    it('ESTADO INVÁLIDO: Debe retornar 400 si el pago está en un estado no reembolsable (ej. DISBURSED)', async () => {
        mockPaymentRecord = [{ transaction_id: 'tx_123', status: 'DISBURSED', amount: '5000' }];
        const req = createMockRequest({ trip_id: 't_1', clerk_id: 'c_1', reason: 'Test', refund_type: 'TOTAL' });

        const response = await POST(req);
        
        expect(response.status).toBe(400); // Dependiendo de tu implementación exacta, puede ser 409 o 400.
    });
});