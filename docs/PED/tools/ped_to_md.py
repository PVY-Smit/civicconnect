"""Convert PED v1.0 (docx) to GitHub-flavoured markdown without changing its content.

Pandoc does the body and the tables. This script then restores what Pandoc cannot infer:
- headings, matched against the Heading 1/2/3 paragraphs listed in the docx itself;
- the six one-cell callout tables, which become blockquotes;
- the two figures, which point at the PNGs already held beside the document;
- the rule under each top-level heading, which is a paragraph border in v1.0 and not content.
"""
import hashlib
import html
import os
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

PANDOC = os.environ.get("PANDOC") or shutil.which("pandoc") or "pandoc"
DOCX = Path(sys.argv[1])
OUT = Path(sys.argv[2])
PED_DIR = DOCX.parent

raw = subprocess.run([PANDOC, "-f", "docx", "-t", "gfm", "--wrap=none", str(DOCX)],
                     capture_output=True, text=True, encoding="utf-8", check=True).stdout

z = zipfile.ZipFile(DOCX)
doc = z.read("word/document.xml").decode("utf-8")
styles = z.read("word/styles.xml").decode("utf-8")
names = dict(re.findall(r'<w:style [^>]*w:styleId="([^"]+)"[^>]*>\s*<w:name w:val="([^"]+)"', styles))
text_of = lambda x: html.unescape("".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", x)))
ws = lambda s: re.sub(r"\s+", " ", s).strip()

# ---- headings, from the document's own heading styles ----
headings = []
for p in re.findall(r"<w:p[ >].*?</w:p>", doc, re.S):
    s = re.search(r'<w:pStyle w:val="([^"]+)"', p)
    m = re.match(r"Heading (\d)", names.get(s.group(1), "")) if s else None
    if m:
        headings.append((int(m.group(1)), ws(text_of(p))))

lines = raw.split("\n")
found = 0
for level, text in headings:
    target = f"**{text}**"
    hits = [i for i, l in enumerate(lines) if ws(l.replace("\\|", "|")) == target]
    if len(hits) != 1:
        raise SystemExit(f"heading not found exactly once ({len(hits)}): {text}")
    lines[hits[0]] = "#" * level + " " + text
    found += 1

# v1.0 draws a rule under each top-level heading with a paragraph border, which Pandoc emits as a
# thematic break. GitHub already rules those headings, and the build restores the border.
for i, line in enumerate(lines):
    if line.startswith("# "):
        j = i + 1
        while j < len(lines) and not lines[j].strip():
            j += 1
        if j < len(lines) and re.fullmatch(r"-{3,}", lines[j].strip()):
            lines[j] = ""
md = "\n".join(lines)

# ---- callouts: one-cell HTML tables become blockquotes ----
def inline(h):
    h = re.sub(r"</?strong>", "**", h)
    h = re.sub(r"</?em>", "*", h)
    h = re.sub(r"<[^>]+>", "", h)
    return html.unescape(h).strip()


def callout(m):
    paras = [inline(p) for p in re.findall(r"<p>(.*?)</p>", m.group(0), re.S)]
    return "\n>\n".join("> " + p for p in paras if p)


md, n_callouts = re.subn(r"<table[^>]*>.*?</table>", callout, md, flags=re.S)

# ---- figures: point at the PNGs beside the document, alt text from the caption ----
by_hash = {hashlib.sha1(f.read_bytes()).hexdigest(): f.name for f in PED_DIR.glob("fig*.png")}


def figure(m):
    data = z.read("word/" + m.group(1))
    name = by_hash[hashlib.sha1(data).hexdigest()]
    caption = re.search(r"\n\n\*\*(Figure \d+\.)\*\* ([^\n]+)", md[m.end():])
    alt = f"{caption.group(1)} {caption.group(2)}" if caption else name
    return f"![{alt}]({name})"


md, n_figs = re.subn(r'<img src="(media/[^"]+)"[^>]*/>', figure, md)

md = re.sub(r"\n{3,}", "\n\n", md).strip() + "\n"
OUT.write_text(md, encoding="utf-8", newline="\n")
print(f"headings {found}/{len(headings)} | callouts {n_callouts} | figures {n_figs} | lines {md.count(chr(10))}")
