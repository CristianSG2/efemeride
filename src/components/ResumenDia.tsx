import { useState } from 'react'
import type { EstadoPartida, PackDiario } from '../types'
import { SCORE_MAXIMO_EVENTO } from '../lib/puntuacion'
import { copiarAlPortapapeles, emojiCercania, generarTextoCompartir } from '../lib/compartir'
import type { ResultadoEvento } from '../lib/compartir'
import { formatearFechaLarga } from '../lib/fechas'
import styles from './ResumenDia.module.css'

interface Props {
  pack: PackDiario
  estado: EstadoPartida
  scoreTotal: number
  esNuevoRecord: boolean
  record: number
  racha: number
  esHoy: boolean
}

/** Pantalla final del pack: score total, récord, racha y compartir con grid de emojis. */
export function ResumenDia({ pack, estado, scoreTotal, esNuevoRecord, record, racha, esHoy }: Props) {
  const [copiado, setCopiado] = useState(false)
  const scoreMaximo = pack.events.length * SCORE_MAXIMO_EVENTO

  const resultados: ResultadoEvento[] = pack.events.map((evento, i) => {
    const e = estado.eventos[i]
    const ultimo = e.intentos[e.intentos.length - 1]
    return { intentosUsados: e.intentos.length, distanciaFinal: Math.abs(ultimo - evento.year) }
  })

  const compartir = async () => {
    const texto = generarTextoCompartir(pack.date, resultados, scoreTotal, scoreMaximo)
    if (await copiarAlPortapapeles(texto)) {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    }
  }

  return (
    <section className={styles.resumen}>
      <p className={styles.eyebrow}>{esHoy ? 'Resumen del día' : 'Partida de archivo'}</p>
      <h2 className={styles.fecha}>{formatearFechaLarga(pack.date)}</h2>

      <p className={styles.score}>
        {scoreTotal}
        <span className={styles.scoreMax}> / {scoreMaximo}</span>
      </p>
      {esHoy && esNuevoRecord && <p className={styles.nuevoRecord}>★ ¡Nuevo récord!</p>}

      {esHoy ? (
        <dl className={styles.estadisticas}>
          <div>
            <dt>Racha</dt>
            <dd>
              {racha} {racha === 1 ? 'día' : 'días'}
            </dd>
          </div>
          <div>
            <dt>Récord</dt>
            <dd>{record} pts</dd>
          </div>
        </dl>
      ) : (
        <p className={styles.notaArchivo}>Las partidas de archivo no afectan a tu racha ni a tu récord.</p>
      )}

      <ul className={styles.eventos}>
        {pack.events.map((evento, i) => (
          <li key={evento.id} className={styles.evento}>
            <span className={styles.emoji}>{emojiCercania(resultados[i].distanciaFinal)}</span>
            <span className={styles.ano}>{evento.year}</span>
            <a
              className={styles.textoEvento}
              href={evento.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {evento.texto}
            </a>
            <span className={styles.puntos}>+{estado.eventos[i].score ?? 0}</span>
          </li>
        ))}
      </ul>

      <button type="button" className={styles.compartir} onClick={compartir}>
        {copiado ? '¡Copiado al portapapeles!' : 'Compartir resultado'}
      </button>
    </section>
  )
}
