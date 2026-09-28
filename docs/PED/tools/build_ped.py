"""Build the PED Word document from its markdown source, in the house style of PED v1.0.

    python docs/PED/tools/build_ped.py [--out PATH]

Reads docs/PED/CivicConnect_PED.md and writes docs/PED/CivicConnect_PED_v<version>.docx, where the
version is taken from the cover line "Project Engineering Document (PED) v<version>".

Pandoc converts the markdown. Formatting then comes from CivicConnect_PED_v1.0.docx, the M1
artefact, which is read and never written:

- an element whose text is identical to an element of v1.0 is replaced by v1.0's element, after the
  text is checked, unless v1.0's element carries a relationship such as a hyperlink or image, in which
  case only its formatting is copied. A bare URL that GitHub renders as a link therefore stays plain
  text where v1.0 had it as plain text;
- an element that is new or changed takes v1.0's formatting for that kind of element: a table takes
  the formatting of the v1.0 table with the same header row, or of v1.0's widest table, and a table
  with no v1.0 column layout is sized to the text width of the page it lands on;
- section breaks, orientation and page breaks follow v1.0 at headings with the same text, plus the
  headings listed in NEW_SECTIONS. A page break directly before a section break is dropped, since
  the section already starts a new page. In v1.0 those produced five blank pages;
- empty spacer paragraphs follow the elements v1.0 placed them after, and a new table always gets
  one, since two adjacent tables join into one in Word;
- page size, margins per orientation and document settings are v1.0's;
- header and footer text follow the version, subtitle and milestone stated on the cover.

Requires Pandoc (set PANDOC if it is not on the PATH) and lxml.
"""
import argparse
import collections
import copy
import hashlib
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

from lxml import etree

PED = Path(__file__).resolve().parent.parent
SRC = PED / "CivicConnect_PED.md"
TEMPLATE = PED / "CivicConnect_PED_v1.0.docx"
PANDOC = os.environ.get("PANDOC") or shutil.which("pandoc") or "pandoc"

# Headings added after v1.0 that should start a new section: heading text -> "L" or "P".
NEW_SECTIONS = {}

NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "pr": "http://schemas.openxmlformats.org/package/2006/relationships",
}
R_ATTRS = (f"{{{NS['r']}}}id", f"{{{NS['r']}}}embed")


def q(tag):
    prefix, name = tag.split(":")
    return f"{{{NS[prefix]}}}{name}"


def norm(s):
    return re.sub(r"\s+", " ", s).strip()


def text(el):
    return norm("".join(t.text or "" for t in el.iter(q("w:t"))))


def style(p):
    s = p.find("w:pPr/w:pStyle", NS)
    return s.get(q("w:val")) if s is not None else ""


def heading_level(p, names):
    m = re.match(r"heading\s*(\d)$", names.get(style(p), style(p)).lower())
    return int(m.group(1)) if m else 0


def has_rel(el):
    return any(a in R_ATTRS for n in el.iter() for a in n.attrib)


def rows(tbl):
    return tbl.findall("w:tr", NS)


def cells(tr):
    return tr.findall("w:tc", NS)


def table_key(tbl):
    first = rows(tbl)[0]
    return " | ".join(text(c) for c in cells(first))


def table_texts(tbl):
    return [[text(c) for c in cells(tr)] for tr in rows(tbl)]


def is_callout(tbl):
    return len(rows(tbl)) == 1 and len(cells(rows(tbl)[0])) == 1


def para_key(paras):
    return norm(" ".join(text(p) for p in paras if text(p)))


def all_bold(p):
    runs = [r for r in p.iter(f"{{{NS['w']}}}r") if text(r)]
    return bool(runs) and all(r.find("w:rPr/w:b", NS) is not None for r in runs)


def set_child(parent, child, first=False):
    old = parent.find(child.tag)
    if old is not None:
        parent.replace(old, child)
    elif first:
        parent.insert(0, child)
    else:
        parent.append(child)


def fresh(info):
    """A new zip entry record. writestr() updates the record it is given, so reusing a record read
    from an open archive corrupts that archive's index."""
    new = zipfile.ZipInfo(info.filename, date_time=info.date_time)
    new.compress_type = info.compress_type
    new.external_attr = info.external_attr
    return new


