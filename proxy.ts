// proxy.ts — SPEC 18 rate-limit en memoria por IP + Origin check en POST
// Nota Next 16: `middleware.ts` está deprecado y renombrado a `proxy.ts`.
// Este archivo es el canónico en v16; implementa lo que la spec llama "middleware.ts".
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

const WINDOW_MS = 60_000;

function groupFor(pathname: string): { key: string; limit: number } | null {
  if (pathname === '/api/contacto' || pathname === '/api/send-email') {
    return { key: 'contacto', limit: 10 };
  }
  if (pathname.startsWith('/api/mercadopago/')) {
    return { key: 'mercadopago', limit: 20 };
  }
  if (pathname === '/api/search' || pathname === '/api/agente-productos') {
    return { key: 'search', limit: 30 };
  }
  return null;
}

function clientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function originMatchesHost(request: NextRequest): boolean {
  const host = request.headers.get('host') ?? '';
  if (!host) return true;
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  try {
    if (origin) return new URL(origin).host === host;
    if (referer) return new URL(referer).host === host;
  } catch {
    return false;
  }
  // Sin Origin/Referer (curl, apps, healthchecks): el proxy deja pasar,
  // cada ruta POST decide (send-email exige origen, resto permite vacío).
  return true;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Origin check solo en POST a APIs sensibles; GET siempre pasa
  if (request.method === 'POST') {
    if (
      pathname === '/api/contacto' ||
      pathname === '/api/send-email' ||
      pathname.startsWith('/api/mercadopago/')
    ) {
      if (!originMatchesHost(request)) {
        return NextResponse.json(
          { error: 'No se pudo procesar, intenta de nuevo' },
          { status: 403 },
        );
      }
    }
  }

  const group = groupFor(pathname);
  if (!group) return NextResponse.next();

  // Rate-limit solo en POST para no romper navegación GET
  if (request.method === 'GET') return NextResponse.next();

  const ip = clientIp(request);
  const bucketKey = `${group.key}:${ip}`;
  const now = Date.now();
  const bucket = store.get(bucketKey);

  if (!bucket || now >= bucket.resetAt) {
    store.set(bucketKey, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  bucket.count += 1;
  if (bucket.count > group.limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return NextResponse.json(
      { error: 'Demasiadas solicitudes, intenta de nuevo más tarde' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/contacto', '/api/send-email', '/api/mercadopago/:path*', '/api/search', '/api/agente-productos'],
};
