import { useEffect, useState } from 'react'
import type { PackDiario } from '../types'
import { usePartidaDiaria } from '../hooks/usePartidaDiaria'
import { TarjetaEvento } from './TarjetaEvento'
import { ResumenDia } from './ResumenDia'
import styles from './PantallaJuego.module.css'

interface Props {
  pack: PackDiario
  esHoy: boolean
}

/**
 * Orquesta el pack del día: muestra un evento cada vez, mantiene la revelación
 * en pantalla hasta que el jugador continúa, y cierra con el resumen.
 */
export function PantallaJuego({ pack, esHoy }: Props) {
  const { estado, intentar, scoreTotal, esNuevoRecord, racha, record } = usePartidaDiaria(pack, esHoy)
  const [indiceVisible, setIndiceVisible] = useState(0)
  const [mostrarResumen, setMostrarResumen] = useState(false)

  // Al cargar la partida (o cambiar de día): retomar por el primer evento sin
  // resolver, o ir directa al resumen si ya estaba completada.
  const fechaPartida = estado?.date
  useEffect(() => {
    if (!estado) return
    if (estado.completada) {
      setMostrarResumen(true)
    } else {
      setMostrarResumen(false)
      setIndiceVisible(estado.eventos.findIndex((e) => !e.resuelto))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaPartida])

  if (!estado) return null

  if (mostrarResumen) {
    return (
      <ResumenDia
        pack={pack}
        estado={estado}
        scoreTotal={scoreTotal}
        esNuevoRecord={esNuevoRecord}
        record={record}
        racha={racha}
        esHoy={esHoy}
      />
    )
  }

  const esUltimo = indiceVisible === pack.events.length - 1
  const continuar = () => {
    if (esUltimo) setMostrarResumen(true)
    else setIndiceVisible(indiceVisible + 1)
  }

  return (
    <div>
      {scoreTotal > 0 && (
        <p className={styles.marcador}>
          Llevas <strong>{scoreTotal}</strong> puntos
        </p>
      )}
      <TarjetaEvento
        key={pack.events[indiceVisible].id}
        evento={pack.events[indiceVisible]}
        estado={estado.eventos[indiceVisible]}
        numero={indiceVisible + 1}
        total={pack.events.length}
        onIntento={intentar}
        onContinuar={continuar}
        textoContinuar={esUltimo ? 'Ver resumen' : 'Siguiente evento'}
      />
    </div>
  )
}
