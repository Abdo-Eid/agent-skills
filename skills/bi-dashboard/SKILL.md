---
name: bi-dashboard
description: Create polished, self-contained HTML business-intelligence dashboards from local tabular data using the baked React, Vite, ECharts, DuckDB, and pandas runtime.
license: Proprietary; see /workspace/LICENSE.
---

# BI Dashboard

Build a polished business intelligence dashboard as one self-contained HTML artifact. Use the React/Vite/ECharts scaffold in this skill, aggregate data locally with DuckDB, and deliver `outputs/index.html` as the final downloadable file.

## Use When

Use this skill for BI, analytics, KPI, reporting, pipeline, sales, finance, operations, or executive dashboard requests.

Do not use this skill for admin panels, SaaS control panels, account pages, CMS dashboards, product UI screens, or full web apps. Those are app-building tasks, not BI dashboard artifacts.

## Workspace

Work from this skill's scaffold directory:

```bash
cd scaffold
```

The output artifact is:

```text
scaffold/outputs/index.html
```

The host application or calling agent decides how to rename, copy, upload, or serve that file.

## File Boundary

Fixed files — do not read or overwrite these during a dashboard task. They are pre-built infrastructure:

- `scripts/ingest.py`
- `scripts/profile.py`
- `src/Chart.jsx`
- `src/main.jsx`
- `src/styles.css`
- `index.html`
- `vite.config.js`
- `package.json`

Task-specific files. Create or replace these for each dashboard task:

- `aggregate.py`
- `src/App.jsx`
- `data/dashboard-data.json`
- `outputs/index.html`

Never modify uploaded input files.

`aggregate.py` is a task template. Customize its `INPUT` path and aggregation section for the task, but keep its import of `scripts/ingest.py`, script-relative paths, JSON validation, compact output, and reconciliation checks.

## Required Workflow

Use a two-pass workflow: first profile and plan the business story, then write the final aggregation and dashboard.

1. Run the fixed profiler on the input file to get compact planning facts. From `scaffold/`, use:

```bash
python3 ../scripts/profile.py <path-to-input-file>
```

2. Use the profile output to make a short internal dashboard plan before writing final code. Decide:
   - headline/story
   - KPI definitions and denominators
   - chart list and each chart's purpose
   - insight and action strategy

   The profiler output is sufficient for planning. Do not run additional ad-hoc queries or inspect the raw CSV before writing `aggregate.py`. If you need to run exploratory Python, write a `.py` file and execute it — do not use multi-line inline `python -c` commands, they fail due to shell quoting.
3. Customize `aggregate.py` using `scripts/ingest.py` helpers and DuckDB to produce the final data needed by that plan.
4. Run `python3 aggregate.py` and fix failures before writing the dashboard.
5. Write `src/App.jsx` to import `data/dashboard-data.json` and render the final dashboard.
6. Run `npm run build` from the scaffold directory.
7. Verify the artifact exists and is non-empty:

```bash
test -s outputs/index.html
```

8. Verify the output is self-contained. It must not rely on CDN URLs or external runtime assets.

Mandatory output rule: the final HTML must be usable by itself. Do not add CDN scripts, remote CSS, remote fonts, remote map assets, or runtime data fetches.

If you need ECharts chart type guidance, read `references/echarts.md`. If you need DuckDB query patterns, read `references/duckdb.md`. Read reference files only when you have a specific gap — not upfront. For a written Markdown report after delivery, read `references/report.md`.

## Data Contract

`aggregate.py` must write portable JSON to `data/dashboard-data.json`: strings, numbers, booleans, arrays, and objects only.

Include only data the dashboard uses. Prefer compact aggregates over raw rows. Add reconciliation checks before writing output, for example grouped totals matching the row count or an intentionally filtered denominator.

The fixed `scripts/ingest.py` helpers support CSV, TSV, XLSX, and XLS inputs. Reuse them for column cleaning, header detection, file hash metadata, DuckDB DataFrame registration, JSON validation, and compact success output instead of reimplementing ingestion in `aggregate.py`.

The fixed `scripts/profile.py` profiler is for planning only. It should print compact summaries such as row count, columns, date ranges, notable nulls, and top categorical values. Do not print raw rows or large grouped tables for planning.

`src/App.jsx` must import the generated JSON directly:

```jsx
import dashboardData from '../data/dashboard-data.json'
```

Do not fetch data at runtime.

The scaffold `src/App.jsx` is only a replaceable example. During a real dashboard task, replace its sample data and chart option with imports from `data/dashboard-data.json`.

## Dashboard Contract

The dashboard must be a finished executive artifact, not a chart dump.

Include:

- A headline assessment tied to measured data.
- KPI cards that separate volume, quality, and risk when the data supports it.
- Comparison-friendly charts with clear labels and short supporting notes.
- A concise insight panel with measured findings.
- A concise action panel with specific next moves tied to the data.

Use business language. Avoid generic advice such as "monitor performance" unless it names the measured segment, stage, source, count, rate, or trend.

Every insight and action must follow the Finding → Meaning → Action pattern: what the data shows, why it matters, and what to do about it. If you need writing patterns, confidence language, or headline guidance, read `references/business-synthesis.md`.

Use the default CSS classes as a flexible vocabulary, not a rigid template. Prefer `dashboard-shell`, `dashboard-header`, `headline-card`, `kpi-grid`, `kpi-card`, `dashboard-grid`, `chart-card`, `insight-panel`, and `action-panel` for responsive/print-safe structure. Extend with task-specific classes, inline styles, or custom sections when the data story needs a distinct treatment. If you need layout composition guidance, read `references/layout.md`.

Set readiness after the dashboard renders:

```js
window.__DASHBOARD_READY__ = true
```

## ECharts Rules

Use the fixed `Chart` wrapper from `src/Chart.jsx`:

```jsx
<Chart option={echartsOptionObject} style={{ height: '320px' }} />
```

Pass a standard ECharts option object. The wrapper handles SVG renderer registration and resize.

The scaffold uses SVG rendering to avoid canvas print/export artifacts. Do not switch to canvas.

If you need additional ECharts chart or component types, add the imports and `echarts.use([...])` registration in `src/Chart.jsx` only for the needed types.

For geographic charts, do not put a pie series on a geo coordinate system. Use a `map` series for region coloring or `scatter` / `effectScatter` with `coordinateSystem: 'geo'` for point data.

## Failure Rules

Do not install dependencies at runtime. Do not run `npm install`, `pip install`, `bun install`, or project initialization commands.

If `duckdb`, `vite`, React, ECharts, or `vite-plugin-singlefile` is missing, report that the runtime environment is missing required dependencies. Do not fix the environment from inside the task.

If build output is missing or empty, do not deliver it. Read the failing command output, fix the root cause once, rebuild, and recheck `outputs/index.html`.
