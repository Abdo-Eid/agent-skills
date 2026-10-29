# Read And Analyze Workbook Data

Reading and analysis never modify the supplied file. Use the helper for structure and cache discovery, then use pandas only for the requested analysis.

## Inspect First

```bash
python <skills-root>/xlsx/scripts/read_workbook.py <project-root>/assets/input.xlsx
python <skills-root>/xlsx/scripts/read_workbook.py <project-root>/assets/input.xlsx --sheet Sales --json
python <skills-root>/xlsx/scripts/read_workbook.py <project-root>/assets/input.csv --json
```

The placeholders stand for the skills and project roots you were given (see `SKILL.md`); replace them with the real paths.

For XLSX/XLSM, the report includes sheet dimensions, formula counts, missing cached values, tables, charts, merged ranges, frozen panes, and sample rows. For CSV/TSV, it reports encoding, dimensions, columns, null counts, and sample rows.

## Analyze With Pandas

```python
import pandas as pd

sheets = pd.read_excel("input.xlsx", sheet_name=None)
sales = sheets["Sales"]
totals = sales.groupby("Region", dropna=False)["Revenue"].sum()
```

Compute aggregations directly from source columns. Do not reconstruct a column before summing it unless the user explicitly requested a transformation.

## Profile Before Cleaning

Before choosing cleaning rules or workbook structure, record:

- Source path/name, row and column counts, column order, and a content hash when provenance matters.
- Inferred and observed types, null counts, whitespace-only values, and parse failures.
- Candidate key columns, uniqueness, duplicates, and blank keys.
- Distinct/category counts and representative values for low-cardinality columns.
- Numeric ranges, quantiles, suspicious sentinels, and unit labels.
- Whether metrics that look related are actually comparable (for example MPG versus MPGe, nominal versus inflation-adjusted currency, or local versus UTC timestamps).

Cleaning is column-specific. Preserve the raw observations unchanged, document each rule, and retain a source-row number or stable source key in every cleaned/selected table. Values such as `0`, `-1`, `N/A`, `Unknown`, or empty strings are not interchangeable unless the source semantics prove they are.

Keep exact machine/source headers on the immutable raw sheet. If names are cryptic, add a data dictionary with source header, readable display label, definition, unit, cleaning rule, and any caveat. Use display labels on summaries and charts while retaining the source header or key wherever lineage must be verified; do not create a second visual header row inside a data table.

For threshold-driven selections, report sensitivity near the cutoff: ties, records just outside the threshold, and how many candidates each filter removes. Rank within comparable groups unless a defensible common-unit normalization is explicit.

## Formula And Cache Semantics

- Formula text comes from an openpyxl load with `data_only=False`.
- Stored calculated values come from a separate load with `data_only=True`.
- A missing cached value is unknown, not zero.
- A cached value may be stale; report when no calculation provenance is available.
- Never load an uploaded workbook and call `save()`.

## Output Quality

- Monetary values use separators and requested decimals.
- Percentages are labeled and formatted as percentages.
- Counts are integers unless fractional counts are meaningful.
- Excel row numbers account for one-based rows and header rows.
- Report nulls, duplicates, mixed types, sentinel handling, key reconciliation, and formula-cache limits.

## Supported Inputs

- `.xlsx` and `.xlsm`: read and analyze only.
- `.csv` and `.tsv`: read and analyze only.
- `.xls`: not supported by this skill runtime.

If the user asks for a transformed deliverable, create a new `.xlsx` through the CREATE route rather than overwriting the uploaded source.
