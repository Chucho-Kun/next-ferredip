// scripts/import-csv.ts. NO FUNCIONA MEJOR USAR TABLE PLUS PARA IMPORTAR
import fs from 'fs';
import { parse } from 'csv-parse';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { productos } from '@/src/shared/db/schema/productList';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function importCSV() {
  const results: any[] = [];

  console.log('📂 Leyendo CSV...');

  fs.createReadStream('./productos.csv')
    .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`✅ ${results.length} registros leídos.`);

      try {
        // Insertar sin limpiar primero (para evitar el error)
        await db.insert(productos).values(
          results.map((item) => ({
            id: (item.id || item.clave || '').toString().trim(),
            clave: item.clave?.toString().trim(),
            variante: item.variante?.toString().trim(),
            descripcion: item.descripcion?.toString().trim(),
            informacion: item.informacion?.toString().trim(),
            disponible: item.disponible?.toString().trim(),
            marca: item.marca?.toString().trim(),
            categoria: item.categoria?.toString().trim(),
            existencias: parseInt(item.existencias) || 0,
            precioAnt: item.precioAnt ? item.precioAnt.toString().replace('$', '').trim() : null,
            precio: item.precio ? item.precio.toString().replace('$', '').trim() : '0',
            destacado: item.destacado === '1' || item.destacado === 1,
          }))
        );

        console.log('🎉 ¡Importación completada exitosamente!');
      } catch (error: any) {
        console.error('❌ Error al insertar:', error.message);
      } finally {
        await pool.end();
      }
    })
    .on('error', (err) => console.error('Error CSV:', err));
}

importCSV();