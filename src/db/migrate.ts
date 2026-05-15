import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { config } from 'dotenv';

// Load the .env only if we're in local (in Vercel they are already injected)
config({ path: '.env.local' });

const runMigrate = async () => {
  if (!process.env.NEON_DB_DATABASE_URL) {
    throw new Error('NEON_DB_DATABASE_URL not defined');
  }

  const sql = neon(process.env.NEON_DB_DATABASE_URL);
  const db = drizzle(sql);

  console.log('Executing migrations');

  const start = Date.now();

  await migrate(db, { migrationsFolder: 'drizzle' });

  const end = Date.now();

  console.log(`Migrations completed in ${end - start}ms`);

  process.exit(0);
};

runMigrate().catch((err) => {
  console.error('❌ Error in migration:', err);
  process.exit(1);
});