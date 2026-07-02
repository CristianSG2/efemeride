import { useEffect, useState } from 'react'
import type { EstadoEvento, EventoDiario } from './types'
import { cargarPack } from './lib/datos'
import { calcularScore, MAX_INTENTOS } from './lib/puntuacion'
import { TarjetaEvento } from './components/TarjetaEvento'

/**
 * Demo temporal de TarjetaEvento con un evento real del pack del 2 de julio.
 * Se sustituirá por la pantalla de juego completa.
 */
function estadoDemo(anoReal: number): EstadoEvento {
  const preset = new URLSearchParams(window.location.search).get('demo')
  if (preset === 'pistas') {
    return { intentos: [1950, 1880], resuelto: false, score: null }
  }
  if (preset === 'revelado') {
    return { intentos: [1950, 1880, 1899], resuelto: true, score: calcularScore(anoReal, 1899) }
  }
  return { intentos: [], resuelto: false, score: null }
}

export default function App() {
  const [evento, setEvento] = useState<EventoDiario | null>(null)
  const [estado, setEstado] = useState<EstadoEvento>({ intentos: [], resuelto: false, score: null })

  useEffect(() => {
    cargarPack('2026-07-02').then((pack) => {
      if (!pack) return
      const elegido = pack.events.find((e) => e.year === 1897) ?? pack.events[0]
      setEvento(elegido)
      setEstado(estadoDemo(elegido.year))
    })
  }, [])

  const intentar = (ano: number) => {
    if (!evento || estado.resuelto) return
    const intentos = [...estado.intentos, ano]
    const resuelto = ano === evento.year || intentos.length >= MAX_INTENTOS
    setEstado({ intentos, resuelto, score: resuelto ? calcularScore(evento.year, ano) : null })
  }

  return (
    <main>
      <header className="mancheta">
        <h1>Efeméride Diaria</h1>
        <p>¿En qué año ocurrió?</p>
      </header>
      {evento && (
        <TarjetaEvento evento={evento} estado={estado} numero={5} total={5} onIntento={intentar} />
      )}
    </main>
  )
}
