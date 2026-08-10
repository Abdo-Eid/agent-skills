---
name: docx
description: Create professional, editable Word documents with the baked docx package and continue generated documents by patching their source generator.
license: Proprietary; see /workspace/LICENSE.
---

# DOCX

Author a Node generator with the baked `docx` package under `/workspace/projects/<projectId>/src` and write the resulting `.docx` to `out/`. The generator source is the continuation contract; do not perform deep XML edits on arbitrary uploaded Word binaries.

## Creation workflow

1. Choose page size, margins, heading hierarchy, and a restrained palette before adding content. Use explicit document styles instead of ad-hoc formatting.
2. Create a title page or opening title block only when it serves the document type. Use Heading 1 through Heading 3 semantically so navigation remains usable.
3. Use tables for aligned data, callout tables or shaded paragraphs for emphasis, and captions for figures. Set table widths, cell margins, and header treatment deliberately.
4. Keep paragraphs readable with consistent spacing and avoid empty paragraphs for layout. Use page breaks only at real section boundaries.
5. Add page numbers, a header/footer, and a contents or overview section for documents of eight or more pages.
6. Build to `out/<descriptive-name>.docx` and call `docQa`. It validates the package and blocks delivery if LibreOffice cannot render it.

## Quality rules

- Use a maximum of two type families and clear, accessible contrast.
- Keep headings with following content and avoid stranded table headers, captions, or one-line paragraphs.
- Prefer real Word paragraphs, runs, lists, tables, images, and styles over embedded screenshots of text.
- Keep images local under `assets/`, set their dimensions explicitly, and preserve their aspect ratio.
- Preserve provided citations and source wording; do not fabricate citations.

## Continuation

Read the existing generator first, make a targeted source patch, rebuild, and call `docQa` with `scope: "changed"`. Comments, tracked changes, redlining, and deep arbitrary OOXML editing are deferred in this first pass.

## Runtime boundary

The `docx` package, LibreOffice, and validator are baked into the snapshot. Do not run package installers, manual OOXML validators, or manual rendering commands. Use `docQa` and `docDeliver` for verification and delivery.
