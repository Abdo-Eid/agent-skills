---
name: bi-dashboard
description: Create polished, self-contained HTML business-intelligence dashboards from CSV/XLSX input or a deterministic supplied specification with a project-local React, Vite, ECharts, DuckDB, and pandas starter.
license: Proprietary; see the repository-root LICENSE.
---

# BI Dashboard

Build a polished business intelligence dashboard as one self-contained HTML artifact. Initialize a writable project from this skill's source-only React/Vite/ECharts starter, aggregate data locally with DuckDB, and build `outputs/index.html`.

## Skill Layout

```text
<skills-root>/bi-dashboard/
  SKILL.md                         # this contract
  requirements.txt                # fixed Python dependency declaration
  scaffold/                        # immutable starter copied into a writable project
    aggregate.py                   # replaceable domain-neutral capability fixture
    package.json
    package-lock.json
    index.html
    vite.config.js
    data/dashboard-data.json       # replaceable domain-neutral sample data
    src/
      App.jsx                      # replaceable domain-neutral capability fixture
      Chart.jsx                    # fixed SVG/readiness wrapper
      main.jsx                     # fixed application entry point
      styles.css                   # fixed light/print design system
  scripts/
    init-project.mjs               # required project copier and locked install
    ingest.py                      # fixed input helpers
    profile.py                     # fixed planning profiler
    validate-output.mjs            # portable static check
    preflight-browser.mjs          # portable browser/print check
  references/
    style-default.md               # visual and print direction
    echarts.md                     # chart selection and label rules
    duckdb.md
    layout.md
    business-synthesis.md
    report.md
```

Never recreate the starter file-by-file. Run the initializer once so the writable project starts as an exact copy of `scaffold/`, then edit only the task-owned files listed below. The installed skill tree remains read-only.

## Visual Direction

Use a light, information-first visual language by default: warm white or light neutral surfaces, charcoal text, restrained accents, crisp data grids, practical typography, and clear decision hierarchy. This remains legible in offices, printed reports, and shared screens across business domains.

Use a dark theme only when the user supplies a brand system or the subject clearly calls for a control-room, security, monitoring, or low-light operating context. A dark theme must be an intentional task-specific choice, never the automatic dashboard default.

The copied starter supplies generic tokens for light surfaces, text, borders, accents, cards, KPIs, tables, flagged items, and charts. Its task-owned sample files are a capability fixture, not a business schema or composition template: replace their generic measures, groups, findings, actions, and layout with the task's actual decision model. Read `references/style-default.md` when choosing an intentional visual direction or print hierarchy.

## Use When

Use this skill for BI, analytics, KPI, reporting, pipeline, sales, finance, operations, or executive dashboard requests.

Do not use this skill for admin panels, SaaS control panels, account pages, CMS dashboards, product UI screens, or full web apps. Those are app-building tasks, not BI dashboard artifacts.

## Project Setup

Initialize a new or empty writable project directory. Require an explicit target even when it is the current directory:

```bash
node <skills-root>/bi-dashboard/scripts/init-project.mjs --target <project-root>
```

The initializer copies `scaffold/`, the fixed helper scripts, and `requirements.txt`; runs `npm ci --no-audit --no-fund`; verifies that `package.json` and `package-lock.json` remain unchanged; and requires Vite to be available. It never modifies the installed skill.

For a restored dashboard project whose source still exists but `node_modules` does not, run:

```bash
node <skills-root>/bi-dashboard/scripts/init-project.mjs \
  --target <project-root> \
  --install-only
```

`--install-only` copies nothing, preserves source, runs the locked `npm ci`, verifies unchanged manifests, requires Vite, and refuses a target that is not an existing BI dashboard starter project.

The initialized project contains:

