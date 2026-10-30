# Taste for PDF documents

PDF gets the second-largest budget: page composition and editorial rhythm are the craft, and real CSS means almost any layout is possible.

## A PDF can be

A report, a dossier, a catalogue, a visual essay, a handbook, a programme, a ledger, a timetable, a field notebook, a magazine spread, a poster sequence.

## Page architectures

- **Margin-note column:** the narrative in a wide column, figures and asides beside it.
- **Ledger:** rows carry the content, columns are the attributes; the table is the page.
- **Dossier:** short numbered sections with evidence attached to each.
- **Catalogue:** one item per block, the same fields every time, an index at the end.
- **Spread:** a large image or figure field against a column of text.
- **Timetable or schedule:** time runs along one axis and organises everything.

## Your PDF attractors

The masthead stack (small label, big serif title, grey standfirst, then a row of figures); a stat row on page 1; hairline tables; numbered section labels; a tinted rounded callout box. Use them only when you chose them.

## Dials on a page

- Shape: `borderRadius` 0 to about 6mm; a sharp document has none anywhere.
- Line: none, hairline `0.5pt` rules, or heavy `3pt` bars and full frames.
- Ground: white, paper tint, or full colour fields (`background` on a box that spans the column).
- Scale: body 9.5 to 11pt; display 28pt to 80pt.
- Alignment: CSS grid columns (`grid([1, 2])`, `gridTemplateColumns`), offsets with `margin-inline-start`.
- Density: generous `margin` and `padding` (airy) or tight leading and small gaps (analytical).

## Craft floor

Body text 9pt or more; secondary text 8.5pt or more with real contrast (the kit warns below that). No near-empty pages by accident. Eight or more pages: a contents or overview page.
