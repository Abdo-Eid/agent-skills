---
name: artifact-taste
description: Read before making or redesigning any PDF, PPTX, DOCX or XLSX, together with the reference for that format. It changes how you arrive at a design, not what the design looks like, so documents stop converging on the same safe template.
license: Proprietary; see the repository-root LICENSE.
---

# Artifact taste

Read this, then `<skills-root>/artifact-taste/<format>.md` for your format (`pptx.md`, `pdf.md`, `docx.md` or `xlsx.md`), then the format skill. There is no house style: the document you build should be chosen, not inherited.

## Your first idea is the factory

The first complete idea that comes to mind is the artifact you have seen most often: a title, a row of key figures, three cards, a table, a chart, a conclusion, in a tidy accent colour. It is valid and it looks like every other document. Treat it as one candidate, not the answer.

## Start from the subject

Look for what only this content has: its objects, places, numbers, dates and notation; the shape of its information (a sequence, a comparison, a flow, a set of exceptions, one number that matters); and the documents its field already uses (a dispatch sheet, a field notebook, a ledger, a timetable, a case file, a programme). Let the structure grow from that material: borrow its logic and feel, not a costume.

Structures you tend to forget: narrative, comparison, chronology, argument and evidence, question and answer, exception-led, overview then detail, reference to search rather than read, one diagram that develops. What can lead a page: type, data, a diagram, an image, a table, whitespace.

## Dials: the look is dealt, not chosen

Left alone you pick the same look every time, and when asked to choose dials you pick the same ends every time. So the dials are dealt for this document. After writing your `Direction:` line, run:

```
python <skills-root>/artifact-taste/dials.py <format> "<one line: the subject and what the document is for>"
```

It deals shape, line, contrast, ground, type voice, scale, density, rhythm, alignment, colour role and colour temperature, with concrete settings for your format, and prints a `Dials:` line to copy under `Direction:`. The same subject line always gets the same deal.

- **Build what is dealt.** It is your brief for the look, as binding as the facts: an unusual combination is the point, so make it work rather than escape it.
- You may change **at most three** dials, each only for a reason that comes from the subject (not from habit or ease); write each change into the line, e.g. `shape round (dealt sharp: the route map is made of circles)`.
- Dials set the look; your `Direction:` sets the structure. Colours stay yours: pick hues of the dealt temperature that fit the subject.
- Arabic and right-to-left: never italic, uppercase or letter-spacing; emphasis comes from weight, size or colour. Naskh faces read traditional, Cairo and Tajawal geometric; choose Western or Arabic-Indic digits for the audience.
- Familiar patterns (cards, a figure row, a centred cover, a dashboard) are fine when the subject calls for them, never because they came first.

## Commit, then build what you chose

The first lines of your generator:

```js
// Direction: <subject material, the structure you chose, what the pages will concretely look like, why it beats the obvious version>
// Dials: <the line dials.py printed, with any of your up to three changes and their reasons>
```

Then build that, all the way through; when a page gets hard, solve it inside the direction instead of drifting back to the template. The kits have no ready-made cover, header band, figure row or card grid: you compose every page.

## Styling: write the look once, as CSS

The PDF and PPTX kits take a `style` object written in CSS and every primitive uses its class names; each kit turns it into its own native styling. The DOCX and XLSX kits use their own theme tokens and formats (see their skills).

```js
style: {
  '--accent': '#…', '--ink': '#…',                  // colours: your choice, no default
  '--radius': '…', '--line': '…', '--space': '…',   // your dials as variables, used by the classes
  body: { fontFamily: ['…', 'Arial'] },             // elements restyle the kit's own parts (body, th, td, chart…)
  '.yourName': { fontSize: …, borderRadius: 'var(--radius)' },  // classes named for roles in your document
  '.other': { composes: '.yourName', … },
}
d.text(…, 'yourName')  ·  d.box(…, ['yourName', 'other'], { inline overrides })
```

- CSS property names in camelCase; lengths with units (`'12pt'`, `'4mm'`), a bare number is points; a value may be `var(--name)` or just `name`. `fontFamily` is a list, first wish first.
- A property a format cannot do, or a misspelt one, stops the build with the reason; that message is the reference. A `pdf:` / `pptx:` key in a class passes raw native options.
- Define a class once and reuse it; repeating the same inline style is a class you have not written yet.

## Edits, templates and hard rules

- Editing or continuing a document, or working from a user's template or brand: its identity is fixed; change only what was asked.
- Use only the facts, figures and dates you were given; label what is derived or fictional. Right-to-left reads and orders correctly, in tables and charts too. Formulas work; nothing is clipped or overlapping.

## Look at what you made

```
python <skills-root>/artifact-taste/preview.py <project-root>/out/<file> --out <project-root>/preview
```

It renders every page to a PNG and prints your `Direction:` and `Dials:` lines back. Open the pages and check each one against both: a page that could sit unchanged in any document of this kind, or that does not show the dials you chose, is the template: rebuild it.