# ---------------------------------------------------------------- cover facts
md = SRC.read_text(encoding="utf-8")
version = re.search(r"Project Engineering Document \(PED\) v(\d+\.\d+)", md).group(1)
subtitle = re.search(r"Project Engineering Document \(PED\) v[\d.]+\s*\n\s*\n\*([^*\n]+)\*", md).group(1).strip()
milestone = re.search(r"\|\s*\*\*Milestone\*\*\s*\|\s*Milestone (\d+)", md).group(1)

ap = argparse.ArgumentParser()
ap.add_argument("--out", type=Path, default=PED / f"CivicConnect_PED_v{version}.docx")
args = ap.parse_args()
if args.out.resolve() == TEMPLATE.resolve():
    raise SystemExit("refusing to overwrite the v1.0 artefact; pass --out to write elsewhere")

# ---------------------------------------------------------------- template analysis
tz = zipfile.ZipFile(TEMPLATE)
tdoc = etree.fromstring(tz.read("word/document.xml"))
tbody = tdoc.find("w:body", NS)
tstyles = tz.read("word/styles.xml").decode("utf-8")
style_names = dict(re.findall(r'<w:style [^>]*w:styleId="([^"]+)"[^>]*>\s*<w:name w:val="([^"]+)"', tstyles))
tkids = list(tbody)
t_final_sect = tkids[-1]
assert t_final_sect.tag == q("w:sectPr")

t_para, t_heading, t_level = {}, {}, {}
t_tables, t_callouts, t_break_ids = {}, {}, set()
t_cover = []
seen_table = False
pending_break = None
sections = []  # (heading text that starts the section, None for the first; orientation)
current_start, awaiting_start = None, False
for el in tkids[:-1]:
    if el.tag == q("w:tbl"):
        seen_table = True
        if pending_break is not None:
            t_break_ids.add(id(el))
            pending_break = None
        if is_callout(el):
            t_callouts.setdefault(para_key(el.iter(q("w:p"))), el)
        else:
            t_tables.setdefault(table_key(el), []).append(el)
        continue
    t = text(el)
    lvl = heading_level(el, style_names)
    if not t and el.find("w:pPr/w:pageBreakBefore", NS) is not None:
        pending_break = el
    if t and not seen_table:
        t_cover.append(el)
    if lvl:
        t_heading.setdefault(t, el)
        t_level.setdefault(lvl, el)
        if awaiting_start:
            current_start, awaiting_start = t, False
    elif t:
        t_para.setdefault(t, el)
    if t and pending_break is not None:
        t_break_ids.add(id(el))
        pending_break = None
    sp = el.find("w:pPr/w:sectPr", NS)
    if sp is not None:
        sections.append((current_start, "L" if sp.find("w:pgSz", NS).get(q("w:orient")) == "landscape" else "P"))
        current_start, awaiting_start = None, True
sections.append((current_start, "L" if t_final_sect.find("w:pgSz", NS).get(q("w:orient")) == "landscape" else "P"))
section_plan = sections

# v1.0 uses tighter margins on landscape pages than on portrait ones, so each orientation keeps its own.
t_page_setup = {}
for sp in tbody.iter(q("w:sectPr")):
    o = "L" if sp.find("w:pgSz", NS).get(q("w:orient")) == "landscape" else "P"
    t_page_setup.setdefault(o, (sp.find("w:pgSz", NS), sp.find("w:pgMar", NS)))

for t in list(t_callouts):
    for p in t_callouts[t].iter(q("w:p")):
        if text(p):
            t_para.setdefault(text(p), p)

long_paras = [p for p in t_para.values() if len(text(p)) > 120 and p.getparent() is tbody]
dominant_ppr = collections.Counter(etree.tostring(p.find("w:pPr", NS)) for p in long_paras if p.find("w:pPr", NS) is not None).most_common(1)[0][0]
plain_runs = [r for p in long_paras for r in p.findall("w:r", NS) if r.find("w:rPr/w:b", NS) is None and r.find("w:rPr", NS) is not None]
dominant_rpr = collections.Counter(etree.tostring(r.find("w:rPr", NS)) for r in plain_runs).most_common(1)[0][0]
numbered_ppr = next((etree.tostring(p.find("w:pPr", NS)) for p in tkids if p.tag == q("w:p")
                     and re.match(r"\d+\.\s", text(p)) and p.find("w:pPr/w:ind", NS) is not None), None)
