import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { getPaymentsUser } from '@/db/queries/users';

// ---------------------------------------------------------------------------
// 1. MOCKS DE INFRAESTRUCTURA (Drizzle ORM y Dependencias Externas)
// ---------------------------------------------------------------------------

// Usamos vi.hoisted para elevar la creación de la variable junto con el mock
const { mockReturning } = vi.hoisted(() => {
    return {
        mockReturning: vi.fn(),
    };
});

vi.mock('@/db', () => ({
    db: {
        insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
                onConflictDoNothing: vi.fn().mockReturnValue({
                    returning: mockReturning,
                }),
            }),
        }),
    },
}));

// Mockeamos la función de base de datos que busca al usuario
vi.mock('@/db/queries/users', () => ({
    getPaymentsUser: vi.fn(),
}));

// ---------------------------------------------------------------------------
// 2. UTILIDADES DE PRUEBA (Test Helpers)
// ---------------------------------------------------------------------------

const MOCK_SECRET = 'test_super_secret';
process.env.INTERNAL_API_SECRET = MOCK_SECRET;

/**
 * Helper para construir un NextRequest simulado con tipado fuerte.
 */
function createMockRequest(body: Record<string, any>, authHeader: string | null = `Bearer ${MOCK_SECRET}`) {
    const headers = new Headers();
    if (authHeader) {
        headers.set('Authorization', authHeader);
    }
    
    return new NextRequest('http://localhost:3000/api/payments', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
}

// ---------------------------------------------------------------------------
// 3. SUITE DE PRUEBAS
// ---------------------------------------------------------------------------

describe('POST /api/payments', () => {
    
    // Limpiamos los mocks antes de cada test para evitar contaminación de estado (Golden Rule en QA)
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Debe retornar 401 si no se envía el header de autorización', async () => {
        // Arrange
        const req = createMockRequest({ tripId: 'TRP-123', clerkId: 'user_1', amount: 5000 }, null);

        // Act
        const response = await POST(req);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(401);
        expect(data.error).toBe('Not authorized');
    });

    it('Debe retornar 401 si el token es inválido', async () => {
        // Arrange
        const req = createMockRequest({ tripId: 'TRP-123', clerkId: 'user_1', amount: 5000 }, 'Bearer token_falso');

        // Act
        const response = await POST(req);

        // Assert
        expect(response.status).toBe(401);
    });

    it('Debe retornar 400 si faltan parámetros en el payload', async () => {
        // Arrange (falta el amount)
        const req = createMockRequest({ tripId: 'TRP-123', clerkId: 'user_1' });

        // Act
        const response = await POST(req);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toContain('Invalid payload');
    });

    it('Debe retornar 400 si el monto (amount) es 0 o negativo', async () => {
        // Arrange
        const req = createMockRequest({ tripId: 'TRP-123', clerkId: 'user_1', amount: -500 });

        // Act
        const response = await POST(req);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toBe('The amount must be greater than 0');
    });

    it('Debe retornar 409 si el pago ya existe (Validación de Idempotencia por DB)', async () => {
        // Arrange
        const req = createMockRequest({ tripId: 'TRP-123', clerkId: 'user_1', amount: 5000 });
        
        // Simulamos que el usuario existe
        vi.mocked(getPaymentsUser).mockResolvedValue({ userId: 99, balance: '0', is_banned: false });
        
        // Simulamos que Postgres rechazó el INSERT (onConflictDoNothing devuelve array vacío)
        mockReturning.mockResolvedValue([]); 

        // Act
        const response = await POST(req);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(409);
        expect(data.error).toBe('Payment already exists.');
    });

    it('Debe retornar 201 y el ID de transacción si todo es correcto (Happy Path)', async () => {
        // Arrange
        const req = createMockRequest({ tripId: 'TRP-123', clerkId: 'user_1', amount: 5000 });
        const mockTxId = 'uuid-transaccion-exitosa-789';
        
        vi.mocked(getPaymentsUser).mockResolvedValue({ userId: 99, balance: '0', is_banned: false });
        
        // Simulamos que Postgres insertó correctamente y devolvió el ID
        mockReturning.mockResolvedValue([{ transactionId: mockTxId }]);

        // Act
        const response = await POST(req);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(201);
        expect(data.message).toBe('Transaction created successfully');
        expect(data.transaction_id).toBe(mockTxId);
        
        // Verificamos que la función de DB fue llamada con los argumentos correctos
        expect(getPaymentsUser).toHaveBeenCalledWith('user_1');
        expect(mockReturning).toHaveBeenCalledOnce();
    });
});