# Create A New XLSX Workbook

Use this route only for a new workbook. XlsxWriter owns package creation; the generator owns workbook content; LibreOffice owns recalculation; `docQa` owns validation and visual review.

## Start From The Scaffold

Copy the matching template into the active project and adapt it. Use `generate_workbook.py` for a formula model or `generate_data_workbook.py` for CSV-backed cleaning/EDA:

```bash
cp <skills-root>/xlsx/templates/generate_workbook.py \
  <project-root>/src/generate.py
python <project-root>/src/generate.py \
  --skills-root <skills-root> \
  --output <project-root>/out/report.xlsx
```

`<skills-root>` and `<project-root>` are the host-provided values defined in `SKILL.md`; do not execute the angle-bracket placeholders literally. Omit `--skills-root` when the host already sets `AGENT_SKILLS_ROOT`.

Do not run package installers. A missing XlsxWriter, openpyxl, pandas, or LibreOffice dependency is a runtime-contract failure.

## Plan The Workbook

Before writing source, decide:

- Exact sheet names and order.
- Source identity, provenance, immutable raw-data range, and row/key lineage.
- A source-header data dictionary with readable display labels, definitions, and units when machine names are not natural for users.
- Input profile: schema, row count, nulls, sentinel candidates, inferred types, key uniqueness, category counts, and unit semantics.
- Cleaning rules by column, including why each sentinel or type conversion is valid.
- Input and assumption cells.
- Formula rows and cross-sheet dependencies.
- Executive outputs and reconciliation checks.
- Number formats and input indicators.
- Tables, filters, validation, and frozen panes.
- Chart purpose, ranges, axis scales, and labels.
- Print area, orientation, repeating rows, and fit-to-width.
- Exact QA assertions that prove row counts, table bounds, key lineage, formulas, outputs, and visible/print structure.

## Build With XlsxWriter

```python
from pathlib import Path
import xlsxwriter

raw_path = output_path.with_name(f".{output_path.stem}.raw.xlsx")
workbook = xlsxwriter.Workbook(raw_path)
worksheet = workbook.add_worksheet("Summary")

header = workbook.add_format({
    "bold": True,
    "font_color": "#FFFFFF",
    "bg_color": "#17324D",
    "align": "center",
    "valign": "vcenter",
})
currency = workbook.add_format({"num_format": '$#,##0.00;($#,##0.00);-""'})

worksheet.write("A1", "Metric", header)
worksheet.write("B1", "Value", header)
worksheet.write_formula("B2", "=SUM(Data!B2:B13)", currency)

workbook.close()
```

Check `workbook.close()` errors and require a non-empty raw file before recalculation.

## Formula-First Models

Write derived values with `write_formula()`:

```python
forecast.write_formula("B7", "=B3+B4+B5-B6", currency_formula)
forecast.write_formula("B8", "=B7/12", currency_formula)
summary.write_formula("B4", "=Forecast!M7", cross_sheet_currency)
```

Only supplied assumptions and source observations are hard-coded. A Python calculation may be used to detect contradictory acceptance criteria before building, but it must not replace the workbook formula.

## Charts

Charts must communicate a specific question and use worksheet ranges rather than copied constants:

```python
chart = workbook.add_chart({"type": "line"})
chart.add_series({
    "name": "=Forecast!$A$7",
    "categories": "=Forecast!$B$2:$M$2",
    "values": "=Forecast!$B$7:$M$7",
    "line": {"color": "#245B8A", "width": 2.25},
    "marker": {"type": "circle", "size": 5},
})
chart.add_series({
    "name": "=Forecast!$A$8",
    "categories": "=Forecast!$B$2:$M$2",
    "values": "=Forecast!$B$8:$M$8",
    "y2_axis": True,
    "line": {"color": "#C65D38", "width": 2.25},
    "marker": {"type": "diamond", "size": 5},
})
summary.insert_chart("D3", chart, {"x_scale": 1.35, "y_scale": 1.2})
```

Use a secondary axis only when units or magnitudes differ enough to flatten one series. Never rely on color alone; use series names, markers, line styles, or data labels.

## Print Setup

Every important sheet needs deliberate print behavior because `docQa` renders the workbook:

```python
forecast.set_landscape()
forecast.fit_to_pages(1, 1)
forecast.repeat_rows(0, 1)
forecast.print_area("A1:M11")
forecast.set_margins(0.25, 0.25, 0.5, 0.5)
forecast.hide_gridlines(0)
```

`repeat_rows(first_row, last_row)` is zero-based and inclusive. Worksheet gridlines are a screen setting and are not printed; use a restrained table style or thin, pale borders on printable data ranges. Do not force a dense sheet to one unreadably small page. Use one page wide and an appropriate number of pages tall when necessary.

## QA Contract

Write `<final-path>.qa.json` beside the workbook. Use exact cells rather than global value searches:

```json
{
  "schemaVersion": 1,
  "exactSheets": ["Assumptions", "Forecast", "Executive Summary"],
  "minimumFormulaCells": 12,
  "requireFormulaCaches": true,
  "requiredFormulas": [
    {"cell": "Executive Summary!B5", "formula": "=Forecast!M7"}
  ],
  "expectedValues": [
    {"cell": "Executive Summary!B5", "value": 1921385.65, "tolerance": 0.01}
  ],
  "rangeValues": [
    {"range": "Forecast!B2:M2", "values": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]}
  ],
  "requiredCharts": [
    {"sheet": "Executive Summary", "minimum": 1}
  ]
}
```

For a real-data workbook, assert its tables, lineage, and visible/print structure directly:

```json
{
  "schemaVersion": 1,
  "exactSheets": ["Raw Data", "Cleaned Data", "Shortlist"],
  "requiredTables": [
    {"sheet": "Cleaned Data", "name": "CleanedDataTable", "ref": "A1:H1274", "dataRows": 1273}
  ],
  "keyRelations": [
    {"subsetRange": "Shortlist!A2:A13", "supersetRange": "Cleaned Data!A2:A1274", "requireUnique": true}
  ],
  "sheetViews": [
    {"sheet": "Cleaned Data", "showGridLines": true, "allowHiddenRows": false, "allowHiddenColumns": false}
  ],
  "borderRanges": [
    {"range": "Cleaned Data!A2:H20", "style": "thin"}
  ]
}
```

Include expected values only when they are supplied or independently derivable without ambiguity. If the task contradicts itself, report that instead of weakening the assertion.

## Final Build

The generator must call:

```bash
python <skills-root>/xlsx/scripts/recalculate_workbook.py \
  <project-root>/out/.report.raw.xlsx <project-root>/out/report.xlsx
```

Then require `<project-root>/out/report.xlsx` and `<project-root>/out/report.xlsx.qa.json` to be non-empty. Call `docQa` through the application tool, not through the shell.

## Pre-Delivery Checklist

- All derived cells are formulas.
- Inputs and formulas have distinct labels or styling.
- Number formats match the data type and precision.
- Formula references use the intended absolute/mixed behavior.
- Charts reference live worksheet ranges and have readable scales.
- Important sheets have frozen panes and useful widths.
- Real-data workbooks preserve raw observations, declare cleaning rules, and expose source-row or source-key lineage.
- Raw sheets preserve exact source headers; summaries use readable labels backed by a source-header data dictionary.
- Ranking and aggregation compare like units or disclose a defensible normalization/grouping method.
- Print areas render coherently.
- The QA contract targets exact cells and structures.
- The recalculated final workbook, not the raw workbook, is passed to `docQa`.
