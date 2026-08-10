---
name: pptx
description: Create editable, visually disciplined PowerPoint presentations with PptxGenJS and continue generated decks by patching their generator source.
license: Proprietary; see /workspace/LICENSE.
---

# PPTX

Use PptxGenJS in a durable generator under `/workspace/projects/<projectId>/src`; build the editable deck to `out/`. Use a 16:9 deck unless the user supplies a template or explicitly requests another ratio.

## Creation workflow

1. Establish audience, narrative, and a slide-by-slide purpose before coding. Each slide needs a distinct job: cover, agenda, divider, evidence, comparison, process, recommendation, or close.
2. Define named theme tokens in the generator for background, primary text, muted text, accent, and surface. Use solid colors, a deliberate font pairing, explicit coordinates, and safe margins.
3. Build composition rather than repeating card grids. Alternate dense evidence, spacious editorial, diagrammatic, and comparative layouts when the story supports it.
4. Use code-native charts and concise labels. Keep supporting text readable at normal presentation size; do not use screenshots of tables or charts when native shapes/charts can remain editable.
5. Put a subtle slide number or progress cue on non-cover slides. Decks with eight or more slides require an agenda or overview near the start.
6. Build once, then call `docQa`. It owns OOXML validation, LibreOffice rendering, and visual inspection.

## Layout discipline

- Use a consistent 13.333 by 7.5 inch coordinate system for widescreen decks.
- Keep title/body hierarchy obvious. Titles normally need 28pt or larger; body text normally needs 14pt or larger; sources and labels must remain readable.
- Align groups to shared edges and distribute whitespace intentionally. Never allow cropped text, overlaps, or content outside the safe area.
- Pick a visual language from the subject rather than defaulting to generic blue gradients, centered title/body clones, or decorative filler icons.
- Keep every visual asset local under `assets/` and preserve aspect ratio.

## Continuation

Read and patch the existing generator source, retaining its theme tokens, slide order, and asset paths unless the request changes them. Rebuild the deck and use `docQa` with `scope: "changed"`. Editing arbitrary uploaded PPTX internals is deferred; reconstruct a durable generator only when the user explicitly accepts that limitation.

## Runtime boundary

PptxGenJS and supporting render tools are baked into the image. Do not install packages at runtime and do not call validators or LibreOffice directly; use `docQa` and `docDeliver`.
