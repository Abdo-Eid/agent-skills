# Workbook Formatting And Print Quality

Use XlsxWriter formats to encode meaning, hierarchy, and numeric precision. Formatting must remain readable on screen and in pages rendered by a compatible office renderer.

## Semantic Roles

| Role | Recommended treatment |
|---|---|
| Input or assumption | Blue font plus an `Input` label, legend, or light fill |
| Same-sheet formula | Black text with the correct number format |
| Cross-sheet formula | Green text plus a formula/source label where useful |
| Warning or review item | Amber fill plus explicit warning text |
| Error or failed check | Red accent plus explicit status text |
| Header | Strong contrast, bold type, restrained fill |
| Total | Bold with a top border and matching number format |

Color must not be the only signal.

## Format Registry

Create formats once and reuse them:

```python
formats = {
    "header": workbook.add_format({
        "bold": True,
        "font_color": "#FFFFFF",
        "bg_color": "#17324D",
        "align": "center",
        "valign": "vcenter",
        "border": 0,
    }),
    "input_currency": workbook.add_format({
        "font_color": "#0000FF",
        "num_format": '$#,##0.00;($#,##0.00);-""',
    }),
    "formula_currency": workbook.add_format({
        "font_color": "#000000",
        "num_format": '$#,##0.00;($#,##0.00);-""',
    }),
    "cross_sheet_currency": workbook.add_format({
        "font_color": "#008000",
        "num_format": '$#,##0.00;($#,##0.00);-""',
    }),
    "percentage": workbook.add_format({"num_format": "0.0%"}),
    "percentage_precise": workbook.add_format({"num_format": "0.00%"}),
    "integer": workbook.add_format({"num_format": "#,##0"}),
    "decimal": workbook.add_format({"num_format": "#,##0.00"}),
    "year": workbook.add_format({"num_format": "0"}),
    "date": workbook.add_format({"num_format": "mmm d, yyyy"}),
}
```

Use the precision requested by the user. Store percentages as decimals (`0.08` for 8%).

## Layout

- Give label columns enough width for the longest meaningful label.
- Use wrapped text only when width expansion would make the sheet unwieldy.
- Freeze headers and identifier columns on long tables.
- Keep normal worksheet gridlines visible on raw and cleaned data sheets. A summary/dashboard may hide them intentionally, but do not turn the source table into a blank white canvas or hide columns merely for presentation.
- Gridlines are an on-screen worksheet view and do not print. When printed raw/cleaned rows must remain traceable, apply a table style or thin low-contrast borders (for example `#D9E2EC`) to the printable cell range, including intentionally blank cells.
- Use alternating row fills sparingly; table styles are preferable for large datasets.
- Keep assumptions visible and grouped.
- Put reconciliations near the outputs they validate.
- Avoid decorative merged cells in data tables.
- Do not solve machine-oriented headers by stacking a second header row inside a table. Preserve source headers on raw data and map them to readable labels, definitions, and units in a separate data dictionary; summaries and charts may use those display labels.

## Print And Render

Configure every sheet expected to appear in QA previews:

```python
sheet.set_landscape()
sheet.set_paper(9)  # A4
sheet.fit_to_pages(1, 0)  # one page wide, as many pages tall as the rows need
sheet.repeat_rows(0, 1)  # zero-based, inclusive
sheet.set_margins(0.25, 0.25, 0.5, 0.5)
sheet.set_header("&LNorthstar&CForecast&R&A")
sheet.set_footer("&LSource data&CPage &P of &N&R&D")
sheet.print_area("A1:M20")
sheet.hide_gridlines(0)  # retain on-screen worksheet gridlines
```

Use portrait for narrow summaries and landscape for time-series or wide tables. Data sheets normally use one page wide and unlimited pages tall; never shrink hundreds of rows onto one page. Summary sheets may use a bounded height when the result remains readable.

## Charts

- Titles state the metric and unit.
- Categories and values reference worksheet ranges.
- Legends do not cover the plot area.
- Axis number formats match source values.
- Series with materially different scales use separate axes or separate charts.
- Use markers, line styles, labels, or direct annotation so color is not the only distinction.
- Keep the chart within the configured print area.

## Navigation

At five or more worksheets, put `Index` first and link major sheets:

```python
index.write_url("A3", "internal:'Executive Summary'!A1", string="Executive Summary")
```

Name the first sheet `Index`, `Contents`, `Overview`, or `Navigation` so the application QA contract and workbook instructions agree.

## Final Checks

- Years do not display with thousands separators.
- Currency and percentages have explicit precision.
- Negative and zero display conventions are consistent.
- Inputs, formulas, and warnings have non-color labels or context.
- Forecast and summary sheets render without horizontal page fragmentation.
- Chart series remain legible at rendered-page scale.
