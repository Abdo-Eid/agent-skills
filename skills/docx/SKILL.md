---
name: docx
description: "Create editable Word documents, from memos to theses and books, with the docx package through a small kit: a CSS-like stylesheet compiled to real Word styles, native heading numbering, footnotes, equations from TeX, numbered captions and cross-references, sections with their own page numbering, a contents page, and RTL. Check them in one call."
license: Proprietary; see the repository-root LICENSE.
---

# DOCX

Read `<skills-root>/artifact-taste/SKILL.md`, then `<skills-root>/artifact-taste/docx.md`, first: decide what this document should be before you open the kit.

Write a CommonJS generator `<project-root>/src/build.cjs` with the kit; run it with `node` and `NODE_PATH` set. The file goes to `<project-root>/out/<name>.docx`. Do not hand-edit OOXML; anything the kit lacks goes through `add(...)` with objects from the `docx` package.

```js
// Direction: <subject material, chosen structure, why>
// Dials: <the line of the look you picked from dials.py, with why>
const K = require('<skills-root>/docx/kit.cjs');
(async () => {                        // CommonJS has no top-level await
  const d = K.doc({ style: { /* your stylesheet */ }, page: 'A4', title: '...', footer: '...' });
  // your structure: kit calls in the order your direction needs
  await d.save('<project-root>/out/x.docx');
})();
```

## Style

`style` is CSS as an object (see artifact-taste), compiled to **real Word styles**: each `.class` appears in Word's style gallery and `composes` becomes `basedOn`, so the file stays editable. Paragraphs take one class; on a heading, title, subtitle or small a class adds to that element's style, on `p` it is the paragraph's style.

- Variables: `--accent --ink --muted --tint --line` set the kit's colours; `--accent` is required (or `theme`: `navy forest clay slate`, a starting set). Your own variables work in any value.
- Elements: `body title subtitle h1 h2 h3 caption footnote th td header footer contentsTitle toc1 toc2 toc3`. Headings follow `body`'s `fontFamily` until you set theirs; `footer`/`header` style the running lines (a monospace page number goes here).
- Properties: `fontFamily fontSize fontWeight fontStyle fontVariant color lineHeight letterSpacing textTransform textDecoration textAlign textIndent background padding border borderTop borderBottom borderInlineStart borderInlineEnd marginTop marginBottom marginInlineStart marginInlineEnd breakBefore breakAfter breakInside`, plus `docx: {run, paragraph}` for raw options. `breakBefore: 'page'` on `h1` starts each chapter on a new page; a negative `textIndent` with an equal `marginInlineStart` is a hanging indent; `borderTop: 'none'` on `footer` removes its rule; `lineHeight` is Word's line spacing, not CSS's: `1` is single, which already has air, so book text sits near `1.1` to `1.25` and `1.45` looks nearly double; `letterSpacing` also takes `em`; `textIndent` on `body` indents running text only (headings, tables, captions and lists stay flush), and a class with `textIndent: 0` makes a flush first paragraph. Anything else stops the build and says why.
- Fonts: any name works, and the first on the list is the one used, since a Word file stores one name; see artifact-taste on choosing one. For Arabic, that face draws the Arabic text too, so pick one that carries it. When the exact font matters more than file size, it can travel inside the file: `K.doc({ docx: { fonts: [{ name, data, bold }] } })`, where `data` and `bold` are the bytes of the font files.

## Kit API

