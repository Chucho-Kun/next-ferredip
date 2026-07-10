// db/index.ts o donde configures tu conexión
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 12,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 15000,
  keepAlive: true,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
});

export const db = drizzle(pool, { logger: false });

// Cerrar pool limpiamente
process.on('SIGTERM', async () => {
  console.log('Cerrando pool de conexiones...');
  await pool.end();
});