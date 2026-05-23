import { useEffect } from 'react'
import Chart from './Chart.jsx'
import dashboardData from '../data/dashboard-data.json'

const palette = ['#4f72ad', '#344f86', '#2d92c4', '#28b6c9', '#f5b5c8', '#c88b3a']

const stages = dashboardData.charts.stageDistribution
const sources = dashboardData.charts.sourceDistribution
const sourceConv = dashboardData.charts.sourceConversion
const kpis = dashboardData.kpis
const insights = dashboardData.insights
const actions = dashboardData.actions

const stageNames = stages.map(s => s.deal_stage)
const stageCounts = stages.map(s => s.count)

const sourceNames = sources.map(s => s.source)
const sourceCounts = sources.map(s => s.count)

const sourceWinSorted = [...sourceConv].sort((a, b) => b.win_rate - a.win_rate)
const srcWinNames = sourceWinSorted.map(s => s.source)
const srcWinRates = sourceWinSorted.map(s => s.win_rate)

const stageOption = {
  color: palette,
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 16, right: 24, top: 28, bottom: 28 },
  xAxis: { type: 'category', data: stageNames, axisTick: { show: false }, axisLabel: { rotate: 30 } },
  yAxis: { type: 'value', axisLabel: { formatter: v => v.toLocaleString() } },
  series: [{ type: 'bar', data: stageCounts, barMaxWidth: 40, label: { show: true, position: 'top', formatter: p => p.value.toLocaleString() } }],
}

const sourceOption = {
  color: [palette[0], palette[3]],
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { bottom: 0, icon: 'circle' },
  grid: { left: 16, right: 56, top: 28, bottom: 48 },
  xAxis: { type: 'category', data: sourceNames, axisTick: { show: false }, axisLabel: { rotate: 30, fontSize: 10 } },
  yAxis: [
    { type: 'value', name: 'Leads', axisLabel: { formatter: v => v.toLocaleString() } },
    { type: 'value', name: 'Win Rate %', min: 0, max: 16, axisLabel: { formatter: '{value}%' } },
  ],
  series: [
    { type: 'bar', name: 'Leads', data: sourceCounts, barMaxWidth: 24 },
    { type: 'line', name: 'Win Rate', data: sourceConv.map(s => s.win_rate), yAxisIndex: 1, smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { width: 2 } },
  ],
}

const winRateOption = {
  color: palette,
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => `${p[0].name}<br/>Win Rate: ${p[0].value}%` },
  grid: { left: 16, right: 24, top: 28, bottom: 28 },
  xAxis: { type: 'category', data: srcWinNames, axisTick: { show: false }, axisLabel: { rotate: 30, fontSize: 10 } },
  yAxis: { type: 'value', name: 'Win Rate %', axisLabel: { formatter: '{value}%' } },
  series: [{ type: 'bar', data: srcWinRates, barMaxWidth: 28, label: { show: true, position: 'top', formatter: p => `${p.value}%`, fontSize: 10 } }],
}

export default function App() {
  useEffect(() => {
    window.__DASHBOARD_READY__ = true
  }, [])

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">Sales Pipeline Report</p>
          <h1>Pipeline Health &amp; Source Performance</h1>
          <p className="dashboard-subtitle">
            {dashboardData.metadata.rowCount.toLocaleString()} leads across {dashboardData.charts.stages.length} stages and {dashboardData.charts.sources.length} sources.
            Generated {new Date(dashboardData.metadata.generatedAt).toLocaleDateString()}.
          </p>
        </div>
      </div>

      <div className="headline-card">
        <strong>Pipeline is balanced but stalled volume demands attention</strong>
        <p>
          With {kpis[0].value} leads distributed evenly across {dashboardData.charts.stages.length} stages, the pipeline shows healthy top-of-funnel activity.
          However, {kpis[3].value} deals ({kpis[1].value} win rate) are stalled in On Hold — the single largest segment.
          Source performance varies significantly, with Cold Email (12.5%) converting at nearly double Social Media (7.5%).
        </p>
      </div>

      <div className="kpi-grid">
        {kpis.map((kpi, i) => (
          <div className="kpi-card" key={i}>
            <p className="kpi-label">{kpi.label}</p>
            <p className="kpi-value">{kpi.value}</p>
            <p className="kpi-note">{kpi.note}</p>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="chart-card wide">
          <div className="chart-card-header">
            <p className="chart-card-title">Pipeline Stage Distribution</p>
            <p className="chart-card-subtitle">Lead count by stage in pipeline order — On Hold is the largest single stage at 1,047</p>
          </div>
          <div className="chart-card-body">
            <Chart option={stageOption} height={320} />
          </div>
        </div>

        <div className="chart-card wide">
          <div className="chart-card-header">
            <p className="chart-card-title">Source Volume &amp; Win Rate</p>
            <p className="chart-card-subtitle">Lead count by source (bars) with conversion rate overlay (line)</p>
          </div>
          <div className="chart-card-body">
            <Chart option={sourceOption} height={320} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <p className="chart-card-title">Win Rate by Source</p>
            <p className="chart-card-subtitle">Sorted from highest to lowest conversion</p>
          </div>
          <div className="chart-card-body">
            <Chart option={winRateOption} height={340} />
          </div>
        </div>
      </div>

      <div className="insight-grid">
        <div className="insight-panel">
          <p className="panel-title">Key Findings</p>
          <ul className="finding-list">
            {insights.map((item, i) => (
              <li key={i}>
                <strong>Finding: </strong>{item.finding}<br />
                <strong>Meaning: </strong>{item.meaning}
              </li>
            ))}
          </ul>
        </div>

        <div className="action-panel">
          <p className="panel-title">Recommended Actions</p>
          <ul className="action-list">
            {actions.map((item, i) => (
              <li key={i}>
                <strong>Action: </strong>{item.action}
                <br /><span style={{ color: '#5f594f', fontSize: '0.92rem' }}>{item.finding}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
