import styles from './SelectorAno.module.css'

interface Props {
  valor: number
  onCambio: (ano: number) => void
  min: number
  max: number
  disabled?: boolean
}

/** Selector de año: cifra grande editable, ajuste fino ±1 y slider del rango completo. */
export function SelectorAno({ valor, onCambio, min, max, disabled = false }: Props) {
  const fijar = (ano: number) => onCambio(Math.min(max, Math.max(min, ano)))

  return (
    <div className={styles.selector}>
      <div className={styles.fila}>
        <button
          type="button"
          className={styles.paso}
          onClick={() => fijar(valor - 1)}
          disabled={disabled || valor <= min}
          aria-label="Un año antes"
        >
          −
        </button>
        <input
          type="number"
          className={styles.cifra}
          value={valor}
          min={min}
          max={max}
          disabled={disabled}
          aria-label="Año"
          onChange={(e) => {
            const ano = Number(e.target.value)
            if (!Number.isNaN(ano)) onCambio(ano)
          }}
          onBlur={() => fijar(valor)}
        />
        <button
          type="button"
          className={styles.paso}
          onClick={() => fijar(valor + 1)}
          disabled={disabled || valor >= max}
          aria-label="Un año después"
        >
          +
        </button>
      </div>
      <input
        type="range"
        className={styles.slider}
        value={Math.min(max, Math.max(min, valor))}
        min={min}
        max={max}
        step={1}
        disabled={disabled}
        aria-label="Deslizador de año"
        onChange={(e) => fijar(Number(e.target.value))}
      />
      <div className={styles.extremos}>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}
