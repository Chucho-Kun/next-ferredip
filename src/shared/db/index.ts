// db/index.ts o donde configures tu conexión
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 8,
  idleTimeoutMillis: 12000,
  connectionTimeoutMillis: 8000,
  keepAlive: true,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

// Sin este listener, un cliente inactivo que el proveedor cierra por su cuenta
// (ej. Railway cortando conexiones ociosas) emite 'error' sin oyentes y tumba
// el proceso. El pool ya descarta ese cliente solo; aquí nada más evitamos el crash.
pool.on('error', (err) => {
  console.error('Error inesperado en cliente inactivo del pool de PostgreSQL:', err);
});

export const db = drizzle(pool, { logger: false });

// Cerrar pool limpiamente
process.on('SIGTERM', async () => {
  console.log('Cerrando pool de conexiones...');
  await pool.end();
});