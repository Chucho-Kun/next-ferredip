// scripts/download-truper-images.mjs
import { Pool } from "pg";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const TRUPER_BASE_URL = "https://www.truper.com/media/import/imagenes";
const OUTPUT_DIR = "fotos-truper";
const USER_AGENT = "ferredip-image-sync/1.0";
const REQUEST_TIMEOUT_MS = 30000;
const JPEG_MAGIC_BYTES = [0xff, 0xd8, 0xff];

function normalizarClave(clave) {
  return clave.trim().toUpperCase();
}

function esJpegValido(buffer) {
  return (
    buffer.length >= 3 &&
    buffer[0] === JPEG_MAGIC_BYTES[0] &&
    buffer[1] === JPEG_MAGIC_BYTES[1] &&
    buffer[2] === JPEG_MAGIC_BYTES[2]
  );
}

const CONCURRENCIA = 5;
const REINTENTOS_MAX = 3;
const REINTENTOS_ESPERA_MS = [1000, 3000];

async function intentarDescarga(clave) {
  const claveNormalizada = normalizarClave(clave);
  const url = `${TRUPER_BASE_URL}/${encodeURIComponent(claveNormalizada)}.jpg`;

  let response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    return { estado: "error", url, detalle: error.message, retryable: true };
  }

  if (response.status === 404) {
    return { estado: "no-encontrado", url, detalle: "HTTP 404" };
  }

  if (response.status === 429 || response.status >= 500) {
    return { estado: "error", url, detalle: `HTTP ${response.status}`, retryable: true };
  }

  if (response.status !== 200) {
    return { estado: "error", url, detalle: `HTTP ${response.status}`, retryable: false };
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    return { estado: "error", url, detalle: `content-type inesperado: ${contentType}`, retryable: false };
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!esJpegValido(buffer)) {
    return { estado: "error", url, detalle: "magic bytes no coinciden con JPEG", retryable: false };
  }

  return { estado: "ok", url, detalle: "", buffer };
}

async function descargarConReintentos(clave) {
  let resultado;
  for (let intento = 0; intento < REINTENTOS_MAX; intento += 1) {
    resultado = await intentarDescarga(clave);
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

function rutaDestino(id) {
  return path.join(OUTPUT_DIR, `${id}.jpg`);
}

function agruparPorClave(rows) {
  const grupos = new Map();
  for (const row of rows) {
    const claveNormalizada = normalizarClave(row.clave);
    if (!grupos.has(claveNormalizada)) {
      grupos.set(claveNormalizada, { clave: row.clave, ids: [] });
    }
    grupos.get(claveNormalizada).ids.push(row.id);
  }
  return [...grupos.values()];
}

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function escribirReporte(filas) {
  const encabezado = "id,clave,url,estado,bytes,detalle";
  const filasOrdenadas = [...filas].sort((a, b) => a.id.localeCompare(b.id));
  const lineas = filasOrdenadas.map((fila) =>
    [fila.id, fila.clave, fila.url, fila.estado, fila.bytes, fila.detalle].map(csvEscape).join(",")
  );
  const contenido = [encabezado, ...lineas].join("\n") + "\n";
  await writeFile(path.join(OUTPUT_DIR, "_reporte.csv"), contenido, "utf8");
}

async function procesarLote(rows, args) {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const pendientes = args.limit ? rows.slice(0, args.limit) : rows;
  const conClave = pendientes.filter((row) => row.clave && row.clave.trim() !== "");
  const sinClave = pendientes.filter((row) => !row.clave || row.clave.trim() === "");
  const grupos = agruparPorClave(conClave);

  const resumen = { ok: 0, "ok-duplicado": 0, "no-encontrado": 0, "sin-clave": 0, error: 0, omitido: 0 };
  const filasReporte = [];

  function marcarOmitido(id, clave) {
    resumen.omitido += 1;
    filasReporte.push({ id, clave, url: "", estado: "omitido", bytes: 0, detalle: "archivo ya existia" });
    console.log(`OMITIDO  ${id} (${clave}) - archivo ya existia`);
  }

  for (const row of sinClave) {
    resumen["sin-clave"] += 1;
    filasReporte.push({ id: row.id, clave: "", url: "", estado: "sin-clave", bytes: 0, detalle: "clave vacia en BD" });
    console.log(`SIN-CLAVE  ${row.id} - clave vacia en BD`);
  }

  await ejecutarConcurrente(
    grupos,
    async (grupo) => {
      const faltaAlguno = args.force || grupo.ids.some((id) => !existsSync(rutaDestino(id)));

      if (!faltaAlguno) {
        for (const id of grupo.ids) {
          marcarOmitido(id, grupo.clave);
        }
        return;
      }

      const resultado = await descargarConReintentos(grupo.clave);

      for (const [posicion, id] of grupo.ids.entries()) {
        if (!args.force && existsSync(rutaDestino(id))) {
          marcarOmitido(id, grupo.clave);
          continue;
        }

        const esDuplicado = posicion > 0;

        if (resultado.estado === "ok") {
          const destino = rutaDestino(id);
          await writeFile(destino, resultado.buffer);
          const estadoFinal = esDuplicado ? "ok-duplicado" : "ok";
          resumen[estadoFinal] += 1;
          const detalle = esDuplicado ? `copiado de ${grupo.ids[0]}` : "";
          filasReporte.push({
            id,
            clave: grupo.clave,
            url: resultado.url,
            estado: estadoFinal,
            bytes: resultado.buffer.length,
            detalle,
          });
          console.log(`${estadoFinal.toUpperCase()}  ${id} (${grupo.clave}) -> ${destino}${detalle ? ` (${detalle})` : ""}`);
        } else {
          resumen[resultado.estado] += 1;
          filasReporte.push({
            id,
            clave: grupo.clave,
            url: resultado.url,
            estado: resultado.estado,
            bytes: 0,
            detalle: resultado.detalle,
          });
          console.log(`${resultado.estado.toUpperCase()}  ${id} (${grupo.clave}) - ${resultado.detalle}`);
        }
      }
    },
    CONCURRENCIA
  );

  await escribirReporte(filasReporte);

  console.log("\nResumen:");
  for (const [estado, cantidad] of Object.entries(resumen)) {
    console.log(`  ${estado}: ${cantidad}`);
  }
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

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const { rows } = await pool.query("SELECT id, clave, marca FROM productos_ ORDER BY id");

    const totalFilas = rows.length;
    const conClave = rows.filter((row) => row.clave && row.clave.trim() !== "");
    const clavesUnicas = new Set(conClave.map((row) => row.clave.trim().toUpperCase()));

    const porMarca = new Map();
    for (const row of conClave) {
      const marca = row.marca && row.marca.trim() !== "" ? row.marca.trim() : "(sin marca)";
      porMarca.set(marca, (porMarca.get(marca) || 0) + 1);
    }

    console.log(`Total de filas en productos_: ${totalFilas}`);
    console.log(`Filas con clave no vacia: ${conClave.length}`);
    console.log(`Claves unicas (normalizadas a mayusculas): ${clavesUnicas.size}`);
    console.log("Conteo por marca (filas con clave):");
    for (const [marca, count] of [...porMarca.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${marca}: ${count}`);
    }

    if (args.dryRun) {
      console.log("\n--dry-run: no se descargo ningun archivo.");
      return;
    }

    console.log("");
    await procesarLote(rows, args);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
