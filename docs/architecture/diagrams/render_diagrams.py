"""Render the architecture diagram sources to PNG.

The SVG is the controlled artefact and the PNG is a build product, which is what #36 requires. Run this
after changing any diagram source, and commit both files in the same pull request.

    python render_diagrams.py
"""
import glob
import os
import sys

import pymupdf

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HERE = os.path.dirname(os.path.abspath(__file__))
DPI = 200

for svg in sorted(glob.glob(os.path.join(HERE, "*.svg"))):
    png = svg[:-4] + ".png"
    doc = pymupdf.open(svg)
    pdf = pymupdf.open("pdf", doc.convert_to_pdf())
    pix = pdf[0].get_pixmap(dpi=DPI)
    pix.save(png)
    print(f"{os.path.basename(svg)} -> {os.path.basename(png)} ({pix.width}x{pix.height} px, {os.path.getsize(png) // 1024} KB)")
