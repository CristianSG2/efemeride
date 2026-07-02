import type { Pista } from '../types'

export const ANO_MINIMO = 1850
export const MAX_INTENTOS = 3
/** Distancia en años a partir de la cual el score del evento es 0. */
export const DISTANCIA_SCORE_CERO = 30
export const SCORE_MAXIMO_EVENTO = 100

/** Año máximo jugable: el año en curso. */
export function anoMaximo(): number {
  return new Date().getFullYear()
}

/**
 * Score de un evento según el intento final:
 * max(0, round(100 * (1 - distancia / 30)))
 */
export function calcularScore(anoReal: number, intento: number): number {
  const distancia = Math.abs(anoReal - intento)
  return Math.max(0, Math.round(SCORE_MAXIMO_EVENTO * (1 - distancia / DISTANCIA_SCORE_CERO)))
}

/**
 * Pista tras un intento: si el año real es más antiguo o más reciente que el
 * intento. No revela nada más.
 */
export function compararIntento(anoReal: number, intento: number): Pista {
  if (intento === anoReal) return 'acierto'
  return anoReal < intento ? 'mas-antiguo' : 'mas-reciente'
}
