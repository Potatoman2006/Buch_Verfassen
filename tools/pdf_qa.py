"""Inspect a local PDF and optionally render Poppler contact sheets for review.

Automated bounds/text checks complement manual review; they cannot establish
that every page looks good or that a story is narratively satisfying.
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import math
import re
import shutil
import subprocess
from pathlib import Path

import pdfplumber
from PIL import Image, ImageDraw
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent


def find_pdftoppm(explicit: Path | None = None) -> Path:
    candidates = [explicit] if explicit else []
    discovered = shutil.which("pdftoppm")
    if discovered:
        candidates.append(Path(discovered))
    candidates.extend([
        Path.home() / ".cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe",
        Path.home() / ".cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/bin/pdftoppm",
    ])
    for candidate in candidates:
        if candidate and candidate.is_file():
            return candidate.resolve()
    raise FileNotFoundError("Poppler pdftoppm was not found. Supply --pdftoppm with its local path.")


def tokens(text: str) -> list[str]:
    return re.findall(r"\b[\w]+(?:['’][\w]+)*\b", text.replace("’", "'").lower())


def check_source(source: Path, extracted_text: str) -> dict:
    original = source.read_text(encoding="utf-8-sig")
    expected = tokens(original)
    actual = tokens(extracted_text)
    remaining = collections.Counter(expected) - collections.Counter(actual)
    position = 0
    for word in actual:
        if position < len(expected) and expected[position] == word:
            position += 1
    return {
        "source": str(source.resolve()),
        "source_words": len(expected),
        "pdf_words": len(actual),
        "missing_token_counts": dict(remaining),
        "all_source_tokens_in_order": position == len(expected),
        "matched_source_tokens": position,
        "first_unmatched_context": expected[max(position - 5, 0):position + 12] if position != len(expected) else [],
    }


def render_review(pdf: Path, target: Path, page_count: int, args: argparse.Namespace) -> dict:
    pdftoppm = find_pdftoppm(args.pdftoppm)
    # A changed PDF gets a fresh render directory, so old pages from a longer
    # layout cannot be mistaken for pages in a subsequent shorter layout.
    target = target / ("render-" + hashlib.sha256(pdf.read_bytes()).hexdigest()[:12])
    contact_dir = target / "contact_pages"
    detail_dir = target / "representative_pages"
    contact_dir.mkdir(parents=True, exist_ok=True)
    detail_dir.mkdir(parents=True, exist_ok=True)
    prefix = contact_dir / "page"
    subprocess.run([str(pdftoppm), "-r", "45", "-png", str(pdf), str(prefix)], check=True, capture_output=True, text=True)
    thumbnails = sorted(contact_dir.glob("page-*.png"), key=lambda p: int(p.stem.rsplit("-", 1)[1]))
    if len(thumbnails) != page_count:
        raise RuntimeError(f"Expected {page_count} contact renders, found {len(thumbnails)}. Use a fresh QA output directory.")
    contact_sheets = []
    tile_width, tile_height, columns, per_sheet = 252, 374, 4, 16
    for start in range(0, len(thumbnails), per_sheet):
        group = thumbnails[start:start + per_sheet]
        rows = math.ceil(len(group) / columns)
        sheet = Image.new("RGB", (columns * tile_width, rows * tile_height), "#d8d4cf")
        draw = ImageDraw.Draw(sheet)
        for offset, path in enumerate(group):
            with Image.open(path) as image:
                image = image.convert("RGB")
                image.thumbnail((tile_width - 20, tile_height - 30))
                left = (offset % columns) * tile_width + (tile_width - image.width) // 2
                top = (offset // columns) * tile_height + 21
                sheet.paste(image, (left, top))
                draw.rectangle((left - 1, top - 1, left + image.width, top + image.height), outline="#9e9892")
            draw.text(((offset % columns) * tile_width + 10, (offset // columns) * tile_height + 6), f"PDF page {start + offset + 1}", fill="#24221f")
        destination = target / f"contact-sheet-{len(contact_sheets) + 1:02d}.png"
        sheet.save(destination)
        contact_sheets.append(str(destination))

    if args.pages:
        representative = sorted({int(value.strip()) for value in args.pages.split(",")})
    else:
        representative = sorted({1, min(2, page_count), min(3, page_count), max(1, page_count // 3), max(1, 2 * page_count // 3), max(1, page_count - 1), page_count})
    if any(page < 1 or page > page_count for page in representative):
        raise ValueError("Representative page numbers must fall within the PDF.")
    detailed = []
    for page in representative:
        destination = detail_dir / f"page-{page:03d}"
        subprocess.run([str(pdftoppm), "-f", str(page), "-l", str(page), "-r", str(args.dpi), "-singlefile", "-png", str(pdf), str(destination)], check=True, capture_output=True, text=True)
        detailed.append(str(destination.with_suffix(".png")))
    return {"renderer": str(pdftoppm), "contact_sheets": contact_sheets, "representative_pages": detailed, "manual_visual_review_required": True}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--source", type=Path, help="Optional original Markdown for a source-token preservation check.")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "tmp/pdfs/five_years_of_night_qa")
    parser.add_argument("--render", action="store_true", help="Render all pages for contact sheets and selected pages at reading resolution.")
    parser.add_argument("--pages", help="Comma-separated 1-based PDF pages to render at reading resolution.")
    parser.add_argument("--dpi", type=int, default=120)
    parser.add_argument("--pdftoppm", type=Path)
    args = parser.parse_args()
    pdf = args.pdf.resolve()
    target = args.output_dir.resolve()
    target.mkdir(parents=True, exist_ok=True)
    reader = PdfReader(pdf)
    texts = [page.extract_text() or "" for page in reader.pages]
    report = {
        "pdf": str(pdf), "page_count": len(reader.pages),
        "total_words": sum(len(tokens(text)) for text in texts),
        "blank_pages": [], "out_of_page_characters": [], "missing_glyph_markers": [],
        "page_metrics": [], "source_comparison": None, "rendering": None,
        "automated_checks_pass": False,
    }
    with pdfplumber.open(pdf) as document:
        for number, (page, text) in enumerate(zip(document.pages, texts), start=1):
            if not re.sub(r"\d|\s", "", text):
                report["blank_pages"].append(number)
            chars = [char for char in page.chars if char.get("text", "").strip()]
            outside = [char for char in chars if char["x0"] < -0.5 or char["x1"] > page.width + 0.5 or char["top"] < -0.5 or char["bottom"] > page.height + 0.5]
            if outside:
                report["out_of_page_characters"].append({"page": number, "count": len(outside), "sample": "".join(char["text"] for char in outside[:30])})
            bad_chars = sorted({char for char in text if char in "\ufffd\u25a0\x00"})
            if bad_chars:
                report["missing_glyph_markers"].append({"page": number, "characters": bad_chars})
            bounds = None if not chars else [round(min(c["x0"] for c in chars), 2), round(min(c["top"] for c in chars), 2), round(max(c["x1"] for c in chars), 2), round(max(c["bottom"] for c in chars), 2)]
            report["page_metrics"].append({"page": number, "words": len(tokens(text)), "size_points": [page.width, page.height], "text_bounds_points": bounds})
    if args.source:
        report["source_comparison"] = check_source(args.source, "\n".join(texts))
    source_ok = report["source_comparison"] is None or (not report["source_comparison"]["missing_token_counts"] and report["source_comparison"]["all_source_tokens_in_order"])
    report["automated_checks_pass"] = not (report["blank_pages"] or report["out_of_page_characters"] or report["missing_glyph_markers"]) and source_ok
    if args.render:
        report["rendering"] = render_review(pdf, target, len(reader.pages), args)
    report_path = target / "qa-report.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (target / "extracted-text.txt").write_text("\n\n".join(f"--- PDF PAGE {i} ---\n{text}" for i, text in enumerate(texts, 1)), encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "page_metrics"}, indent=2, ensure_ascii=False))
    print(f"QA report: {report_path}")
    raise SystemExit(0 if report["automated_checks_pass"] else 1)


if __name__ == "__main__":
    main()
