import '@testing-library/jest-dom/vitest'

// Node >= 22 define un getter global experimental de localStorage (inactivo
// sin --localstorage-file) que tapa al de jsdom al poblar los globals, y
// reutilizar el Storage de jsdom entre realms es inestable en el pool de
// forks. Para los tests basta un almacenamiento en memoria con la API real.
class StorageEnMemoria implements Storage {
  private datos = new Map<string, string>()

  get length(): number {
    return this.datos.size
  }

  clear(): void {
    this.datos.clear()
  }

  getItem(clave: string): string | null {
    return this.datos.get(clave) ?? null
  }

  key(indice: number): string | null {
    return [...this.datos.keys()][indice] ?? null
  }

  removeItem(clave: string): void {
    this.datos.delete(clave)
  }

  setItem(clave: string, valor: string): void {
    this.datos.set(clave, String(valor))
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new StorageEnMemoria(),
  writable: true,
  configurable: true,
})
