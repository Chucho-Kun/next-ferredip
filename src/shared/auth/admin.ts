// src/shared/auth/admin.ts — SPEC 18 gate admin con token
import { timingSafeEqual } from 'crypto';

export function isAdminAuthorized(request: Request): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const provided = request.headers.get('x-admin-token');
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
