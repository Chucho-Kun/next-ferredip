// src/utils/fotos.ts — único constructor de rutas de foto de producto (CDN R2, ver SPEC 08)
import manifiestoAdicionales from '@/src/shared/db/fotos-adicionales.json';

const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL;

export const LOGO_SRC = '/logo.webp'; // sigue siendo un asset local

export function fotoPrincipal(id: string): string {
  return `${CDN_URL}/fotos/webp/${id}.webp`;
}

export function fotoPrincipalThumb(id: string): string {
  return `${CDN_URL}/fotos/webp/160/${id}.webp`;
}

export function fotoPrincipalZoom(id: string): string {
  return `${CDN_URL}/fotos/${id}.jpg`;
}

export type FotoAdicional = { src: string; thumb: string; zoom: string };

export function fotosAdicionalesDe(id: string): FotoAdicional[] {
  const cantidad = (manifiestoAdicionales as Record<string, number>)[id] ?? 0;

  return Array.from({ length: cantidad }, (_, indice) => {
    const nombre = `${id}-${indice + 1}`;
    return {
      src: `${CDN_URL}/fotos/adicionales/webp/${nombre}.webp`,
      thumb: `${CDN_URL}/fotos/adicionales/webp/160/${nombre}.webp`,
      zoom: `${CDN_URL}/fotos/adicionales/${nombre}.jpg`,
    };
  });
}
