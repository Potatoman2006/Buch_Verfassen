# Superseded material

This directory preserves earlier drafts, generators, worldbuilding experiments,
maps, and reference applications. **Nothing here is current canon.** The active
setting lives in `../world/`, its local interactive atlas in `../atlas/`, and the
new five-year vampire story in `../stories/five_years_of_night/`.

The user chose to archive earlier work rather than permanently delete it. The
dated archive therefore retains whole source directories, including ignored and
hidden files, dependency folders, and local modifications. It is deliberately
excluded from the active reading experience and normal validation.

`archive_plan_2026-09-05.json` is a preview inventory. Once migration has run,
`_superseded_2026-09-05/manifest.json` records the authoritative result, original
paths, file/byte totals, the original Git status, and SHA-256 hashes for selected
authored files. Existing deleted files are recorded by Git status; they are not
recreated. Secret/environment files are preserved in place with their containing
directory but their contents are not read or included in hashes.

The archive script is `../tools/archive_legacy.ps1`; it previews by default and
requires `-Execute` to move anything. It never deletes files or resets Git. All
source and destination paths must stay within this repository, and the script
refuses reparse points and existing archive destinations.

To restore an individual item, consult the manifest, check that its original
destination is empty, and move or copy that item back explicitly. Never restore
the old root README or entire world tree over current work. Keep this archive
local: it can contain ignored legacy configuration and is not a publication
package.
