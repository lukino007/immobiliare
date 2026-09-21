# Immobiliare

Personal real estate shortlist: save links to interesting listings and keep track of scores,
comments, photos, visit notes, tags and property details. Deployed on Netlify.

## Features

- Save listing URLs with title, address and price
- Score each property from 0 to 10
- Workflow status: to evaluate, to visit, visit scheduled, visited, favorite, offer, discarded
- Free-form tags, visit notes and comments (with timestamps)
- Photo gallery with client-side image resizing before upload
- Photo import from the listing page or from a list of image URLs, with a bookmarklet helper
- Extra details: size, rooms, floor, condo fees, year built, energy class
- Search, filters (status, tag, price range, minimum score) and sorting
- JSON export for backups
- Password-protected access with a signed, HttpOnly session cookie

## Tech stack

- React 19 + TypeScript + Vite
- Netlify Functions (API under `/api/*`)
- Netlify Blobs for storage (`houses` and `photos` stores)
- No database or external service required

## Project structure

```
netlify/
  functions/        API endpoints (session, houses, photos, import, export)
  lib/              Shared server code (auth, storage, validation, listing scraping)
shared/             Types shared between frontend and functions
src/                React application
netlify.toml        Build, dev server and redirect configuration
```

## Requirements

- Node.js 22 (see `.nvmrc`)

## Local development

```bash
npm install
cp .env.example .env
# edit .env and set APP_PASSWORD and SESSION_SECRET
npm run dev:netlify
```

The app is served at http://localhost:8888. `netlify dev` runs Vite behind the Netlify proxy so
that `/api/*` requests reach the functions and Netlify Blobs works locally. On the first run the
Netlify CLI may ask you to log in or link a site; linking is only needed for deploys, not for local
usage.

Running `npm run dev` alone starts only Vite, without the API and without the password gate.

## Environment variables

| Variable         | Description                                                      |
| ---------------- | ---------------------------------------------------------------- |
| `APP_PASSWORD`   | The single password required to access the app.                  |
| `SESSION_SECRET` | Random string (32+ chars) used to sign the session cookie.       |

Generate a secret with:

```bash
openssl rand -base64 48
```

## Deploy to Netlify

1. Push this repository to GitHub.
2. In Netlify choose **Add new site > Import an existing project** and pick the repository.
   Build settings are read from `netlify.toml` (build command `npm run build`, publish directory
   `dist`).
3. Before or after the first deploy, set the environment variables in
   **Project configuration > Environment variables**: `APP_PASSWORD` and `SESSION_SECRET`.
4. Deploy. Open the site and log in with `APP_PASSWORD`.

Netlify Blobs are provisioned automatically; no extra configuration is needed. Every new deploy
keeps the existing data.

## Photo import

Photos can be uploaded manually, imported automatically from the listing page, or imported from a
list of image URLs.

- **Importa dall'annuncio**: a Netlify Function fetches the listing page and extracts the image
  URLs (JSON-LD, `og:image`, known image CDNs). This works for sites without bot protection.
  Portals such as immobiliare.it are protected by DataDome and answer with HTTP 403.
- **Incolla link foto**: for protected sites. Drag the "Copia foto annuncio" button to the
  bookmarks bar, open the listing, click the bookmarklet to copy the photo URLs to the clipboard,
  then paste them into the import box. The server downloads the images from the CDN; immobiliare
  photo URLs are upgraded to the `xxl` size.
- Imports are idempotent: URLs already imported for a property are skipped on the next run.

Use this feature for personal use only and respect the terms of service of the sites you import
from.

## Data and backups

Data lives in two Netlify Blobs stores:

- `houses`: one JSON blob per property
- `photos`: binary image blobs

The **Esporta JSON** button downloads all properties (comments, notes, scores, tags, details and
photo metadata). Photo binaries are not part of the export; download them from the photo URLs or
from the Netlify UI under **Data & Storage > Blobs**.

## Scripts

| Command              | Description                                    |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Vite dev server only (no API)                  |
| `npm run dev:netlify`| Full local environment (Vite + functions)      |
| `npm run build`      | Type-check and build the production bundle     |
| `npm run typecheck`  | Type-check frontend and functions              |
| `npm run lint`       | Run Oxlint                                     |
| `npm run preview`    | Preview the production build                   |
