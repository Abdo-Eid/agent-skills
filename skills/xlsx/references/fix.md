# FIX — Repair Broken Formulas in an Existing xlsx

This is an EDIT task. You MUST preserve all original sheets and data. Never create a new workbook.

## Workflow

```bash
# Step 1: Unpack and inspect workbook/worksheet XML
python3 SKILL_DIR/scripts/xlsx_unpack.py input.xlsx /tmp/xlsx_work/

# Step 2: Fix each broken <f> element in the worksheet XML using the Edit tool
#   (see Error-to-Fix mapping below)

# Step 3: Pack to the active project's final out/ path
python3 SKILL_DIR/scripts/xlsx_pack.py /tmp/xlsx_work/ output.xlsx
```

Call `docQa` on the final artifact to identify or confirm formula errors. Repair the durable XML source, repack, and repeat the bounded `docQa` cycle until it passes.

## Error-to-Fix Mapping

| Error | Fix Strategy |
|-------|-------------|
| `#DIV/0!` | Wrap: `IFERROR(original_formula, "-")` |
| `#NAME?` | Fix misspelled function (e.g. `SUMM` → `SUM`) |
| `#REF!` | Reconstruct the broken reference |
| `#VALUE!` | Fix type mismatch |

For the final hash-bound QA and repair workflow, see `validate.md`.

## Critical Rules

- The output MUST contain the same sheets as the input. Do NOT create a new workbook.
- Only modify the specific `<f>` elements that are broken — everything else must be untouched.
- After packing, always call `docQa` to confirm all errors are resolved.
