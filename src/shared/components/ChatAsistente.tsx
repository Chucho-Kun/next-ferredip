'use client';

import Script from 'next/script';

// Widget @n8n/chat servido por CDN (versión fija para reproducibilidad).
// Se eligió CDN en vez de `npm install @n8n/chat` porque el paquete arrastra
// 426 dependencias y cambiaba la versión de 9 paquetes existentes.
// Referencia: https://cdn.jsdelivr.net/npm/@n8n/chat@1.39.2/README.md
const N8N_CHAT_VERSION = '1.39.2';
const N8N_CHAT_BUNDLE = `https://cdn.jsdelivr.net/npm/@n8n/chat@${N8N_CHAT_VERSION}/dist/chat.bundle.es.js`;
export const N8N_CHAT_CSS = `https://cdn.jsdelivr.net/npm/@n8n/chat@${N8N_CHAT_VERSION}/dist/style.css`;

// El widget solo soporta locale `en`: los textos en español se inyectan
// sobrescribiendo ese diccionario (título "Asistente Ferredip" según spec).
function opcionesChat(webhookUrl: string): string {
  const opciones = {
    webhookUrl,
    mode: 'window',
    target: '#n8n-chat',
    showWelcomeScreen: false,
    enableStreaming: false,
    initialMessages: ['¡Hola! Soy tu Asistente en Ferredip. ¿Qué producto buscas hoy?'],
    i18n: {
      en: {
        title: 'Chatbot de Ferredip',
        subtitle: 'Pregúntame por productos, precios, envíos y más.',
        footer: '',
        getStarted: 'Nueva conversación',
        inputPlaceholder: 'Escribe tu mensaje…',
        closeButtonTooltip: 'Cerrar',
      },
    },
  };
  return JSON.stringify(opciones);
}

export default function ChatAsistente() {
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL;

  // Sin webhook configurado no se monta nada: el sitio sigue funcional sin chat.
  if (!webhookUrl) return null;

  return (
    <>
      <div id="n8n-chat" />
      <Script id="n8n-chat-init" type="module" strategy="lazyOnload">
        {`import { createChat } from '${N8N_CHAT_BUNDLE}';
          createChat(${opcionesChat(webhookUrl)});`}
      </Script>
    </>
  );
}
