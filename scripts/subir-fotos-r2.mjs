// scripts/subir-fotos-r2.mjs
import { readdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { S3Client, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const SRC_PRINCIPAL_DIR = path.join("public", "fotos");
const SRC_ADICIONALES_DIR = path.join("public", "fotos", "adicionales");
const REPORT_DIR = "fotos-truper";
const REPORT_PATH = path.join(REPORT_DIR, "_reporte_r2.csv");
const MANIFEST_PATH = path.join("src", "shared", "db", "fotos-adicionales.json");

const CONCURRENCIA = 5;
const REINTENTOS_MAX = 3;
const REINTENTOS_ESPERA_MS = [1000, 3000];
const TAMANOS_WEBP = [800, 160];
const CALIDAD_WEBP = 75;
const CACHE_CONTROL = "public, max-age=31536000, immutable";

function clienteR2() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("Faltan R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY en .env");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

function enumerarPrincipales() {
  return readdirSync(SRC_PRINCIPAL_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".jpg"))
    .map((entry) => entry.name.replace(/\.jpg$/, ""))
    .sort();
}

function enumerarAdicionales() {
  return readdirSync(SRC_ADICIONALES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".jpg"))
    .map((entry) => {
      const match = entry.name.match(/^(\d+)-(\d+)\.jpg$/);
      return match ? { id: match[1], n: Number(match[2]) } : null;
    })
    .filter((entry) => entry !== null)
    .sort((a, b) => (a.id === b.id ? a.n - b.n : a.id.localeCompare(b.id)));
}

function construirTareas(args) {
  const principales = enumerarPrincipales().map((id) => ({ tipo: "principal", id }));
  const adicionales = enumerarAdicionales().map(({ id, n }) => ({ tipo: "adicional", id, n }));
  const tareas = [...principales, ...adicionales];
  return args.limit ? tareas.slice(0, args.limit) : tareas;
}

function objetosDeTarea(tarea) {
  if (tarea.tipo === "principal") {
    return {
      srcPath: path.join(SRC_PRINCIPAL_DIR, `${tarea.id}.jpg`),
      original: `fotos/${tarea.id}.jpg`,
      webp800: `fotos/webp/${tarea.id}.webp`,
      webp160: `fotos/webp/160/${tarea.id}.webp`,
    };
  }
  const nombre = `${tarea.id}-${tarea.n}`;
  return {
    srcPath: path.join(SRC_ADICIONALES_DIR, `${nombre}.jpg`),
    original: `fotos/adicionales/${nombre}.jpg`,
    webp800: `fotos/adicionales/webp/${nombre}.webp`,
    webp160: `fotos/adicionales/webp/160/${nombre}.webp`,
  };
}

async function existeEnR2(client, bucket, key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === "NotFound") {
      return false;
    }
    throw error;
  }
}

async function subirConReintentos(client, bucket, key, buffer, contentType) {
  let ultimoError;
  for (let intento = 0; intento < REINTENTOS_MAX; intento += 1) {
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          CacheControl: CACHE_CONTROL,
        })
      );
      return { estado: "ok", bytes: buffer.length };
    } catch (error) {
      ultimoError = error;
      const espera = REINTENTOS_ESPERA_MS[intento];
      if (espera) {
        await new Promise((resolve) => setTimeout(resolve, espera));
      }
    }
  }
  return { estado: "error", bytes: 0, detalle: ultimoError.message };
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

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function escribirReporte(filas) {
  const encabezado = "id,tipo,indice,variante,objeto,estado,bytes,detalle";
  const lineas = filas.map((fila) =>
    [fila.id, fila.tipo, fila.indice, fila.variante, fila.objeto, fila.estado, fila.bytes, fila.detalle]
      .map(csvEscape)
      .join(",")
  );
  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(REPORT_PATH, [encabezado, ...lineas].join("\n") + "\n", "utf8");
}

// El manifiesto se recalcula siempre desde cero a partir de lo que hay en disco:
// evita que quede desincronizado si el bucket se toca fuera de este script.
async function escribirManifiesto() {
  const conteo = {};
  for (const { id } of enumerarAdicionales()) {
    conteo[id] = (conteo[id] || 0) + 1;
  }
  const ordenado = Object.fromEntries(Object.entries(conteo).sort((a, b) => a[0].localeCompare(b[0])));
  await writeFile(MANIFEST_PATH, JSON.stringify(ordenado, null, 2) + "\n", "utf8");
  console.log(`\nManifiesto escrito en ${MANIFEST_PATH} (${Object.keys(ordenado).length} productos con adicionales)`);
}

