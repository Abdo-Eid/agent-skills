---
name: artifact-taste
description: Read before making or redesigning any PDF, PPTX, DOCX or XLSX. It changes how you arrive at a design, not what the design looks like, so documents stop converging on the same safe template.
license: Proprietary; see the repository-root LICENSE.
---

# Artifact taste

Read this first, then the format skill. It sets no house style. It exists so the document you build was chosen, not inherited.

## Your first idea is the factory

The first complete idea that comes to mind is the artifact you have seen most often: title, a row of key figures, three cards, a table, a chart, a conclusion, in a tidy accent colour. It is valid and it looks like every other document. Treat it as one candidate, not the answer. The aim is not novelty for its own sake; it is a document that fits this content better than the template would.

## Start from the subject, not the format

Before choosing any layout, look for what only this content has:

- its objects, places, numbers, dates, people, materials and notation;
- the shape of the information itself: a sequence, a comparison, a hierarchy, a flow, a set of exceptions, a single number that matters;
- the documents people in this field already use and recognise: a dispatch sheet, a field notebook, a lab record, a ledger, a timetable, a site report, a menu, a case file, a programme, a map legend.

Let the structure and the look grow from that material. A logistics review can borrow the rhythm of a dispatch board; an excavation report can read like a field notebook; a clinic update can be organised the way a patient pathway is. Borrow the logic and the feel, not a costume.

## The space is wider than you think

These are axes you tend to forget exist. They are possibilities, not rules.

- **Structure:** linear narrative, comparison, chronology, argument and evidence, question and answer, exception-led, overview then detail, reference you search rather than read, one diagram that develops.
- **Density:** sparse, rhythmic (dense and quiet pages alternating), dense and analytical.
- **What leads:** type, data, a diagram, an image, a table, whitespace.
- **Composition:** asymmetric, columnar, margin notes beside the text, full-width figures, a single large canvas, modular, one long scroll of evidence.
- **Visual source:** the field's own artefacts, editorial and newspaper systems, technical notation, maps, ledgers, signage, scientific figures.
- **Arabic and other right-to-left documents** have their own editorial and typographic traditions (newspaper hierarchy, calligraphic emphasis, Arabic numerals or Arabic-Indic digits by audience). Draw on them instead of mirroring a Latin template.

## What each format can be

- **A deck** can develop one diagram across several slides, alternate an image with an argument, run as a sequence of evidence ending in one decision, read as a short visual essay, or be a briefing book meant to be read rather than presented.
- **A Word document** can be a memo, a field report, a catalogue, a dossier, a handbook; it can lead with figures, carry annotated tables as the main thread, or use short sections with a running summary.
- **A workbook** can be a model, a decision surface, a work queue, a ledger, a scenario lab or a notebook of analysis. Its originality is in how the information is organised and how a reader moves through it, not in colour; a quiet workbook can be the best one.
- **A PDF** can be a report, a dossier, a catalogue, a visual essay, a handbook, a programme, a poster sequence.

## Familiar patterns are allowed

Cards, a row of key figures, a centred cover, a dashboard, a standard table and a bar chart are all fine when they are the strongest answer for this content. Use them because you chose them, never because they came first or are easiest to build. A decision changes when only its colours or fonts change; that is still the same document.

## Commit, then build what you chose

Write the decision as the first comment of your generator, starting `Direction:`, two to four lines: the subject material you are drawing on, the structure you chose, what the pages will concretely look like because of it (for a dispatch board: routes as rows with status columns, a large on-time figure per route), and why it fits better than the obvious version. No option write-ups and no extra step. Then build that direction all the way through. When a page gets hard, solve it inside the direction instead of drifting back to the template because it is easier to code.

The format kits give you mechanics (fonts, right-to-left, page numbers, tables, charts) and layout primitives (text at any size, columns, regions, lines). They deliberately have no ready-made cover, header band, figure row or card grid: every page is composed by you from your direction.

## Edits, continuations and templates

When you edit or continue a document, or the user gives a template or a brand, its identity is fixed: keep its type, colours and structure, and change only what was asked. Inside that identity the possibilities stay open; choose the composition of new material the same way.

## The only hard rules

- Use only the facts, figures and dates you were given; label what you derived and what is fictional.
- Right-to-left text must read and order correctly, including in tables and charts.
- Formulas work; nothing is clipped, overlapping or cut off.
- The user's instructions, template and brand win over everything here.

## Look at what you made

Render the file and look at the pages before you finish:

```
python <skills-root>/artifact-taste/preview.py <project-root>/out/<file> --out <project-root>/preview
```

It writes one PNG per page (PDF directly; PPTX, DOCX and XLSX through LibreOffice) and, when it can, a contact sheet of all pages, then prints your `Direction:` note back. Open the images and check every page against that note: name what on the page comes from the direction. A page that could sit unchanged in any document of this kind is the template: rebuild it. Also fix anything clipped, overlapping or misordered.
