import { useEffect, useState } from 'react'
import type { PackDiario } from './types'
import { cargarPack } from './lib/datos'
import { formatearFechaLarga, hoyISO } from './lib/fechas'
import { PantallaJuego } from './components/PantallaJuego'
import { Archivo } from './components/Archivo'

type Vista = { tipo: 'juego'; fecha: string | null } | { tipo: 'archivo' }

/** Rutas hash: #/archivo, #/dia/YYYY-MM-DD, y raíz = el día de hoy. */
function vistaDesdeHash(): Vista {
  const hash = window.location.hash
  if (hash === '#/archivo') return { tipo: 'archivo' }
  const dia = hash.match(/^#\/dia\/(\d{4}-\d{2}-\d{2})$/)
  if (dia) return { tipo: 'juego', fecha: dia[1] }
  return { tipo: 'juego', fecha: null }
}

export default function App() {
  const [vista, setVista] = useState<Vista>(vistaDesdeHash)
  const [pack, setPack] = useState<PackDiario | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const alCambiar = () => setVista(vistaDesdeHash())
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  const hoy = hoyISO()
  const fecha = vista.tipo === 'juego' ? (vista.fecha ?? hoy) : null

  useEffect(() => {
    if (!fecha) return
    setCargando(true)
    setPack(null)
    cargarPack(fecha).then((cargado) => {
      setPack(cargado)
      setCargando(false)
    })
  }, [fecha])

  const esHoy = fecha === hoy

  return (
    <main>
      <header className="mancheta">
        <h1>Efeméride Diaria</h1>
        <p>¿En qué año ocurrió?</p>
      </header>

      <nav className="navegacion">
        {vista.tipo === 'archivo' ? (
          <a href="#/">← Volver a hoy</a>
        ) : esHoy ? (
          <a href="#/archivo">Archivo</a>
        ) : (
          <>
            <a href="#/archivo">← Archivo</a>
            <span className="navegacion-fecha">{fecha && formatearFechaLarga(fecha)}</span>
            <a href="#/">Hoy</a>
          </>
        )}
      </nav>

      {vista.tipo === 'archivo' ? (
        <Archivo onElegir={(elegida) => (window.location.hash = `#/dia/${elegida}`)} />
      ) : cargando ? null : pack ? (
        <PantallaJuego key={pack.date} pack={pack} esHoy={esHoy} />
      ) : (
        <p className="sin-pack">
          {esHoy
            ? 'El pack de hoy todavía no está disponible. Vuelve en un rato.'
            : 'No hay pack para este día.'}
        </p>
      )}
    </main>
  )
}
