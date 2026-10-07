# The House That Kept the Night

A complete dark fantasy novella set in Aetherra's Inner Salt. Mara Venn is twenty when a vampire takes her ordinary future away. The story follows her first five years after turning: hunger, a difficult escape, the changing life of her younger sister, and the possibility of a home she can choose.

The reading edition contains twelve chapters and approximately 15,800 words across 50 PDF pages, including the title page. It uses 11-point Georgia on a 7-by-10-inch page.

Read the [PDF](output/pdf/five_years_of_night.pdf), the [Markdown manuscript](manuscript.md), or use **Read the story** in the [local atlas](../../atlas/index.html#story). The story stands alone; the atlas supplies deeper background when you want it. There is no explicit sexual content.

## World first, story second

The lore was written and independently reviewed before the prose began. [WORLD_REVIEW.md](WORLD_REVIEW.md) records that decision. `world_packet/` preserves the exact source material and hashes. The shared world remains at 250 IS; the novella's local continuity runs from autumn 250 to autumn 255 IS.

`STORY_BIBLE.md`, `continuity.json`, and `EDITORIAL_REVIEW.md` contain spoilers and authoring notes. `validation.json` records structural checks; it is not a literary-quality score.

## Rebuild locally

The delivered PDF is ready to read. Regeneration uses Python with ReportLab and pypdf, plus an available Georgia, Liberation Serif, or DejaVu Serif font family:

```powershell
python stories/five_years_of_night/build_pdf.py
node tools/validate_story.mjs
```

The root `tools/pdf_qa.py` can check the generated PDF against the source and render it for inspection. No remote service is used.
