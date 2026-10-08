// src/shared/validation/schemas.ts — SPEC 18
// Schemas de validación centralizados. El servidor nunca cobra montos del cliente.
import { z } from 'zod';

export const ProcessPaymentSchema = z.object({
  token: z.string().min(10).max(500),
  issuer_id: z.string().max(20).optional(),
  payment_method_id: z.string().max(30),
  installments: z.number().int().min(1).max(24),
  payer: z.object({ email: z.string().email().max(120) }),
  items: z
    .array(
      z.object({
        id: z.string().max(40),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
  transaction_amount: z.number().positive().optional(),
});

export type ProcessPaymentInput = z.infer<typeof ProcessPaymentSchema>;

export const PreferenceSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().max(40),
        title: z.string().max(120),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
  payer: z.object({ email: z.string().email().max(120) }).optional(),
  metadata: z.record(z.string().max(40), z.string().max(200)).optional(),
});

export type PreferenceInput = z.infer<typeof PreferenceSchema>;

export const SendEmailSchema = z.object({
  customerEmail: z.string().email().max(120),
  orderData: z.object({
    id: z.string().max(60),
    total: z.number().positive(),
    items: z
      .array(
        z.object({
          id: z.string().max(40),
          titulo: z.string().max(120),
          quantity: z.number().int().min(1).max(99),
        }),
      )
      .max(50),
  }),
  deliveryData: z.object({
    nombre: z.string().max(80),
    direccion: z.string().max(200),
    email: z.string().email().max(120).optional(),
  }),
});

export type SendEmailInput = z.infer<typeof SendEmailSchema>;

export const RelacionadosSchema = z.object({
  related_ids: z.array(z.string().max(40)).max(20),
});

export type RelacionadosInput = z.infer<typeof RelacionadosSchema>;

// Tipos auxiliares para recálculo server-side
export type ServerQuote = { id: string; unit_price: number; quantity: number; line_total: number };
export type QuoteCheck = { server_total: number; client_total: number; diverged: boolean };
