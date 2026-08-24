import { pgTable, serial, varchar, integer, numeric, timestamp, jsonb, text } from 'drizzle-orm/pg-core';

export type OrdenItem = {
  id: string;
  titulo: string;
  descripcion: string;
  clave: string;
  marca: string;
  cantidad: number;
  precio: number;     // unitario, ya normalizado a número
};

export const ordenes = pgTable('ordenes', {
  id: serial('id').primaryKey(),

  // Identidad del pago en Mercado Pago
  mp_payment_id: varchar('mp_payment_id', { length: 40 }).unique(),
  mp_status: varchar('mp_status', { length: 30 }),
  mp_status_detail: varchar('mp_status_detail', { length: 60 }),
  payment_method_id: varchar('payment_method_id', { length: 30 }),
  installments: integer('installments'),

  // Comprador y entrega
  nombre: varchar('nombre', { length: 100 }),
  apellidos: varchar('apellidos', { length: 100 }),
  email: varchar('email', { length: 150 }),
  telefono: varchar('telefono', { length: 30 }),
  direccion: text('direccion'),
  entre_calles: text('entre_calles'),
  ciudad: varchar('ciudad', { length: 100 }),
  cp: varchar('cp', { length: 10 }),

  // Montos
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }),
  envio: numeric('envio', { precision: 12, scale: 2 }),
  total: numeric('total', { precision: 12, scale: 2 }),

  // Contenido del pedido
  items: jsonb('items').$type<OrdenItem[]>().default([]),

  // Seguimiento interno, editable a mano
  estatus_pedido: varchar('estatus_pedido', { length: 20 }).default('nuevo'),

  createdat: timestamp('createdat').defaultNow(),
});
