"""Build a reflowable EPUB 3 from the manuscript used for the reading PDF."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import html
import json
import re
import uuid
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "manuscript.md"
OUTPUT = ROOT / "output/epub/the_house_that_kept_the_night.epub"


def inline(text):
    text = html.escape(text, quote=False)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    return re.sub(r"\*([^*]+)\*", r"<em>\1</em>", text)


def page(title, body):
    return ('<?xml version="1.0" encoding="utf-8"?>\n'
            '<html xmlns="http://www.w3.org/1999/xhtml" '
            'xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en">'
            f'<head><title>{html.escape(title)}</title>'
            '<link rel="stylesheet" type="text/css" href="style.css"/></head>'
            f'<body>{body}</body></html>')


def build():
    raw = SOURCE.read_bytes()
    source = raw.decode("utf-8-sig").replace("\r\n", "\n")
    digest = hashlib.sha256(raw).hexdigest()
    # The EPUB and delivered PDF must represent the same final manuscript.
    pdf_qa = json.loads((ROOT / "output/pdf/five_years_of_night.qa.json").read_text(encoding="utf-8-sig"))
    assert digest == pdf_qa["manuscript_sha256"], "Manuscript differs from the delivered PDF source"
    title = re.search(r"^# (.+)$", source, re.M).group(1)
    sections = re.split(r"^## (.+)\n", source, flags=re.M)
    chapters = list(zip(sections[1::2], sections[2::2]))
    assert len(chapters) == 12
    files = {}
    files["EPUB/title.xhtml"] = page(title, f'<section epub:type="titlepage"><h1>{inline(title)}</h1><p>A dark fantasy novella</p></section>')
    for index, (heading, content) in enumerate(chapters, 1):
        paragraphs = []
        for block in re.split(r"\n\s*\n", content.strip()):
            block = " ".join(block.splitlines())
            if re.fullmatch(r"(?:\*\s*){3,}|-{3,}", block):
                paragraphs.append('<hr class="scene"/>')
            else:
                paragraphs.append(f'<p>{inline(block)}</p>')
        files[f"EPUB/chapter-{index:02}.xhtml"] = page(heading, f'<section epub:type="chapter"><h1>{inline(heading)}</h1>'+"\n".join(paragraphs)+"</section>")
    links = ''.join(f'<li><a href="chapter-{i:02}.xhtml">{inline(h)}</a></li>' for i, (h, _) in enumerate(chapters, 1))
    files["EPUB/nav.xhtml"] = page("Contents", '<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>'+links+'</ol></nav>')
    identifier = "urn:uuid:" + str(uuid.uuid5(uuid.NAMESPACE_URL, "aetherra:novella:"+digest))
    points = ''.join(f'<navPoint id="chapter-{i}" playOrder="{i}"><navLabel><text>{html.escape(h)}</text></navLabel><content src="chapter-{i:02}.xhtml"/></navPoint>' for i, (h, _) in enumerate(chapters, 1))
    files["EPUB/toc.ncx"] = ('<?xml version="1.0" encoding="utf-8"?>'
        '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">'
        f'<head><meta name="dtb:uid" content="{identifier}"/></head><docTitle><text>{html.escape(title)}</text></docTitle>'
        f'<navMap>{points}</navMap></ncx>')
    items = ''.join(f'<item id="c{i}" href="chapter-{i:02}.xhtml" media-type="application/xhtml+xml"/>' for i in range(1, len(chapters)+1))
    spine = ''.join(f'<itemref idref="c{i}"/>' for i in range(1, len(chapters)+1))
    modified = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    files["EPUB/package.opf"] = ('<?xml version="1.0" encoding="utf-8"?>'
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">'
        '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">'
        f'<dc:identifier id="book-id">{identifier}</dc:identifier><dc:title>{html.escape(title)}</dc:title><dc:language>en</dc:language>'
        f'<meta property="dcterms:modified">{modified}</meta></metadata><manifest>'
        '<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>'
        '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>'
        '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>'
        '<item id="style" href="style.css" media-type="text/css"/>'
        f'{items}</manifest><spine toc="ncx"><itemref idref="title"/><itemref idref="nav"/>{spine}</spine></package>')
    files["EPUB/style.css"] = ('body{font-family:serif;line-height:1.45;margin:0 5%;}'
        'h1{font-size:1.65em;line-height:1.2;margin:1.5em 0 1em;break-after:avoid;}'
        'p{margin:0;text-indent:1.2em;orphans:2;widows:2;}h1+p{margin-bottom:1.3em;text-indent:0;}'
        'h1+p+p{text-indent:0;}nav li{margin:.7em 0;}a{color:inherit;}'
        '.scene{border:0;text-align:center;margin:1.5em 0;}')
    files["META-INF/container.xml"] = ('<?xml version="1.0" encoding="utf-8"?>'
        '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles>'
        '<rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
    for name, content in files.items():
        if name.endswith((".xhtml", ".xml", ".opf", ".ncx")):
            ET.fromstring(content)
    # Check every chapter's readable text against the source, in exact order.
    for i, (heading, content) in enumerate(chapters, 1):
        document = ET.fromstring(files[f"EPUB/chapter-{i:02}.xhtml"])
        section = document.find(".//{http://www.w3.org/1999/xhtml}section")
        actual = " ".join(section.itertext())
        tokens = lambda s: re.findall(r"\w+(?:['’]\w+)*", s)
        assert tokens(actual) == tokens(heading+" "+content), f"Text mismatch in chapter {i}"
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        for name, content in files.items():
            archive.writestr(name, content.encode("utf-8"))
    with zipfile.ZipFile(OUTPUT) as archive:
        assert archive.namelist()[0] == "mimetype"
        assert archive.getinfo("mimetype").compress_type == zipfile.ZIP_STORED
        assert archive.testzip() is None
        package = ET.fromstring(archive.read("EPUB/package.opf"))
        ns = {"opf": "http://www.idpf.org/2007/opf"}
        manifest = {item.attrib["id"]: item.attrib["href"] for item in package.findall("opf:manifest/opf:item", ns)}
        for href in manifest.values():
            assert "EPUB/"+href in archive.namelist()
        for item in package.findall("opf:spine/opf:itemref", ns):
            assert item.attrib["idref"] in manifest
    print(json.dumps({"output": str(OUTPUT), "chapters": len(chapters), "source_matches_pdf": True, "chapter_text_verified": True, "zip_xml_spine_verified": True, "bytes": OUTPUT.stat().st_size}, indent=2))


if __name__ == "__main__":
    build()
