// scripts/download-truper-adicionales.mjs
import { Pool } from "pg";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const TRUPER_BASE_URL = "https://www.truper.com/media/import/imagenes";
const OUTPUT_DIR = path.join("public", "fotos", "adicionales");
const REPORT_DIR = "fotos-truper";
const REPORT_PATH = path.join(REPORT_DIR, "_reporte_adicionales.csv");
const USER_AGENT = "ferredip-image-sync/1.0";
const REQUEST_TIMEOUT_MS = 30000;
const JPEG_MAGIC_BYTES = [0xff, 0xd8, 0xff];
const CONCURRENCIA = 5;
const REINTENTOS_MAX = 3;
const REINTENTOS_ESPERA_MS = [1000, 3000];

// Orden de sondeo == orden de las thumbnails (ver SPEC 05).
const SUFIJOS = ["FC1", "FC2", "E1"];

function normalizarClave(clave) {
  return clave.trim().toUpperCase().replace(/\//g, "-");
}

function urlSufijo(claveNormalizada, sufijo) {
  return `${TRUPER_BASE_URL}/${encodeURIComponent(claveNormalizada)}+${sufijo}.jpg`;
}

function esJpegValido(buffer) {
  return (
    buffer.length >= 3 &&
    buffer[0] === JPEG_MAGIC_BYTES[0] &&
    buffer[1] === JPEG_MAGIC_BYTES[1] &&
    buffer[2] === JPEG_MAGIC_BYTES[2]
  );
}

async function intentarDescarga(claveNormalizada, sufijo) {
  const url = urlSufijo(claveNormalizada, sufijo);

  let response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    return { sufijo, url, estado: "error", detalle: error.message, retryable: true };
  }

  if (response.status === 404) {
    return { sufijo, url, estado: "no-encontrado", detalle: "HTTP 404" };
  }

  if (response.status === 429 || response.status >= 500) {
    return { sufijo, url, estado: "error", detalle: `HTTP ${response.status}`, retryable: true };
  }

  if (response.status !== 200) {
    return { sufijo, url, estado: "error", detalle: `HTTP ${response.status}`, retryable: false };
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    return { sufijo, url, estado: "error", detalle: `content-type inesperado: ${contentType}`, retryable: false };
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!esJpegValido(buffer)) {
    return { sufijo, url, estado: "error", detalle: "magic bytes no coinciden con JPEG", retryable: false };
  }

  return { sufijo, url, estado: "ok", detalle: "", buffer };
}

