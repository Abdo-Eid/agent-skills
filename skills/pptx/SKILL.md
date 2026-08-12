---
name: pptx
description: Create editable, visually disciplined PowerPoint presentations with PptxGenJS and continue generated decks by patching their generator source.
license: Proprietary; see the repository-root LICENSE.
---

# PPTX

Use PptxGenJS in a durable generator under `<project-root>/src`; build the editable deck to `<project-root>/out`. Use a 16:9 deck unless the user supplies a template or explicitly requests another ratio.

## Creation workflow

1. Establish audience, narrative, and a slide-by-slide purpose before coding. Each slide needs a distinct job: cover, agenda, divider, evidence, comparison, process, recommendation, or close.
2. Define named theme tokens in the generator for background, primary text, muted text, accent, and surface. Use solid colors, a deliberate font pairing, explicit coordinates, and safe margins.
3. Build composition rather than repeating card grids. Alternate dense evidence, spacious editorial, diagrammatic, and comparative layouts when the story supports it.
4. Use code-native charts and concise labels. Keep supporting text readable at normal presentation size; do not use screenshots of tables or charts when native shapes/charts can remain editable. Encode percentage data as fractions when using `0%` formats (`1.19` renders as `119%`); whole-number percentages need a non-scaling label format.
5. Put a subtle slide number or progress cue on non-cover slides. Decks with eight or more slides require an agenda or overview near the start.
6. Build the deck, require a non-empty package, confirm the expected slide count, convert it with a compatible office renderer, and inspect rendered slides before reporting it ready for host validation.

## Layout discipline

- Use a consistent 13.333 by 7.5 inch coordinate system for widescreen decks.
- Keep title/body hierarchy obvious. Titles normally need 28pt or larger; body text normally needs 14pt or larger; sources and labels must remain readable.
- Align groups to shared edges and distribute whitespace intentionally. Never allow cropped text, overlaps, or content outside the safe area.
- Pick a visual language from the subject rather than defaulting to generic blue gradients, centered title/body clones, or decorative filler icons.
- Keep every visual asset local under `assets/` and preserve aspect ratio.
- Derive risk-matrix positions from named likelihood and impact maps rather than manually chosen coordinates. Keep axis labels outside the grid and verify every marker agrees with its adjacent label.
- On dark surfaces, pass an explicit light foreground color for every text run. Do not rely on a global dark-text default. Avoid global `fit: 'shrink'`: it can hide overflow by reducing text below the readable minimum; fix the content or layout instead.
- Reconcile the finished deck against supplied facts before delivery. Distinguish supplied facts from editorial inference and remove invented dates, classifications, causal claims, and implied relationships.
- For percentage charts, retain fractional source values such as `1.16` for `116%`. When a renderer requires overlay labels, derive every overlay from the same data array and reconcile it against chart values; overlays are a conversion fallback, not linked PowerPoint labels.
- Build risk matrices from named likelihood/impact maps and reserve separate geometry for adjacent watchlists or panels. Assert that matrix points, axis labels, and panels do not overlap.
- Classify missing input before authoring: ask for a required missing fact; label transparently derived analysis; label requested owners or mitigations as `Proposed`; omit unsupported enrichment.
- Package inspection, office conversion, slide-count checks, and rendered-slide review are portable authoring checks. A host decides which validation, visual review, acceptance, and delivery mechanisms apply.

## Continuation

Read and patch the existing generator source, retaining its theme tokens, slide order, and asset paths unless the request changes them. Rebuild the deck and rerun the relevant portable checks. Editing arbitrary uploaded PPTX internals is deferred; reconstruct a durable generator only when the user explicitly accepts that limitation.

## Runtime boundary

The required packages and binaries are listed in the repository-root `DEPENDENCIES.md` and `registry/dependencies.json`. They must be available before authoring starts; runtime installs and replacement-skill downloads are outside this skill contract.
