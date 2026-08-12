---
name: pdf
description: Create polished, print-ready PDF reports, proposals, guides, and papers from an editable generator source. Use for new PDF creation or targeted changes to a generated PDF.
license: Proprietary; see the repository-root LICENSE.
---

# PDF

Build durable source under `<project-root>/src` and write the final file under `<project-root>/out`. Use ReportLab for deterministic multi-page documents and Playwright with local HTML/CSS when an editorial or branded composition benefits from browser layout. Use `pdf-lib` or `pypdf` only for narrow assembly tasks, never as a substitute for the durable generator.

## Creation workflow

1. Read the existing generator before a continuation; patch it instead of rebuilding healthy pages.
2. Choose one content-led visual direction: restrained research, confident strategy, calm health, expressive culture, or a user-supplied brand. Use a limited palette, one visible accent, and at most two type families.
3. Set explicit page size, margins, typography, headers, footers, and page numbers. Keep headings with their first paragraph or table row; do not split a chart, figure, or callout from its caption.
4. Use native charts or locally generated images. Preserve aspect ratio and include useful captions or source notes. For ReportLab charts, reserve separate title, tick-label, plot, and container bands; verify top/right ticks and direct labels stay inside the chart bounds.
5. Build into `<project-root>/out/<descriptive-name>.pdf`. Require successful generation, a non-empty artifact, required text markers, and a complete local render before reporting the build as ready for host validation.

## Quality rules

- Design for print first: no clipped content, low-contrast text, browser-only fonts, remote assets, or decorative gradients.
- Treat the cover and body as one system. Use consistent title, body, caption, and metadata scales.
- Prefer structured sections, tables, callouts, and figures to a wall of prose. Keep tables legible; split dense tables across pages.
- For eight or more pages, add a contents or overview page and running page-position cues.
- Preserve citations and dates supplied by research. Do not invent sources or replace a requested date.
- Route unconstrained narrative, callout, and table prose through width-aware wrapping. Do not use raw `drawString` for text that can exceed its available width.
- Before host delivery, reconcile the completed PDF against the task: required page count, page numbers, page-specific content, chart labels, disclaimers, and financial calculations must all be present.
- For financial analysis, expose supplied inputs, annual cash flows, discount factors, NPV, simple payback, and sensitivity inputs in a machine-readable reconciliation beside the generator output. Label derived values as analysis.
- Plan each page as title, plot, table, callout, and footer regions before drawing. Assert variable-width text and table widths fit their allocated region.
- `qpdf --check`, `pdfinfo`, text extraction, and full-page rendering are portable authoring checks. A host decides which validation, visual review, acceptance, and delivery mechanisms apply.

## Continuation

For a targeted change, update only the durable generator, preserve page setup and existing assets, rebuild the same output path, and rerun the relevant portable checks. Deep edits of arbitrary uploaded PDFs and form filling are not part of this skill's first-pass contract.

## Runtime boundary

The required packages and binaries are listed in the repository-root `DEPENDENCIES.md` and `registry/dependencies.json`. They must be available before authoring starts; runtime installs and replacement-skill downloads are outside this skill contract.
