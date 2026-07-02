import { DISTANCIA_SCORE_CERO, MAX_INTENTOS } from './puntuacion'

/** Resultado de un evento ya resuelto, sin revelar años. */
export interface ResultadoEvento {
  intentosUsados: number
  distanciaFinal: number
}

/**
 * Emoji de cercanía del intento final, estilo Wordle: del acierto exacto al
 * fallo total, sin revelar el año.
 */
export function emojiCercania(distancia: number): string {
  if (distancia === 0) return '🎯'
  if (distancia <= 5) return '🟩'
  if (distancia <= 15) return '🟨'
  if (distancia <= DISTANCIA_SCORE_CERO) return '🟧'
  return '🟥'
}

/**
 * Texto compartible del día: una fila por evento con los intentos fallidos
 * previos (⬛), la cercanía del intento final y los intentos no usados (⬜).
 */
export function generarTextoCompartir(
  fecha: string,
  resultados: ResultadoEvento[],
  scoreTotal: number,
  scoreMaximo: number,
): string {
  const filas = resultados.map(
    (r) =>
      '⬛'.repeat(Math.max(0, r.intentosUsados - 1)) +
      emojiCercania(r.distanciaFinal) +
      '⬜'.repeat(Math.max(0, MAX_INTENTOS - r.intentosUsados)),
  )
  return [`Efeméride Diaria · ${fecha}`, `${scoreTotal}/${scoreMaximo} puntos`, ...filas].join('\n')
}

export async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}
