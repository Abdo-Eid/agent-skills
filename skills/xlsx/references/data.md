# Real-data workbooks (CSV cleaning, EDA, shortlists)

Profile the input first (`references/read-analyze.md`: schema, row count, nulls, sentinels, key uniqueness, categories, units). Then build with `kit.py`; `templates/generate_data_workbook.py` is a worked overview/raw/cleaned/profile example to read, not to copy.

## Structure

- `Raw Data`: exact source headers and values, untouched. `s = b.sheet("Raw Data", widths, grid=True)`, `s.table("A1", headers, rows, fmts, inputs=False, filt=True)`.
- `Cleaned Data`: one row per kept record, a source-row number or stable key column, every rule documented, derived columns as formulas that point at Raw Data where practical.
- Summary and chart sheets read from Cleaned Data by formula (`COUNTIFS`, `SUMIFS`, `AVERAGEIFS`, `INDEX/MATCH`; avoid `XLOOKUP`, `FILTER`, `LET`, dynamic arrays: LibreOffice may not cache them).
- `Data Dictionary`: source header, readable label, definition, unit, cleaning rule, caveat. Summaries and charts use the readable labels; do not add a second header row inside a table.
- Treat `0`, `-1`, `N/A`, `Unknown`, blank as distinct unless the source proves they mean the same. Rank only within comparable units, or normalize with a stated method. Report threshold sensitivity (ties, rows just outside the cutoff).
- Screen gridlines stay on (`grid=True`), headers and id columns frozen, no blanket white fill. `table()` already puts a pale rule under every row so printed rows keep their structure. Long sheets print one page wide, header repeated.

## Extra QA contract keys (pass as `b.finish(extra={...})`)

```python
{"requiredTables": [{"sheet": "Cleaned Data", "name": "CleanedDataTable", "ref": "A1:H1274", "dataRows": 1273}],
 "keyRelations": [{"subsetRange": "Shortlist!A2:A13", "supersetRange": "Cleaned Data!A2:A1274", "requireUnique": True}],
 "borderRanges": [{"range": "Cleaned Data!A2:H20", "style": "thin"}],
 "rangeValues": [{"range": "Forecast!B2:M2", "values": ["Jan", "Feb"]}],
 "numberFormats": [{"cell": "Summary!B4", "format": "$#,##0.00;($#,##0.00)"}]}
```

`requiredTables` needs a real Excel table: `s.ws.add_table(r0, c0, r1, c1, {"name": ..., "columns": [{"header": h} for h in headers]})` instead of `s.table` for that range. Defaults written by `finish`: sheets, formula count and caches, required formulas, charts, freeze panes, print orientation and area, gridline visibility. Use exact cells; never accept a value found somewhere else. If a supplied expected value contradicts the data, report it instead of weakening the assertion.