```text
<project-root>/
  aggregate.py                    # task-owned
  package.json                     # fixed locked manifest
  package-lock.json                # fixed locked manifest
  requirements.txt                 # fixed Python declaration
  index.html                       # fixed entry document
  vite.config.js                   # fixed self-contained build configuration
  scripts/                         # fixed ingestion/profiling helpers
  src/
    App.jsx                        # task-owned
    Chart.jsx                      # fixed: SVG, readable defaults, readiness
    dashboard-theme.css            # optional task-owned theme
    main.jsx                       # fixed entry point
    styles.css                     # fixed light and print system
  data/dashboard-data.json         # task-owned generated data
  outputs/index.html               # generated artifact
```

The consuming host decides how to rename, copy, validate, upload, or serve the built artifact.

## File Boundary

Fixed files — do not overwrite these during a dashboard task. They are starter infrastructure:

- `scripts/ingest.py`
- `scripts/profile.py`
- `src/Chart.jsx`
- `src/main.jsx`
- `src/styles.css`
- `index.html`
- `vite.config.js`
- `package.json`
- `package-lock.json`
- `requirements.txt`

Task-specific files. Create or replace these for each dashboard task:

- `aggregate.py`
- `src/App.jsx`
- `data/dashboard-data.json`
- `src/dashboard-theme.css` (optional)
- `outputs/index.html`

The committed versions of `aggregate.py`, `data/dashboard-data.json`, and `src/App.jsx` exist only to prove the starter can build and exercise its chart/print infrastructure. A delivered dashboard must replace their `domain-neutral deterministic starter` marker and generic `P1`/`Group A`/`Primary measure` vocabulary with task-owned data and meaning.

Never modify uploaded input files.

`aggregate.py` is a task template. In local-input mode, customize its `INPUT` path and aggregation section while keeping the `scripts/ingest.py` helpers, script-relative paths, JSON validation, compact output, and reconciliation checks. In deterministic-specification mode, no fake input file or `scripts/ingest.py` import is required; generate detail records directly and assert the supplied specification before writing JSON.

## Required Workflow

Read the task, classify its input mode, and use the matching workflow.

### Local CSV/XLSX Input

1. Run the fixed profiler on the input file to get compact planning facts:

```bash
python <project-root>/scripts/profile.py <path-to-input-file>
```

2. Use the profile output to make a short internal dashboard plan before writing final code. Decide:
   - headline/story
   - KPI definitions and denominators
   - chart list and each chart's purpose
   - insight and action strategy

   The profiler output is sufficient for planning. Do not run additional ad-hoc queries or inspect the raw CSV before writing `aggregate.py`. If you need to run exploratory Python, write a `.py` file and execute it — do not use multi-line inline `python -c` commands, they fail due to shell quoting.
3. Map task requirements to references and read the mapped references before the first source edit.
4. Customize `aggregate.py` using `scripts/ingest.py` helpers and DuckDB.
5. Reconcile source rows, cleaned rows, identifiers, grouped totals, null handling, denominators, and filter exclusions.
6. Run `python <project-root>/aggregate.py` and fix failures before writing the dashboard.
7. Write `src/App.jsx` and any optional task-owned theme file.
8. Build and run the portable checks below.

### Deterministic Supplied Specification

1. Initialize the starter.
2. Convert the supplied rules into deterministic detail records; do not invent a fake input file.
3. Preserve exact expected values and event-period exception facts as structured fields.
4. Add assertions for record counts, identifiers, periods, totals, detail grain, and named exceptions.
5. Map task requirements to references and read the mapped references before the first source edit.
6. Write compact generated JSON, author the dashboard, build, and run the portable checks.

For either mode, verify the artifact exists and is non-empty:

```bash
test -s outputs/index.html
```

Verify the output is self-contained. It must not rely on CDN URLs or external runtime assets.

Mandatory output rule: the final HTML must be usable by itself. Do not add CDN scripts, remote CSS, remote fonts, remote map assets, or runtime data fetches.

## Print-Ready HTML

The HTML artifact must also be usable with a normal browser Print → Save as PDF action. This skill still delivers HTML only; a host or user may choose to create a PDF companion, but that is not a second skill deliverable.

