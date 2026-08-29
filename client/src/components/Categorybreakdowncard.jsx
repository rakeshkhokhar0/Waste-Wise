import { getCategoryMeta } from '../utils/Wastecategory'

// One reusable card for the "Where your waste went" section on
// MyImpact. Iterate this over however many categories the user
// has actually detected — could be 1, could be all 6 — instead
// of hand-writing a block per category.
//
// Props:
//   category      - raw category value, e.g. "recyclable"
//   count         - how many times this category was detected
//                   across the user's analyses
//   totalCount    - total category detections across all
//                   analyses, used to compute the % bar

function CategoryBreakdownCard({ category, count, totalCount }) {
  const meta = getCategoryMeta(category)
  const Icon = meta.icon

  const percent =
    totalCount > 0 ? Math.round((count / totalCount) * 100) : 0

  return (
    <article className="rounded-2xl border border-green-100 bg-white p-5">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${meta.color}`}
      >
        <Icon size={20} />
      </span>

      <p className="mt-5 text-sm text-slate-500">{meta.label}</p>

      <h3 className="mt-1 text-2xl font-bold">
        Detected {count} time{count === 1 ? '' : 's'}
      </h3>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${meta.progressColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {percent}% of your waste entries
      </p>
    </article>
  )
}

export default CategoryBreakdownCard