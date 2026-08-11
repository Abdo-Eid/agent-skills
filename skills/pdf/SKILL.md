---
name: pdf
description: Create polished, print-ready PDF reports, proposals, guides, and papers from an editable generator source. Use for new PDF creation or targeted changes to a generated PDF.
license: Proprietary; see /workspace/LICENSE.
---

# PDF

Build from source under `/workspace/projects/<projectId>/src` and write the final file under `out/`. Use ReportLab for deterministic multi-page documents and Playwright with local HTML/CSS when an editorial or branded composition benefits from browser layout. Use `pdf-lib` or `pypdf` only for narrow assembly tasks, never as a substitute for the durable generator.

## Creation workflow

1. Read the existing generator before a continuation; patch it instead of rebuilding healthy pages.
2. Choose one content-led visual direction: restrained research, confident strategy, calm health, expressive culture, or a user-supplied brand. Use a limited palette, one visible accent, and at most two type families.
3. Set explicit page size, margins, typography, headers, footers, and page numbers. Keep headings with their first paragraph or table row; do not split a chart, figure, or callout from its caption.
4. Use native charts or locally generated images. Preserve aspect ratio and include useful captions or source notes. For ReportLab charts, reserve separate title, tick-label, plot, and container bands; verify top/right ticks and direct labels stay inside the chart bounds.
5. Build once into `out/<descriptive-name>.pdf`, then call `docQa`. Do not invoke PDF validators, renderers, or page-inspection commands yourself.

## Quality rules

- Design for print first: no clipped content, low-contrast text, browser-only fonts, remote assets, or decorative gradients.
- Treat the cover and body as one system. Use consistent title, body, caption, and metadata scales.
- Prefer structured sections, tables, callouts, and figures to a wall of prose. Keep tables legible; split dense tables across pages.
- For eight or more pages, add a contents or overview page and running page-position cues.
- Preserve citations and dates supplied by research. Do not invent sources or replace a requested date.
- Route unconstrained narrative, callout, and table prose through width-aware wrapping. Do not use raw `drawString` for text that can exceed its available width.
- A successful deterministic `docQa` result proves structural checks and rendering only. It is not visual acceptance when `visionRan` is false; inspect every rendered page before making a visual-quality claim.
- Before delivery, reconcile the completed PDF against the task: required page count, page numbers, page-specific content, chart labels, and disclaimers must all be present.

## Continuation

For a targeted change, update only the durable generator, preserve page setup and existing assets, rebuild the same output path, and call `docQa` with `scope: "changed"`. Deep edits of arbitrary uploaded PDFs and form filling are not part of this skill's first-pass contract.

## Runtime boundary

All dependencies are baked. Do not run `npm install`, `pip install`, or download replacement skills. `docQa` owns `qpdf`, `pdfinfo`, rendering, text probes, and visual review; `docDeliver` is the only publication path.
