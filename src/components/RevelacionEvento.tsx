import type { EstadoEvento, EventoDiario } from '../types'
import styles from './RevelacionEvento.module.css'

interface Props {
  evento: EventoDiario
  estado: EstadoEvento
}

/** Revelación tras el intento final: año real, texto del evento y link a Wikipedia. */
export function RevelacionEvento({ evento, estado }: Props) {
  const acerto = estado.intentos[estado.intentos.length - 1] === evento.year
  return (
    <div className={styles.revelacion}>
      <p className={styles.etiqueta}>{acerto ? '¡Acertaste!' : 'El año era'}</p>
      <p className={styles.ano}>{evento.year}</p>
      <p className={styles.score} data-cero={estado.score === 0 || undefined}>
        +{estado.score ?? 0} puntos
      </p>
      <p className={styles.texto}>{evento.texto}</p>
      <a className={styles.enlace} href={evento.wikipediaUrl} target="_blank" rel="noopener noreferrer">
        Leer en Wikipedia ↗
      </a>
    </div>
  )
}
