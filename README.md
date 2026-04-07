# World Heritage Interactive Map

A Vite + React + Three.js project for exploring UNESCO World Heritage sites on an interactive globe or flat world map.

The app renders site markers in 3D, lets users switch between globe and flat views, filters by continent and country, and surfaces image-backed site details from the local dataset.

## Features

- Interactive globe and flat map views built with `@react-three/fiber` and `three`
- Continent and country drill-down in the sidebar
- Site overlays with images, category, inscription year, and description
- Layer toggles for ocean, land, borders, site markers, and labels
- Local image asset pipeline organized by continent, country, and site
- UNESCO data normalization scripts for refreshing the dataset

## Tech Stack

- React 19
- TypeScript
- Vite
- Three.js
- React Three Fiber / Drei
- Zustand
- Motion

## Project Structure

```text
src/
  components/              UI, 3D scene, overlays, controls
  data/
    unesco-world-heritage.json
    unesco-world-heritage.raw.json
    unesco-image-map.json
  App.tsx
  store.ts
public/
  images/sites/            Downloaded and renamed site images
scripts/
  fetch-unesco-data.mjs
  fetch-wikimedia-images.mjs
  fetch-manual-images.mjs
  rename-site-images.mjs
```

## Getting Started

### Requirements

- Node.js 20+ recommended
- npm

### Install

```bash
npm install
```

### Start the dev server

```bash
npm run dev
```

The app runs on `http://localhost:3000`.

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## Available Scripts

- `npm run dev`: start the Vite dev server on port `3000`
- `npm run build`: create a production build in `dist/`
- `npm run preview`: preview the production build locally
- `npm run lint`: run TypeScript type-checking with `tsc --noEmit`
- `npm run clean`: remove the `dist/` directory
- `npm run fetch:unesco`: refresh UNESCO source data and regenerate normalized app data
- `npm run fetch:images`: download site images from Wikidata/Wikipedia

## Data Pipeline

### UNESCO data

`scripts/fetch-unesco-data.mjs` pulls records from the UNESCO DataHub dataset `whc001`, writes the raw payload to:

- `src/data/unesco-world-heritage.raw.json`

and writes the normalized app-ready payload to:

- `src/data/unesco-world-heritage.json`

The normalized dataset includes:

- UNESCO ID
- site name
- display country and optional multi-country data
- continent grouping used by the UI
- coordinates
- category
- description
- source metadata

### Images

`scripts/fetch-wikimedia-images.mjs` attempts to resolve images from Wikidata and Wikipedia, then updates:

- `src/data/unesco-image-map.json`
- `public/images/sites/`

Useful environment variables for image fetching:

- `IMAGE_COUNTRY`: limit downloads to a specific country
- `IMAGE_LIMIT`: cap the number of attempted downloads
- `IMAGE_DELAY_MS`: delay between requests

Example:

```bash
IMAGE_COUNTRY="Japan" IMAGE_LIMIT=20 npm run fetch:images
```

### Manual image fixes

For sites that need manual intervention, use `scripts/fetch-manual-images.mjs` with `MANUAL_IMAGE_TARGETS`.

Example:

```bash
MANUAL_IMAGE_TARGETS='[{"id":"262","queries":["Sanganeb Marine National Park"]}]' node scripts/fetch-manual-images.mjs
```

After downloading or backfilling images, run the rename script if needed to normalize asset paths:

```bash
node scripts/rename-site-images.mjs
```

## Deployment

This project is a static frontend built with Vite and can be deployed to any static hosting platform.

The current app code includes a share link pointing to:

- [https://world-heritage-seven.vercel.app/](https://world-heritage-seven.vercel.app/)

If you deploy to a different domain, update the hard-coded share URL in [src/App.tsx](/Users/zhangxumeng/Desktop/world-heritage-interactive-map%20(2)/src/App.tsx).

## Notes

- The checked-in `.env.example` still contains legacy AI Studio template variables and is not required for the current frontend runtime.
- Data-fetching scripts require network access.
- Large image and dataset updates can create sizable diffs in `public/images/sites/` and `src/data/`.
