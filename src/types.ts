/** Evento del pack diario, con la forma exacta que genera scripts/generar-evento-diario.js */
export interface EventoDiario {
  id: string
  year: number
  /** Texto original del evento; solo se muestra en la revelación final. */
  texto: string
  /** Texto con los años en rango enmascarados; pista visible desde el primer intento. */
  textoPista: string
  imageUrl: string
  wikipediaUrl: string
  popularityScore: number
}

export interface PackDiario {
  date: string
  events: EventoDiario[]
}

/** Resultado de comparar un intento con el año real. */
export type Pista = 'acierto' | 'mas-antiguo' | 'mas-reciente'

/** Progreso del jugador sobre un evento concreto del pack. */
export interface EstadoEvento {
  /** Años intentados, en orden. */
  intentos: number[]
  /** true cuando el evento terminó (acierto o 3 intentos agotados). */
  resuelto: boolean
  /** Score final del evento; null mientras no esté resuelto. */
  score: number | null
}

/** Partida de un día concreto. Se persiste por fecha en localStorage. */
export interface EstadoPartida {
  date: string
  /** Mismo orden que los events del pack. */
  eventos: EstadoEvento[]
  completada: boolean
  /** true si esta partida ya actualizó racha/récord (solo aplica al día real). */
  registrada: boolean
  /** true si al completarse superó el récord vigente. */
  nuevoRecord: boolean
}

/** Progreso global del jugador, compartido entre días. */
export interface ProgresoJugador {
  record: number
  racha: number
  /** Último día real (YYYY-MM-DD) completado; las partidas de archivo no cuentan. */
  ultimoDiaJugado: string | null
}