widest_table = max((t for ts in t_tables.values() for t in ts), key=lambda t: len(cells(rows(t)[0])))
first_callout = next(iter(t_callouts.values()))


def is_spacer(e):
    return (e.tag == q("w:p") and not text(e) and e.find(".//w:drawing", NS) is None
            and e.find("w:pPr/w:pageBreakBefore", NS) is None and e.find("w:pPr/w:sectPr", NS) is None)


# Empty paragraphs v1.0 places after an element to space it from the next one. Markdown cannot hold
# them, so they are re-emitted wherever that element is reused. Two tables with nothing between them
# would otherwise join into one.
t_spacers_after = {}
for k, e in enumerate(tkids[:-1]):
    if is_spacer(e):
        continue
    trailing = []
    for f in tkids[k + 1:-1]:
        if not is_spacer(f):
            break
        trailing.append(f)
    if trailing:
        t_spacers_after[id(e)] = trailing
standard_spacer = collections.Counter(
    etree.tostring(s) for run in t_spacers_after.values() for s in run).most_common(1)[0][0]

t_rels = etree.fromstring(tz.read("word/_rels/document.xml.rels"))
t_media_hash = {}
for rel in t_rels.findall("pr:Relationship", NS):
    if rel.get("Target").startswith("media/"):
        t_media_hash[rel.get("Id")] = hashlib.sha1(tz.read("word/" + rel.get("Target"))).hexdigest()
t_image_para = {}
for p in tbody.iter(q("w:p")):
    blip = p.find(".//a:blip", NS)
    if blip is not None:
        t_image_para[t_media_hash[blip.get(q("r:embed"))]] = p


# ---------------------------------------------------------------- formatting transplant
def page_break():
    brk = etree.Element(q("w:p"))
    etree.SubElement(etree.SubElement(brk, q("w:pPr")), q("w:pageBreakBefore"))
    return brk


def emit(out, el, source=None, table=False):
    """Append el, with the page break v1.0 placed before its source and the spacers after it.

    source is the v1.0 element this one reproduces, or None when it is new. A new table still gets
    v1.0's usual spacer after it, so that it cannot join the next table.
    """
    if source is not None and id(source) in t_break_ids:
        out.append(page_break())
    out.append(el)
    if source is not None:
        out.extend(copy.deepcopy(s) for s in t_spacers_after.get(id(source), []))
    elif table:
        out.append(etree.fromstring(standard_spacer))


def transplant_runs(p, source_p, inherit_bold=False):
    """Give p's runs the run formatting of source_p. Bold and italic come from the markdown, except
    that with inherit_bold a run is also bold where v1.0's is: headings, table header rows and the
    cover are bold in v1.0 without being written in bold in the markdown."""
    src_runs = [r for r in source_p.iter(q("w:r")) if r.find("w:rPr", NS) is not None]
    base = next((r for r in src_runs if r.find("w:rPr/w:b", NS) is None), src_runs[0] if src_runs else None)
    bold = next((r for r in src_runs if r.find("w:rPr/w:b", NS) is not None), None)
    for r in p.iter(q("w:r")):
        old = r.find("w:rPr", NS)
        is_b = old is not None and old.find("w:b", NS) is not None
        is_i = old is not None and old.find("w:i", NS) is not None
        rstyle = old.find("w:rStyle", NS) if old is not None else None
        src = bold if (is_b and bold is not None) else base
        new = copy.deepcopy(src.find("w:rPr", NS)) if src is not None else etree.fromstring(dominant_rpr)
        is_b = is_b or (inherit_bold and new.find("w:b", NS) is not None)
        for tag in ("w:b", "w:bCs", "w:i", "w:iCs"):
            el = new.find(tag, NS)
            if el is not None:
                new.remove(el)
        if is_b:
            new.insert(0, etree.Element(q("w:bCs")))
            new.insert(0, etree.Element(q("w:b")))
        if is_i:
            new.append(etree.Element(q("w:i")))
        if rstyle is not None:
            new.insert(0, copy.deepcopy(rstyle))
        if old is not None:
            r.replace(old, new)
        else:
            r.insert(0, new)


def transplant_para(p, source_p, inherit_bold=False):
    src = source_p.find("w:pPr", NS)
    new = copy.deepcopy(src) if src is not None else etree.Element(q("w:pPr"))
    for sp in new.findall("w:sectPr", NS):
        new.remove(sp)
    old = p.find("w:pPr", NS)
    if old is not None:
        p.replace(old, new)
    else:
        p.insert(0, new)
    transplant_runs(p, source_p, inherit_bold)