- `K.doc(opts)`: `style`, `page` `A4 | Letter | A5 | B5` or a trim `['6in', '9in']`, `margin` (one length, or `{top, bottom, left | inside, right | outside}`), `rtl: true` (the kit's own labels turn Arabic: contents title, Table N, Page X of Y; a signed number such as -54,000 needs a leading U+200E to keep its sign on the left), `title`, `author`, `footer`, `header`, `headerEven` (different header on even pages), `pageLabel`, `hyphenate: true` (Word hyphenates, for justified text on a narrow page), `spread`, `density`.
  - Numbering is off until you ask: `numberHeadings: true` (native 1, 1.1, 1.1.1; never type numbers, also not "Chapter 3"), `chapterStart: 3` (a chapter that is not the first), `chapterLabel: 'Chapter'` or `'Chapter %1:'` (the word in the number), `chapterNumbers: true` (captions and equations as 3.2 and (3.2), restarting per chapter; without it they count through the whole document).
  - Binding: `gutter: '12mm'` (extra margin for the binding), `mirror: true` (the gutter goes on the inside of each page, and running heads and page numbers on the outside).
- Text: `d.p(text, 'cls', {inline css})`, class and inline both optional. `d.title`, `d.subtitle` and `d.small` are their own calls with the same arguments (`d.p(text, 'title')` fails: there is no class `.title`). Headings `d.h1(text, 'cls', {inline css, number: false, label: 'x'})`, or `d.h1(text, {label: 'x'})` without a class; also `h2 h3`. Inline markup `**bold**` `*italic*`. Also `bullets([..], cls) numbered([..], cls) gap() pageBreak() tabline(left, right)`. Headings stay with the next block. Every call returns `d`, so calls chain.
- `table({head, rows, widths (relative), align:'lrr', total, caption, label, zebra})`: the header row repeats and the caption, above the table, is numbered.
- `figure(file, {width: '120mm', height, caption, label})`: png or jpg with a numbered caption below; height comes from the image.
- A drawing (diagram, map, illustration): write it as HTML or SVG, run `node <skills-root>/artifact-taste/image.cjs in.svg out/x.png --w 1200`, then `figure('out/x.png', {width, caption})`.
- `eq('\\frac{a}{b} = \\sum_{i=1}^{n} x_i^2', {label, number})`: a display equation from TeX, real Word math; numbered at the right when `label` or `number: true` is given. Supported: `\frac \sqrt[n] \sum \int \lim_{..} ^ _ \text{words}` (upright, keeps its spaces), `\sin`-style function names (upright), `\quad`, Greek letters and common operators; an unknown command stops the build and lists them, and anything else can be built from `K.D` math objects. As in TeX, `^` and `_` apply to the one thing before them, so group with braces: `{(1+h)}^{n}`, `\sum_{k=0}^{n} {a r^k}`.
- Inside any text written in a template literal (backticks): `${d.note('Footnote text.')}` a footnote, `${d.m('x^2')}` an inline equation, `${d.ref('label')}` a clickable cross-reference and may point forward. It prints "Figure 3", "Table 2", "Section 1.2" or "Chapter 3", so do not write those words yourself; an equation prints just "(3.1)". Text is literal, so subscripts and symbols go through `d.m`, also in footnotes.
- `contents(title, {levels, cls})`: the contents, under a visible title (`false` for none; the default is "Contents"). The kit reads the page numbers from one LibreOffice pass at save, exactly as each section shows them, so they appear in any viewer. Headings may fall anywhere; do not arrange pages around it.
- `section({...})`: starts a new section, on a new page. `numbering: 'roman' | 'Roman' | 'decimal' | 'alpha'` (carries over from the previous section until changed), `start`, `columns`, `continuous` (no page break), `oddPage: true` (starts on a right-hand page, for chapter openers), `firstPage: 'plain'` (no running head on the section's first page), `footer`, `header`, `headerEven`, `pageLabel: 'of' | 'number' | 'none'`. Front matter is usually `{numbering: 'roman', start: 1}`, the body `{numbering: 'decimal', start: 1}`. `footer: false` and `header: false` remove them, here or for the whole document in `K.doc`. A `footer` string is literal left-hand text; the number on the right comes from `pageLabel`, and the default is "Page X of Y". A book with chapter openers uses one section per chapter: `{oddPage: true, firstPage: 'plain'}`.
- **The whole `docx` package stays open; the kit never limits you.** It only saves work on numbering, contents numbers, equations and references. For anything it does not list (read the package's docs at `docx.js.org` or its `.d.ts` when unsure):
  - Any object: `d.add(new K.D.Paragraph({...}), new K.D.Table({...}))`; `K.D` is the package, `d.W` is the text width in twips, `d.para(text, paragraphOpts, runOpts)` and `d.runs(text)` build pieces. Text styles: `docx: {run, paragraph}` in a class.
  - Any section option: `d.section({ docx: { properties: { lineNumbers: { countBy: 5 }, page: { size: { orientation: K.D.PageOrientation.LANDSCAPE } } } } })`. Kit tables still size to `d.W`, so pass your own `K.D.Table` on a page of another width. Your own `footers` replace the kit's, and its contents page numbers then need a refresh in Word.
  - Any document option: `K.doc({ docx: { compatibility: {...}, background: {...} } })`. Plain objects merge with what the kit set; anything else replaces it.

## Page count

Write the content once and let it flow; `pageBreak()` only for real section breaks. A brief that says "about N pages" takes a range: `--pages 4-6`. If the page count must be exact, run the check with `--fit`: it rebuilds with a spacing-only `spread` until the file has exactly N pages, then prints `spread: x` (add it to `K.doc`). If it says content is short, the document is shorter than asked: add real content or accept fewer pages, never blank lines.

## Check and look (every time)

```
<python> <skills-root>/docx/check.py <project-root>/out/x.docx --pages 3 [--fit "node src/build.cjs"] [--text]
<python> <skills-root>/artifact-taste/preview.py <project-root>/out/x.docx
```
`check.py` validates the package, converts with LibreOffice, and prints page count and fill. It does not compare the text with what you wrote: read your words on the preview pages. Arabic in `--text` can look scrambled, because PDF text readers misplace some letters: that is the reader, not your file, so leave it. It exits 1 only for: invalid package, no heading styles, typed bullets or leader dots, wrong page count. Then open the preview pages, fix what is wrong, rebuild. The preview is LibreOffice, not Word, and these are known differences where Word is right: it does not hyphenate; it shows the running head on a later section's plain first page; and it leaves out the blank pages that `oddPage` inserts, so the preview and `--pages` count fewer pages than print and a chapter can look like it opens on a left-hand page.

## Rules

- Use only supplied facts and dates; label derived figures; label fictional scenarios. Do not invent citations.
- No clipped text; images local.
- Comments, tracked changes and deep edits of uploaded Word files are out of scope; patch the generator.
