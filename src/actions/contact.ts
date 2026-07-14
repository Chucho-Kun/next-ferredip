'use server';

import nodemailer from 'nodemailer';

export async function sendContactEmail(formData: FormData) {
  const nombre = formData.get('nombre') as string;
  const email = formData.get('email') as string;
  const mensaje = formData.get('mensaje') as string;

  console.log("📧 Intentando enviar email...");
  console.log("EMAIL_PASSWORD existe?", !!process.env.EMAIL_PASSWORD);
  console.log("EMAIL_PASSWORD length:", process.env.EMAIL_PASSWORD?.length);

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.hospedalia.com",//"mail.hospedalia.com",
      port: 587,
      secure: false,
      auth: {
        user: "contacto@ferredip.com.mx",
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: `"Sitio Web Ferredip" <contacto@ferredip.com.mx>`,
      to: "contacto@ferredip.com.mx",
      replyTo: email,
      subject: `Nuevo mensaje - ${nombre}`,
      html: `...`,
    });

    console.log("✅ Email enviado:", info.messageId);
    return { success: true, message: "¡Mensaje enviado correctamente!" };

  } catch (error: any) {
    console.error("❌ Error completo:", error);
    console.error("Código de error:", error.code);
    console.error("Respuesta del servidor:", error.response);
    
    return { 
      success: false, 
      message: "Error al enviar el mensaje. Inténtalo más tarde." 
    };
  }
}