def plain_para(p):
    # v1.0 numbers items as paragraphs starting with a bold "1." and a hanging indent, never as Word
    # lists, so a new numbered paragraph takes that format.
    numbered = re.match(r"\d+\.\s", text(p)) and numbered_ppr is not None
    new = etree.fromstring(numbered_ppr if numbered else dominant_ppr)
    old = p.find("w:pPr", NS)
    p.replace(old, new) if old is not None else p.insert(0, new)
    fake = etree.Element(q("w:p"))
    r = etree.SubElement(fake, q("w:r"))
    r.append(etree.fromstring(dominant_rpr))
    transplant_runs(p, fake)


to_fit = {}


def fit_table(tbl, weights, width):
    """Share the page's text width between the columns, in proportion to their content."""
    cols = [int(width * w_ / sum(weights)) for w_ in weights]
    tblw = tbl.find("w:tblPr/w:tblW", NS)
    tblw.set(q("w:w"), str(sum(cols)))
    tblw.set(q("w:type"), "dxa")
    for g, c in zip(tbl.find("w:tblGrid", NS), cols):
        g.set(q("w:w"), str(c))
    for tr in rows(tbl):
        for tc, c in zip(cells(tr), cols):
            tcw = tc.find("w:tcPr/w:tcW", NS)
            if tcw is not None:
                tcw.set(q("w:w"), str(c))
                tcw.set(q("w:type"), "dxa")


def text_width(orient):
    size, margins = t_page_setup[orient]
    return int(size.get(q("w:w"))) - int(margins.get(q("w:left"))) - int(margins.get(q("w:right")))


def transplant_table(tbl, src, fit=False):
    set_child(tbl, copy.deepcopy(src.find("w:tblPr", NS)), first=True)
    ncols = len(cells(rows(tbl)[0]))
    s_rows = rows(src)
    if not fit and len(cells(s_rows[0])) == ncols:
        set_child(tbl, copy.deepcopy(src.find("w:tblGrid", NS)))
    else:
        # Sized later to the text width of the page it lands on, which is known once sections are placed.
        lens = [max(len(text(c)) for c in col) for col in zip(*[cells(tr) for tr in rows(tbl)])]
        to_fit[tbl] = [max(6.0, n) ** 0.5 for n in lens]
        grid = etree.Element(q("w:tblGrid"))
        for _ in lens:
            etree.SubElement(grid, q("w:gridCol")).set(q("w:w"), "1000")
        set_child(tbl, grid)
    widths = [g.get(q("w:w")) for g in tbl.find("w:tblGrid", NS)]
    for i, tr in enumerate(rows(tbl)):
        s_tr = s_rows[0] if i == 0 else s_rows[min(i, len(s_rows) - 1)] if len(s_rows) > 1 else s_rows[0]
        if s_tr.find("w:trPr", NS) is not None:
            set_child(tr, copy.deepcopy(s_tr.find("w:trPr", NS)), first=True)
        s_cells = cells(s_tr)
        for j, tc in enumerate(cells(tr)):
            s_tc = s_cells[min(j, len(s_cells) - 1)]
            tcpr = copy.deepcopy(s_tc.find("w:tcPr", NS))
            tcw = tcpr.find("w:tcW", NS)
            if tcw is not None:
                tcw.set(q("w:w"), widths[j])
                tcw.set(q("w:type"), "dxa")
            set_child(tc, tcpr, first=True)
            s_p = s_tc.find("w:p", NS)
            for p in tc.findall("w:p", NS):
                transplant_para(p, s_p, inherit_bold=(i == 0))


def callout_table(paras):
    tbl = copy.deepcopy(first_callout)
    tc = tbl.find(".//w:tc", NS)
    s_ps = [p for p in tc.findall("w:p", NS)]
    for p in s_ps:
        tc.remove(p)
    for i, p in enumerate(paras):
        transplant_para(p, s_ps[min(i, len(s_ps) - 1)])
        tc.append(p)
    return tbl