Build screen and print views from the same computed dashboard state. Filters, KPI values, chart series, ranked entities, flagged rows, definitions, and methodology must never be duplicated as task-specific hard-coded print fallback content. A print layout may use a light palette, a different page hierarchy, and static chart treatment, but it must represent the selected dashboard state faithfully.

For print CSS:

- Use `@media print` and an explicit `@page` size and margins.
- Hide interactive controls and browser-only affordances, not the report content.
- Preserve readable contrast with `print-color-adjust: exact` and `-webkit-print-color-adjust: exact` when backgrounds convey meaning.
- Disable motion and chart animation for print.
- Keep headings, charts, exception rows, and KPI groups from splitting across pages where practical.
- Repeat table headers and avoid orphaned rows.
- Include the active filter scope, metric definitions, and generated-data methodology in the printable view.
- Keep screen chart labels, legends, axis names, and visible values at 12 px or larger. Prefer 14 px as the default. If labels cannot fit at that scale, reduce label density, abbreviate safely, rotate labels, widen the chart, or choose a more suitable chart type; never solve density by shrinking text below the readable floor.
- Keep ordinary printed body text at 10 pt or larger and printed tables at 9 pt or larger. Let the document use more pages when needed for legibility.
- Do not use LibreOffice or another non-browser HTML converter as a dashboard PDF fallback. If automated browser printing is unavailable, report that limitation rather than producing a divergent substitute.

## Reference Mapping

Read the task before choosing references. Read only the references mapped to concrete requirements, but read them before the first source edit. Required behavior cannot be replaced with a workaround because its owning reference was skipped. If host scope blocks a required reference, report the conflict before implementing.

| Task requirement | Read |
|---|---|
| New visual direction or print hierarchy | `references/style-default.md` |
| New dashboard composition or responsive/print arrangement | `references/layout.md` |
| Executive findings, meaning, and actions | `references/business-synthesis.md` |
| Chart type, axis, label, threshold, or registration decisions | `references/echarts.md` |
| Aggregation, weighting, grain, comparison periods, reconciliation | `references/duckdb.md` |
| Written post-delivery Markdown report | `references/report.md` |

## Data Contract

`aggregate.py` must write portable JSON to `data/dashboard-data.json`: strings, numbers, booleans, arrays, and objects only.

Include only data the dashboard uses. Prefer compact aggregates over raw rows. Add reconciliation checks before writing output, for example grouped totals matching the row count or an intentionally filtered denominator.

Plan every KPI and metric with its source grain, selected-filter grain, aggregation function, weighting, denominator, comparison period, supported filters, and unavailable-state rule. Additive measures are usually summed. Ratios and rates must state their denominator and weighting policy; contribution views generally need weighting by the relevant additive measure. Snapshot, duration, quality, and risk measures require an intentional documented aggregation policy. Compare year-over-year and other period changes over matching periods only. If matching prior coverage is unavailable, show unavailable and explain the coverage gap; never substitute an assumed growth rate.

When the task supplies named exceptions or material events, keep them as first-class structured data rather than inferring values from prose. Use task-appropriate field names while preserving the affected entity and periods, metric, numeric actual, unit, numeric target/baseline, operator, numeric variance, evidence-backed driver, owner, action, and affected segments when applicable. Keep event-period actual, selected-period aggregate, expected/baseline value, and variance distinct. Show supplied named exceptions before generated threshold breaches.

For deterministic specifications, assert record count, unique entity count, complete period and category counts, expected detail grain, grouped totals against detail sums, matching-period comparison coverage, exact named exception count and values, no duplicate exception keys, and non-empty required chart datasets. For local input, assert source and cleaned rows, unique identifiers, grouped totals, null handling, metric denominators, and data excluded by filters.

The fixed `scripts/ingest.py` helpers support CSV and XLSX input. Reuse them for column cleaning, header detection, file hash metadata, DuckDB DataFrame registration, JSON validation, and compact success output instead of reimplementing ingestion in `aggregate.py`.

The fixed `scripts/profile.py` profiler is for planning only. It should print compact summaries such as row count, columns, date ranges, notable nulls, and top categorical values. Do not print raw rows or large grouped tables for planning.

