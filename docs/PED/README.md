# PED

The Project Engineering Document. From v2.0 its source is markdown, and the Word document is
generated from it (#55).

## What is here

| File | What it is | Edit it? |
|---|---|---|
| `CivicConnect_PED.md` | The source of the PED from v2.0 onwards | Yes, through a pull request |
| `CivicConnect_PED_v1.0.docx` | PED v1.0 as submitted at the M1 gate. It is the M1 record and the style source for the build | Never |
| `CivicConnect_PED_v<version>.docx` | Generated from the markdown when a version is issued | Never by hand. Rebuild it |
| `fig1_fec_map.png`, `fig2_status_model.png` | The two figures as rendered for v1.0. Their sources are not yet held (#36) | Only by replacing it with a regenerated figure |
| `tools/` | The build, and the one-off conversion from v1.0 with its check | Through a pull request |

## Changing the PED

- Edit `CivicConnect_PED.md`. It is GitHub-flavoured markdown, so the pull request shows the change
  line by line.
- M1 content is not silently rewritten. The M2 brief requires that the assessor can tell what M1
  established from what later milestones added, so a change to baselined content goes through change
  control (Master Project Brief s14) and is recorded in the version history in s1.
- Do not change the Word document in an ordinary pull request. It is regenerated when a version is
  issued, in a pull request of its own, so that two open pull requests never change the same binary
  file. Two pull requests changing one binary are what forced #40, #42 and #44 to be rebuilt as #46.

## Writing conventions the build relies on

- Headings carry their number as text, as in `## 8.5 Title`. Use `#` for a top-level section and
  `##` and `###` below it. A new top-level section starts on a new page.
- Tables are pipe tables with a header row. A table whose header row matches a v1.0 table takes that
  table's formatting. Any other table takes the formatting of the widest v1.0 table.
- A callout box is a blockquote whose first paragraph is entirely bold. That paragraph becomes its
  title, and the next entirely bold paragraph starts a new box:

  ```markdown
  > **Title of the box**
  >
  > Body text of the box.
  ```

- A figure is an image line followed by its caption paragraph. Keep the PNG in this folder, with its
  source beside it (#36). A figure that belongs to another record, such as the architecture views in
  `docs/architecture/diagrams/`, is referenced where it lives, with its source beside it there, so
  that there is only one copy to correct:

  ```markdown
  ![Figure 3. Caption text.](fig3_name.png)

  **Figure 3.** Caption text.
  ```

- A new top-level section that needs landscape pages, for a wide table, is added to `NEW_SECTIONS`
  in `tools/build_ped.py`. Sections that exist in v1.0 keep v1.0's orientation.
- Numbered items and lists are written as paragraphs, as v1.0 does: a numbered item starts with a bold
  number such as `**1.**`, a list item starts with a bold lead phrase, and each is separated from the
  next by a blank line. The build gives a numbered paragraph v1.0's hanging indent. Markdown list
  syntax would lose its numbering in the Word document.
- A section still to be written by its owner is a bracketed placeholder naming its issue, such as
  `[To be completed under #58: ...]`, following the square-bracket convention in s2.
- No raw HTML. GitHub renders it, and the build does not carry it into Word.

## Building the Word document

It needs Python 3.10 or later, lxml (`pip install lxml`) and Pandoc. The build was written against
Pandoc 3.11 and lxml 6.1.

```bash
python docs/PED/tools/build_ped.py
```

It writes `CivicConnect_PED_v<version>.docx`, taking the version from the cover line
"Project Engineering Document (PED) v<version>". The header and footer follow that version, the
subtitle beneath it and the milestone in the cover table.

- If Pandoc is not on the PATH, set `PANDOC` to its location.
- `--out PATH` writes somewhere else, for checking a build without replacing the committed one.
- The build refuses to overwrite the v1.0 document.
- The build stops without writing if a section heading it sets the page orientation for is missing,
  for example after a heading is renamed.

The formatting comes from the v1.0 document. Anything whose text matches v1.0 is reused from it, and
anything new takes v1.0's formatting for that kind of element, so additions look like the rest. The
docstring at the top of `tools/build_ped.py` sets out each rule.

Open the result in Word before issuing it, and check the page orientation and any table that crosses
a page.

## The conversion from v1.0

`tools/ped_to_md.py` converted v1.0 once. `tools/ped_fidelity.py` checks a markdown file against a
Word document by converting the markdown back to Word and comparing the two paragraph by paragraph
and cell by cell. At conversion it reported 1504 blocks each, no differences, and an identical
sequence of 18,169 words.

The build was checked the same way. Built from the unchanged markdown, it gave the same text, the
same 12 sections, and 48 content pages matching v1.0 in orientation and rendered content. It leaves
out the five blank pages v1.0 contained, where a page break sat directly before a section break.

Both checks stop being meaningful once v2.0 content is added. They are kept as the record of how the
conversion was verified.
