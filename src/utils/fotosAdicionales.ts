// src/utils/fotosAdicionales.ts — solo se importa desde Server Components
import { existsSync } from 'node:fs';
import path from 'node:path';

const MAX_ADICIONALES = 3;
const ADICIONALES_DIR = path.join(process.cwd(), 'public', 'fotos', 'adicionales');

export function fotosAdicionalesDe(id: string): string[] {
  const fotos: string[] = [];

  for (let n = 1; n <= MAX_ADICIONALES; n += 1) {
    const archivo = `${id}-${n}.jpg`;
    if (!existsSync(path.join(ADICIONALES_DIR, archivo))) break;
    fotos.push(`/fotos/adicionales/${archivo}`);
  }

  return fotos;
}
