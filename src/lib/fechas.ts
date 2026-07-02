/** Fecha local en formato YYYY-MM-DD. */
export function formatearISO(fecha: Date): string {
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mm}-${dd}`
}

export function hoyISO(): string {
  return formatearISO(new Date())
}

/** "2026-07-02" → "2 de julio de 2026" */
export function formatearFechaLarga(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** true si `actual` es exactamente el día siguiente a `anterior`. */
export function esDiaSiguiente(anterior: string, actual: string): boolean {
  const [ano, mes, dia] = anterior.split('-').map(Number)
  return formatearISO(new Date(ano, mes - 1, dia + 1)) === actual
}
