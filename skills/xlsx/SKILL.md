---
name: xlsx
description: "Create formula-driven XLSX workbooks (budgets, forecasts, models, tables, charts) and read or analyze XLSX/XLSM/CSV/TSV data. Uploaded workbooks are analyzed, not binary-edited."
---

# XLSX

Read `<skills-root>/artifact-taste/SKILL.md` first: decide how this workbook should be organised (a model, a decision surface, a queue, a ledger, a scenario lab…) before you open the kit. In a workbook the originality is in the information architecture and how a reader moves through it, not in decoration.

New workbooks: a short Python generator against `kit.py` (XlsxWriter underneath); this page covers its API. Never hand-write workbook XML, install packages, or save an uploaded workbook with openpyxl. Use the `<skills-root>` and `<project-root>` paths you were given literally. Generator in `<project-root>/src/`, result in `<project-root>/out/`.

```python
# Direction: <subject material, how the sheets are organised, why>
import sys; sys.path.insert(0, "<skills-root>/xlsx")
from kit import Book

b = Book("<project-root>/out/budget.xlsx", accent="<chosen colour>", footer="Fictional scenario")
s = b.sheet("Budget", widths=[26, 12, 14, 16])          # column widths in characters, from A
s.title("Community Garden Budget", "Fictional scenario for illustration only.")
t = s.table("A4", ["Item", "Quantity", "Unit cost", "Subtotal"],
            [["Materials", 8, 150, "=B{r}*C{r}"], ["Soil", 20, 40, "=B{r}*C{r}"]],
            fmts=["text", "int", "money", "money"], total="Grand total", sums=3)
s.legend()                                               # below the table
s.chart(b.chart("column", "Subtotal by item (USD)", t.col(0), [("Subtotal", t.col(3))]), "A:D", rows=18)
b.finish(expect={t.total(3): 2000})                      # exact result known from the brief
```

Run `python <project-root>/src/generate.py`: it prints `OK ... validator=ok` or the issues. Then look at every printed page with `python <skills-root>/artifact-taste/preview.py <project-root>/out/<file>.xlsx`, fix, rebuild. With charts `finish()` runs the generator a second time to fill chart caches, so keep it deterministic and re-runnable.

## API

- `Book(path, accent, footer, font="Arial")`: `accent` is required (choose it from the subject); `font` is the workbook font (Arial, Times New Roman or Courier New render the same everywhere). `b.sheet(name, widths, grid=False)`: `grid=True` keeps screen gridlines (raw data sheets).
- `s.title(text, sub)` rows 1-2. `s.put("B3", value, role, fmt)`: role `in calc link total head label note`, or `"in:money"`. `s.link("A3", "Sheet")`.
- `s.table(at, headers, rows, fmts, total=label, sums=[cols], freeze=True, filt=False, inputs=True)` returns `t`: header at `at`, data below, total row right under the last data row. Formula cell `"=B{r}*C{r}"`: `{r}` its row, `{p}` the row above. `{p}` raises in the first data row: use a tuple `(first_row_cell, later_rows_cell)`, e.g. `("=Inputs!$B$4", "=B{p}*(1+Inputs!$B$5)")`. Numbers and `datetime.date` become blue inputs (`inputs=False` for source data). `fmts`: `money` (whole dollars; cents if a typed-in number has cents), `money0`, `cents`, `int dec pct date year text`, any Excel format, or `role:fmt`.
- `t.col(j)` data range (no total), `t.cell(j, row)` one cell (row 0 first, -1 last), `t.total(j)`: absolute refs like `Model!$B$5:$B$16` for charts and formulas (prefix `=` for one cell).
- `s.inputs("A4", [(label, value, fmt, note)])`: two columns, no header: label in A, blue value in B (number, or `datetime.date` written as a real date), optional muted note in C (`note` may be omitted). Returns `{label: "Inputs!$B$4"}`; use `"=" + refs[label]` or inside formulas.
- `s.kpi("A4", [(label, "=formula", fmt)])`: one tile per column, two rows.
- `s.legend()`: swatches for the styles on this sheet; call after its tables. Column A, two rows below the last row; writes nothing without inputs or formulas. `s.legend("A20")` places it.
- `b.chart(kind, title, cats, [(name, values_ref)], nf="money0", labels=None, cat_nf=None)`: kind `column bar line area pie doughnut`, `column:stacked`. `(name, ref, {"as": "line"})` plots on a second axis. Value labels default on for one column/bar series. A date column's format carries to the category axis (`mmm yy` for `date`); `cat_nf` overrides. Pie: one series, percentage labels, a colour per slice; `nf="cents"` for cent values.
- `s.chart(chart, "A12:D30")` fills that cell block; `s.chart(chart, "A:D", rows=16)` goes one blank row below everything written so far (charts stack).
- `b.finish(expect={t.total(3): value})`: print setup, recalculate, write `<out>.qa.json`, validate. Print area = all written cells and charts (`s.print_area("A1:D26")` overrides). A short sheet prints on one page, top-aligned and enlarged; a long one one page wide with a repeated header. `expect` keys: `t.total(j)`, `t.cell(j, row)`, `"Sheet!D8"`; only for results the brief gives or that follow without ambiguity.
- Raw XlsxWriter: `s.ws`, `b.wb` (formulas written there get no chart cache).

## Rules

- Every derived cell is a formula; hard-code only supplied facts, labels and assumptions. Other sheets' values are reached by formula.
- Inputs are the blue cells; keep the legend or a sentence saying so. Percentages are stored as fractions.
- Do not quote sheet names that need no quotes (`Forecast!B5`); `t.col` and `s.inputs` handle this.
- Five or more sheets: first sheet `Overview` or `Index` with `s.link` to each.
- Guard a possible zero divisor with `IF`; no blanket `IFERROR`. Do not rank or sum values in different units.
- If the brief's expected result contradicts its own inputs, report it; never place the expected number elsewhere.
- Fictional or sample data is labelled as such on the sheet and in the footer.

## Other

- Existing `.xlsx`/`.csv` to read: `references/read-analyze.md`. CSV cleaning, QA contract keys: `references/data.md`. Change a workbook built earlier: `references/continuation.md`. Print and formula-engine pitfalls: `references/advanced.md`. Validator alone: `scripts/validate_workbook.py <file> --json`.
