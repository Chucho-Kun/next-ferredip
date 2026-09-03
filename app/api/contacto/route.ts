// app/api/contacto/route.ts
import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

type ContactoPayload = {
  nombre: string;
  email: string;
  telefono?: string;
  mensaje: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function construirHtml(data: ContactoPayload): string {
  const nombre = escapeHtml(data.nombre);
  const email = escapeHtml(data.email);
  const telefono = data.telefono ? escapeHtml(data.telefono) : null;
  const mensaje = escapeHtml(data.mensaje).replace(/\n/g, '<br />');

  return `
  <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #FF5E00; margin-bottom: 16px;">Nuevo mensaje de contacto</h2>
    <table style="border-collapse: collapse; width: 100%;">
      <tbody>
        <tr>
          <td style="padding: 8px 12px; font-weight: bold; border: 1px solid #eee; width: 120px;">Nombre</td>
          <td style="padding: 8px 12px; border: 1px solid #eee;">${nombre}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: bold; border: 1px solid #eee;">Correo</td>
          <td style="padding: 8px 12px; border: 1px solid #eee;">${email}</td>
        </tr>
        ${telefono ? `
        <tr>
          <td style="padding: 8px 12px; font-weight: bold; border: 1px solid #eee;">Teléfono</td>
          <td style="padding: 8px 12px; border: 1px solid #eee;">${telefono}</td>
        </tr>` : ''}
        <tr>
          <td style="padding: 8px 12px; font-weight: bold; border: 1px solid #eee; vertical-align: top;">Mensaje</td>
          <td style="padding: 8px 12px; border: 1px solid #eee;">${mensaje}</td>
        </tr>
      </tbody>
    </table>
  </div>
  `;
}

function validar(body: unknown): { ok: true; data: ContactoPayload } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'El cuerpo de la petición no es válido.' };
  }

  const { nombre, email, telefono, mensaje } = body as Record<string, unknown>;

  if (typeof nombre !== 'string' || nombre.trim().length < 1 || nombre.trim().length > 100) {
    return { ok: false, error: 'El nombre es obligatorio y debe tener entre 1 y 100 caracteres.' };
  }

  if (typeof email !== 'string' || email.trim().length > 150 || !EMAIL_RE.test(email.trim())) {
    return { ok: false, error: 'El correo es obligatorio y debe tener un formato válido.' };
  }

  if (telefono !== undefined && telefono !== null && telefono !== '') {
    if (typeof telefono !== 'string' || telefono.trim().length > 30) {
      return { ok: false, error: 'El teléfono no puede tener más de 30 caracteres.' };
    }
  }

  if (typeof mensaje !== 'string' || mensaje.trim().length < 10 || mensaje.trim().length > 5000) {
    return { ok: false, error: 'El mensaje es obligatorio y debe tener entre 10 y 5000 caracteres.' };
  }

  return {
    ok: true,
    data: {
      nombre: nombre.trim(),
      email: email.trim(),
      telefono: typeof telefono === 'string' && telefono.trim() !== '' ? telefono.trim() : undefined,
      mensaje: mensaje.trim(),
    },
  };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'El cuerpo de la petición no es un JSON válido.' }, { status: 400 });
  }

  const resultado = validar(body);
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 400 });
  }

  const { data } = resultado;

  try {
    const { error } = await resend.emails.send({
      from: 'Ferredip Web <noreply@ferredip.com.mx>',
      to: ['contacto@ferredip.com.mx'],
      replyTo: data.email,
      subject: `Nuevo mensaje de contacto — ${data.nombre}`,
      html: construirHtml(data),
    });

    if (error) {
      console.error('❌ Error Resend (contacto):', error);
      return NextResponse.json({ error: 'No se pudo enviar el mensaje. Intenta de nuevo más tarde.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('❌ Error enviando correo de contacto:', err);
    return NextResponse.json({ error: 'No se pudo enviar el mensaje. Intenta de nuevo más tarde.' }, { status: 500 });
  }
}
