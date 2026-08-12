---
name: docx
description: Create professional, editable Word documents with the baked docx package and continue generated documents by patching their source generator.
license: Proprietary; see the repository-root LICENSE.
---

# DOCX

Author a Node generator with the `docx` package under `<project-root>/src` and write the resulting `.docx` to `<project-root>/out`. The generator source is the continuation contract; do not perform deep XML edits on arbitrary uploaded Word binaries.

## Creation workflow

1. Choose page size, margins, heading hierarchy, and a restrained palette before adding content. Use explicit document styles instead of ad-hoc formatting.
2. Create a title page or opening title block only when it serves the document type. Use Heading 1 through Heading 3 semantically so navigation remains usable.
3. Use tables for aligned data, callout tables or shaded paragraphs for emphasis, and captions for figures. Set table widths, cell margins, and header treatment deliberately. Build header text as runs in an array, for example `paragraph([run("Decision")])`; never pass a `TextRun` through a helper that expects plain text.
4. Keep paragraphs readable with consistent spacing and avoid empty paragraphs for layout. Use page breaks only at real section boundaries.
5. Add page numbers, a header/footer, and a contents or overview section for documents of eight or more pages. Use `new TextRun({ children: [PageNumber.CURRENT] })` for the current-page field and tab stops or a footer table for alignment, never literal spaces.
6. Build to `<project-root>/out/<descriptive-name>.docx`, require a non-empty package, validate its OOXML structure, convert it with a compatible office renderer, and inspect the rendered pages before reporting it ready for host validation.

## Quality rules

- Use a maximum of two type families and clear, accessible contrast.
- Keep headings with following content and avoid stranded table headers, captions, or one-line paragraphs.
- Prefer real Word paragraphs, runs, lists, tables, images, and styles over embedded screenshots of text.
- Keep images local under `assets/`, set their dimensions explicitly, and preserve their aspect ratio.
- Preserve provided citations and source wording; do not fabricate citations.
- Give the document explicit page dimensions and margins. Use the verified `docx@9.7.1` structure `page: { size: { width, height }, margin: { ... } }`; standard creation uses high-level `docx` objects and `Packer.toBuffer()`.
- Before host delivery, reconcile extracted output text with the exact title, contents entries, table headers, representative table values, and rendered page numbers required by the task. For typed contents pages, extract each referenced rendered page and confirm its expected heading appears there.
- OOXML validation, office conversion, text extraction, and rendered-page review are portable authoring checks. A host decides which validation, visual review, acceptance, and delivery mechanisms apply.

## Continuation

Read the existing generator first, make a targeted source patch, rebuild, and rerun the relevant portable checks. Comments, tracked changes, redlining, and deep arbitrary OOXML editing are deferred in this first pass.

## Runtime boundary

The required packages and binaries are listed in the repository-root `DEPENDENCIES.md` and `registry/dependencies.json`. They must be available before authoring starts; runtime installs and replacement-skill downloads are outside this skill contract.
