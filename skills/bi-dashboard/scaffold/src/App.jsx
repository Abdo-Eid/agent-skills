import Chart from './Chart.jsx'
import dashboardData from '../data/dashboard-data.json'

const palette = ['#087d72', '#4f72ad', '#d28d18', '#b74040']
const number = value => value.toLocaleString('en-US')
const trend = dashboardData.charts.trend
const groups = dashboardData.charts.groups
const composition = dashboardData.charts.composition
const relationship = dashboardData.charts.relationship

const trendOption = {
  color: [palette[0], palette[2]],
  tooltip: { trigger: 'axis' },
  grid: { left: 56, right: 52, top: 22, bottom: 52 },
  xAxis: { type: 'category', data: trend.map(row => row.period), axisTick: { show: false } },
  yAxis: [
    { type: 'value', name: 'Primary measure', axisLabel: { formatter: number } },
    { type: 'value', name: 'Rate', min: 0, max: 100, axisLabel: { formatter: '{value}%' } },
  ],
  series: [
    { type: 'bar', name: 'Primary measure', data: trend.map(row => row.primary), barMaxWidth: 42, label: { show: true, position: 'top' } },
    { type: 'line', name: 'Rate', data: trend.map(row => row.rate), yAxisIndex: 1, smooth: true, symbol: 'circle', symbolSize: 8, lineStyle: { width: 3 } },
  ],
}

const groupOption = {
  color: [palette[1]],
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 56, right: 24, top: 22, bottom: 52 },
  xAxis: { type: 'category', data: groups.map(row => row.group), axisTick: { show: false } },
  yAxis: { type: 'value', name: 'Primary measure', axisLabel: { formatter: number } },
  series: [{ type: 'bar', name: 'Primary measure', data: groups.map(row => row.primary), barMaxWidth: 48, label: { show: true, position: 'top' } }],
}

const compositionOption = {
  color: palette,
  tooltip: { trigger: 'item', formatter: '{b}: {c}% ({d}% of displayed composition)' },
  legend: { bottom: 0 },
  series: [{ type: 'pie', name: 'Composition', radius: ['42%', '68%'], center: ['50%', '44%'], label: { show: true, formatter: '{b}: {c}%' }, data: composition.map(row => ({ name: row.category, value: row.value })) }],
}

const relationshipOption = {
  color: [palette[1]],
  tooltip: { trigger: 'item', formatter: ({ data }) => `${data.name}<br/>X measure: ${data.value[0]}<br/>Y measure: ${data.value[1]}` },
  grid: { left: 62, right: 28, top: 28, bottom: 52 },
  xAxis: { type: 'value', name: 'X measure' },
  yAxis: { type: 'value', name: 'Y measure' },
  series: [{
    type: 'scatter',
    name: 'Groups',
    symbolSize: 14,
    data: relationship.map(row => ({ name: row.group, value: [row.x, row.y] })),
    markLine: { silent: true, data: [{ xAxis: 80 }, { yAxis: 100 }] },
  }],
}

export default function App() {
  return (
    <main className="dashboard-shell" id="dashboard-content">
      <a className="skip-link" href="#dashboard-content">Skip to dashboard content</a>
      <header className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">Domain-neutral BI starter</p>
          <h1>Replace this sample with the task&apos;s decision story</h1>
          <p className="dashboard-subtitle">This starter proves bar, line, donut, scatter, thresholds, readable defaults, print layout, and structured exceptions. Replace its schema, labels, values, findings, and composition rather than treating it as a template.</p>
        </div>
        <aside className="headline-card">
          <strong>{dashboardData.assessment.title}</strong>
          <p>{dashboardData.assessment.detail}</p>
        </aside>
      </header>

      <section className="kpi-grid" aria-label="Example key performance indicators">
        {dashboardData.kpis.map(kpi => <article className="kpi-card" key={kpi.label}><p className="kpi-label">{kpi.label}</p><p className="kpi-value">{kpi.value}</p><p className="kpi-note">{kpi.note}</p></article>)}
      </section>

      <section className="dashboard-grid" aria-label="Example chart capabilities">
        <article className="chart-card wide"><header className="chart-card-header"><h2 className="chart-card-title">Trend capability</h2><p className="chart-card-subtitle">Bar and line series with independent scales</p></header><div className="chart-card-body"><Chart option={trendOption} height={340} /></div></article>
        <article className="chart-card compact"><header className="chart-card-header"><h2 className="chart-card-title">Group comparison</h2><p className="chart-card-subtitle">Replace generic groups with the task&apos;s comparison dimension</p></header><div className="chart-card-body"><Chart option={groupOption} height={340} /></div></article>
        <article className="chart-card compact"><header className="chart-card-header"><h2 className="chart-card-title">Composition capability</h2><p className="chart-card-subtitle">Use only when part-to-whole is the business question</p></header><div className="chart-card-body"><Chart option={compositionOption} height={340} /></div></article>
        <article className="chart-card full"><header className="chart-card-header"><h2 className="chart-card-title">Relationship and threshold capability</h2><p className="chart-card-subtitle">Scatter geometry with illustrative X/Y thresholds; replace both measures and targets</p></header><div className="chart-card-body"><Chart option={relationshipOption} height={340} /></div></article>
      </section>

      <section className="insight-grid">
        <article className="insight-panel"><h2 className="panel-title">Example measured findings</h2><ul className="finding-list">{dashboardData.insights.map(item => <li key={item.finding}><strong>Finding:</strong> {item.finding}<br /><strong>Meaning:</strong> {item.meaning}</li>)}</ul></article>
        <article className="action-panel"><h2 className="panel-title">Example actions</h2><ul className="action-list">{dashboardData.actions.map(item => <li key={item.action}><strong>Action:</strong> {item.action}<br />{item.finding}</li>)}</ul></article>
      </section>

      <section className="table-card" aria-labelledby="exception-title"><h2 className="panel-title" id="exception-title">Structured exception example</h2><div className="table-wrap"><table><thead><tr><th>Entity</th><th>Periods</th><th>Metric</th><th>Actual</th><th>Target</th><th>Variance</th><th>Driver</th><th>Owner</th><th>Action</th></tr></thead><tbody>{dashboardData.exceptions.map(item => <tr key={`${item.entity}-${item.metric}`}><td>{item.entity}</td><td>{item.periods.join(', ')}</td><td>{item.metric}</td><td>{number(item.actual)} {item.unit}</td><td>{item.operator} {number(item.target)} {item.unit}</td><td>{number(item.variance)} {item.unit}</td><td>{item.driver}</td><td>{item.owner}</td><td>{item.action}</td></tr>)}</tbody></table></div></section>
    </main>
  )
}
