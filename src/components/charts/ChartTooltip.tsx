/** Shared Recharts tooltip card — dark ink on white, matching the app's cards. */
export interface TooltipRow {
  name?: string | number
  value?: number | string
  color?: string
}

export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipRow[]
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  const first = payload[0]?.name
  // Skip the header when it duplicates the first row (e.g. donut slices).
  const showLabel = label != null && label !== first
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      {showLabel && (
        <div className="text-xs font-semibold text-slate-700">{label}</div>
      )}
      <div className="mt-1 space-y-0.5">
        {payload.map((row) => (
          <div
            key={String(row.name ?? row.value)}
            className="flex items-center gap-1.5 text-xs text-slate-500"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: row.color }}
            />
            <span className="capitalize">{row.name}</span>
            <span className="ml-auto pl-3 font-semibold tabular-nums text-slate-800">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
