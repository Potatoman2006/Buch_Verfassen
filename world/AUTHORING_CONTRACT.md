# Aetherra: the Inner Salt, edition 2

This edition replaces the earlier active worlds. Its baseline is the first day of 250 IS. The world and regional lore are established before fiction is drafted. Dark fantasy with human warmth, consequential violence, and no explicit sexual content.

## Authority and scope

`world/core/*.md` and `world/regions/*.md` contain the readable canon. `world/manifest.json` indexes those exact files and their dependencies. `world/cartography.json` contains schematic map positions, never an alternative body of lore. The atlas is a generated local reader of these files. Stories have a dated local continuity and do not silently change the baseline.

Keep Aetherra, Greater Meridian, Inner Salt, Crownspine, the Lume, and the twelve established regional names. Retain strong geographic and cultural seeds; replace the old dominance of accounts, audits, legal documents, debt, and administrative disputes. No supernatural contracts, power scores, universal game levels, or accounting metaphysics. Ordinary economics exists in the background.

The Inner Salt is a detailed subsection of a much larger inhabited world. The inherited paintings are interpretive, not surveys. Regional chart is approximately 4,800 by 3,200 km; walking 20-30 km/day, coastal sailing 80-160 km/day in season. Wider chart is a cartographer's composite, not a georeferenced parent tile. Do not claim exact planetary dimensions or 84 Earths.

## Module format

Each Markdown file starts with one H1, an introductory paragraph, and readable H2 sections. Use ordinary Markdown (no raw HTML, tables optional). Links to other modules use `[Title](../core/magic.md)` or appropriate real relative paths. End with a short `## Connections` list of relevant files. Each module should distinguish stable author facts from in-world disputed beliefs in prose. Do not use other sources of active authority.

Core IDs and filenames: `world-frame`, `history`, `peoples`, `cultures`, `faiths`, `magic`, `vampirism`, `ecology`, `beyond-the-map` (all under `core/`).

Regional IDs and filenames: `rhydder`, `orison`, `kharad-vorn`, `avarenne`, `greyhaven`, `velisara`, `merenne`, `seven-boughs`, `redwind`, `aurelian-isles`, `nine-beacons`, `reef-crown` (all under `regions/`). Also `inner-salt` and `story-ground` for connected geography and the deep local story region.

Every major region needs: sensory identity and ordinary life; at least two contrasting communities within it; peoples and languages; faith as practice; power and present conflict with credible opposing motives; magic and its consequences; memorable sites; relationships to neighbours; multiple independent story openings. Core and regions together should support war, exploration, family, faith, horror and political stories, without serving one protagonist.

## Shared supernatural foundation (fixed for both writing teams)

The living world and the undercurrent of remembered form overlap at ancient wounds. Magic uses a material medium and a learned pattern: heat, growth, stone, tides, perception, or echoes of the dead. It cannot create souls, restore a dead person, reverse time, teleport, command minds, or solve hunger. Distance, interruption, material supply, and exhaustion matter. Large ancient works need maintained sites and several practitioners.

Vampirism is an acquired condition, never a people or moral alignment. Turning requires a dying adult to receive a vampire's blood before death and survive a night of transformation; an ordinary bite does not turn. A vampire needs fresh human or other sapient warm-blooded blood about every three nights (150-200 ml); animals blunt hunger for one night but cannot sustain them beyond roughly two weeks. Donors need long recovery, so a single person cannot sustain one vampire safely. Explain consent, coercion, access, and different societies' responses. No mystical sire obedience, telepathy, flight, mist form, compulsion, or automatic new powers with age. Strength about twice a fit human in short bursts; fine hearing within a room, never through stone. Daylight directly on skin burns within seconds; cloudy open sky also burns more slowly; opaque shelter protects. Fire, beheading, or destruction of the heart kills. A wooden stake immobilises only by physical heart damage. Sun injury and severe wounds require weeks, blood, and rest. Mirrors reflect them. Faith symbols alone do nothing; wards require actual established magic. Stored blood loses sustaining virtue after six hours even if chilled. No convenient later exception.

## Story grounding to establish before prose

Reserve a coastal Merenne district with a town named Rookharbour, its inland abandoned monastery Saint Orra's, a forest-edge settlement called Briarbridge, and nearby waters of the western Inner Salt. These three sites form a tight corridor, at most 60 km apart; the story need not visit the whole region. A twenty-year-old human woman named Mara Venn becomes a vampire in autumn 250 IS. Story spans exactly to autumn 255 IS, five full years after turning. Her younger sister is Tessa (seventeen at start), her sire is Yseld (a vampire formerly human), and a human hunter/healer is Brother Cael. These are four principal characters; minor local characters may have roles but keep cast manageable. Do not draft the story before core and regional files have been reviewed. The story should be about living with hunger, family, secrecy, danger, and chosen responsibilities, with a concrete external conflict and a complete ending. No administrative mystery or bureaucracy plot.

## Change discipline

Add depth inside bounded modules and update declared links. Stories must request any new magical exception as a world revision before using it; default to solving scenes with established tools. No external deployment, API calls, accounts, or remote fonts. The reader must work from `atlas/index.html` using file access alone.
