#!/usr/bin/env node
/**
 * Job diario de Efeméride Diaria.
 *
 * Consulta la API "on this day" de Wikipedia en español, filtra eventos con
 * foto y año dentro del rango jugable, los prioriza por pageviews del último
 * mes completo y genera el pack de 5 eventos del día en data/YYYY-MM-DD.json.
 *
 * Uso:
 *   node scripts/generar-evento-diario.js             # fecha de hoy
 *   node scripts/generar-evento-diario.js 2026-07-01  # fecha concreta
 */

import { access, readFile, writeFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data')
const USED_EVENTS_PATH = path.join(DATA_DIR, 'used-events.json')
const INDEX_PATH = path.join(DATA_DIR, 'index.json')

const ANO_MINIMO = 1850
const EVENTOS_POR_DIA = 5
const TOP_ALEATORIO = 15
// Umbrales de pageviews mensuales, de más exigente a más laxo. Si con uno no
// salen 5 candidatos se pasa al siguiente; foto y rango de años nunca se relajan.
const UMBRALES_POPULARIDAD = [5000, 1000, 100, 0]

const USER_AGENT = 'EfemerideDiaria/1.0 (juego web; https://github.com/CristianSG2/efemeride)'

// Imágenes genéricas que no representan al evento (la página relacionada suele
// ser el artículo de un país): banderas, escudos, mapas, sellos y emblemas.
const PATRONES_IMAGEN_GENERICA = [
  'flag_of',
  'bandera_de',
  'coat_of_arms',
  'escudo_de',
  'escudo_nacional',
  'seal_of',
  'emblem_of',
  'emblema_de',
  'locator_map',
  'location_map',
  'orthographic_projection',
  'in_its_region',
  'mapa_de_localizacion',
]

/** @param {string} url */
function esImagenGenerica(url) {
  let decodificada = url
  try {
    decodificada = decodeURIComponent(url)
  } catch {
    // URL con escapes malformados: se evalúa tal cual
  }
  decodificada = decodificada.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (PATRONES_IMAGEN_GENERICA.some((patron) => decodificada.includes(patron))) return true
  return contieneAnoPlausible(decodificada)
}

/**
 * Detecta nombres de archivo que delatan la respuesta: una secuencia de
 * exactamente 4 dígitos que sea un año plausible dentro del rango jugable
 * (p. ej. "UEFA_Euro_2012_logo.svg"). Los tamaños de thumbnail ("330px-",
 * "2000px-") se eliminan antes para no dar falsos positivos.
 * @param {string} url ya decodificada y en minúsculas
 */
function contieneAnoPlausible(url) {
  const sinTamanos = url.replace(/\d+px-/g, '')
  const anoActual = new Date().getFullYear()
  for (const [, digitos] of sinTamanos.matchAll(/(?<!\d)(\d{4})(?!\d)/g)) {
    const ano = Number(digitos)
    if (ano >= ANO_MINIMO && ano <= anoActual) return true
  }
  return false
}

/** @param {string} url */
async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT, accept: 'application/json' } })
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status} en ${url}`)
    error.status = res.status
    throw error
  }
  return res.json()
}

/** @param {string} texto */
function slugificar(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Fecha local en formato YYYY-MM-DD. @param {Date} fecha */
function formatearFecha(fecha) {
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mm}-${dd}`
}

/**
 * Rango del último mes completo anterior a `fecha`, en el formato YYYYMMDD
 * que espera la API de pageviews con granularidad mensual.
 * @param {Date} fecha
 */
function rangoMesAnterior(fecha) {
  const primeroDeEsteMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
  const finMesAnterior = new Date(primeroDeEsteMes.getTime() - 24 * 60 * 60 * 1000)
  const inicioMesAnterior = new Date(finMesAnterior.getFullYear(), finMesAnterior.getMonth(), 1)
  const aYYYYMMDD = (d) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return { inicio: aYYYYMMDD(inicioMesAnterior), fin: aYYYYMMDD(finMesAnterior) }
}

