---
name: pdf
description: Create print-ready PDF reports, briefs, proposals, catalogues and guides in any language, including Arabic, Hebrew and other right-to-left documents. You write ordinary HTML and CSS; one build command adds fonts, pages and page numbers and prints it, and one call checks it.
license: Proprietary; see the repository-root LICENSE.
---

# PDF

Read `<skills-root>/artifact-taste/SKILL.md`, then `<skills-root>/artifact-taste/pdf.md`, first: decide what this document should be before you write it.

Write one ordinary HTML file, `<project-root>/src/doc.html`, with your CSS in a `<style>` block (a linked `doc.css` next to it also works). There is no kit API to learn: anything Chromium can lay out works (grid, flex, columns, SVG, tables).

```html
<!doctype html>
<html lang="en">  <!-- lang="ar" dir="rtl" for Arabic -->
<head>
<meta charset="utf-8"><title>Document title</title>
<!-- Direction: … -->
<!-- Dials: … -->
<style> /* your CSS */ </style>
</head>
<body> … </body>
</html>
```

Build it (locally with `CHROME_PATH=<chrome.exe>` set, and `NODE_PATH` as usual):

```
node <skills-root>/pdf/build.cjs <project-root>/src/doc.html <project-root>/out/x.pdf --footer "Short title | Fictional"
```

Options: `--footer`, `--header`, `--size A4|Letter`, `--margin 20` (mm, left and right; top and bottom are 24mm), `--digits arabic-indic`, `--lang`.

## What the build adds, so you do not write it

- **Fonts.** Every shipped font in `<skills-root>/fonts/` (see its `README.md`) is available by name in any `font-family`: `Rubik`, `InstrumentSerif` (one weight, never bold it), `IBMPlexSansArabic`, `Cairo`, `Tajawal`, `Amiri`, `NotoNaskhArabic`. Do not write `@font-face` for them.
- **Pages.** `@page` size and margins, and the footer with `Page N of M` (`صفحة N من M` in Arabic; just the footer text on a single page), mirrored for right-to-left. Override anything with your own `@page` rules; your CSS always wins. A tinted or dark `body` background also covers the page margins, and the footer colour follows it.
- **Page size in your CSS.** `var(--content-h)` and `var(--content-w)` are the space inside the margins (249mm by 170mm on A4 at the defaults), `var(--page-h)` and `var(--page-w)` the whole sheet. A block meant to fill one page: `min-height: var(--content-h)`.
- **Direction.** `dir` from `lang`. Arabic letters are always set in a shipped Arabic face even if your `font-family` names only Latin faces, and letter-spacing is removed from Arabic (it breaks the joins).
- **Icons.** `<i data-icon="calendar"></i>` becomes a line icon in the current text colour (names in `<skills-root>/icons/README.md`). Use one only where it names the thing beside it.
- **Measurements.** It prints a `fit:` line (each section between forced page breaks, its height against the page) and WARN lines for content wider than the page, clipped content, text under 8.5pt, small text under 4.5:1 contrast, and sections that run past a page, have a long empty stretch, or hold a hollow box. Fix the first four; the last three are questions to answer by looking at the page.

Print techniques for your CSS (page breaks, full-bleed pages, charts) are in `artifact-taste/pdf.md`.

## Check and look (every time)

```
python <skills-root>/pdf/check.py <project-root>/out/x.pdf --pages 2 --expect "Page 2 of 2" "key figure" [--text]
python <skills-root>/artifact-taste/preview.py <project-root>/out/x.pdf
```
`check.py` opens the PDF strictly, counts pages, shows how far down each page is used, lists fonts and title, confirms the expected strings and exits 1 on failure. For Arabic it also confirms selectable letters in logical order and that all Arabic used a shipped font: pass Arabic phrases and the footer to `--expect`, e.g. `"صفحة 2 من 2"`. Then open the preview pages, fix what is wrong, rebuild.

## Rules

- Use only supplied facts and dates; label derived figures as derived and fictional scenarios as fictional. Do not invent sources.
- No clipped or overlapping text, no remote files; images are local files.
- Right-to-left: write text in logical order, never reversed or pre-shaped. Wrap a Latin phrase, email, code or number range inside Arabic in `<bdi dir="ltr">`. Flex and grid mirror by themselves; in a chart you draw, the first item sits at the right.
- Eight or more pages: add a contents or overview page.
- Continuation: edit `doc.html` and rebuild the same path. A document made earlier with a generator program: write its content into a new `doc.html`, keeping its look.
