# Taste for Word documents

Word gets a modest creativity budget, on purpose: a Word file is meant to be edited, printed and read in order, and its layout options are limited. The craft is structure and typography. A well-made document can look quiet and still be excellent.

## First: which genre is this?

Readers of a genre expect its conventions; break them only on purpose.

- **Thesis or dissertation:** roman-numbered front matter (title, abstract, contents), then the body from 1; chapters start on a new page; numbering 1 / 1.1 / 1.1.1 (`numberHeadings`, `chapterNumbers`, and `chapterStart` when this is not chapter 1); table captions above and figure captions below; equations numbered (3.1) at the right; footnotes for asides; references with a hanging indent. Body serif, generous line spacing (1.3 to 1.6).
- **Book:** a book is not A4. Set a trim size (`page: 'A5'`, `'B5'` or `['6in', '9in']`), which also gives the line of about 65 characters a book needs, with a binding `gutter` and `mirror`. Serif body, Word line spacing about 1.1 to 1.25, justified with `hyphenate`, first paragraph of a chapter flush and the rest with a first-line indent and no space between. Chapters as sections opening on a right-hand page with no running head (`oddPage`, `firstPage: 'plain'`): the opener sinks a third of the way down the page with a quiet title, no rule and no coloured band. If chapters are numbered, the number or "Chapter One" is its own small line above the title (typed, with `{number: false}` on the `h1`), not run in with it. Book title on even pages, chapter title on odd (`headerEven`, one section per chapter), page numbers on the outside with no footer rule. Title page: title and author, nothing else that looks like a report; the imprint or notice goes on its back, with no running head (`header: false`). Few heading levels, often just chapters.
- **Long report:** A4 or Letter is right; a contents page, numbered sections, a `gutter` when it will be bound.
- **Maths or science notes:** Definition, Theorem and Proof as their own classes (`.theorem`, `.proof`), proofs ending with ∎; equations numbered only when referred to, written with `d.eq` and `d.m`; symbols in maths, not plain text.
- **Legal or policy:** numbered clauses with hanging indents; defined terms in bold; no decoration; cross-references through `d.ref`.
- **Memo or proposal:** short; the ask at the top; one or two heading levels; tables only for real comparisons.
- **Field report, handbook, dossier:** can lead with figures, carry annotated tables as the main thread, or use short sections with a running summary.

## Structure is the design

- Real heading styles, at most three levels, so navigation and a contents page work.
- Spacing comes from styles, never from blank lines or repeated breaks.
- Tables carry data, never page layout; every table and figure has a numbered caption and is referred to with `d.ref`.
- Lists for steps and sets, prose for argument; no random bold, no fake headings made of bold text.
- Define a class once for each recurring role (an abstract, a theorem, a reference entry); Word users can then restyle the whole document from the gallery.

## Dials that apply here

In a thesis, book or legal document, the genre outranks the dials: pick the look that sits best with its conventions and apply it inside them.

## Craft floor

Body text 10.5pt or more; footnotes and captions 8.5pt or more; one font pairing; section, caption and equation numbers never typed by hand (a book's "Chapter One" line is the one exception); page numbers stay correct across sections.