/**
 * Pageviews del último mes completo de un artículo. Devuelve 0 si la API no
 * tiene datos (404) para no descartar el candidato por un fallo puntual.
 * @param {string} titulo
 * @param {Date} fecha
 */
async function obtenerPageviews(titulo, fecha) {
  const articulo = encodeURIComponent(titulo.replace(/ /g, '_'))
  const { inicio, fin } = rangoMesAnterior(fecha)
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/es.wikipedia/all-access/user/${articulo}/monthly/${inicio}/${fin}`
  try {
    const datos = await fetchJson(url)
    return (datos.items ?? []).reduce((total, item) => total + (item.views ?? 0), 0)
  } catch (error) {
    if (error.status === 404) return 0
    throw error
  }
}

/** Ejecuta tareas asíncronas con un límite de concurrencia. */
async function enLotes(elementos, tamano, tarea) {
  const resultados = []
  for (let i = 0; i < elementos.length; i += tamano) {
    const lote = elementos.slice(i, i + tamano)
    resultados.push(...(await Promise.all(lote.map(tarea))))
  }
  return resultados
}

/**
 * Enmascara con "▪▪▪▪" toda secuencia de exactamente 4 dígitos que sea un año
 * plausible dentro del rango jugable (1850–año actual). Se aplica a todos los
 * años en rango, no solo al del evento: fechas como "(1874-1937)" acotan la
 * respuesta igualmente. Números fuera de rango o de otra longitud no se tocan.
 * @param {string} texto
 * @param {number} [anoActual]
 */
export function enmascararAnos(texto, anoActual = new Date().getFullYear()) {
  return texto.replace(/(?<!\d)\d{4}(?!\d)/g, (digitos) => {
    const ano = Number(digitos)
    return ano >= ANO_MINIMO && ano <= anoActual ? '▪▪▪▪' : digitos
  })
}

/**
 * Convierte un evento crudo de la API en candidato del juego, o null si no
 * cumple los requisitos innegociables (foto y año en rango).
 * @param {any} evento
 * @param {number} anoActual
 */
function aCandidato(evento, anoActual) {
  if (typeof evento.year !== 'number' || evento.year < ANO_MINIMO || evento.year > anoActual) {
    return null
  }
  // Se recorren todas las páginas relacionadas: si la imagen de la primera es
  // genérica (bandera, escudo, mapa...), se prueba con las siguientes. Solo se
  // descarta el evento si ninguna página tiene una imagen que pase el filtro.
  const pagina = (evento.pages ?? []).find(
    (p) => p.thumbnail?.source && !esImagenGenerica(p.thumbnail.source) && p.content_urls?.desktop?.page,
  )
  if (!pagina || !evento.text) return null
  const wikipediaUrl = pagina.content_urls.desktop.page
  return {
    id: `${slugificar(pagina.title)}-${evento.year}`,
    year: evento.year,
    texto: evento.text,
    textoPista: enmascararAnos(evento.text, anoActual),
    imageUrl: pagina.thumbnail.source,
    wikipediaUrl,
    tituloPagina: pagina.title,
  }
}

/** Baraja una copia del array (Fisher-Yates). */
function barajar(array) {
  const copia = [...array]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

/**
 * Selecciona 5 eventos: aplica el umbral de popularidad más exigente que aún
 * deje suficientes candidatos y elige al azar dentro del top 15 por vistas.
 * @param {Array<{popularityScore: number}>} candidatos ordenados por popularidad desc
 */
function seleccionarEventos(candidatos) {
  let elegibles = candidatos
  for (const umbral of UMBRALES_POPULARIDAD) {
    const filtrados = candidatos.filter((c) => c.popularityScore >= umbral)
    if (filtrados.length >= EVENTOS_POR_DIA) {
      elegibles = filtrados
      break
    }
  }
  const top = elegibles.slice(0, TOP_ALEATORIO)
  return barajar(top).slice(0, EVENTOS_POR_DIA)
}

/** @param {string} ruta */
async function existeArchivo(ruta) {
  try {
    await access(ruta)
    return true
  } catch {
    return false
  }
}

/** Lee un JSON si existe; si no, devuelve el valor por defecto. */
async function leerJsonOpcional(ruta, porDefecto) {
  try {
    return JSON.parse(await readFile(ruta, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return porDefecto
    throw error
  }
}

async function main() {
  const args = process.argv.slice(2)
  const forzar = args.includes('--forzar')
  const argumento = args.find((arg) => !arg.startsWith('--'))
  let fecha
  if (argumento) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(argumento)) {
      console.error(`Fecha inválida: "${argumento}". Formato esperado: YYYY-MM-DD`)
      process.exit(1)
    }
    const [ano, mes, dia] = argumento.split('-').map(Number)
    fecha = new Date(ano, mes - 1, dia)
  } else {
    fecha = new Date()
  }

  const fechaISO = formatearFecha(fecha)
  const rutaPack = path.join(DATA_DIR, `${fechaISO}.json`)

  // Idempotencia: si el pack del día ya existe (p. ej. una re-ejecución del
  // workflow), no se regenera ni se tocan used-events.json / index.json.
  // Salida 0: para el cron esto es éxito, no fallo.
  if (!forzar && (await existeArchivo(rutaPack))) {
    console.log(`El pack de ${fechaISO} ya existe; no se regenera (usa --forzar para sobreescribirlo).`)
    return
  }

  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  const anoActual = new Date().getFullYear()

  console.log(`Generando pack para ${fechaISO}...`)
  const feed = await fetchJson(`https://es.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`)
  const eventos = feed.events ?? []
  console.log(`  ${eventos.length} eventos en el feed de Wikipedia`)

  const usados = new Set(await leerJsonOpcional(USED_EVENTS_PATH, []))

  const vistos = new Set()
  const candidatos = []
  for (const evento of eventos) {
    const candidato = aCandidato(evento, anoActual)
    if (!candidato || usados.has(candidato.id) || vistos.has(candidato.id)) continue
    vistos.add(candidato.id)
    candidatos.push(candidato)
  }
  console.log(`  ${candidatos.length} candidatos con foto, año ${ANO_MINIMO}-${anoActual} y sin usar`)

  if (candidatos.length === 0) {
    console.error('No hay candidatos válidos para esta fecha.')
    process.exit(1)
  }

  await enLotes(candidatos, 8, async (candidato) => {
    candidato.popularityScore = await obtenerPageviews(candidato.tituloPagina, fecha)
  })
  candidatos.sort((a, b) => b.popularityScore - a.popularityScore)

  const seleccionados = seleccionarEventos(candidatos)
  if (seleccionados.length < EVENTOS_POR_DIA) {
    console.warn(`  Aviso: solo hay ${seleccionados.length} candidatos válidos (se esperaban ${EVENTOS_POR_DIA})`)
  }

  const pack = {
    date: fechaISO,
    events: seleccionados.map(({ tituloPagina, ...evento }) => evento),
  }
  await writeFile(rutaPack, JSON.stringify(pack, null, 2) + '\n')
  console.log(`  Escrito ${rutaPack}`)

  const nuevosUsados = [...usados, ...seleccionados.map((e) => e.id)]
  await writeFile(USED_EVENTS_PATH, JSON.stringify(nuevosUsados, null, 2) + '\n')

  const archivos = await readdir(DATA_DIR)
  const fechas = archivos
    .filter((nombre) => /^\d{4}-\d{2}-\d{2}\.json$/.test(nombre))
    .map((nombre) => nombre.replace('.json', ''))
    .sort()
  await writeFile(INDEX_PATH, JSON.stringify(fechas, null, 2) + '\n')
  console.log(`  Índice actualizado: ${fechas.length} fecha(s) disponibles`)

  for (const evento of seleccionados) {
    console.log(`  · ${evento.year} — ${evento.texto.slice(0, 80)}${evento.texto.length > 80 ? '…' : ''} (${evento.popularityScore} vistas)`)
  }
}

// Solo se ejecuta como CLI; al importarlo (p. ej. desde los tests de
// enmascararAnos) no lanza el job.
const esEjecucionDirecta =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (esEjecucionDirecta) {
  main().catch((error) => {
    console.error('Error generando el pack diario:', error)
    process.exit(1)
  })
}
