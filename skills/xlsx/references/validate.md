# Recalculation And Validation

The generator produces recalculated final bytes. `docQa` validates, renders, visually inspects, and records those exact bytes.

## Recalculate During Build

Call the helper only from the durable generator:

```bash
python <skills-root>/xlsx/scripts/recalculate_workbook.py \
  <project-root>/out/.report.raw.xlsx <project-root>/out/report.xlsx
```

The placeholders are the host-provided roots defined in `SKILL.md`; do not infer them from the current working directory.

The helper uses separate temporary input/output directories, an isolated LibreOffice profile configured for OOXML recalculation, ZIP postconditions, formula-lineage comparison, byte-change proof for formula-bearing workbooks, and formula-cache inspection. LibreOffice supplies calculated cache values; the helper transplants only those caches into the original XlsxWriter package so headless conversion cannot discard generator-owned view and chart settings. A zero exit code is required.

Do not use a fake `.xlsm` extension to force conversion. Do not treat LibreOffice exit code alone as proof that recalculation occurred.

## QA Contract

Every generated workbook must place structured assertions at `<artifact>.qa.json`. Validation fails when this contract is absent or malformed. Supported fields are:

| Field | Purpose |
|---|---|
| `exactSheets` | Required sheet names and order |
| `minimumFormulaCells` | Lower bound for formula-bearing workbooks |
| `requireFormulaCaches` | Fail when a formula has no stored result |
| `requiredFormulas` | Exact cell and normalized formula pairs |
| `expectedValues` | Exact cell values with optional numeric tolerance |
| `rangeValues` | Exact one-dimensional range contents |
| `numberFormats` | Exact cell number formats |
| `freezePanes` | Expected frozen pane per sheet |
| `requiredCharts` | Minimum chart count and optional minimum series count per sheet |
| `printSettings` | Expected orientation, fit-to-width, and print-area presence |

Use exact locations. Never accept an expected value merely because it appears somewhere in the workbook.

## docQa

Call `docQa` on the final artifact. It owns:

- ZIP, OOXML, relationship, formula, cache, and contract validation.
- Five-sheet navigation checks.
- LibreOffice conversion to PDF.
- Bounded worksheet-page rendering.
- Visual inspection for clipping, unreadable columns, broken charts, and print fragmentation.
- One initial check plus the bounded focused repair attempts.
- SHA-256 evidence consumed by `docDeliver`.

If `pass` is false, repair the generator rather than the `.xlsx`, rebuild once, and call `docQa` again while the repair budget remains. Stop when `repairLimitReached` is true.

## Failure Semantics

- Formula cache missing: fix recalculation or unsupported formula behavior.
- Exact formula mismatch: fix the owning generator formula.
- Expected value mismatch: inspect assumptions and formula lineage; do not insert the expected number elsewhere.
- Contract contradiction: report it instead of weakening the contract.
- Rendering fragmentation: fix print area, orientation, scaling, widths, or chart placement.
- LibreOffice/Excel semantic difference: report the engine limit and do not claim Excel parity.

Deliver only after `docQa.pass` is true and the artifact hash matches the final bytes.
