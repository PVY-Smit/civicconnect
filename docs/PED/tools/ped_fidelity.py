"""Check the markdown PED's text against PED v1.0.

Both documents are reduced to their text in reading order, paragraph by paragraph and table cell by
table cell, with whitespace normalised. The markdown side goes through Pandoc to Word first, so the
check covers the path the submitted document will take.

    python ped_fidelity.py CivicConnect_PED_v1.0.docx CivicConnect_PED.md            # whole document
    python ped_fidelity.py CivicConnect_PED_v1.0.docx CivicConnect_PED.md --m1-only  # s1 to s17 only

The whole-document check is the conversion check: it passed at 3b2def7, where the markdown reproduced
v1.0 exactly, and it fails on every later version because sections 18 onwards are new. --m1-only
compares the M1 sections alone, so the differences it prints are the M1 changes a version makes; each
must be one listed in that version's row of s1. The script exits 1 whenever there is a difference, so
it can gate a build.
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
args = [a for a in sys.argv[1:] if not a.startswith("--")]
V1, MD = Path(args[0]), Path(args[1])
M1_ONLY = "--m1-only" in sys.argv
FIRST_M2_HEADING = "18. Architecturally Significant Requirements"


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
if M1_ONLY:
    b = b[: b.index(FIRST_M2_HEADING)] if FIRST_M2_HEADING in b else b

diff = [l for l in difflib.unified_diff(a, b, "v1.0", "markdown", lineterm="", n=0)
        if not l.startswith(("---", "+++", "@@"))]
print(f"v1.0 blocks: {len(a)} | markdown blocks: {len(b)} | differing lines: {len(diff)}")
for l in diff[: None if M1_ONLY else 40]:
    print("  " + (l[:180] + "..." if len(l) > 180 else l))
words = lambda xs: re.findall(r"\w+", " ".join(xs))
same = words(a) == words(b)
print("word sequences identical:", same, f"({len(words(a))} vs {len(words(b))} words)")
sys.exit(0 if not diff and same else 1)