async function descargarConReintentos(claveNormalizada, sufijo) {
  let resultado;
  for (let intento = 0; intento < REINTENTOS_MAX; intento += 1) {
    resultado = await intentarDescarga(claveNormalizada, sufijo);
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

async function sondearClave(claveNormalizada) {
  const resultados = [];
  for (const sufijo of SUFIJOS) {
    resultados.push(await descargarConReintentos(claveNormalizada, sufijo));
  }
  return resultados;
}

function agruparPorClave(rows) {
  const grupos = new Map();
  for (const row of rows) {
    const claveNormalizada = normalizarClave(row.clave);
    if (!grupos.has(claveNormalizada)) {
      grupos.set(claveNormalizada, { claveNormalizada, clave: row.clave, ids: [] });
    }
    grupos.get(claveNormalizada).ids.push(row.id);
  }
  return [...grupos.values()];
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

async function sondearHistograma(grupos) {
  const histograma = { 0: 0, 1: 0, 2: 0, 3: 0 };

  await ejecutarConcurrente(
    grupos,
    async (grupo) => {
      const resultados = await sondearClave(grupo.claveNormalizada);
      const encontrados = resultados.filter((r) => r.estado === "ok").length;
      histograma[encontrados] += 1;
    },
    CONCURRENCIA
  );

  return histograma;
}

function rutaDestino(id, n) {
  return path.join(OUTPUT_DIR, `${id}-${n}.jpg`);
}

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function escribirReporte(filas) {
  const encabezado = "id,clave,sufijo,indice,url,estado,bytes,detalle";
  const filasOrdenadas = [...filas].sort((a, b) => a.id.localeCompare(b.id));
  const lineas = filasOrdenadas.map((fila) =>
    [fila.id, fila.clave, fila.sufijo, fila.indice, fila.url, fila.estado, fila.bytes, fila.detalle]
      .map(csvEscape)
      .join(",")
  );
  const contenido = [encabezado, ...lineas].join("\n") + "\n";
  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(REPORT_PATH, contenido, "utf8");
}

async function procesarLote(grupos, sinClave, args) {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const resumen = { ok: 0, "ok-duplicado": 0, "no-encontrado": 0, "sin-clave": 0, error: 0, omitido: 0 };
  const filasReporte = [];

  for (const row of sinClave) {
    resumen["sin-clave"] += 1;
    filasReporte.push({
      id: row.id,
      clave: "",
      sufijo: "",
      indice: "",
      url: "",
      estado: "sin-clave",
      bytes: 0,
      detalle: "clave vacia en BD",
    });
    console.log(`SIN-CLAVE  ${row.id} - clave vacia en BD`);
  }

  const gruposASondear = [];
  for (const grupo of grupos) {
    const faltaAlguno = args.force || grupo.ids.some((id) => !existsSync(rutaDestino(id, 1)));
    if (faltaAlguno) {
      gruposASondear.push(grupo);
      continue;
    }
    for (const id of grupo.ids) {
      resumen.omitido += 1;
      filasReporte.push({
        id,
        clave: grupo.clave,
        sufijo: "",
        indice: "",
        url: "",
        estado: "omitido",
        bytes: 0,
        detalle: "archivo ya existia",
      });
      console.log(`OMITIDO  ${id} (${grupo.clave}) - archivo ya existia`);
    }
  }

  const resultadosPorClave = new Map();
  await ejecutarConcurrente(
    gruposASondear,
    async (grupo) => {
      resultadosPorClave.set(grupo.claveNormalizada, await sondearClave(grupo.claveNormalizada));
    },
    CONCURRENCIA
  );

  const candidatosSegundaPasada = gruposASondear.filter((grupo) =>
    resultadosPorClave.get(grupo.claveNormalizada).every((r) => r.estado === "no-encontrado")
  );

  if (candidatosSegundaPasada.length > 0) {
    console.log(
      `\nSegunda pasada sobre ${candidatosSegundaPasada.length} claves con los 3 sufijos en 404 (posible bloqueo transitorio)...`
    );
    await ejecutarConcurrente(
      candidatosSegundaPasada,
      async (grupo) => {
        resultadosPorClave.set(grupo.claveNormalizada, await sondearClave(grupo.claveNormalizada));
      },
      CONCURRENCIA
    );
  }

  for (const grupo of gruposASondear) {
    const resultados = resultadosPorClave.get(grupo.claveNormalizada);

    for (const [posicion, id] of grupo.ids.entries()) {
      if (!args.force && existsSync(rutaDestino(id, 1))) {
        resumen.omitido += 1;
        filasReporte.push({
          id,
          clave: grupo.clave,
          sufijo: "",
          indice: "",
          url: "",
          estado: "omitido",
          bytes: 0,
          detalle: "archivo ya existia",
        });
        console.log(`OMITIDO  ${id} (${grupo.clave}) - archivo ya existia`);
        continue;
      }

      const esDuplicado = posicion > 0;
      let indice = 0;

      for (const r of resultados) {
        if (r.estado === "ok") {
          indice += 1;
          const destino = rutaDestino(id, indice);
          await writeFile(destino, r.buffer);
          const estadoFinal = esDuplicado ? "ok-duplicado" : "ok";
          resumen[estadoFinal] += 1;
          filasReporte.push({
            id,
            clave: grupo.clave,
            sufijo: r.sufijo,
            indice,
            url: r.url,
            estado: estadoFinal,
            bytes: r.buffer.length,
            detalle: "",
          });
          console.log(`${estadoFinal.toUpperCase()}  ${id} (${grupo.clave}) +${r.sufijo} -> ${destino}`);
        } else {
          resumen[r.estado] += 1;
          filasReporte.push({
            id,
            clave: grupo.clave,
            sufijo: r.sufijo,
            indice: "",
            url: r.url,
            estado: r.estado,
            bytes: 0,
            detalle: r.detalle,
          });
          console.log(`${r.estado.toUpperCase()}  ${id} (${grupo.clave}) +${r.sufijo} - ${r.detalle}`);
        }
      }
    }
  }

  await escribirReporte(filasReporte);

  console.log("\nResumen:");
  for (const [estado, cantidad] of Object.entries(resumen)) {
    console.log(`  ${estado}: ${cantidad}`);
  }
  console.log(`\nReporte escrito en ${REPORT_PATH}`);
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
    const { rows } = await pool.query("SELECT id, clave FROM productos_ ORDER BY id");

    const pendientes = args.limit ? rows.slice(0, args.limit) : rows;
    const conClave = pendientes.filter((row) => row.clave && row.clave.trim() !== "");
    const sinClave = pendientes.filter((row) => !row.clave || row.clave.trim() === "");
    const grupos = agruparPorClave(conClave);

    console.log(`Filas consideradas: ${pendientes.length}`);
    console.log(`Filas con clave no vacia: ${conClave.length} (${grupos.length} claves unicas)`);
    console.log(`Filas sin clave: ${sinClave.length}`);

    if (args.dryRun) {
      console.log(`\nSondeando ${SUFIJOS.join(", ")} para ${grupos.length} claves (HTTP, sin escribir nada)...`);
      const histograma = await sondearHistograma(grupos);

      console.log("\nClaves por cantidad de fotos adicionales encontradas:");
      for (const cantidad of [0, 1, 2, 3]) {
        console.log(`  ${cantidad}: ${histograma[cantidad]}`);
      }

      console.log("\n--dry-run: no se escribio ningun archivo.");
      return;
    }

    console.log(`\nDescargando ${SUFIJOS.join(", ")} para ${grupos.length} claves y escribiendo en ${OUTPUT_DIR}...`);
    await procesarLote(grupos, sinClave, args);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
