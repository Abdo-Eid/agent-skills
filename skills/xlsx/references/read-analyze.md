# Read And Analyze Workbook Data

Reading and analysis never modify the supplied file. Use the helper for structure and cache discovery, then use pandas only for the requested analysis.

## Inspect First

```bash
python <skills-root>/xlsx/scripts/read_workbook.py <project-root>/assets/input.xlsx
python <skills-root>/xlsx/scripts/read_workbook.py <project-root>/assets/input.xlsx --sheet Sales --json
python <skills-root>/xlsx/scripts/read_workbook.py <project-root>/assets/input.csv --json
```

The placeholders are the host-provided roots defined in `SKILL.md`; do not execute them literally.

For XLSX/XLSM, the report includes sheet dimensions, formula counts, missing cached values, tables, charts, merged ranges, frozen panes, and sample rows. For CSV/TSV, it reports encoding, dimensions, columns, null counts, and sample rows.

## Analyze With Pandas

```python
import pandas as pd

sheets = pd.read_excel("input.xlsx", sheet_name=None)
sales = sheets["Sales"]
totals = sales.groupby("Region", dropna=False)["Revenue"].sum()
```

Compute aggregations directly from source columns. Do not reconstruct a column before summing it unless the user explicitly requested a transformation.

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
- Report nulls, duplicates, mixed types, and formula-cache limits.

## Supported Inputs

- `.xlsx` and `.xlsm`: read and analyze only.
- `.csv` and `.tsv`: read and analyze only.
- `.xls`: not supported by this skill runtime.

If the user asks for a transformed deliverable, create a new `.xlsx` through the CREATE route rather than overwriting the uploaded source.