# ---------------------------------------------------------------- build
with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
    tmp = Path(tmp)
    ref = tmp / "reference.docx"
    ref_doc = copy.deepcopy(tdoc)
    ref_body = ref_doc.find("w:body", NS)
    for el in list(ref_body)[:-1]:
        ref_body.remove(el)
    ref_body.insert(0, etree.Element(q("w:p")))
    with zipfile.ZipFile(ref, "w", zipfile.ZIP_DEFLATED) as zout:
        for info in tz.infolist():
            data = etree.tostring(ref_doc, xml_declaration=True, encoding="UTF-8", standalone=True) \
                if info.filename == "word/document.xml" else tz.read(info.filename)
            zout.writestr(fresh(info), data)

    raw = tmp / "pandoc.docx"
    subprocess.run([PANDOC, "-f", "gfm", "-t", "docx", "--reference-doc", str(ref),
                    "--resource-path", str(PED), str(SRC), "-o", str(raw)], check=True)

    gz = zipfile.ZipFile(raw)
    gdoc = etree.fromstring(gz.read("word/document.xml"))
    gbody = gdoc.find("w:body", NS)
    gstyles = gz.read("word/styles.xml").decode("utf-8")
    g_names = dict(re.findall(r'<w:style [^>]*w:styleId="([^"]+)"[^>]*>\s*<w:name w:val="([^"]+)"', gstyles))
    g_rels = etree.fromstring(gz.read("word/_rels/document.xml.rels"))
    g_media_hash = {r.get("Id"): hashlib.sha1(gz.read("word/" + r.get("Target"))).hexdigest()
                    for r in g_rels.findall("pr:Relationship", NS) if r.get("Target").startswith("media/")}

    g_sect = list(gbody)[-1]
    out = []
    kids = list(gbody)[:-1]
    stats = collections.Counter()
    cover_i = 0
    seen_table = False
    i = 0
    while i < len(kids):
        el = kids[i]
        if el.tag == q("w:p") and el.find(".//w:pict", NS) is not None and not text(el):
            stats["rule removed"] += 1
            i += 1
            continue
        if el.tag == q("w:p") and style(el) == "BlockText":
            group = [kids[i]]
            i += 1
            while i < len(kids) and kids[i].tag == q("w:p") and style(kids[i]) == "BlockText" and not all_bold(kids[i]):
                group.append(kids[i])
                i += 1
            match = t_callouts.get(para_key(group))
            if match is not None and not has_rel(match):
                emit(out, copy.deepcopy(match), match, table=True)
                stats["callout copied"] += 1
            else:
                emit(out, callout_table(group), match, table=True)
                stats["callout formatted"] += 1
            continue
        i += 1
        if el.tag == q("w:tbl"):
            seen_table = True
            candidates = t_tables.get(table_key(el), [])
            exact = next((c for c in candidates if table_texts(c) == table_texts(el)), None)
            if exact is not None and not has_rel(exact):
                emit(out, copy.deepcopy(exact), exact, table=True)
                stats["table copied"] += 1
            else:
                transplant_table(el, candidates[0] if candidates else widest_table, fit=not candidates)
                emit(out, el, candidates[0] if candidates else None, table=True)
                stats["table formatted" if candidates else "table new"] += 1
            continue
        t = text(el)
        blip = el.find(".//a:blip", NS)
        if blip is not None:
            h = g_media_hash[blip.get(q("r:embed"))]
            s_p = t_image_para.get(h)
            if s_p is not None:
                s_ext = s_p.find(".//wp:extent", NS)
                for ext in list(el.iter(q("wp:extent"))) + list(el.iter(q("a:ext"))):
                    ext.set("cx", s_ext.get("cx"))
                    ext.set("cy", s_ext.get("cy"))
                src_ppr = s_p.find("w:pPr", NS)
                if src_ppr is not None:
                    set_child(el, copy.deepcopy(src_ppr), first=True)
                stats["figure sized"] += 1
            emit(out, el, s_p)
            continue
        lvl = heading_level(el, g_names)
        if lvl:
            if t in t_heading:
                emit(out, copy.deepcopy(t_heading[t]), t_heading[t])
                stats["heading copied"] += 1
            else:
                if lvl == 1 and t not in NEW_SECTIONS:
                    out.append(page_break())
                transplant_para(el, t_level.get(lvl, t_level[max(t_level)]), inherit_bold=True)
                emit(out, el)
                stats["heading formatted"] += 1
            continue
        if not seen_table and t:
            src = t_cover[min(cover_i, len(t_cover) - 1)]
            cover_i += 1
            if text(src) == t:
                emit(out, copy.deepcopy(src), src)
            else:
                transplant_para(el, src, inherit_bold=True)
                emit(out, el, src)
            stats["cover"] += 1
            continue
        if t in t_para:
            if has_rel(t_para[t]):
                transplant_para(el, t_para[t])
                emit(out, el, t_para[t])
                stats["paragraph formatted (link)"] += 1
            else:
                emit(out, copy.deepcopy(t_para[t]), t_para[t])
                stats["paragraph copied"] += 1
        elif t:
            plain_para(el)
            emit(out, el)
            stats["paragraph new"] += 1

    # ---- two tables with nothing between them join into one in Word
    joined = 0
    for k in range(len(out) - 1, 0, -1):
        if out[k].tag == q("w:tbl") and out[k - 1].tag == q("w:tbl"):
            out.insert(k, etree.fromstring(standard_spacer))
            joined += 1
    if joined:
        stats["spacer between adjacent tables"] += joined

    # ---- sections, from v1.0 plus NEW_SECTIONS
    def make_sect(orient):
        sp = copy.deepcopy(g_sect)
        size, margins = t_page_setup[orient]
        sp.replace(sp.find("w:pgSz", NS), copy.deepcopy(size))
        sp.replace(sp.find("w:pgMar", NS), copy.deepcopy(margins))
        return sp

    def is_break(e):
        return e.tag == q("w:p") and not text(e) and e.find("w:pPr/w:pageBreakBefore", NS) is not None

    plan = list(section_plan) + list(NEW_SECTIONS.items())
    heading_pos = {text(e): k for k, e in enumerate(out) if e.tag == q("w:p") and heading_level(e, style_names)}
    missing = [h for h, _ in plan if h is not None and h not in heading_pos]
    start_orient = {heading_pos[h]: o for h, o in plan if h is not None and h in heading_pos}
    current = next(o for h, o in plan if h is None)
    placed = []
    for k, e in enumerate(out):
        if k in start_orient:
            while placed and is_break(placed[-1]):
                placed.pop()
            prev = placed[-1]
            if prev.tag == q("w:p") and prev.find("w:pPr/w:sectPr", NS) is None:
                prev = copy.deepcopy(prev)
                placed[-1] = prev
                pp = prev.find("w:pPr", NS)
                if pp is None:
                    pp = etree.Element(q("w:pPr"))
                    prev.insert(0, pp)
                pp.append(make_sect(current))
            else:
                carrier = etree.Element(q("w:p"))
                etree.SubElement(carrier, q("w:pPr")).append(make_sect(current))
                placed.append(carrier)
            current = start_orient[k]
        if e.tag == q("w:tbl") and e in to_fit:
            fit_table(e, to_fit[e], text_width(current))
            stats["table sized to page"] += 1
        placed.append(e)
    out = placed
    final = make_sect(current)

    for el in list(gbody):
        gbody.remove(el)
    for el in out:
        gbody.append(el)
    gbody.append(final)

    # ---- header and footer text
    t_sub = text(t_cover[3])
    t_ver = re.search(r"v(\d+\.\d+)", text(t_cover[2])).group(1)
    parts = {}
    for name in gz.namelist():
        if re.match(r"word/(header|footer)\d+\.xml$", name):
            x = gz.read(name).decode("utf-8")
            x = x.replace(f"v{t_ver}", f"v{version}").replace(t_sub, subtitle)
            x = re.sub(r"MILESTONE \d+", f"MILESTONE {milestone}", x)
            parts[name] = x.encode("utf-8")
    parts["word/document.xml"] = etree.tostring(gdoc, xml_declaration=True, encoding="UTF-8", standalone=True)
    # Pandoc's settings switch on Word 2013 layout, which breaks lines differently from v1.0.
    parts["word/settings.xml"] = tz.read("word/settings.xml")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.out, "w", zipfile.ZIP_DEFLATED) as zout:
        for info in gz.infolist():
            zout.writestr(fresh(info), parts.get(info.filename, gz.read(info.filename)))
    gz.close()

sects = len(gdoc.findall(".//w:sectPr", NS))
print(f"built {args.out.name}: version {version}, milestone {milestone}, {sects} sections")
print("  " + ", ".join(f"{k} {v}" for k, v in sorted(stats.items())))
if missing:
    print("  section headings not found:", missing)
