// scripts/redownload-truper-faltantes.mjs
//
// Re-descarga solo las filas con estado "no-encontrado" de fotos-truper/_faltantes.csv,
// usando la URL ya corregida en la columna `url` de ese CSV (no reconstruida desde `clave`).
import { writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const OUTPUT_DIR = "fotos-truper";
const INPUT_CSV = path.join(OUTPUT_DIR, "_faltantes.csv");
const REPORT_CSV = path.join(OUTPUT_DIR, "_reporte_faltantes.csv");
const USER_AGENT = "ferredip-image-sync/1.0";
const REQUEST_TIMEOUT_MS = 30000;
const JPEG_MAGIC_BYTES = [0xff, 0xd8, 0xff];
const CONCURRENCIA = 5;
const REINTENTOS_MAX = 3;
const REINTENTOS_ESPERA_MS = [1000, 3000];

function esJpegValido(buffer) {
  return (
    buffer.length >= 3 &&
    buffer[0] === JPEG_MAGIC_BYTES[0] &&
    buffer[1] === JPEG_MAGIC_BYTES[1] &&
    buffer[2] === JPEG_MAGIC_BYTES[2]
  );
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function leerFaltantes() {
  const contenido = await readFile(INPUT_CSV, "utf8");
  const [, ...lineas] = contenido.split("\n").filter((l) => l.trim() !== "");
  return lineas
    .map(parseCsvLine)
    .map(([id, clave, url, estado, bytes, detalle]) => ({ id, clave, url, estado, bytes, detalle }))
    .filter((row) => row.estado === "no-encontrado");
}

function rutaDestino(id) {
  return path.join(OUTPUT_DIR, `${id}.jpg`);
}

async function intentarDescarga(url) {
  let response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    return { estado: "error", detalle: error.message, retryable: true };
  }

  if (response.status === 404) {
    return { estado: "no-encontrado", detalle: "HTTP 404" };
  }

  if (response.status === 429 || response.status >= 500) {
    return { estado: "error", detalle: `HTTP ${response.status}`, retryable: true };
  }

  if (response.status !== 200) {
    return { estado: "error", detalle: `HTTP ${response.status}`, retryable: false };
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    return { estado: "error", detalle: `content-type inesperado: ${contentType}`, retryable: false };
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!esJpegValido(buffer)) {
    return { estado: "error", detalle: "magic bytes no coinciden con JPEG", retryable: false };
  }

  return { estado: "ok", detalle: "", buffer };
}

async function descargarConReintentos(url) {
  let resultado;
  for (let intento = 0; intento < REINTENTOS_MAX; intento += 1) {
    resultado = await intentarDescarga(url);
    if (resultado.estado !== "error" || !resultado.retryable) {
      return resultado;
    }
    const espera = REINTENTOS_ESPERA_MS[intento];
    if (espera) {
      await new Promise((resolve) => setTimeout(resolve, espera));
    }
  }
  return resultado;
}

async function ejecutarConcurrente(items, worker, concurrencia) {
  let indice = 0;

  async function siguiente() {
    while (indice < items.length) {
      const miIndice = indice;
      indice += 1;
      await worker(items[miIndice]);
    }
  }

  const trabajadores = Array.from({ length: Math.min(concurrencia, items.length) }, () => siguiente());
  await Promise.all(trabajadores);
}

async function escribirReporte(filas) {
  const encabezado = "id,clave,url,estado,bytes,detalle";
  const filasOrdenadas = [...filas].sort((a, b) => a.id.localeCompare(b.id));
  const lineas = filasOrdenadas.map((fila) =>
    [fila.id, fila.clave, fila.url, fila.estado, fila.bytes, fila.detalle].map(csvEscape).join(",")
  );
  const contenido = [encabezado, ...lineas].join("\n") + "\n";
  await writeFile(REPORT_CSV, contenido, "utf8");
}

function parseArgs(argv) {
  const args = { dryRun: false, limit: null, force: false };
  for (const arg of argv) {
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--force") {
      args.force = true;
    } else if (arg.startsWith("--limit=")) {
      const value = Number(arg.slice("--limit=".length));
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`--limit debe ser un entero positivo, recibido: ${arg}`);
      }
      args.limit = value;
    } else {
      throw new Error(`Argumento desconocido: ${arg}`);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const todas = await leerFaltantes();
  const pendientes = args.limit ? todas.slice(0, args.limit) : todas;

  console.log(`Filas con estado "no-encontrado" en ${INPUT_CSV}: ${todas.length}`);
  if (args.dryRun) {
    console.log("--dry-run: no se descargo ningun archivo.");
    return;
  }

  const resumen = { ok: 0, "no-encontrado": 0, error: 0, omitido: 0 };
  const filasReporte = [];

  await ejecutarConcurrente(
    pendientes,
    async (row) => {
      const destino = rutaDestino(row.id);
      if (!args.force && existsSync(destino)) {
        resumen.omitido += 1;
        filasReporte.push({ ...row, estado: "omitido", bytes: 0, detalle: "archivo ya existia" });
        console.log(`OMITIDO  ${row.id} (${row.clave}) - archivo ya existia`);
        return;
      }

      const resultado = await descargarConReintentos(row.url);

      if (resultado.estado === "ok") {
        await writeFile(destino, resultado.buffer);
        resumen.ok += 1;
        filasReporte.push({ ...row, estado: "ok", bytes: resultado.buffer.length, detalle: "" });
        console.log(`OK  ${row.id} (${row.clave}) -> ${destino}`);
      } else {
        resumen[resultado.estado] += 1;
        filasReporte.push({ ...row, estado: resultado.estado, bytes: 0, detalle: resultado.detalle });
        console.log(`${resultado.estado.toUpperCase()}  ${row.id} (${row.clave}) - ${resultado.detalle}`);
      }
    },
    CONCURRENCIA
  );

  await escribirReporte(filasReporte);

  console.log("\nResumen:");
  for (const [estado, cantidad] of Object.entries(resumen)) {
    console.log(`  ${estado}: ${cantidad}`);
  }
  console.log(`\nReporte escrito en ${REPORT_CSV}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
