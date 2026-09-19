/** Compact metric tile for a card header — a value over a small caps label. */
export function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-5 text-center">
      <div className="text-2xl leading-none font-black tabular-nums text-slate-800">
        <h1>{value}</h1>
      </div>
      <div className="mt-1 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </div>
    </div>
  )
}
