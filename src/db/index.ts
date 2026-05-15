import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Connect to db using environment variable
const sql = neon(process.env.DATABASE_URL!);

// Export the db instance to be used in the application
export const db = drizzle(sql, { schema });