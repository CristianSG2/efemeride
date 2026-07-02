import type { PackDiario } from '../types'

/** Carga el pack de una fecha desde /data; null si ese día no existe. */
export async function cargarPack(fecha: string): Promise<PackDiario | null> {
  const res = await fetch(`/data/${fecha}.json`)
  if (!res.ok) return null
  return res.json()
}

/**
 * Pide a Wikimedia una versión más ancha del thumbnail: las URLs con /NNNpx-
 * generan la imagen al tamaño solicitado. Si la URL no sigue ese patrón se
 * devuelve tal cual.
 */
export function ampliarThumbnail(url: string, ancho = 800): string {
  return url.replace(/\/\d+px-/, `/${ancho}px-`)
}

/** Fechas con pack disponible, ordenadas ascendentemente. */
export async function cargarIndice(): Promise<string[]> {
  const res = await fetch('/data/index.json')
  if (!res.ok) return []
  return res.json()
}
