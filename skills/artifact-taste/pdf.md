# Taste for PDF documents

PDF gets the second-largest budget: page composition and editorial rhythm are the craft, and real CSS means almost any layout is possible.

## A PDF can be

A report, a dossier, a catalogue, a visual essay, a handbook, a programme, a ledger, a timetable, a field notebook, a magazine spread, a poster sequence.

## Let the data build the page

The best documents put real data into their structure; the worst build a structure and have nothing to put in it. Before you draw a box, name what goes in it. A card holding one short sentence, or a grid repeating one word, is not a structure yet. Ask what shape this data has, then draw that shape:

- Many items sharing a dimension: one scale that every item reuses, so they compare at a glance.
- A figure supporting a sentence: the figure beside that sentence, not in a row of its own.
- Steps that escalate or narrow: position that changes with each step.
- One value that matters among others: only that one gets the accent.
- A combination that does not exist: the empty cell shown as empty and said so.
- A category that matters: colour for that one variable and nothing else.

Short of content for the pages you were asked for? Give what you have more size: larger type, a bigger chart, one idea to a page. A box is as tall as what it holds; never stretch one to fill a page. A page may end early, and a quiet page can be a choice.

## Page architectures

- **Margin-note column:** the narrative in a wide column, figures and asides beside it.
- **Ledger:** rows carry the content, columns are the attributes; the table is the page.
- **Dossier:** short numbered sections with evidence attached to each.
- **Catalogue:** one item per block, the same fields every time, an index at the end.
- **Spread:** a large image or figure field against a column of text.
- **Timetable or schedule:** time runs along one axis and organises everything.

## Your PDF attractors

You reach for these without deciding to: a small label, a title and a top rule on every page; hairline rows for everything; one huge number leading the page; a row of three figures on the cover; rounded pill bars; three numbered blocks side by side; cream paper with one rust or green accent. Use one only when this document needs it, and say why in your `Direction:`.

## Dials on a page

- Shape: `border-radius` 0 to about 6mm; a sharp document has none anywhere.
- Line: none, hairline `0.5pt` rules, or heavy `3pt` bars and full frames.
- Ground: white, paper tint (`body { background }`), full colour fields; for a dark document put the dark colour on `body`.
- Scale: body 9.5 to 11pt; display 28pt to 80pt.
- Alignment: CSS grid columns (`grid-template-columns: 1fr 2fr`), offsets with `margin-inline-start`.
- Density: generous `margin` and `padding` (airy) or tight leading and small gaps (analytical).

## Print techniques

- Set sizes in `pt` and `mm`. Anything wider than `var(--content-w)` makes Chromium shrink the whole page.
- Page breaks: `break-before: page` on a section starts a new page; `break-inside: avoid` keeps a figure, card or row whole. Table rows never split and headers repeat by themselves.
- A block that fills one page: `min-height: var(--content-h)`, with `display: flex` or `grid` to place what is inside. Never a taller fixed height: it spills onto a page of its own.
- Full-bleed page (a cover, a colour field): `@page cover { margin: 0; @bottom-left { content: none } @bottom-center { content: none } @bottom-right { content: none } }` and `section.cover { page: cover; break-after: page; height: var(--page-h); }`.
- Footer: the build's default is fine to keep. If this document wants its own, write it in your CSS: `@page { @bottom-left { content: "Room guide"; font-family: InstrumentSerif; border-top: none } @bottom-center { border-top: none } @bottom-right { content: counter(page); border-top: none } }`.
- Charts: draw them with CSS (bars as `div`s with `width` or `height` in %) or inline SVG. Values start at zero. A bar's % height needs a parent with a set height. Keep text as HTML, not inside SVG, in Arabic. In a right-to-left document, flex and grid already run from the right; the first item must sit at the right.

## Craft floor

Body text 9pt or more; secondary text 8.5pt or more with real contrast (the build warns below that). Eight or more pages: a contents or overview page.
