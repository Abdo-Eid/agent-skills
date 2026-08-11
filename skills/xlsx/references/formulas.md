# Formula Authoring

XlsxWriter stores live Excel formulas. LibreOffice recalculates the generated workbook before QA so downstream readers receive cached results as well as formula text.

## Syntax

XlsxWriter formulas include `=`:

```python
sheet.write_formula("B10", "=SUM(B2:B9)", amount_format)
sheet.write_formula("C5", "='Q1 Data'!B5", cross_sheet_format)
sheet.write_formula("D8", "=IF(C8=0,0,D7/C8-1)", percentage_format)
```

Use English function names and commas as separators in stored formulas.

## Formula-First Rule

Derived values remain formulas. Python may independently calculate an expected result for a QA assertion, but the worksheet cell must still use `write_formula()`.

Good:

```python
sheet.write_formula("M7", "=M3+M4+M5-M6", currency)
```

Not acceptable:

```python
sheet.write_number("M7", closing_arr, currency)
```

## References

- `$B$4` locks row and column.
- `B$4` locks only the row.
- `$B4` locks only the column.
- Sheet names containing spaces use single quotes.
- Cross-sheet formula formatting must preserve the numeric format, not only change font color.

## Error Handling

Use an error guard only when it matches the business meaning:

```python
sheet.write_formula("B9", "=IF(B4=0,0,B8/B4)", percentage)
```

Do not blanket every formula with `IFERROR(...,0)` because it can conceal broken references and incorrect inputs.

## Volatile And Advanced Functions

LibreOffice and Excel can differ on newer, volatile, dynamic-array, add-in, and external-workbook functions. Prefer ordinary arithmetic, aggregation, lookup, logical, and date formulas when they satisfy the task. If advanced Excel-specific behavior is required, document the compatibility limit and do not claim equivalent Excel calculation without an Excel engine.

For cross-engine deliverables, prefer formulas with long-standing OOXML support such as `SUM`, `COUNTIF(S)`, `SUMIF(S)`, `AVERAGEIF(S)`, `IF`, `INDEX`/`MATCH`, and explicit helper columns. Test newer functions such as `XLOOKUP`, `FILTER`, `UNIQUE`, `LET`, `MAXIFS`, or dynamic arrays through the required recalculation engine before relying on them. A conventional helper range is preferable to an elegant formula that LibreOffice cannot cache correctly.

Formula compatibility does not make unlike metrics comparable. Keep source units visible and either normalize with a documented conversion or calculate/rank within unit-compatible groups.

## Cached Results

XlsxWriter does not calculate formulas. The raw workbook is therefore not deliverable. The generator must pass it through `recalculate_workbook.py`, and QA must inspect the recalculated final file with both formula and `data_only` views.

Cache presence is not semantic proof. Important outputs also need exact cell assertions in the QA contract.

## Contradictions

Before authoring a model with a supplied expected result, independently evaluate the supplied recurrence. If the assumptions and expected result disagree:

1. Keep the supplied assumptions unchanged.
2. Do not hide the expected value in another cell.
3. Do not alter the recurrence to force the target.
4. Report the conflicting requirements and ask which should be authoritative.
