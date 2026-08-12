// Fixed scaffold file. It owns supported chart types, readable defaults, and readiness.

import { useId, useInsertionEffect, useRef } from 'react'
import ReactEChartsCore from 'echarts-for-react/esm/core'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts'
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TitleComponent,
  TooltipComponent,
  SVGRenderer,
])

const chartText = { color: '#3f4d5d', fontSize: 14 }

function readableOption(option) {
  const mergeText = value => ({ ...chartText, ...value })
  const mergeAxis = axis => ({
    ...axis,
    axisLabel: mergeText(axis.axisLabel),
    nameTextStyle: mergeText(axis.nameTextStyle),
  })
  const mergeLegend = legend => ({
    ...legend,
    textStyle: mergeText(legend.textStyle),
  })
  const mergeSeries = series => ({
    ...series,
    ...(series.label && series.label.show !== false
      ? { label: mergeText(series.label) }
      : {}),
  })

  return {
    backgroundColor: 'transparent',
    animation: false,
    ...option,
    textStyle: mergeText(option.textStyle),
    legend: Array.isArray(option.legend)
      ? option.legend.map(mergeLegend)
      : option.legend && mergeLegend(option.legend),
    xAxis: Array.isArray(option.xAxis)
      ? option.xAxis.map(mergeAxis)
      : option.xAxis && mergeAxis(option.xAxis),
    yAxis: Array.isArray(option.yAxis)
      ? option.yAxis.map(mergeAxis)
      : option.yAxis && mergeAxis(option.yAxis),
    series: Array.isArray(option.series)
      ? option.series.map(mergeSeries)
      : option.series && mergeSeries(option.series),
  }
}

function registry() {
  if (!window.__DASHBOARD_CHARTS__) window.__DASHBOARD_CHARTS__ = new Map()
  return window.__DASHBOARD_CHARTS__
}

function updateGlobalReadiness(charts) {
  window.__DASHBOARD_READY__ = charts.size > 0 && [...charts.values()].every(Boolean)
}

export default function Chart({ option, height = 320, className = 'chart' }) {
  const id = useId()
  const wrapper = useRef(null)

  useInsertionEffect(() => {
    const charts = registry()
    charts.set(id, false)
    updateGlobalReadiness(charts)
    return () => {
      charts.delete(id)
      updateGlobalReadiness(charts)
    }
  }, [id, option])

  const finished = () => {
    const svg = wrapper.current?.querySelector('svg')
    const marks = svg?.querySelectorAll('path, rect, circle, polyline').length ?? 0
    if (svg && marks > 0) {
      const charts = registry()
      charts.set(id, true)
      updateGlobalReadiness(charts)
    }
  }

  return (
    <div ref={wrapper} className={className} data-dashboard-chart={id}>
      <ReactEChartsCore
        echarts={echarts}
        option={readableOption(option)}
        notMerge
        lazyUpdate
        opts={{ renderer: 'svg' }}
        onEvents={{ finished }}
        style={{ width: '100%', height }}
      />
    </div>
  )
}
