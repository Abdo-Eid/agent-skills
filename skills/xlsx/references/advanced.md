# Advanced notes

## When kit.py is not enough

`s.ws` is the XlsxWriter worksheet and `b.wb` the workbook. Write extras with them before `b.finish()`: `s.ws.conditional_format(...)`, `s.ws.data_validation(...)`, `b.wb.add_format(...)`. Cell coordinates there are zero-based `(row, col)` or A1 strings. `repeat_rows(first, last)` is zero-based and inclusive.

## Print and gridlines (why kit does what it does)

- `hide_gridlines(0)` PRINTS gridlines; the default `1` hides them on paper and keeps them on screen; `2` hides both. Kit uses 1 for data sheets (`grid=True`) and 2 for presentation sheets.
- Fit-to-page shrinks but never enlarges, so a small sheet lands tiny in a corner. Kit sets an explicit `set_print_scale` computed from column widths and row heights, centers the page, and picks portrait or landscape by whichever fills more.
- Override with `b.sheet(..., fit="page")` (everything on one page) or `fit="width"` (one page wide, as tall as needed).
- Keep charts inside the printed block: `s.chart(chart, "A11:D25")` sizes the chart to those cells.

## Formulas

- Formulas start with `=`, English function names, commas. Absolute refs `$B$4`; sheet names with spaces are quoted (kit's refs do this).
- LibreOffice supplies the cached results. Prefer `SUM(IF)(S)`, `COUNTIF(S)`, `AVERAGEIF(S)`, `INDEX/MATCH`, `IF`; test anything newer through `finish()` before relying on it. A missing cache is a failure, never zero.
- Python may compute an expected value to detect a contradiction in the brief, but the cell must still hold the formula.

## Failure messages from the validator

| Message | Fix |
|---|---|
| formula cache missing / cached error | repair the formula, unsupported function, or bad reference |
| exact formula / expected value mismatch | inspect the formula chain; do not paste the number elsewhere |
| hidden structure / border mismatch | keep source rows visible, add borders |
| chart references unknown sheet / `#REF!` | rebuild ranges from `t.col(...)` |
| navigation (5+ sheets) | first sheet `Overview` or `Index` with links |

Excel and LibreOffice may differ on exotic functions; report the engine limit rather than claiming Excel parity.
