// Chart series colors — mapped to the ICONSULTA Tailwind theme
// (index.css @theme). Each multi-hue set passed the dataviz palette validator
// (CVD + normal-vision separation) against the app's light surface.

export const CHART = {
  // Trend chart: Total = navy-400, Completed = sky-500
  total: '#4f6bb0',
  completed: '#0ea5e9',
  // Status donut: mirrors lib/utils statusTone()
  pending: '#f59e0b', // amber-500
  confirmed: '#10b981', // emerald-500
  rejected: '#ef4444', // red-500
  // Department bars: single brand hue (matches the existing BarList)
  department: '#6a72f0', // brand-500
  // Axes / grid / labels
  grid: '#e2e8f0', // slate-200
  axis: '#94a3b8', // slate-400
} as const
