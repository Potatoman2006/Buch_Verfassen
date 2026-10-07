# Aetherra — The Inner Salt

One fantasy world, one local interactive atlas, and stories that grow from established lore.

**Open [`atlas/index.html`](atlas/index.html) in your browser**, or double-click [`Open Aetherra.cmd`](Open%20Aetherra.cmd). Everything works directly from files. No server, installation, account, API key, or internet connection is needed to read it.

## Start reading

- The atlas opens with the world introduction. Click a realm, search for a subject, or choose a foundation article.
- Switch between the **Inner Salt**, the **wider world**, and the **Rookharbour coast**. The paintings and positions are interpretive maps, not surveyed geography.
- Change layers to explore realms, communities, magic, travel routes, and story locations. Drag to pan; use the wheel or zoom buttons. Map places also work with keyboard focus and Enter.
- Use the star to bookmark an article on this browser. The reading-view button widens the text; Escape restores the map. Press `/` to search.
- **Read the story** opens the complete novella in the atlas. Its PDF and Markdown edition are linked there.

The current world contains 23 connected modules and about 30,200 words of lore. Its first story, **The House That Kept the Night**, is a complete twelve-chapter novella of approximately 15,800 words, delivered as a 50-page PDF including its title page.

## The active project

| Folder | Purpose |
| --- | --- |
| [`world/`](world/) | The authoritative lore: nine shared foundations and fourteen regional modules, indexed by one manifest. |
| [`atlas/`](atlas/) | The offline interactive reader; generated article content comes directly from the world modules. |
| [`stories/five_years_of_night/`](stories/five_years_of_night/) | A complete story following Mara Venn from her turning in autumn 250 IS to autumn 255 IS. |
| [`tools/`](tools/) | Build, validation, authoring-packet export, and local verification tools. |
| [`archive/`](archive/) | Earlier drafts and applications, preserved outside the active world. Nothing here is current canon. |

The Inner Salt is a detailed part of the much larger world of Aetherra. Its baseline is **250 IS**. Peoples, cultures, faith, political allegiance, and magical knowledge are separate parts of identity. The world supports stories of war, exploration, family, faith, adventure, and horror. The vampire novella occupies one small coastal district.

## Develop a story or expand the world

Read [`world/AUTHORING_CONTRACT.md`](world/AUTHORING_CONTRACT.md) first. Edit the relevant Markdown module, update its connections and the dependencies in [`world/manifest.json`](world/manifest.json), then rebuild the atlas. Avoid introducing facts only in the generated reader or a manuscript.

With Node.js installed, from this project folder:

```powershell
npm run build
npm run validate
npm test
```

There are no npm packages to install for those commands. The generated [`world/WORLD_BOOK.md`](world/WORLD_BOOK.md) provides the entire lore as one reading edition; edit its source modules instead.

Create a bounded packet containing one module and its declared dependencies:

```powershell
node tools/export_packet.mjs story-ground tmp/packets/rookharbour
```

The packet includes exact source hashes. A story has its own dated continuity and must resolve changes to the world's rules before using them. See the story's `WORLD_REVIEW.md`, `STORY_BIBLE.md`, and `EDITORIAL_REVIEW.md` for the first worked example.

The browser QA helper optionally uses Playwright; PDF regeneration uses Python, ReportLab, and Georgia fonts. Neither is needed to open the delivered atlas or read the PDF.

## What changed

Edition 2 retains Aetherra, the Inner Salt, its strongest geographical and cultural seeds, and the two existing terrain paintings. It replaces competing sources of authority and the previous preoccupation with financial records and administration with a connected fantasy setting. The old applications, artificial capability scores, earlier supernatural rules, and manuscripts are archived.

The archived files were moved intact, including local changes. The archive manifest records the move and verification. No material has been published or deployed. Exact planetary size, surveyed boundaries, and a whole-world simulation are outside this edition's claims.
