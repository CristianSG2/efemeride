import { useCallback, useEffect, useState } from 'react'
import type { EstadoEvento, EstadoPartida, PackDiario, ProgresoJugador } from '../types'
import { calcularScore, MAX_INTENTOS } from '../lib/puntuacion'
import { esDiaSiguiente, hoyISO } from '../lib/fechas'

const CLAVE_PROGRESO = 'efemeride:progreso'
const clavePartida = (fecha: string) => `efemeride:partida:${fecha}`

const PROGRESO_INICIAL: ProgresoJugador = { record: 0, racha: 0, ultimoDiaJugado: null }

function leerJSON<T>(clave: string, porDefecto: T): T {
  try {
    const crudo = localStorage.getItem(clave)
    return crudo ? (JSON.parse(crudo) as T) : porDefecto
  } catch {
    return porDefecto
  }
}

function guardarJSON(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    // localStorage lleno o bloqueado: la partida sigue en memoria
  }
}

function partidaNueva(pack: PackDiario): EstadoPartida {
  return {
    date: pack.date,
    eventos: pack.events.map((): EstadoEvento => ({ intentos: [], resuelto: false, score: null })),
    completada: false,
    registrada: false,
    nuevoRecord: false,
  }
}

/**
 * Racha resultante al completar el día `hoy`:
 * continúa si el último día jugado fue ayer, se mantiene si ya se jugó hoy,
 * y se reinicia a 1 en cualquier otro caso.
 */
function calcularRacha(progreso: ProgresoJugador, hoy: string): number {
  if (progreso.ultimoDiaJugado === hoy) return progreso.racha
  if (progreso.ultimoDiaJugado && esDiaSiguiente(progreso.ultimoDiaJugado, hoy)) {
    return progreso.racha + 1
  }
  return 1
}

/**
 * Estado centralizado de la partida de un día. Persiste el avance por fecha y,
 * solo cuando `esHoy`, actualiza racha y récord globales al completar el pack.
 * Las partidas de archivo (esHoy=false) nunca tocan el progreso global.
 */
export function usePartidaDiaria(pack: PackDiario | null, esHoy: boolean) {
  const [estado, setEstado] = useState<EstadoPartida | null>(null)
  const [progreso, setProgreso] = useState<ProgresoJugador>(() =>
    leerJSON(CLAVE_PROGRESO, PROGRESO_INICIAL),
  )

  // Keyado por fecha (no por identidad del objeto pack): una partida se
  // recarga solo al cambiar de día, aunque el llamante recree el pack en cada
  // render. Con la identidad como dependencia, un pack nuevo por render
  // provocaría efecto -> setEstado -> re-render en bucle.
  useEffect(() => {
    if (!pack) {
      setEstado(null)
      return
    }
    const guardada = leerJSON<EstadoPartida | null>(clavePartida(pack.date), null)
    setEstado(guardada && guardada.eventos.length === pack.events.length ? guardada : partidaNueva(pack))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack?.date])

  const intentar = useCallback(
    (ano: number) => {
      if (!pack || !estado || estado.completada) return
      const indice = estado.eventos.findIndex((e) => !e.resuelto)
      if (indice === -1) return

      const evento = pack.events[indice]
      const intentos = [...estado.eventos[indice].intentos, ano]
      const resuelto = ano === evento.year || intentos.length >= MAX_INTENTOS
      const nuevoEvento: EstadoEvento = {
        intentos,
        resuelto,
        score: resuelto ? calcularScore(evento.year, ano) : null,
      }
      const eventos = estado.eventos.map((e, i) => (i === indice ? nuevoEvento : e))
      const completada = eventos.every((e) => e.resuelto)
      const nueva: EstadoPartida = { ...estado, eventos, completada }

      if (completada && esHoy && !estado.registrada) {
        const scoreTotal = eventos.reduce((total, e) => total + (e.score ?? 0), 0)
        const hoy = hoyISO()
        nueva.registrada = true
        nueva.nuevoRecord = scoreTotal > progreso.record
        const nuevoProgreso: ProgresoJugador = {
          record: Math.max(progreso.record, scoreTotal),
          racha: calcularRacha(progreso, hoy),
          ultimoDiaJugado: hoy,
        }
        setProgreso(nuevoProgreso)
        guardarJSON(CLAVE_PROGRESO, nuevoProgreso)
      }

      guardarJSON(clavePartida(pack.date), nueva)
      setEstado(nueva)
    },
    [pack, estado, progreso, esHoy],
  )

  const eventoActualIndex = estado ? estado.eventos.findIndex((e) => !e.resuelto) : -1
  const scoreTotal = estado
    ? estado.eventos.reduce((total, e) => total + (e.score ?? 0), 0)
    : 0

  return {
    estado,
    /** Índice del primer evento sin resolver; -1 si la partida está completa. */
    eventoActualIndex,
    intentar,
    scoreTotal,
    esNuevoRecord: estado?.nuevoRecord ?? false,
    racha: progreso.racha,
    record: progreso.record,
  }
}
