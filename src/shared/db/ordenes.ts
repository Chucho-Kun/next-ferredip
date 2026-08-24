// db/ordenes.ts
import { db } from '@/src/shared/db';
import { ordenes, type OrdenItem } from '@/src/shared/db/schema/ordenes';

type NuevaOrden = {
  mp_payment_id: string;
  mp_status: string | null | undefined;
  mp_status_detail: string | null | undefined;
  payment_method_id: string | null | undefined;
  installments: number;
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  direccion: string;
  entre_calles: string;
  ciudad: string;
  cp: string;
  subtotal: number;
  envio: number;
  total: number;
  items: OrdenItem[];
};

export async function registrarOrden(datos: NuevaOrden): Promise<void> {
  try {
    await db.insert(ordenes).values({
      ...datos,
      subtotal: String(datos.subtotal),
      envio: String(datos.envio),
      total: String(datos.total),
    });
  } catch (error) {
    console.error('❌ No se pudo registrar la orden', { mp_payment_id: datos.mp_payment_id, error });
  }
}
