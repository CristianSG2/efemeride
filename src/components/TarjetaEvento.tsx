import { useState } from 'react'
import type { EstadoEvento, EventoDiario } from '../types'
import { ANO_MINIMO, MAX_INTENTOS, anoMaximo, compararIntento } from '../lib/puntuacion'
import { ampliarThumbnail } from '../lib/datos'
import { SelectorAno } from './SelectorAno'
import { RevelacionEvento } from './RevelacionEvento'
import styles from './TarjetaEvento.module.css'

interface Props {
  evento: EventoDiario
  estado: EstadoEvento
  numero: number
  total: number
  onIntento: (ano: number) => void
  onContinuar?: () => void
  textoContinuar?: string
}

const ANO_INICIAL = Math.round((ANO_MINIMO + new Date().getFullYear()) / 2)

/**
 * Pieza jugable de un evento: foto completa desde el principio, selector de
 * año con 3 intentos, pistas más antiguo/más reciente y revelación final.
 */
export function TarjetaEvento({ evento, estado, numero, total, onIntento, onContinuar, textoContinuar }: Props) {
  const [ano, setAno] = useState(ANO_INICIAL)
  // Wikimedia rechaza thumbnails más anchos que la imagen original (HTTP 400):
  // si la versión ampliada falla, se recurre al thumbnail original del pack.
  const [src, setSrc] = useState(() => ampliarThumbnail(evento.imageUrl))
  const max = anoMaximo()
  const intentosRestantes = MAX_INTENTOS - estado.intentos.length

  return (
    <article className={styles.tarjeta}>
      <header className={styles.cabecera}>
        <span className={styles.numero}>
          Evento {numero} de {total}
        </span>
        <span className={styles.intentos} aria-label={`${intentosRestantes} intentos restantes`}>
          {Array.from({ length: MAX_INTENTOS }, (_, i) => (
            <span key={i} className={i < estado.intentos.length ? styles.puntoUsado : styles.punto} />
          ))}
        </span>
      </header>

      <figure className={styles.marco}>
        <img
          className={styles.foto}
          src={src}
          onError={() => setSrc((actual) => (actual === evento.imageUrl ? actual : evento.imageUrl))}
          alt="Fotografía relacionada con el evento"
        />
        {!estado.resuelto && (
          <figcaption className={styles.pregunta}>{evento.textoPista}</figcaption>
        )}
      </figure>

      {estado.intentos.length > 0 && (
        <ul className={styles.pistas}>
          {estado.intentos.map((intento, i) => {
            const pista = compararIntento(evento.year, intento)
            return (
              <li key={i} className={styles.pista} data-pista={pista}>
                <span className={styles.pistaAno}>{intento}</span>
                {pista === 'acierto' && <span>● exacto</span>}
                {pista === 'mas-antiguo' && <span>← más antiguo</span>}
                {pista === 'mas-reciente' && <span>más reciente →</span>}
              </li>
            )
          })}
        </ul>
      )}

      {!estado.resuelto ? (
        <div className={styles.controles}>
          <SelectorAno valor={ano} onCambio={setAno} min={ANO_MINIMO} max={max} />
          <button
            type="button"
            className={styles.probar}
            onClick={() => onIntento(Math.min(max, Math.max(ANO_MINIMO, ano)))}
          >
            Probar {estado.intentos.length > 0 ? `(${intentosRestantes} restantes)` : 'año'}
          </button>
        </div>
      ) : (
        <>
          <RevelacionEvento evento={evento} estado={estado} />
          {onContinuar && (
            <button type="button" className={styles.continuar} onClick={onContinuar}>
              {textoContinuar ?? 'Continuar'} →
            </button>
          )}
        </>
      )}
    </article>
  )
}
