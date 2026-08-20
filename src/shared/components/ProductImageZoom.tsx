import Image from 'next/image';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { X } from 'lucide-react';

const CONSULTA_PUNTERO_GRUESO = '(pointer: coarse)';

function suscribirPunteroGrueso(callback: () => void) {
  const mql = window.matchMedia(CONSULTA_PUNTERO_GRUESO);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function leerPunteroGrueso() {
  return window.matchMedia(CONSULTA_PUNTERO_GRUESO).matches;
}

// El servidor no tiene matchMedia: el primer render asume puntero fino (false)
// y useSyncExternalStore lo corrige del lado del cliente sin romper la hidratación.
function leerPunteroGruesoServidor() {
  return false;
}

const UMBRAL_AMPLIACION = 1.2;
const PANEL_PX = 366;
const PANEL_GAP_PX = 16;
// Mismo fallback que ProductCard.tsx: sin foto real, no tiene sentido ofrecer zoom.
const LOGO_SRC = '/logo.webp';

type ZoomSource = {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
};

type Interaccion = {
  lenteX: number;
  lenteY: number;
  lenteLado: number;
  // backgroundPosition del panel: desplazamiento (positivo) dentro de la foto grande, en px.
  fondoX: number;
  fondoY: number;
  // Posición del panel, a la derecha de la foto (coords del contenedor).
  panelLeft: number;
  panelTop: number;
};

type Props = {
  zoomSrc: string;
  src: string;
  alt: string;
  onError: () => void;
};

export default function ProductImageZoom({ zoomSrc, src, alt, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // La foto tiene mt-8: su caja no arranca en (0,0) del contenedor, así que la
  // geometría del zoom se mide sobre la <img> real, no sobre el contenedor.
  const imageRef = useRef<HTMLImageElement>(null);
  const triedRef = useRef(false);
  // null = todavía no se intentó cargar, o falló, o no amplía lo suficiente -> sin zoom
  const [zoom, setZoom] = useState<ZoomSource | null>(null);
  // null = el cursor no está sobre la foto (o todavía no hay zoom disponible)
  const [interaccion, setInteraccion] = useState<Interaccion | null>(null);
  const esTactil = useSyncExternalStore(
    suscribirPunteroGrueso,
    leerPunteroGrueso,
    leerPunteroGruesoServidor
  );
  const [lightboxAbierto, setLightboxAbierto] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !zoomSrc || src === LOGO_SRC) return;

    let cancelled = false;

    const precargarFotoGrande = () => {
      if (triedRef.current) return;
      triedRef.current = true;

      const fotoGrande = new window.Image();
      fotoGrande.onload = () => {
        if (cancelled) return;
        const rect = imageRef.current?.getBoundingClientRect();
        if (rect && rect.width > 0 && fotoGrande.naturalWidth >= rect.width * UMBRAL_AMPLIACION) {
          setZoom({
            src: fotoGrande.src,
            naturalWidth: fotoGrande.naturalWidth,
            naturalHeight: fotoGrande.naturalHeight,
          });
        }
      };
      fotoGrande.onerror = () => {
        if (cancelled) return;
        setZoom(null);
      };
      fotoGrande.src = zoomSrc;
    };

    container.addEventListener('pointerenter', precargarFotoGrande);
    return () => {
      cancelled = true;
      container.removeEventListener('pointerenter', precargarFotoGrande);
    };
  }, [zoomSrc, src]);

  const moverLente = (e: React.MouseEvent<HTMLDivElement>) => {
    // En táctil no hay lente ni panel: manda el lightbox (ver abrirLightbox).
    // Sin foto real (fallback al logo) tampoco hay nada que ampliar.
    if (esTactil || !zoom || !imageRef.current || src === LOGO_SRC) return;

    const rect = imageRef.current.getBoundingClientRect();
    const factor = zoom.naturalWidth / rect.width;
    const lado = PANEL_PX / factor;

    // Posición dentro de la foto, acotada a su recuadro.
    const xEnFoto = clamp(e.clientX - rect.left - lado / 2, 0, rect.width - lado);
    const yEnFoto = clamp(e.clientY - rect.top - lado / 2, 0, rect.height - lado);

    // Convertida a coordenadas del contenedor (donde se posicionan los divs absolutos).
    const { offsetLeft, offsetTop, offsetWidth } = imageRef.current;

    setInteraccion({
      lenteX: offsetLeft + xEnFoto,
      lenteY: offsetTop + yEnFoto,
      lenteLado: lado,
      fondoX: xEnFoto * factor,
      fondoY: yEnFoto * factor,
      panelLeft: offsetLeft + offsetWidth + PANEL_GAP_PX,
      panelTop: offsetTop,
    });
  };

  const ocultarLente = () => setInteraccion(null);

  const abrirLightbox = () => {
    if (!esTactil || !zoom || src === LOGO_SRC) return;
    setLightboxAbierto(true);
  };

  // Derivado en render, no en estado: así no hace falta limpiar zoom/interaccion
  // "a mano" si src cambia a LOGO_SRC ya con un zoom cargado de antes.
  const hayZoomDisponible = zoom !== null && src !== LOGO_SRC;

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${!esTactil && hayZoomDisponible ? 'cursor-zoom-in' : ''}`}
      onMouseEnter={moverLente}
      onMouseMove={moverLente}
      onMouseLeave={ocultarLente}
      onBlur={ocultarLente}
      onPointerCancel={ocultarLente}
      onClick={abrirLightbox}
    >
      <Image
        key={src}
        ref={imageRef}
        src={src}
        alt={alt}
        width={366}
        height={214}
        className="h-auto object-contain mt-8"
        priority={true}           // Solo pon true en la página principal
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 366px"
        quality={85}
        onError={onError}
      />

      {hayZoomDisponible && zoom && interaccion && (
        <>
          <div
            className="pointer-events-none absolute border border-white bg-white/30"
            style={{
              left: interaccion.lenteX,
              top: interaccion.lenteY,
              width: interaccion.lenteLado,
              height: interaccion.lenteLado,
            }}
          />
          <div
            className="pointer-events-none absolute z-20 hidden border border-gray-300 bg-white lg:block"
            style={{
              left: interaccion.panelLeft,
              top: interaccion.panelTop,
              width: PANEL_PX,
              height: PANEL_PX,
              backgroundImage: `url(${zoom.src})`,
              backgroundSize: `${zoom.naturalWidth}px ${zoom.naturalHeight}px`,
              backgroundPosition: `-${interaccion.fondoX}px -${interaccion.fondoY}px`,
              backgroundRepeat: 'no-repeat',
            }}
          />
        </>
      )}

      {esTactil && hayZoomDisponible && zoom && (
        <Dialog.Root open={lightboxAbierto} onOpenChange={setLightboxAbierto}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
            <Dialog.Content
              className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              <VisuallyHidden>
                <Dialog.Title>{alt || 'Foto del producto'}</Dialog.Title>
              </VisuallyHidden>

              {/* eslint-disable-next-line @next/next/no-img-element -- foto grande a tamaño real, no next/image */}
              <img src={zoom.src} alt={alt} className="max-h-[85vh] max-w-[90vw] w-auto object-contain" />

              <Dialog.Close
                aria-label="Cerrar"
                className="absolute -top-10 right-0 text-white"
              >
                <X size={28} />
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}

function clamp(valor: number, min: number, max: number) {
  return Math.min(Math.max(valor, min), max);
}
