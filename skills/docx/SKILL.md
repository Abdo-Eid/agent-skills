---
name: docx
description: Create editable Word documents with the docx package through a small kit that handles the mechanics (real styles, header-row tables, page X of Y footer, RTL) while you own the structure, and check them in one call.
license: Proprietary; see the repository-root LICENSE.
---

# DOCX

Read `<skills-root>/artifact-taste/SKILL.md`, then `<skills-root>/artifact-taste/docx.md`, first: decide what this document should be before you open the kit.

Write a CommonJS generator `<project-root>/src/build.cjs` with the kit; run it with `node` and `NODE_PATH` set. The file goes to `<project-root>/out/<name>.docx`. Do not hand-edit OOXML; anything the kit lacks goes through `add(...)` with objects from the `docx` package.

```js
// Direction: <subject material, chosen structure, why>
const K = require('<skills-root>/docx/kit.cjs');
const D = require('docx');            // for your own paragraphs, tables, images
(async () => {                        // CommonJS has no top-level await
  const d = K.doc({ theme: '<chosen>' /* or tokens: {...} */, page: 'A4', title: '...', footer: '...' });
  // your structure: kit calls and d.add(new D.Paragraph(...), ...) in the order your direction needs
  await d.save('<project-root>/out/x.docx');
})();
```

## Kit API (all methods chain)

- `K.doc(opts)`: **colours are required**: `theme` `navy | forest | clay | slate` or `tokens` (`accent`, `ink`, `muted`, `tint`, `line`, `head` and `body` fonts, `th: 'solid' | 'tint' | 'rule'` table header, `rule: true|false` line under the title and h1). `page` `A4 | Letter`; `numberH1: true` numbers h1 ("1. "; `h1(text, false)` skips one; never type numbers yourself); `rtl: true` (bidi, mirrored tables, Arabic footer); `spread`, `density`, `margin`, `size`, `author`.
- Text: `title subtitle kicker h1 h2 h3 p small gap pageBreak tabline(left, right)`; inline `**bold**` `*italic*`. Headings stay with the next block, a short `p`/`small` before a table stays with it, tables stay whole with their caption.
- Blocks: `table({head, rows, widths (relative), align:'lrr', total, caption, zebra})`; `callout(text, title)`; `bullets([..])`; `numbered([..])`.
- Your own content: `add(...docxObjects)` takes any `docx` objects (paragraphs with your own runs and spacing, tables, `ImageRun` images with explicit size, columns, text frames). Helpers: `d.W` text width in twips, `d.t` the colour and font tokens, `d.para(text, paragraphOpts, runOpts)`, `d.runs(text)`. From eight pages add `add(new D.TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }))`.
- Footer "Page X of Y" is automatic. Fonts: Arial and Times New Roman only (other fonts are substituted wherever they are not installed).

## Page count

Write the content once and let it flow; `pageBreak()` only for real section breaks. If the page count must be exact, run the check with `--fit`: it rebuilds with a spacing-only `spread` until the file has exactly N pages, then prints `spread: x` (add it to `K.doc`). If it says content is short, the document is shorter than asked: add real content or accept fewer pages, never blank lines.

## Check and look (every time)

```
<python> <skills-root>/docx/check.py <project-root>/out/x.docx --pages 3 --expect "Q3 revenue" "Page 3 of 3" [--fit "node src/build.cjs"] [--text]
<python> <skills-root>/artifact-taste/preview.py <project-root>/out/x.docx
```
`check.py` validates the package, converts with LibreOffice, prints page count and fill, and confirms each `--expect` string ("Page N of M" is checked against the real page count). It exits 1 only for: invalid package, no heading styles, wrong page count, missing string. Then open the preview pages, fix what is wrong, rebuild.

## Rules

- Use only supplied facts and dates; label derived figures; label fictional scenarios. Do not invent citations.
- No clipped text; images local with explicit size.
- Comments, tracked changes and deep edits of uploaded Word files are out of scope; patch the generator.
