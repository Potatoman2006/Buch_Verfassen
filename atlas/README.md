# The local atlas

Open `index.html` directly in a browser. It loads only local JavaScript, CSS, and terrain assets. Its content security policy disallows network connections. There is no server, remote font, CDN, telemetry, account, service worker, or deployment configuration.

`index.html`, `styles.css`, and `app.js` are the reader. `content.js` is generated from the single world manifest and its Markdown sources; regenerate it with `npm run build` from the repository root. The story is included when its current manuscript passes `node tools/validate_story.mjs`; the build verifies its hash so an incomplete or changed draft is not labelled complete.

## Map sources and meaning

The two terrain paintings in `assets/` were retained from this repository's earlier interactive atlas. Their original names were `inner-salt-atlas-base.webp` and `known-world-base-v2.webp`; the originals remain in the dated archive. No new third-party map content or game assets were imported.

Edition 2 replaces the former conflicting place overlays with positions linked to current lore in `../world/cartography.json`. Land-realm pins and boundaries were visually corrected against the painting. Boundaries indicate approximate areas of influence, and island realms can include water. The wider sheet is an interpretive composite, not a georeferenced parent map or a claim about the planet's exact size.

The Rookharbour map is a new SVG sketch of the three-place corridor. Route distances and travel times come from `world/regions/story-ground.md`. Decorative terrain is schematic; the relative directions and listed travel distances are authoritative.

## Verification

`npm test` checks canon references and generated content. The optional `tools/browser_qa.mjs` checks real interactions through a file URL at desktop and mobile sizes, including search, map selection, bookmarks, reading view, keyboard control, and absence of HTTP requests. It requires a local Playwright installation and Chromium.

Bookmarks use browser-local storage where available. If the browser disables storage for local files, the atlas remains usable and bookmarks last only for the current page session.
