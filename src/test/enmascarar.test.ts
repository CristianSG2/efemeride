import { describe, expect, it } from 'vitest'
import { enmascararAnos } from '../../scripts/generar-evento-diario'

// Año actual fijo para que los casos no dependan de cuándo corre la suite
const ANO_ACTUAL = 2026

describe('enmascararAnos', () => {
  it('enmascara un año dentro del rango 1850–actual', () => {
    expect(enmascararAnos('la radio se patentó en 1897 en Londres', ANO_ACTUAL)).toBe(
      'la radio se patentó en ▪▪▪▪ en Londres',
    )
  })

  it('enmascara todos los años en rango, no solo el de la respuesta', () => {
    expect(enmascararAnos('Guglielmo Marconi (1874-1937) patenta la radio en 1897', ANO_ACTUAL)).toBe(
      'Guglielmo Marconi (▪▪▪▪-▪▪▪▪) patenta la radio en ▪▪▪▪',
    )
  })

  it('no toca años de 4 dígitos fuera del rango', () => {
    expect(enmascararAnos('En 1492 llegó a América; volveremos en 2050', ANO_ACTUAL)).toBe(
      'En 1492 llegó a América; volveremos en 2050',
    )
  })

  it('respeta los límites del rango: 1850 y el año actual se enmascaran, 1849 y el siguiente no', () => {
    expect(enmascararAnos('1849 1850 2026 2027', ANO_ACTUAL)).toBe('1849 ▪▪▪▪ ▪▪▪▪ 2027')
  })

  it('no toca números de más o menos de 4 dígitos', () => {
    expect(enmascararAnos('quedan 999 días; 12345 asistentes; id 40089810910', ANO_ACTUAL)).toBe(
      'quedan 999 días; 12345 asistentes; id 40089810910',
    )
  })

  it('no confunde un tramo de 4 dígitos dentro de un número más largo', () => {
    // 1976 aparece dentro de 219760: no debe enmascararse
    expect(enmascararAnos('expediente 219760', ANO_ACTUAL)).toBe('expediente 219760')
  })
})
