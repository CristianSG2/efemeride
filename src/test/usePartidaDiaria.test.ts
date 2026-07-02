import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { usePartidaDiaria } from '../hooks/usePartidaDiaria'
import { vistaDesdeHash } from '../App'
import { formatearISO, hoyISO } from '../lib/fechas'
import type { PackDiario, ProgresoJugador } from '../types'

const ANOS = [1900, 1950, 1970, 1990, 2010]

function packDe(fecha: string): PackDiario {
  return {
    date: fecha,
    events: ANOS.map((year, i) => ({
      id: `evento-${i}`,
      year,
      text: `Evento de prueba ${i}`,
      imageUrl: 'https://example.test/foto.jpg',
      wikipediaUrl: 'https://es.wikipedia.org/wiki/Prueba',
      popularityScore: 1000,
    })),
  }
}

function diasAtras(n: number): string {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - n)
  return formatearISO(fecha)
}

function progresoGuardado(): ProgresoJugador {
  return JSON.parse(localStorage.getItem('efemeride:progreso') ?? 'null')
}

function sembrarProgreso(progreso: ProgresoJugador) {
  localStorage.setItem('efemeride:progreso', JSON.stringify(progreso))
}

/** Resuelve los 5 eventos acertando el año exacto (score total 500). */
function completarPack(result: { current: ReturnType<typeof usePartidaDiaria> }) {
  for (const ano of ANOS) {
    act(() => result.current.intentar(ano))
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('usePartidaDiaria: partida y persistencia', () => {
  it('cada intento se persiste en localStorage bajo la clave de la fecha', () => {
    const pack = packDe(hoyISO())
    const { result } = renderHook(() => usePartidaDiaria(pack, true))

    act(() => result.current.intentar(1800))

    const guardada = JSON.parse(localStorage.getItem(`efemeride:partida:${pack.date}`)!)
    expect(guardada.eventos[0].intentos).toEqual([1800])
    expect(guardada.eventos[0].resuelto).toBe(false)
  })

  it('el acierto resuelve el evento con score 100 y avanza al siguiente', () => {
    const pack = packDe(hoyISO())
    const { result } = renderHook(() => usePartidaDiaria(pack, true))

    act(() => result.current.intentar(1900))

    expect(result.current.estado!.eventos[0]).toMatchObject({ resuelto: true, score: 100 })
    expect(result.current.eventoActualIndex).toBe(1)
  })

  it('al tercer fallo el evento queda resuelto con el score del último intento', () => {
    const pack = packDe(hoyISO())
    const { result } = renderHook(() => usePartidaDiaria(pack, true))

    act(() => result.current.intentar(1850))
    act(() => result.current.intentar(1970))
    act(() => result.current.intentar(1902)) // distancia 2 -> 93

    expect(result.current.estado!.eventos[0]).toMatchObject({ resuelto: true, score: 93 })
    expect(result.current.eventoActualIndex).toBe(1)
  })

  it('recarga a mitad de pack: retoma en el primer evento sin resolver', () => {
    const pack = packDe(hoyISO())
    const primera = renderHook(() => usePartidaDiaria(pack, true))
    act(() => primera.result.current.intentar(1900))
    act(() => primera.result.current.intentar(1950))
    primera.unmount()

    // Nueva instancia del hook, como tras recargar la página
    const segunda = renderHook(() => usePartidaDiaria(pack, true))

    expect(segunda.result.current.eventoActualIndex).toBe(2)
    expect(segunda.result.current.estado!.eventos[0]).toMatchObject({ resuelto: true, score: 100 })
    expect(segunda.result.current.estado!.eventos[1]).toMatchObject({ resuelto: true, score: 100 })
    expect(segunda.result.current.scoreTotal).toBe(200)
  })
})

describe('usePartidaDiaria: racha y récord', () => {
  it('completar el pack de hoy inaugura racha y récord', () => {
    const pack = packDe(hoyISO())
    const { result } = renderHook(() => usePartidaDiaria(pack, true))

    completarPack(result)

    expect(result.current.estado!.completada).toBe(true)
    expect(result.current.scoreTotal).toBe(500)
    expect(result.current.esNuevoRecord).toBe(true)
    expect(result.current.racha).toBe(1)
    expect(progresoGuardado()).toEqual({ record: 500, racha: 1, ultimoDiaJugado: hoyISO() })
  })

  it('la racha continúa si el último día jugado fue ayer', () => {
    sembrarProgreso({ record: 300, racha: 3, ultimoDiaJugado: diasAtras(1) })
    const pack = packDe(hoyISO())
    const { result } = renderHook(() => usePartidaDiaria(pack, true))

    completarPack(result)

    expect(result.current.racha).toBe(4)
  })

  it('la racha se reinicia a 1 si el último día jugado no fue ayer', () => {
    sembrarProgreso({ record: 300, racha: 7, ultimoDiaJugado: diasAtras(3) })
    const pack = packDe(hoyISO())
    const { result } = renderHook(() => usePartidaDiaria(pack, true))

    completarPack(result)

    expect(result.current.racha).toBe(1)
  })

  it('no hay nuevo récord si no se supera el vigente', () => {
    sembrarProgreso({ record: 9999, racha: 1, ultimoDiaJugado: diasAtras(1) })
    const pack = packDe(hoyISO())
    const { result } = renderHook(() => usePartidaDiaria(pack, true))

    completarPack(result)

    expect(result.current.esNuevoRecord).toBe(false)
    expect(progresoGuardado().record).toBe(9999)
  })

  it('el registro es único: repetir intentos tras completar no duplica racha', () => {
    const pack = packDe(hoyISO())
    const { result } = renderHook(() => usePartidaDiaria(pack, true))
    completarPack(result)

    act(() => result.current.intentar(1900)) // partida completada: se ignora

    expect(result.current.racha).toBe(1)
    expect(progresoGuardado().racha).toBe(1)
  })
})

describe('usePartidaDiaria: archivo vs. día real', () => {
  it('las partidas de archivo no tocan racha ni récord', () => {
    sembrarProgreso({ record: 300, racha: 3, ultimoDiaJugado: diasAtras(1) })
    const pack = packDe(diasAtras(5))
    const { result } = renderHook(() => usePartidaDiaria(pack, false))

    completarPack(result)

    expect(result.current.estado!.completada).toBe(true)
    expect(result.current.esNuevoRecord).toBe(false)
    // El progreso global queda exactamente como estaba
    expect(progresoGuardado()).toEqual({ record: 300, racha: 3, ultimoDiaJugado: diasAtras(1) })
  })

  it('llegar a hoy por la ruta de archivo (#/dia/hoy) cuenta como partida real', () => {
    const hoy = hoyISO()
    window.location.hash = `#/dia/${hoy}`

    // Así resuelve App la ruta: fecha explícita, y esHoy = fecha === hoyISO()
    const vista = vistaDesdeHash()
    expect(vista).toEqual({ tipo: 'juego', fecha: hoy })
    const fecha = vista.tipo === 'juego' ? (vista.fecha ?? hoy) : null
    const esHoy = fecha === hoy
    expect(esHoy).toBe(true)

    const pack = packDe(fecha!)
    const { result } = renderHook(() => usePartidaDiaria(pack, esHoy))
    completarPack(result)

    expect(result.current.racha).toBe(1)
    expect(result.current.esNuevoRecord).toBe(true)
    expect(progresoGuardado().ultimoDiaJugado).toBe(hoy)
  })
})
