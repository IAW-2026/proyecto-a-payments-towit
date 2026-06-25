import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';
import ws from 'ws';

// 1. Le decimos a Neon que use la librería 'ws' en el entorno de Node.js
neonConfig.webSocketConstructor = ws;

// 2. Capturamos la cadena de conexión (a veces Vercel/Neon usan POSTGRES_URL)
const connectionString = process.env.NEON_DB_DATABASE_URL || process.env.POSTGRES_URL;

// 3. Validación Fail-Fast: Si no hay string de conexión, tiramos la app antes de hacer peticiones locas
if (!connectionString) {
    throw new Error("CRITICAL: La variable DATABASE_URL o POSTGRES_URL no está definida en tu .env.local");
}

// 4. Instanciamos el Pool (TCP/WebSocket)
const pool = new Pool({ connectionString });

// 5. Pasamos el Pool al driver de Drizzle
export const db = drizzle(pool, { schema });