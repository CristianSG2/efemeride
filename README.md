# Efeméride Diaria

Juego web diario al estilo Wordle/Framed: cada día hay **5 eventos históricos reales** (con foto) y tienes que adivinar **en qué año ocurrieron**. Tres intentos por evento; tras cada fallo solo se te dice si el año real es *más antiguo* o *más reciente* que tu intento.

Los datos salen de la API pública de Wikipedia en español, no hay backend: un job diario genera un JSON estático por fecha y el frontend (React 18 + TypeScript + Vite) lo consume. El estado del jugador (partidas, racha, récord) vive en `localStorage`.

## Reglas del juego

- Pack diario de 5 eventos, siempre con foto visible desde el principio.
- Hasta 3 intentos por evento, con pista de dirección tras cada fallo.
- Score por evento sobre el último intento usado: `max(0, round(100 · (1 − distancia_en_años / 30)))` — máximo 100 por evento, 500 por día.
- Al resolver un evento (acierto o tercer fallo) se revelan el año real, el texto del evento y el enlace a Wikipedia.
- Al completar el pack: score total, comparación con tu récord, racha de días consecutivos y botón de compartir con un grid de emojis estilo Wordle (⬛ intentos fallidos previos, 🎯/🟩/🟨/🟧/🟥 según cercanía del intento final; nunca revela los años).
- **Modo archivo**: puedes jugar días anteriores (`#/archivo`), sin que afecten a tu racha ni a tu récord. Solo cuenta como "día real" la fecha de hoy, llegues por la ruta que llegues.

## Cómo funciona el job diario

`scripts/generar-evento-diario.js` (Node puro, ESM, sin dependencias) genera el pack de una fecha:

1. Consulta `https://es.wikipedia.org/api/rest_v1/feed/onthisday/events/{mm}/{dd}`.
2. Filtra candidatos con dos reglas **innegociables**: debe existir una foto válida en alguna de sus páginas relacionadas, y el año debe estar entre 1850 y el año actual (calculado dinámicamente).
   - Se descartan imágenes genéricas o que delaten la respuesta: banderas, escudos, mapas de localización, y cualquier nombre de archivo que contenga un año plausible dentro del rango (p. ej. `UEFA_Euro_2012_logo.svg`). Si la primera página relacionada tiene una imagen genérica, se prueba con las siguientes antes de descartar el evento.
3. Consulta las pageviews del último mes completo de cada candidato (`wikimedia.org/api/rest_v1/metrics/pageviews/...`) y ordena por popularidad.
4. Excluye los eventos ya usados en fechas anteriores (registro persistente en `data/used-events.json`).
5. Selecciona 5 al azar dentro del top 15 por popularidad, aplicando el umbral de vistas más exigente que aún deje 5 candidatos (escalera 5000 → 1000 → 100 → 0: la popularidad se relaja sola si hace falta; la foto y el rango de años, nunca).
6. Escribe `data/YYYY-MM-DD.json`, actualiza `data/used-events.json` y regenera `data/index.json` (el índice de fechas que alimenta el modo archivo).

El plan es que un workflow de GitHub Actions con cron ejecute `npm run generar` cada día y commitee el JSON resultante (el workflow todavía no está configurado).

### Formato del pack diario

```json
{
  "date": "2026-07-02",
  "events": [
    {
      "id": "guerra-de-vietnam-1976",
      "year": 1976,
      "text": "resumen del evento en español",
      "imageUrl": "https://upload.wikimedia.org/...",
      "wikipediaUrl": "https://es.wikipedia.org/wiki/...",
      "popularityScore": 27377
    }
  ]
}
```

El frontend pide los thumbnails a 800px de ancho (Wikimedia los genera al vuelo) y, si el original es más pequeño y la petición falla, recurre a la URL original del JSON.

## Correr en local

```bash
npm install

# Generar el pack de hoy (o de una fecha concreta)
npm run generar
npm run generar 2026-07-01

# Levantar el juego
npm run dev
```

El juego lee los packs de `/data/*.json`; en dev y en build se sirven gracias al symlink `public/data → ../data`, así el job escribe en un único sitio. Si tu plataforma de deploy no sigue symlinks al copiar `public/`, haz que el job escriba directamente en `public/data/`.

### Tests

```bash
npm test        # suite completa (Vitest + React Testing Library)
npm run test:watch
```

Cubren el cálculo de score (límites y redondeo), la lógica de "más antiguo/más reciente" y el hook `usePartidaDiaria` (persistencia en localStorage, racha, récord, recarga a mitad de pack y el caso de llegar a hoy por la ruta de archivo).

## Estructura

```
scripts/generar-evento-diario.js   Job diario (npm run generar [YYYY-MM-DD])
data/                              Packs por fecha + used-events.json + index.json
src/lib/                           Lógica pura: puntuación, pistas, compartir, fechas, datos
src/hooks/usePartidaDiaria.ts      Estado de partida + localStorage (racha, récord)
src/components/                    TarjetaEvento, SelectorAno, RevelacionEvento,
                                   PantallaJuego, ResumenDia, Archivo
src/test/                          Suite de Vitest
```
