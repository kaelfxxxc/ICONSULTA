import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Department } from '../../types'
import { DEPARTMENT_LABEL } from '../../utils/constants'
import { ChartTooltip } from './ChartTooltip'
import { CHART } from './theme'

/** Interactive bar chart of consultations by department (replaces BarList). */
export function DepartmentVolume({
  data,
}: {
  data: { department: Department; count: number }[]
}) {
  const rows = data.map((d) => ({
    name: DEPARTMENT_LABEL[d.department],
    Consultations: d.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={rows}
        margin={{ top: 20, right: 8, bottom: 0, left: -18 }}
        barCategoryGap="24%"
      >
        <CartesianGrid
          stroke={CHART.grid}
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: CHART.axis }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: CHART.axis }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
        <Bar
          dataKey="Consultations"
          fill={CHART.department}
          radius={[4, 4, 0, 0]}
          maxBarSize={56}
        >
          <LabelList
            dataKey="Consultations"
            position="top"
            style={{ fontSize: 11, fill: CHART.axis, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
