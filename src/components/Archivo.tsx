import { useEffect, useState } from 'react'
import type { EstadoPartida } from '../types'
import { cargarIndice } from '../lib/datos'
import { formatearFechaLarga, hoyISO } from '../lib/fechas'
import styles from './Archivo.module.css'

interface Props {
  onElegir: (fecha: string) => void
}

function estadoGuardado(fecha: string): EstadoPartida | null {
  try {
    const crudo = localStorage.getItem(`efemeride:partida:${fecha}`)
    return crudo ? (JSON.parse(crudo) as EstadoPartida) : null
  } catch {
    return null
  }
}

/** Lista de días anteriores disponibles en /data para jugarlos como archivo. */
export function Archivo({ onElegir }: Props) {
  const [fechas, setFechas] = useState<string[] | null>(null)

  useEffect(() => {
    cargarIndice().then(setFechas)
  }, [])

  if (!fechas) return null

  const pasadas = fechas.filter((f) => f < hoyISO()).reverse()

  return (
    <section className={styles.archivo}>
      <p className={styles.eyebrow}>Archivo</p>
      <h2 className={styles.titulo}>Días anteriores</h2>
      <p className={styles.nota}>Las partidas de archivo no afectan a tu racha ni a tu récord.</p>

      {pasadas.length === 0 ? (
        <p className={styles.vacio}>Todavía no hay días anteriores en el archivo. Vuelve mañana.</p>
      ) : (
        <ul className={styles.lista}>
          {pasadas.map((fecha) => {
            const partida = estadoGuardado(fecha)
            const scoreGuardado = partida?.completada
              ? partida.eventos.reduce((total, e) => total + (e.score ?? 0), 0)
              : null
            return (
              <li key={fecha}>
                <button type="button" className={styles.dia} onClick={() => onElegir(fecha)}>
                  <span className={styles.fecha}>{formatearFechaLarga(fecha)}</span>
                  <span className={styles.estado}>
                    {scoreGuardado !== null
                      ? `${scoreGuardado} pts`
                      : partida
                        ? 'a medias'
                        : 'jugar →'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
