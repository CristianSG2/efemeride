import { describe, expect, it } from 'vitest'
import { calcularScore, compararIntento } from '../lib/puntuacion'

describe('calcularScore', () => {
  it('distancia 0 (acierto exacto) da el máximo de 100', () => {
    expect(calcularScore(1969, 1969)).toBe(100)
  })

  it('distancia exacta de 30 años da 0', () => {
    expect(calcularScore(1969, 1999)).toBe(0)
    expect(calcularScore(1969, 1939)).toBe(0)
  })

  it('distancia mayor de 30 años da 0, nunca negativo', () => {
    expect(calcularScore(1969, 2020)).toBe(0)
    expect(calcularScore(1969, 1850)).toBe(0)
  })

  it('redondea correctamente los valores intermedios', () => {
    // 100 * (1 - 1/30) = 96,67 -> 97
    expect(calcularScore(1969, 1970)).toBe(97)
    // 100 * (1 - 2/30) = 93,33 -> 93
    expect(calcularScore(1969, 1967)).toBe(93)
    // 100 * (1 - 4/30) = 86,67 -> 87
    expect(calcularScore(1969, 1973)).toBe(87)
    // 100 * (1 - 15/30) = 50 exacto
    expect(calcularScore(1969, 1984)).toBe(50)
  })

  it('es simétrico: da igual fallar por antes que por después', () => {
    expect(calcularScore(1969, 1962)).toBe(calcularScore(1969, 1976))
  })
})

describe('compararIntento', () => {
  it('detecta el acierto exacto', () => {
    expect(compararIntento(1969, 1969)).toBe('acierto')
  })

  it('si el intento se pasa, el año real es más antiguo', () => {
    expect(compararIntento(1969, 1980)).toBe('mas-antiguo')
    expect(compararIntento(1969, 1970)).toBe('mas-antiguo')
  })

  it('si el intento se queda corto, el año real es más reciente', () => {
    expect(compararIntento(1969, 1950)).toBe('mas-reciente')
    expect(compararIntento(1969, 1968)).toBe('mas-reciente')
  })
})
