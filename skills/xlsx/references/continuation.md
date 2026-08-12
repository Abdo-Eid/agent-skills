# Continue A Generated Workbook

Continuation edits the durable generator source and rebuilds the workbook. It does not patch the generated binary.

## Workflow

1. Read the active project's generator entry and any source data files.
2. Locate the source section that owns the requested worksheet, formulas, formats, chart, or QA assertion.
3. Patch only that section.
4. Keep unrelated sheet names, formulas, formats, charts, and assertions unchanged.
5. Re-run the same generator entry.
6. Require a recalculated non-empty final workbook.
7. Rerun the relevant portable validation and rendered-sheet checks.
8. Hand the rebuilt artifact to the consuming host for any acceptance and delivery sequence.

## Common Changes

| Request | Source change |
|---|---|
| Update an assumption | Change the input data or explicit assumption value |
| Add a metric | Add the formula, format, label, and QA assertion |
| Change a chart | Change its worksheet ranges, axis, title, or placement |
| Change precision | Update the named format definition and affected cells |
| Add a worksheet | Add navigation, print settings, and contract sheet order |
| Correct a formula | Patch the formula and its expected-value assertion if the intended result changes |

## Drift Prevention

- Reuse the existing workbook name and generator entry.
- Do not create a second unrelated generator.
- Do not regenerate a healthy source file from scratch for a targeted request.
- Do not remove QA assertions to make a changed workbook pass.
- Update a structured assertion when the user's requested behavior intentionally changes its expected result.
- Keep raw and final output filenames consistent with the original generator.

## Uploaded Workbooks

This continuation route applies only when durable generator source exists. If the active project contains only an uploaded `.xlsx` or `.xlsm`, this skill version can analyze it but does not promise safe binary mutation. Offer a newly generated replacement when that meets the user's goal.