async function procesarTarea(client, bucket, tarea, args, resumen, filasReporte) {
  const objetos = objetosDeTarea(tarea);
  const indice = tarea.tipo === "adicional" ? tarea.n : "";
  const etiqueta = `${tarea.tipo} ${tarea.id}${indice !== "" ? `-${indice}` : ""}`;

  if (!args.force && (await existeEnR2(client, bucket, objetos.webp800))) {
    resumen.omitido += 1;
    filasReporte.push({
      id: tarea.id,
      tipo: tarea.tipo,
      indice,
      variante: "800",
      objeto: objetos.webp800,
      estado: "omitido",
      bytes: 0,
      detalle: "ya existia en R2",
    });
    console.log(`OMITIDO  ${etiqueta} - ya existia en R2`);
    return;
  }

  let original;
  try {
    original = readFileSync(objetos.srcPath);
  } catch (error) {
    resumen.error += 1;
    filasReporte.push({
      id: tarea.id,
      tipo: tarea.tipo,
      indice,
      variante: "original",
      objeto: objetos.original,
      estado: "error",
      bytes: 0,
      detalle: `no se pudo leer ${objetos.srcPath}: ${error.message}`,
    });
    console.log(`ERROR  ${etiqueta} - no se pudo leer archivo fuente`);
    return;
  }

  const variantes = [{ variante: "original", key: objetos.original, buffer: original, contentType: "image/jpeg" }];
  for (const tamano of TAMANOS_WEBP) {
    const buffer = await sharp(original)
      .resize(tamano, tamano)
      .webp({ quality: CALIDAD_WEBP })
      .toBuffer();
    variantes.push({
      variante: String(tamano),
      key: tamano === 800 ? objetos.webp800 : objetos.webp160,
      buffer,
      contentType: "image/webp",
    });
  }

  let huboError = false;
  for (const variante of variantes) {
    const resultado = await subirConReintentos(client, bucket, variante.key, variante.buffer, variante.contentType);
    if (resultado.estado === "ok") {
      resumen.ok += 1;
    } else {
      huboError = true;
      resumen.error += 1;
    }
    filasReporte.push({
      id: tarea.id,
      tipo: tarea.tipo,
      indice,
      variante: variante.variante,
      objeto: variante.key,
      estado: resultado.estado,
      bytes: resultado.bytes,
      detalle: resultado.detalle ?? "",
    });
  }
  console.log(`${huboError ? "ERROR" : "OK"}  ${etiqueta} -> ${objetos.original}, ${objetos.webp800}, ${objetos.webp160}`);
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
  const tareas = construirTareas(args);
  const principales = tareas.filter((tarea) => tarea.tipo === "principal").length;
  const adicionales = tareas.filter((tarea) => tarea.tipo === "adicional").length;

  console.log(`Fotos principales encontradas en ${SRC_PRINCIPAL_DIR}: ${enumerarPrincipales().length}`);
  console.log(`Fotos adicionales encontradas en ${SRC_ADICIONALES_DIR}: ${enumerarAdicionales().length}`);
  console.log(
    `Tareas a procesar en esta corrida: ${tareas.length} (${principales} principales, ${adicionales} adicionales) -> hasta ${
      tareas.length * 3
    } objetos en R2`
  );

  if (args.dryRun) {
    console.log("\n--dry-run: no se contacto R2 ni se genero ningun archivo.");
    return;
  }

  const bucket = process.env.R2_BUCKET;
  if (!bucket) {
    throw new Error("Falta R2_BUCKET en .env");
  }
  const client = clienteR2();

  const resumen = { ok: 0, omitido: 0, error: 0 };
  const filasReporte = [];

  await ejecutarConcurrente(
    tareas,
    (tarea) => procesarTarea(client, bucket, tarea, args, resumen, filasReporte),
    CONCURRENCIA
  );

  await escribirReporte(filasReporte);

  console.log("\nResumen (omitido cuenta por tarea; ok/error cuentan por objeto subido):");
  for (const [estado, cantidad] of Object.entries(resumen)) {
    console.log(`  ${estado}: ${cantidad}`);
  }
  console.log(`Reporte escrito en ${REPORT_PATH}`);

  if (args.limit) {
    console.log("\n--limit activo: el manifiesto no se regenera (solo en una corrida completa, sin --limit).");
    return;
  }

  await escribirManifiesto();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
