"""Typeset a Markdown novella as a readable paperback PDF.

Run the PDF skill's artifact-operation marker before first PDF generation.
This script performs no network operations and never changes the manuscript.
"""

from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
)

STORY_DIR = Path(__file__).resolve().parent
DASHES = str.maketrans({"\u2010": "-", "\u2011": "-", "\u2012": "-", "\u2013": "-", "\u2014": " -- ", "\u2212": "-", "\u00a0": " "})


def normalize_text(text: str) -> str:
    return text.translate(DASHES)


def inline_markup(text: str) -> str:
    """Escape manuscript HTML, then allow only basic Markdown emphasis."""
    text = html.escape(normalize_text(text), quote=False)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", text)
    text = re.sub(r"(?<!\w)_([^_]+)_(?!\w)", r"<i>\1</i>", text)
    return text


def read_blocks(source: Path) -> list[tuple[str, str]]:
    blocks: list[tuple[str, str]] = []
    paragraph: list[str] = []

    def flush() -> None:
        if paragraph:
            blocks.append(("paragraph", " ".join(paragraph)))
            paragraph.clear()

    for raw_line in source.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line:
            flush()
        elif re.fullmatch(r"(?:\*\s*){3,}|(?:-\s*){3,}", line):
            flush()
            blocks.append(("scene", "* * *"))
        elif line.startswith("### "):
            flush()
            blocks.append(("section", line[4:]))
        elif line.startswith("## "):
            flush()
            blocks.append(("chapter", line[3:]))
        elif line.startswith("# "):
            flush()
            blocks.append(("title", line[2:]))
        else:
            paragraph.append(line)
    flush()
    if not blocks or blocks[0][0] != "title":
        raise ValueError("The manuscript must begin with one '# Title' heading.")
    if sum(kind == "title" for kind, _ in blocks) != 1:
        raise ValueError("Use exactly one H1 title; use H2 headings for chapters.")
    if not any(kind == "chapter" for kind, _ in blocks):
        raise ValueError("The manuscript has no H2 chapter headings.")
    return blocks


def register_fonts(font_directory: Path | None = None) -> tuple[str, str, str, str]:
    candidates = []
    if font_directory:
        candidates.append((font_directory, ("georgia.ttf", "georgiab.ttf", "georgiai.ttf", "georgiaz.ttf")))
    candidates.extend([
        (Path("C:/Windows/Fonts"), ("georgia.ttf", "georgiab.ttf", "georgiai.ttf", "georgiaz.ttf")),
        (Path("/usr/share/fonts/truetype/liberation2"), ("LiberationSerif-Regular.ttf", "LiberationSerif-Bold.ttf", "LiberationSerif-Italic.ttf", "LiberationSerif-BoldItalic.ttf")),
        (Path("/usr/share/fonts/truetype/dejavu"), ("DejaVuSerif.ttf", "DejaVuSerif-Bold.ttf", "DejaVuSerif-Italic.ttf", "DejaVuSerif-BoldItalic.ttf")),
    ])
    names = ("NovellaSerif", "NovellaSerif-Bold", "NovellaSerif-Italic", "NovellaSerif-BoldItalic")
    for directory, files in candidates:
        paths = [directory / file for file in files]
        if all(path.is_file() for path in paths):
            for name, path in zip(names, paths):
                pdfmetrics.registerFont(TTFont(name, str(path)))
            pdfmetrics.registerFontFamily(names[0], normal=names[0], bold=names[1], italic=names[2], boldItalic=names[3])
            return names
    raise FileNotFoundError("No complete serif font family found. Supply --font-directory with Georgia TTF files.")


class NovellaDoc(BaseDocTemplate):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.chapter_pages: list[dict] = []

    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and flowable.style.name == "ChapterTitle":
            title = flowable.getPlainText()
            key = f"chapter-{len(self.chapter_pages) + 1}"
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(title, key, level=0, closed=False)
            self.chapter_pages.append({"title": title, "pdf_page": self.page})


