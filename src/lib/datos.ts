import type { PackDiario } from '../types'

/** Carga el pack de una fecha desde /data; null si ese día no existe. */
export async function cargarPack(fecha: string): Promise<PackDiario | null> {
  const res = await fetch(`/data/${fecha}.json`)
  if (!res.ok) return null
  return res.json()
}

/** Fechas con pack disponible, ordenadas ascendentemente. */
export async function cargarIndice(): Promise<string[]> {
  const res = await fetch('/data/index.json')
  if (!res.ok) return []
  return res.json()
}
