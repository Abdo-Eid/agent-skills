---
name: xlsx
description: "Create formula-driven XLSX workbooks (budgets, forecasts, models, tables, charts) and read or analyze XLSX/XLSM/CSV/TSV data. Uploaded workbooks are analyzed, not binary-edited."
---

# XLSX

Read `<skills-root>/artifact-taste/SKILL.md`, then `<skills-root>/artifact-taste/xlsx.md`, first: decide how this workbook should be organised (a model, a decision surface, a queue, a ledger, a scenario lab…) before you open the kit. In a workbook the originality is in the information architecture and how a reader moves through it, not in decoration.

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

Run `python <project-root>/src/generate.py`: it prints `OK ... validator=ok` or the issues. Then look at every printed page with `python <skills-root>/artifact-taste/preview.py <project-root>/out/<file>.xlsx`, fix, rebuild. The preview shows the gridlines and the row and column references so you can see and name cells; the workbook's own print setup is not changed by it. With charts `finish()` runs the generator a second time to fill chart caches, so keep it deterministic and re-runnable.

## API

- `Book(path, accent, footer, font="Arial", rtl=False)`: `accent` is required (start from your look's dealt accent) and grows one hue from deep to faint for headers and charts. `font` is the workbook font (Arial, Times New Roman or Courier New render the same everywhere). `rtl=True` mirrors every sheet for Arabic: text and numbers aligned right, charts running right to left, legend and footer in Arabic; write columns in reading order. `b.sheet(name, widths, grid=True)`: screen gridlines stay on, as in any Excel sheet, and never print; `grid=False` hides them, for a chart page.
- `s.title(text, sub)` rows 1-2. `s.put("B3", value, role, fmt)`: role `in calc link total head label note`, or `"in:money"`. `s.link("A3", "Sheet")`.
- `s.table(at, headers, rows, fmts, total=label, sums=[cols], totals={col: "=formula"}, freeze=True, filt=False, inputs=True, rh=20)` returns `t`: header at `at`, data below, total row right under the last data row; `rh` is the row height. Headers do not wrap, so make a column as wide as its header. Formula cell `"=B{r}*C{r}"`: `{r}` is its row number, `{p}` the number of the row above, so write `A{p}`: a bare `YEAR({p})` reads the row number as a date and gives 1900. `{p}` raises in the first data row: use a tuple `(first_row_cell, later_rows_cell)`, e.g. `("=Inputs!$B$4", "=B{p}*(1+Inputs!$B$5)")`. Numbers and `datetime.date` become blue inputs (`inputs=False` for source data). `fmts`: `money` (whole dollars; cents if a typed-in number has cents), `money0`, `cents`, `int dec pct date year text`, any Excel format, or `role:fmt`.
- `totals` sets total-row cells by formula, for ratios and weighted means: `{r}` is the total row, `{a}` and `{z}` the first and last data row (keys are column numbers or header names): `totals={"Margin": "=D{r}/C{r}", 4: "=SUMPRODUCT(B{a}:B{z},E{a}:E{z})/SUM(B{a}:B{z})"}`.
- `t.rule(col, op, value, cells=False, **format_options)`: colours every data row (`cells=True`: only that column) whose value passes the test, in the alert colours unless you pass format options: `t.rule("Margin", "<", 0)`, `t.rule("Status", "=", "Late", bg_color="#FFF3CD")`.
- `t.col(j)` data range (no total), `t.cell(j, row)` one cell (row 0 first, -1 last), `t.total(j)`: absolute refs like `Model!$B$5:$B$16`, for charts and inside formulas: `"=SUM(" + t.col(2) + ")"`, `"=" + t.total(3)`.
- `s.inputs("A4", [(label, value, fmt, note)])`: two columns, no header: label in A, blue value in B (number, or `datetime.date` written as a real date), optional muted note in C (`note` may be omitted). Returns `{label: "Inputs!$B$4"}`; use `"=" + refs[label]` or inside formulas.
- `s.kpi("A4", [(label, "=formula", fmt)])`: one tile per column, two rows.
- `s.legend()`: one line saying the blue cells are inputs; call after its tables. Column A, two rows below the last row; writes nothing without inputs. `s.legend("A20")` places it.
- `b.chart(kind, title, cats, [(name, values_ref)], nf="money0", labels=None, cat_nf=None, y_min=None, legend=None)`: returns a raw XlsxWriter chart, so its methods stay open, but `.set_x_axis(...)` and `.set_y_axis(...)` replace everything the kit set on that axis, right-to-left direction included. Category labels already sit below negative bars. A legend shows for several series or a pie; `legend=False` hides it. In a right-to-left book keep `%` out of series names: it flips in the legend. Bars start at zero: pass `y_min=0` unless values go negative. Kind `column bar line area pie doughnut`, `column:stacked`. `(name, ref, {"as": "line"})` plots on a second axis. Value labels default on for one column/bar series. A date column's format carries to the category axis (`mmm yy` for `date`); `cat_nf` overrides. Pie: one series, percentage labels, a colour per slice; `nf="cents"` for cent values.
- `s.chart(chart, "A12:D30")` fills that cell block; `s.chart(chart, "A:D", rows=16)` goes one blank row below everything written so far (charts stack).
- `b.finish(expect={t.total(3): value})`: print setup, recalculate, write `<out>.qa.json`, validate. Print area = all written cells and charts (`s.print_area("A1:D26")` overrides). A short sheet prints on one page, top-aligned and enlarged; a long one one page wide with a repeated header. `expect` is optional. Its keys: `t.total(j)`, `t.cell(j, row)`, `"Sheet!D8"`; only for results the brief gives or that follow without ambiguity.
- The whole of XlsxWriter stays open through `s.ws` and `b.wb` (formulas written there get no chart cache): `s.ws.conditional_format(...)`, `s.ws.data_validation(...)`, sparklines. `b.fmt(role, fmt, **format_options)` gives a kit format with your changes, for those calls or as `s.put(..., **format_options)`.

## Dashboards

A page of components on a pale ground, for when one is wanted: read `artifact-taste/xlsx.md` on when. It can be static, or live with dropdowns. It has no macros, and XlsxWriter cannot write slicers or pivot tables, so a dropdown gives one value at a time.

The wiring, in this order, because tabs appear in the order they are created and formulas may name sheets made later:

1. `d = b.dash(name, cols=14, col_w=11.5, row_h=18)` first. With five or more sheets name it `Dashboard` or `لوحة التحكم`.
2. The data sheets, with `b.sheet`, as plain as any other.
3. Live page only: dropdowns, `ref = d.select(...)`, then a helper sheet of formulas that read `ref` and the data, then `helper.ws.hide()`. Charts need ranges of cells, so everything a chart shows lives here. A static page has no dropdowns: its cards and charts read the data sheets, or a helper sheet if a chart needs totals.
4. The page: cards and charts read those cells.

Components are placed by grid position, `col` from 1 to `cols`, `row` from 1. Blocks may not overlap; keep one empty row between them. What goes where comes from what this reader asks first, and a page needs only the blocks that answer something.

- `d.header(title, sub)`: band across rows 1 and 2. `d.nav(row, [sheet names])`: a strip of links to the other sheets.
- `ref = d.select(col, row, span, label, options, default)`: label at `row`, dropdown at `row + 1`. `options` is a list of strings or a range such as `"=" + t.col(0)`. Returns its absolute reference.
- `d.card(col, row, span, label, value, nf=None, note=None, alert=None)`: 4 rows. `nf` is a format name or any Excel format. `value` and `note` may be formulas. `alert=">1"` turns the value red when true.
- `d.chart(chart, col, row, span, rows, title)`: a panel with a chart from `b.chart(kind, "", cats, series, ...)`. `rows` includes the title row. The title may be a live formula: `'="Load in "&' + ref`.
- `d.matrix(col, row, title, rows, cols, cell, nf="pct", over=None, label_span=2)`: heat table. `rows` and `cols` are labels, `cell(i, j)` gives a value or formula. Takes `len(rows) + 3` rows and `label_span + len(cols)` columns. `over=1` marks values above it in red.
- `d.text(col, row, span, value, rows=1, **format_options)`: a note on the ground. `d.panel(col, row, span, rows, title)`: an empty white block, for anything you place yourself.

Useful to know:

- A choice like "All": `IF(ref="All","*",ref)` as the `SUMIFS` criterion.
- A bar that turns red past a limit is two series, `=IF(x>limit,0,x)` and `=IF(x>limit,x,0)`, the first with `{"overlap": 100}` and the second with `{"fill": {"color": kit.ALERT}}`.
- Stick to functions every engine knows: `SUMIFS INDEX MATCH COUNTIF TEXT`. Newer ones (`XLOOKUP FILTER UNICHAR`) fail the recalculation check.
- In Arabic, a formula that ends text with a percentage needs `&"‎"` after it, or the sign jumps to the wrong side.
- `expect` works on a card: `"Dashboard!B8"` holds its result at the default choices.

## Rules

- Every derived cell is a formula; hard-code only supplied facts, labels and assumptions. Other sheets' values are reached by formula.
- Inputs are the blue cells; keep the legend or a sentence saying so. Percentages are stored as fractions.
- Do not quote sheet names that need no quotes (`Forecast!B5`); `t.col` and `s.inputs` handle this.
- Five or more sheets: first sheet `Overview` or `Index` with `s.link` to each, or a dashboard with `d.nav`.
- Guard a possible zero divisor with `IF`; no blanket `IFERROR`. Do not rank or sum values in different units.
- If the brief's expected result contradicts its own inputs, report it; never place the expected number elsewhere.
- Fictional or sample data is labelled as such on the sheet and in the footer.

## Other

- Existing `.xlsx`/`.csv` to read: `references/read-analyze.md`. CSV cleaning, QA contract keys: `references/data.md`. Change a workbook built earlier: `references/continuation.md`. Validator alone: `scripts/validate_workbook.py <file> --json`.