def build(args: argparse.Namespace) -> dict:
    source = args.source.resolve()
    output = args.output.resolve()
    blocks = read_blocks(source)
    title = normalize_text(blocks[0][1])
    page_size = (args.page_width * inch, args.page_height * inch)
    regular, bold, italic, _ = register_fonts(args.font_directory)
    used_text = normalize_text("\n".join(text for _, text in blocks) + args.subtitle)
    supported = pdfmetrics.getFont(regular).face.charToGlyph
    missing = sorted({c for c in used_text if ord(c) not in supported and not c.isspace()})
    if missing:
        raise ValueError("Font cannot represent manuscript characters: " + ", ".join(f"U+{ord(c):04X} {c!r}" for c in missing))

    body = ParagraphStyle(
        "Body", fontName=regular, fontSize=args.font_size, leading=args.leading,
        alignment=TA_JUSTIFY, firstLineIndent=12, spaceAfter=0,
        allowWidows=0, allowOrphans=0, splitLongWords=False,
        textColor=colors.HexColor("#24221f"),
    )
    styles = {
        "body": body,
        "first": ParagraphStyle("FirstParagraph", parent=body, firstLineIndent=0),
        "title": ParagraphStyle("BookTitle", fontName=regular, fontSize=29, leading=36, alignment=TA_CENTER, spaceAfter=22),
        "subtitle": ParagraphStyle("Subtitle", fontName=italic, fontSize=11, leading=16, alignment=TA_CENTER, textColor=colors.HexColor("#696159")),
        "chapter": ParagraphStyle("ChapterTitle", fontName=regular, fontSize=21, leading=27, alignment=TA_LEFT, spaceBefore=20, spaceAfter=19, keepWithNext=True),
        "date": ParagraphStyle("ChapterDate", fontName=italic, fontSize=10, leading=14, alignment=TA_LEFT, spaceAfter=17, keepWithNext=True, textColor=colors.HexColor("#696159")),
        "section": ParagraphStyle("SectionTitle", fontName=bold, fontSize=12, leading=17, spaceBefore=16, spaceAfter=10, keepWithNext=True),
        "scene": ParagraphStyle("SceneBreak", fontName=regular, fontSize=10, leading=15, alignment=TA_CENTER, spaceBefore=9, spaceAfter=9, keepWithNext=True),
    }
    margin = args.margin * inch
    output.parent.mkdir(parents=True, exist_ok=True)
    doc = NovellaDoc(
        str(output), pagesize=page_size,
        leftMargin=margin, rightMargin=margin, topMargin=0.66 * inch, bottomMargin=0.65 * inch,
        title=title, author="", subject="A dark fantasy novella", creator="Local novella typesetter",
        pageCompression=1,
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0, id="text")

    def decorate_page(canvas, current_doc):
        if current_doc.page == 1:
            return
        canvas.saveState()
        canvas.setFillColor(colors.HexColor("#77716a"))
        canvas.setFont(regular, 8)
        canvas.drawCentredString(page_size[0] / 2, 0.34 * inch, str(current_doc.page - 1))
        canvas.restoreState()

    doc.addPageTemplates(PageTemplate(id="paperback", frames=[frame], onPage=decorate_page))
    flowables = [Spacer(1, 1.40 * inch), Paragraph(inline_markup(title), styles["title"])]
    if args.subtitle:
        flowables.append(Paragraph(inline_markup(args.subtitle), styles["subtitle"]))
    flowables.append(PageBreak())
    has_chapter = False
    first_paragraph = True
    follows_chapter = False
    for kind, text in blocks[1:]:
        if kind == "chapter":
            if has_chapter:
                flowables.append(PageBreak())
            has_chapter = True
            follows_chapter = True
            first_paragraph = True
            flowables.append(Paragraph(inline_markup(text), styles["chapter"]))
        elif kind == "scene":
            flowables.append(Paragraph("* * *", styles["scene"]))
            first_paragraph = True
            follows_chapter = False
        elif kind == "section":
            flowables.append(Paragraph(inline_markup(text), styles["section"]))
            first_paragraph = True
            follows_chapter = False
        elif follows_chapter and len(text) < 200 and re.fullmatch(r"\*[^*]+\*|_[^_]+_", text):
            flowables.append(Paragraph(inline_markup(text[1:-1]), styles["date"]))
            follows_chapter = False
        else:
            flowables.append(Paragraph(inline_markup(text), styles["first" if first_paragraph else "body"]))
            first_paragraph = False
            follows_chapter = False
    doc.build(flowables)
    from pypdf import PdfReader
    summary = {
        "source": str(source), "output": str(output), "title": title,
        "pages": len(PdfReader(output).pages),
        "source_words": len(re.findall(r"\b[\w]+(?:['’][\w]+)*\b", " ".join(text for _, text in blocks))),
        "chapters": doc.chapter_pages,
        "layout": {"width_inches": args.page_width, "height_inches": args.page_height, "font": regular, "font_size": args.font_size, "leading": args.leading, "side_margin_inches": args.margin},
        "unsupported_characters": missing,
    }
    summary_path = output.with_suffix(".build.json")
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=STORY_DIR / "manuscript.md")
    parser.add_argument("--output", type=Path, default=STORY_DIR / "output/pdf/five_years_of_night.pdf")
    parser.add_argument("--font-size", type=float, default=11.0)
    parser.add_argument("--leading", type=float, default=13.8)
    parser.add_argument("--page-width", type=float, default=7.0, help="Paper width in inches.")
    parser.add_argument("--page-height", type=float, default=10.0, help="Paper height in inches.")
    parser.add_argument("--margin", type=float, default=0.62, help="Left/right margin in inches.")
    parser.add_argument("--font-directory", type=Path)
    parser.add_argument("--subtitle", default="A dark fantasy novella")
    args = parser.parse_args()
    if not 9.5 <= args.font_size <= 12.5:
        parser.error("Choose a readable paperback font size between 9.5 and 12.5 points.")
    if not args.font_size * 1.12 <= args.leading <= args.font_size * 1.6:
        parser.error("Leading must be between 1.12 and 1.6 times the font size.")
    if not 0.45 <= args.margin <= 0.85:
        parser.error("Side margins must be between 0.45 and 0.85 inches.")
    if not 5.5 <= args.page_width <= 8.5 or not 8 <= args.page_height <= 11.7:
        parser.error("Choose a standard readable book or document page size.")
    print(json.dumps(build(args), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
