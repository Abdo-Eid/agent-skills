# ECharts Guidance

Use this reference when choosing chart types, adding ECharts registrations, or handling map/geographic views. Mandatory runtime rules stay in `../SKILL.md`; this file gives chart patterns and examples.

## Registration

The fixed scaffold wrapper pre-registers bar, line, pie/donut, scatter, and mark-line thresholds. Do not edit or replace it during a dashboard task.

The underlying registration includes:

```jsx
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts'
import { MarkLineComponent } from 'echarts/components'

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  MarkLineComponent,
])
```

Keep `SVGRenderer`. Do not switch to canvas.

The fixed wrapper disables animation and owns the dashboard readiness marker. Do not add a manual `window.__DASHBOARD_READY__` assignment in application code.

## Chart Selection

- Category comparison: bar or horizontal bar.
- Time trend: line or area line.
- Stage drop-off: funnel or ordered horizontal bar.
- Segment mix across categories: stacked bar or 100% stacked bar.
- Small part-to-whole: donut/pie, usually with 3-6 slices. Donuts with 7+ slices can work for compact composition/pressure views if labels remain readable and precise ranking is not the main task.
- Relationship/outliers: scatter.
- Hierarchy: treemap or sunburst.
- Geographic region values: map series.
- Geographic point values: scatter/effectScatter with `coordinateSystem: 'geo'`.

Prefer chart types that support comparison. Avoid decorative charts when a bar chart would answer the question faster.

Use pie/donut charts sparingly. If precise category comparison matters, prefer bar, ordered bar, stacked bar, or funnel. If composition is the point and the donut remains readable, it can be a good compact diagnostic card.

## Option Skeletons

Bar comparison:

```js
{
  color: ['#4f72ad'],
  tooltip: { trigger: 'axis' },
  grid: { left: 44, right: 18, top: 24, bottom: 42 },
  xAxis: { type: 'category', data: labels, axisTick: { show: false } },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', name: 'Value', data: values, barMaxWidth: 36 }],
}
```

Stacked outcome mix:

```js
{
  color: ['#344f86', '#28b6c9', '#f5b5c8'],
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { bottom: 0 },
  grid: { left: 44, right: 18, top: 24, bottom: 54 },
  xAxis: { type: 'category', data: labels },
  yAxis: { type: 'value' },
  series: outcomeSeries.map((item) => ({ ...item, type: 'bar', stack: 'outcome' })),
}
```

Funnel/drop-off:

```js
{
  color: ['#344f86', '#4f72ad', '#2d92c4', '#28b6c9', '#f5b5c8'],
  tooltip: { trigger: 'item' },
  series: [{
    type: 'funnel',
    left: '8%',
    width: '84%',
    sort: 'descending',
    label: { formatter: '{b}: {c}' },
    data: stages,
  }],
}
```

Scatter/outliers:

```js
{
  color: ['#4f72ad'],
  tooltip: { trigger: 'item', formatter: ({ data }) => `${data.name}<br/>${xLabel}: ${data.value[0]}<br/>${yLabel}: ${data.value[1]}` },
  grid: { left: 52, right: 24, top: 24, bottom: 44 },
  xAxis: { type: 'value', name: xLabel },
  yAxis: { type: 'value', name: yLabel },
  series: [{
    type: 'scatter',
    data: points,
    symbolSize: 10,
    markLine: {
      silent: true,
      data: [{ xAxis: xTarget }, { yAxis: yTarget }],
    },
  }],
}
```

Use scatter for relationships and outliers. Put the business question in the surrounding accessible title/subtitle and explain target quadrants there. Avoid per-point labels when they overlap; preserve readable axes and tooltips, then pair dense entity plots with a ranked exception list when the task needs one.

## Map Rules

Do not put `type: 'pie'` on a `geo` coordinate system. Use a `map` series for region coloring or `scatter` / `effectScatter` with `coordinateSystem: 'geo'` for point data.

Avoid remote GeoJSON and CDN map scripts. If map assets are not available locally/importable through the scaffold, use a non-map comparison chart instead of adding remote runtime dependencies.

## Labeling

- Titles should state the business question or finding, not just the metric name.
- Use short axis labels; move long explanations into subtitles or insight panels.
- The wrapper defaults visible chart text to 14 px. Keep all visible chart text at 12 px or larger, including axis labels, legends, names, and data labels.
- When labels do not fit, reduce tick density, abbreviate unambiguously, rotate category labels, use a wider card, or switch chart types. Do not reduce chart text below 12 px.
- Include denominators when showing rates.
- Sort bars by business relevance unless time/order is meaningful.
- Group small categories into "Other" only when the grouping rule is explicit and counts reconcile.
