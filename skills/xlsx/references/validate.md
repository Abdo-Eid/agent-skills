# Recalculation And Validation

The generator produces recalculated final bytes. This reference defines portable structural validation and authoring checks; the consuming host decides acceptance, rendering policy, and delivery.

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
| `requiredTables` | Required table name, exact range, headers, and/or data-row count |
| `keyRelations` | Assert that keys in `subsetRange` exist in `supersetRange`, with optional subset uniqueness |
| `sheetViews` | Expected gridline visibility and whether hidden rows/columns are allowed |
| `borderRanges` | Expected border style and sides across a printable range |

Use exact locations. Never accept an expected value merely because it appears somewhere in the workbook.

## Portable Validation

Run the validator on the final artifact:

```bash
python <skills-root>/xlsx/scripts/validate_workbook.py \
  <project-root>/out/report.xlsx --json
```

It checks ZIP and OOXML structure, formula/cache state, contract assertions, workbook navigation, charts, and print settings. Render representative sheets with a compatible office renderer to inspect clipping, unreadable columns, broken charts, and print fragmentation.

If validation fails, repair the generator rather than the `.xlsx`, rebuild, recalculate, and rerun the relevant checks. A host decides retry limits and delivery policy.

## Failure Semantics

- Formula cache missing: fix recalculation or unsupported formula behavior.
- Exact formula mismatch: fix the owning generator formula.
- Expected value mismatch: inspect assumptions and formula lineage; do not insert the expected number elsewhere.
- Table/key mismatch: report the exact table range and offending cell/value pairs; never scan narrative or notes below a declared table as data.
- Hidden structure or border mismatch: fix the generator so on-screen and printed data remain auditable.
- Contract contradiction: report it instead of weakening the contract.
- Rendering fragmentation: fix print area, orientation, scaling, widths, or chart placement.
- LibreOffice/Excel semantic difference: report the engine limit and do not claim Excel parity.

Require successful generation, a non-empty artifact, successful portable checks, and a reconciled generator/contract before handing the workbook to a host.