`src/App.jsx` must import the generated JSON directly:

```jsx
import dashboardData from '../data/dashboard-data.json'
```

Do not fetch data at runtime.

The scaffold `aggregate.py`, `data/dashboard-data.json`, and `src/App.jsx` form a replaceable domain-neutral capability fixture. They intentionally use generic names such as primary measure, group, and period only to exercise bar, line, pie/donut, scatter, thresholds, structured findings, and print behavior. During a real task, replace that schema and composition with the requested domain; do not merely relabel the fixture.

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

The fixed `Chart` wrapper owns readiness. It registers every mounted chart, disables animation, and sets `window.__DASHBOARD_READY__` only after each chart has finished rendering SVG geometry. Do not set the marker manually in `src/App.jsx` or task code.

## ECharts Rules

Use the fixed `Chart` wrapper from `src/Chart.jsx`:

```jsx
<Chart option={echartsOptionObject} style={{ height: '320px' }} />
```

Pass a standard ECharts option object. The wrapper handles SVG renderer registration and resize.

The scaffold uses SVG rendering to avoid canvas print/export artifacts. Do not switch to canvas.

The fixed wrapper pre-registers bar, line, pie/donut, scatter, and mark-line thresholds. Use these for common BI charts; do not replace or edit the wrapper and do not substitute CSS, handwritten SVG, or another chart system for a data chart. If a required chart type is unsupported, report the contract gap instead of bypassing readiness.

For geographic charts, do not put a pie series on a geo coordinate system. Use a `map` series for region coloring or `scatter` / `effectScatter` with `coordinateSystem: 'geo'` for point data.

## Failure Rules

The initializer's `npm ci --no-audit --no-fund` command is the only supported JavaScript dependency installation. It requires the committed lockfile, removes existing `node_modules`, installs exactly the locked graph, fails when manifests disagree, and does not update either manifest. Do not run `npm install`, `npm update`, `npm audit fix`, `npm install <package>`, `pip install`, `bun install`, `pnpm install`, or modify dependency manifests to work around an unavailable package.

If `npm ci` fails because the registry/network is unavailable, the lockfile is stale, Node/npm is incompatible, or disk space is insufficient, report the concrete setup failure. Do not replace the React/Vite/ECharts route with handwritten HTML or SVG.

If build output is missing or empty, do not deliver it. Read the failing command output, fix the root cause once, rebuild, and recheck `outputs/index.html`.

## Portable Authoring Checks

Run both checks on the built artifact:

```bash
node <skills-root>/bi-dashboard/scripts/validate-output.mjs \
  --input <project-root>/outputs/index.html
node <skills-root>/bi-dashboard/scripts/preflight-browser.mjs \
  --input <project-root>/outputs/index.html \
  --project <project-root> \
  [--executable-path <chromium>]
```

The static check screens for empty output, missing root/readiness markers, placeholders, remote assets, and obvious task-authored runtime endpoints. Browser network tracking is the authoritative unexpected-request check. The browser preflight checks readiness, script errors, error-level console output, unexpected requests, desktop/mobile overflow, keyboard focus, reduced motion, readable chart text, and per-chart screen/print SVG geometry. It fails if a chart has screen geometry but loses its series in print. Both emit concise JSON and exit non-zero on a failed required check. They are portable authoring checks; a host decides acceptance, delivery, and any additional rendering or review.

`preflight-browser.mjs` is a browser smoke-check script, not a PDF generator or delivery mechanism. It opens the completed HTML in Chromium to verify that the interactive and print-ready document can run without server, network, or layout failures. A user may print the HTML normally. When a host separately needs a PDF companion, the host owns automation and must reuse the exact built HTML, readiness marker, print media, project-local Playwright, and browser executable. That PDF is not an additional portable skill deliverable.

If a host supplies Chromium outside Playwright's managed browser cache, it may pass `--executable-path <path-to-chromium>` to the preflight command. This is a host runtime override; it does not change the initialized project's lockfile or browser-printable HTML contract.
