'use client';

import { CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

type Props = {
  variante: 'aprobado' | 'pendiente';
};

const COPY = {
  aprobado: {
    titulo: '¡Compra exitosa!',
    cuerpo: 'Te enviaremos un correo de confirmación con el detalle de tu pedido.',
  },
  pendiente: {
    titulo: 'Estamos confirmando tu pago',
    cuerpo: 'Te enviaremos un correo en cuanto se acredite.',
  },
} as const;

export default function PagoProcesadoOverlay({ variante }: Props) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const { titulo, cuerpo } = COPY[variante];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 backdrop-blur-sm"
    >
      <div className="max-w-sm mx-4 text-center px-6 py-10 rounded-2xl">
        {variante === 'aprobado' ? (
          <CheckCircle2 className="mx-auto mb-4 text-[#16a34a]" size={64} />
        ) : (
          <Clock className="mx-auto mb-4 text-amber-500" size={64} />
        )}

        <h2 className="text-xl font-bold text-gray-800 mb-2">{titulo}</h2>
        <p className="text-gray-600">{cuerpo}</p>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400">
          <Loader2 className="animate-spin" size={16} />
          <span>No cierres esta ventana, te estamos redirigiendo…</span>
        </div>
      </div>
    </div>
  );
}
