// Fixed scaffold file. Register additional ECharts chart/component types here
// only when the dashboard needs them.

import ReactEChartsCore from 'echarts-for-react/esm/core'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  SVGRenderer,
])

export default function Chart({ option, height = 320, className = 'chart' }) {
  return (
    <ReactEChartsCore
      echarts={echarts}
      option={{ backgroundColor: 'transparent', ...option }}
      notMerge
      lazyUpdate
      className={className}
      opts={{ renderer: 'svg' }}
      style={{ width: '100%', height }}
    />
  )
}
