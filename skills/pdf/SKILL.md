---
name: pdf
description: Create print-ready PDF reports, briefs, proposals, catalogues and guides in any language, including Arabic, Hebrew and other right-to-left documents, with one HTML kit that handles the mechanics while you own the composition, and check them in one call.
license: Proprietary; see the repository-root LICENSE.
---

# PDF

Read `<skills-root>/artifact-taste/SKILL.md` first: decide what this document should be before you open the kit.

Write a short Node generator under `<project-root>/src` and write the file to `<project-root>/out/<name>.pdf`. One route for every script: the HTML kit `html.cjs`. Chromium prints it and joins and orders Arabic and other complex scripts itself. The kit does the mechanics (fonts, direction, page numbers, page breaks, fitting) and offers content blocks; the page composition is yours, and plain HTML and CSS are always available.

```js
// node src/gen.cjs   (NODE_PATH as usual; locally also CHROME_PATH=<chrome.exe>)
// Direction: <the subject material you are using, the structure you chose, and why>
const { Doc } = require('<skills-root>/pdf/html.cjs');
const d = new Doc({ lang: 'en', theme: '<chosen>' /* or accent: '#…' */, title: '…', footer: '…',
                    css: `/* your own styles, e.g. a cover or a margin-note layout */` });
d.build('<project-root>/out/x.pdf', [
  // your composition: text, grid, box and data blocks below, arranged the way your direction needs
  …
]);
```

## Mechanics

- `new Doc(opts)`: `lang` (`ar he fa ur` are right-to-left), `size` `A4` | `Letter`, `title`, `footer`, `header`, `margin` (mm), `digits: 'arabic-indic'`, `numbers: true` (numbers `h1` as 01, 02), `css`.
- **Colours are required**: `theme` (`persimmon indigo forest navy clay slate plum teal`) or your own `accent`, optionally with `ink muted tint rule paper`. Pick from the subject; no theme is the default. `chrome: 'none' | 'rule' | 'band' | 'side'` adds a margin decoration (none unless you ask).
- **Fonts** are the shipped files in `<skills-root>/fonts/` (see its `README.md`), loaded by file URL; `font` is body, `head` is headings. Unset, Latin uses Rubik with InstrumentSerif headings (one weight; never bold it) and Arabic uses IBMPlexSansArabic with Cairo headings. Other shipped faces: Tajawal, Amiri, NotoNaskhArabic, Rubik (the only one with Hebrew). Other scripts: a system font name.
- **Footer** is automatic: `footer` at the start side, `Page N of M` at the end (`صفحة N من M` in Arabic). `build` adjusts spacing a little toward whole pages and prints `pages` and `fill`; a short page may stay short. `{pages: N}` pins one chunk to N pages. `page()` is a hard break, `keep(...)` keeps blocks together.
- **Your own layout**: `raw(html)` returns your HTML unchanged; the `css` option appends your CSS last, so it can also restyle any kit block. Colour variables: `var(--accent) --ink --muted --tint --rule --paper`; the page content width is the body width.

## Layout primitives (you compose every page from these)

There is no ready-made cover, masthead, row of key figures or card grid. Build what your direction calls for from these, so a depot review can look like a dispatch board and a field report like a notebook:

- `text(html, {size, font, color, weight, caps, tag, style})`: any text in any voice. `size` `'display' | 'xl' | 'l' | 'm' | 's' | 'xs'` or points; `font` `'head' | 'body'`; `color` `'ink' | 'muted' | 'accent' | 'paper'` or any CSS colour; `caps` small uppercase (Latin only).
- `grid(widths, cells, {gap, align})`: columns, `widths` relative (`[2, 1]`) or a count (`3`); cells are HTML (nest `text`, `box`, tables, charts, more grids). Mirrors in right-to-left.
- `box(html, {fill, pad, edge, edgeColor, radius, minHeight})`: a region with a fill (`'tint' | 'accent' | 'ink' | 'none'` or a colour; accent and ink fills turn text paper-coloured) and an optional line on one edge (`'top' | 'start' | 'bottom' | 'all'`).
- `rule({color, weight, width, space})`; `gap(px)`; `page()`; `keep(...)`.
- Structure: `h1 h2 p small bullets ltr(text)`.

## Data blocks (use where the data has that shape)
- `table(rows, {widths, align, total, zebra})`: row 0 header; align letters `s` start, `e` end (numbers), `c` centre; rows never split and the header repeats.
- `chart([[label, number, shown]], {type: 'columns' | 'bars', title, caption, height, highlight})` one-series chart in HTML and CSS; values start at zero; items in reading order (in Arabic the first sits at the right; never reverse them). Other charts: inline SVG you draw, with Arabic text as HTML beside it, not inside the SVG.
- `bar([[label, number, shown]])` parts of a whole as one segmented bar; `timeline([[date, label]])` (two dates draw a span labelled with the interval, `{span}` overrides; never invent a middle step).
- `icon(name)`, `pictogram(icon, on, total, caption)` (a count out of a total), `rings([[value, max, label, shown?]])` (shares, completion). Icon names are in `<skills-root>/icons/README.md`; use an icon only where it names the thing beside it.
- Right-to-left: write text in logical order, never reversed or pre-shaped, no `letter-spacing`; wrap Latin phrases, emails, codes and number ranges inside Arabic in `ltr('…')`. Page furniture, tables, timelines, bars, charts, pictograms and rings mirror by themselves.

## Check and look (every time)

```
python <skills-root>/pdf/check.py <project-root>/out/x.pdf --pages 2 --expect "Page 2 of 2" "key figure" [--text]
python <skills-root>/artifact-taste/preview.py <project-root>/out/x.pdf
```
`check.py` opens the PDF strictly, counts pages, shows how far down each page is used, lists fonts and title, confirms the expected strings and exits 1 on failure. For Arabic it also confirms selectable letters in logical order and that all Arabic used a shipped font: pass Arabic phrases and the footer to `--expect`, e.g. `"صفحة 2 من 2"`. Then open the preview pages, fix what is wrong, rebuild.

## Rules

- Use only supplied facts and dates; label derived figures as derived and fictional scenarios as fictional. Do not invent sources.
- No clipped or overlapping text, no remote assets; images are local files.
- Eight or more pages: add a contents or overview page.
- Continuation: patch the existing generator and rebuild the same path.
