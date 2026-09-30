"""Check that the markdown PED carries exactly the text of PED v1.0.

Both documents are reduced to their text in reading order, paragraph by paragraph and table cell by
table cell, with whitespace normalised. The markdown side goes through Pandoc to Word first, so the
check covers the path the submitted document will take.
"""
import difflib
import html
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

PANDOC = os.environ.get("PANDOC") or shutil.which("pandoc") or "pandoc"
V1 = Path(sys.argv[1])
MD = Path(sys.argv[2])


def blocks(docx_path):
    doc = zipfile.ZipFile(docx_path).read("word/document.xml").decode("utf-8")
    body = doc[doc.index("<w:body>"):]
    out = []
    for p in re.findall(r"<w:p[ >].*?</w:p>", body, re.S):
        t = html.unescape("".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p)))
        t = re.sub(r"\s+", " ", t).strip()
        if t:
            out.append(t)
    return out


with tempfile.TemporaryDirectory() as tmp:
    rebuilt = Path(tmp) / "rebuilt.docx"
    subprocess.run([PANDOC, "-f", "gfm", "-t", "docx", str(MD), "-o", str(rebuilt),
                    f"--resource-path={MD.parent}"], check=True)
    a, b = blocks(V1), blocks(rebuilt)

diff = [l for l in difflib.unified_diff(a, b, "v1.0", "markdown", lineterm="", n=0)
        if not l.startswith(("---", "+++", "@@"))]
print(f"v1.0 blocks: {len(a)} | markdown blocks: {len(b)} | differing lines: {len(diff)}")
for l in diff[:40]:
    print("  " + (l[:180] + "..." if len(l) > 180 else l))
words = lambda xs: re.findall(r"\w+", " ".join(xs))
print("word sequences identical:", words(a) == words(b), f"({len(words(a))} vs {len(words(b))} words)")
