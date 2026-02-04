# Wow TBC Macro Builder

This repo contains a three-part system:

- Web macro builder (apps/web)
- Community backend (apps/api)
- In-game addon (addons/TBCMacroBuilder)

## Web App

Install dependencies and run the web app:

```bash
npm install
npm run dev
```

## GitHub Pages Hosting (Frontend Only)

This repo includes a GitHub Actions workflow that builds the frontend and deploys
`apps/web/dist` to GitHub Pages on every push to `main`.

If you use a custom domain, set `BASE_PATH` to `/` in `.github/workflows/pages.yml`.
If you are hosting under `username.github.io/repo`, set it to `/<repo>/`.

Optional API base (community features):

```bash
VITE_API_BASE=http://localhost:8787
```

## Data Pipeline

The data package holds spell + pet ability data and scripts to generate the Lua table:

```bash
npm run data:build
npm run data:lua
```

### Wowhead spell fetcher

You can attempt to pull full class spell lists from Wowhead listview pages:

```bash
npm run data:wowhead
```

The script reads `packages/data/data/wowhead-spell-urls.json` and writes
`packages/data/data/spells.json`. If Wowhead blocks automated requests, you may
need to run this locally or adjust the URLs. The format expects Wowhead listview
pages with `new Listview({ template: 'spell', data: [...] })`.

Consumables are sourced from `packages/data/data/consumables.source.json` and compiled into
`packages/data/data/consumables.json` with Wowhead item IDs so tooltips resolve.

## Community API (Cloudflare Workers)

The API is scaffolded in `apps/api`. To run locally:

```bash
cd apps/api
npm install
npm run dev
```

Update `wrangler.toml` with your D1 database ID and Turnstile secret.

## Addon

Copy `addons/TBCMacroBuilder` into your WoW AddOns folder. Use `/tbcmb` in game.

The addon includes:

- Draft storage in SavedVariables
- Import/export strings compatible with the web builder
- Push to macro slots
- Druid helper templates (native powershift + DruidMacroHelper mode)

DMH templates are available when the DruidMacroHelper addon is installed.

## Project Structure

```
apps/web
apps/api
packages/data
packages/shared
content/curated
addons/TBCMacroBuilder
```
