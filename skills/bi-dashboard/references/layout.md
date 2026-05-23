# Layout Guidance

Use this reference when composing an executive dashboard. Mandatory file/output/runtime rules stay in `../SKILL.md`; this file gives flexible layout patterns, not a fixed template.

## First Screen

The first screen should answer three questions quickly:

- What is the current state?
- Is it healthy, risky, improving, or deteriorating?
- Where should management focus next?

A strong default order is:

- Header with title and subtitle.
- `headline-card` with the main measured conclusion.
- `kpi-grid` with 3-5 KPI cards.
- Primary `chart-card wide` for the main comparison.
- Supporting chart cards.
- Insight and action panels.

This order is a starting point. Change it when the data story needs a different structure.

## Class Vocabulary

- `dashboard-shell`: page width and spacing.
- `dashboard-header`: title/subtitle plus optional headline card.
- `headline-card`: the short executive conclusion.
- `kpi-grid`: responsive KPI layout.
- `kpi-card`: one metric card.
- `dashboard-grid`: 12-column chart grid.
- `chart-card`: default half-width chart card.
- `chart-card wide`: primary chart, 8 columns on desktop.
- `chart-card compact`: supporting card, 4 columns on desktop.
- `chart-card full`: dense chart/table/timeline, full width.
- `insight-grid`: side-by-side findings/actions layout.
- `insight-panel`: measured findings.
- `action-panel`: recommended next moves.

Add task-specific classes or inline styles when useful. Do not force every dashboard into the same shape.

## KPI Cards

Use KPI cards for metrics that can be understood at a glance.

Good KPI mix:

- Volume: total leads, revenue, tickets, orders, pipeline value.
- Quality: conversion rate, win rate, margin, SLA rate, qualified share.
- Risk: stale count, overdue amount, churn exposure, bottleneck count.
- Momentum: week-over-week or month-over-month change when dates exist.

Avoid KPI cards for metrics that need a paragraph to explain. Put those in insight panels instead.

## Chart Placement

- Use `wide` for the chart that carries the main argument.
- Use `compact` for supporting cuts, rankings, or diagnostic summaries.
- Use `full` for timelines, funnels, tables, or charts with many labels.
- Keep related charts near each other so the reader can compare without scrolling far.
- Prefer one strong primary chart over several equal-weight charts.

## Insights And Actions

Insights and actions follow the Finding → Meaning → Action pattern (see `../references/business-synthesis.md`).

**Insight panel** items state the finding and meaning — what the data shows and why it matters.

Weak:
```text
Source performance varies across channels.
```

Better:
```text
Partner referrals produce 18% of leads but 34% of won opportunities —
nearly twice the conversion quality of other channels.
```

**Action panel** items state the action tied back to the finding — names a segment, owner focus, or measurable target.

Weak:
```text
Monitor low-performing sources.
```

Better:
```text
Review paid social qualification rules this week; it contributes 31% of leads
but only 9% of won opportunities.
```

Match confidence language to data strength: "clearly shows" for large clean samples, "suggests" for smaller patterns, "early indications" for sparse data. See `../references/business-synthesis.md`.

## Anti-Patterns

- Chart dump with no headline or decision path.
- KPI cards with unclear denominators.
- Pie/donut charts with many slices when precise comparison is the goal or labels become unreadable.
- Unsigned rates, for example "42%" without saying of what.
- Too many colors with no semantic meaning.
- Dense charts in compact cards.
- Recommendations that are not tied to a measured segment, stage, source, count, rate, or trend.
