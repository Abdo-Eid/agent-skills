# Formula Validation and Recalculation

Spreadsheet validation is owned by `docQa`. The workspace guard intentionally blocks direct calls to `formula_check.py`, so the final artifact receives one deterministic, hash-bound validation result instead of an unrecorded shell check.

## Delivery Workflow

1. Build or edit the workbook and pack it to the active project's `out/` directory.
2. Call `docQa` with the final artifact path. Use `scope: "changed"` after a targeted edit.
3. Read the returned `xlsx-formula-validator` result. Repair every hard error in the durable generator or unpacked XML source.
4. Rebuild and call `docQa` again within the bounded repair budget.
5. Deliver only after `docQa` passes and binds its evidence to the final artifact SHA-256.

## Static Checks

The retained validator examines workbook and worksheet XML for:

- cached Excel error values;
- broken cross-sheet references;
- malformed error cells;
- shared-formula integrity;
- unknown named-range references, reported as heuristic warnings.

The validator's exit code is interpreted by `docQa`; do not invoke it through workspace shell tools.

## Recalculation

LibreOffice recalculation is generator work only when the requested deliverable needs refreshed cached values. It does not replace `docQa`. If recalculation is needed, write the recalculated workbook to the final `out/` path and then validate those exact bytes with `docQa`.

Never save an existing workbook through `openpyxl` with `data_only=True`; that can replace formulas with cached values. Preserve formulas and source structure, especially during targeted edits.
