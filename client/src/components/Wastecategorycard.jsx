import { ChevronDown, CircleCheck, Loader2 } from 'lucide-react'
import { getCategoryMeta } from '../utils/Wastecategory'

// One reusable card for a single detected waste category.
// Iterate this over `analysis.categories` — do not hand-write
// a separate component per category (plastic/glass/organic/etc).
//
// Props:
//   category   - one item from WasteAnalysisResponse.categories
//                { id, category, items, confidence,
//                  disposal_steps: [{id, step_number, instruction,
//                                    is_completed, completed_at}],
//                  total_steps, completed_steps, progress_percentage }
//   expanded   - bool, whether the disposal checklist is open
//   onToggleExpand - () => void
//   onToggleStep   - (step) => void, called when a checkbox is clicked
//   updatingStepId - id of the step currently being saved (shows a
//                    small spinner instead of the checkbox), or null

function WasteCategoryCard({
  category,
  expanded,
  onToggleExpand,
  onToggleStep,
  updatingStepId,
}) {
  const meta = getCategoryMeta(category.category)
  const Icon = meta.icon

  const confidencePercent = Math.round(
    Number(category.confidence || 0) * 100
  )

  const progress = Math.round(category.progress_percentage || 0)

  return (
    <article className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full flex-wrap items-center justify-between gap-4 p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${meta.color}`}
          >
            <Icon size={21} />
          </span>

          <div>
            <h3 className="text-lg font-bold">{meta.label}</h3>

            <p className="text-xs text-slate-500">
              {confidencePercent}% AI confidence &middot;{' '}
              {category.items?.length || 0} item
              {category.items?.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold">
              {category.completed_steps}/{category.total_steps} steps
            </p>
            <p className="text-xs text-slate-500">{progress}% done</p>
          </div>

          <ChevronDown
            size={20}
            className={`text-slate-400 transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100">
        <div
          className={`h-full ${meta.progressColor} transition-all duration-500`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-5">
          {/* Detected items */}
          <div className="flex flex-wrap gap-2">
            {category.items?.map((item) => (
              <span
                key={item}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700"
              >
                {item}
              </span>
            ))}
          </div>

          {/* Disposal steps checklist */}
          <p className="mt-5 text-xs font-bold tracking-[0.12em] text-slate-500">
            HOW TO DISPOSE
          </p>

          <ul className="mt-3 space-y-2">
            {category.disposal_steps?.map((step) => {
              const isUpdating = updatingStepId === step.id

              return (
                <li
                  key={step.id}
                  className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"
                >
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onToggleStep(step)}
                    className="mt-0.5 flex-shrink-0 disabled:cursor-not-allowed"
                    aria-label={
                      step.is_completed
                        ? 'Mark step as not done'
                        : 'Mark step as done'
                    }
                  >
                    {isUpdating ? (
                      <Loader2
                        size={20}
                        className="animate-spin text-green-600"
                      />
                    ) : (
                      <CircleCheck
                        size={20}
                        className={
                          step.is_completed
                            ? 'text-green-600'
                            : 'text-slate-300'
                        }
                      />
                    )}
                  </button>

                  <span
                    className={`text-sm leading-relaxed ${
                      step.is_completed
                        ? 'text-slate-400 line-through'
                        : 'text-slate-700'
                    }`}
                  >
                    {step.instruction}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </article>
  )
}

export default WasteCategoryCard