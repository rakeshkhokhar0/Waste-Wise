// Shared per-category display metadata.
//
// Keep this in sync with the backend WasteCategory enum in
// app/modules/waste/models.py:
//   recyclable, organic, e_waste, hazardous,
//   non_recyclable, compostable

import {
  Biohazard,
  Cpu,
  Leaf,
  Recycle,
  Sprout,
  Trash2,
} from 'lucide-react'

export const CATEGORY_META = {
  recyclable: {
    label: 'Recyclable',
    icon: Recycle,
    color: 'bg-sky-100 text-sky-700',
    progressColor: 'bg-sky-500',
  },
  organic: {
    label: 'Organic',
    icon: Sprout,
    color: 'bg-green-100 text-green-700',
    progressColor: 'bg-green-500',
  },
  e_waste: {
    label: 'E-Waste',
    icon: Cpu,
    color: 'bg-purple-100 text-purple-700',
    progressColor: 'bg-purple-500',
  },
  hazardous: {
    label: 'Hazardous',
    icon: Biohazard,
    color: 'bg-red-100 text-red-700',
    progressColor: 'bg-red-500',
  },
  non_recyclable: {
    label: 'Non-Recyclable',
    icon: Trash2,
    color: 'bg-slate-100 text-slate-700',
    progressColor: 'bg-slate-500',
  },
  compostable: {
    label: 'Compostable',
    icon: Leaf,
    color: 'bg-amber-100 text-amber-700',
    progressColor: 'bg-amber-500',
  },
}

const FALLBACK_META = {
  label: 'Waste',
  icon: Trash2,
  color: 'bg-slate-100 text-slate-700',
  progressColor: 'bg-slate-500',
}

// Accepts the raw category value from the API (e.g. "e_waste")
// and returns { label, icon, color, progressColor }.
export function getCategoryMeta(category) {
  if (!category) return FALLBACK_META

  const meta = CATEGORY_META[category]

  if (meta) return meta

  // Unknown/new category value from backend: fall back to a
  // generated label instead of crashing the UI.
  return {
    ...FALLBACK_META,
    label: String(category).replace(/_/g, ' '),
  }
}

// "2 days ago" / "Today" / "Yesterday" / "Aug 12" style label
// for a created_at ISO timestamp.
export function formatRelativeDate(isoString) {
  if (!isoString) return ''

  const date = new Date(isoString)
  const now = new Date()

  const diffDays = Math.floor(
    (now.setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24)
  )

  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}