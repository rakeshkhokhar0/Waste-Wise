import { useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  GlassWater,
  Leaf,
  Recycle,
  Sparkles,
  Trophy,
  Trash2,
} from 'lucide-react'

const wasteItems = [
  {
    type: 'Plastic',
    amount: '1.0 kg',
    icon: Recycle,
    color: 'bg-sky-100 text-sky-700',
  },
  {
    type: 'Organic',
    amount: '2.0 kg',
    icon: Leaf,
    color: 'bg-green-100 text-green-700',
  },
  {
    type: 'Glass',
    amount: '0.5 kg',
    icon: GlassWater,
    color: 'bg-violet-100 text-violet-700',
  },
]

const steps = [
  {
    waste: 'Plastic',
    step: 'Step 1 of 4',
    title: 'Separate your plastic',
    description:
      'Separate the plastic items from the rest of your waste and keep them together.',
    icon: Recycle,
  },
  {
    waste: 'Organic',
    step: 'Step 2 of 4',
    title: 'Prepare your organic waste',
    description:
      'Separate your vegetable waste and remove plastic packaging or any other non-organic material.',
    icon: Leaf,
  },
  {
    waste: 'Glass',
    step: 'Step 3 of 4',
    title: 'Prepare your glass',
    description:
      'Keep the glass items separate and handle them carefully to avoid breakage.',
    icon: GlassWater,
  },
  {
    waste: 'All waste',
    step: 'Step 4 of 4',
    title: 'Complete your disposal',
    description:
      'Place each waste category in its appropriate collection, recycling, or compost container.',
    icon: Trash2,
  },
]

function WasteJourney({ onNavigate }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completed, setCompleted] = useState(false)

  const step = steps[currentStep]
  const StepIcon = step.icon

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((previous) => previous + 1)
    } else {
      setCompleted(true)
    }
  }

  if (completed) {
    return (
      <main className="min-h-screen bg-[#f5f8f3] text-slate-900">
        <header className="border-b border-green-100 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
            <button
              type="button"
              onClick={() => onNavigate('/dashboard')}
              className="flex items-center gap-2 text-xl font-bold text-green-800"
            >
              <Leaf size={23} />
              WasteWise
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-6 py-12 lg:px-10">
          <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="bg-gradient-to-br from-green-800 to-emerald-600 px-6 py-12 text-center text-white sm:px-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15">
                <Trophy size={38} />
              </div>

              <p className="mt-6 text-xs font-bold tracking-[0.2em] text-green-100">
                JOURNEY COMPLETED
              </p>

              <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
                You made your waste count today.
              </h1>

              <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-green-50">
                Small actions add up. Today you took the right steps to give
                your waste a more responsible next destination.
              </p>
            </div>

            <div className="p-6 sm:p-10">
              <div className="grid gap-4 sm:grid-cols-3">
                {wasteItems.map(
                  ({ type, amount, icon: Icon, color }) => (
                    <article
                      key={type}
                      className="rounded-2xl border border-green-100 bg-white p-5"
                    >
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}
                      >
                        <Icon size={21} />
                      </span>

                      <p className="mt-5 text-sm text-slate-500">{type}</p>

                      <h3 className="mt-1 text-2xl font-bold">
                        {amount}
                      </h3>

                      <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-green-700">
                        <CheckCircle2 size={14} />
                        Disposal completed
                      </div>
                    </article>
                  ),
                )}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-green-50 p-5">
                  <p className="text-sm text-slate-500">Green Points</p>
                  <p className="mt-1 text-3xl font-bold text-green-800">
                    +45
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Added to your account
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50 p-5">
                  <p className="text-sm text-slate-500">
                    Sustainability Score
                  </p>
                  <p className="mt-1 text-3xl font-bold text-amber-700">
                    +4
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Your positive impact
                  </p>
                </div>

                <div className="rounded-2xl bg-sky-50 p-5">
                  <p className="text-sm text-slate-500">Waste handled</p>
                  <p className="mt-1 text-3xl font-bold text-sky-700">
                    3.5 kg
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Across 3 categories
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-green-100 bg-[#f8fbf6] p-6 text-center">
                <Sparkles className="mx-auto text-green-700" size={24} />

                <h2 className="mt-3 text-xl font-bold">
                  Keep the momentum going.
                </h2>

                <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
                  Every time you make a better disposal choice, you're
                  building a cleaner habit and moving closer to your next
                  reward.
                </p>
              </div>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => onNavigate('/my-impact')}
                  className="rounded-xl bg-green-700 px-6 py-3 font-semibold text-white transition hover:bg-green-800"
                >
                  View My Impact
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('/dashboard')}
                  className="rounded-xl border border-green-200 px-6 py-3 font-semibold text-green-800 transition hover:bg-green-50"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f8f3] text-slate-900">
      <header className="border-b border-green-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <button
            type="button"
            onClick={() => onNavigate('/dashboard')}
            className="flex items-center gap-2 text-xl font-bold text-green-800"
          >
            <Leaf size={23} />
            WasteWise
          </button>

          <div className="rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-800">
            Today's Waste Journey
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
        <section>
          <p className="text-xs font-bold tracking-[0.18em] text-green-700">
            YOUR WASTE JOURNEY
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Let's make today's waste count.
          </h1>

          <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">
            Follow each step to give your waste the right destination.
            Complete the journey and earn Green Points for your effort.
          </p>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {wasteItems.map(({ type, amount, icon: Icon, color }) => (
            <article
              key={type}
              className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}
                >
                  <Icon size={21} />
                </span>

                <span className="text-xs font-semibold text-slate-400">
                  TODAY
                </span>
              </div>

              <p className="mt-5 text-sm text-slate-500">{type}</p>

              <h2 className="mt-1 text-2xl font-bold">{amount}</h2>
            </article>
          ))}
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[0.16em] text-green-700">
                  DISPOSAL GUIDE
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  One step at a time
                </h2>
              </div>

              <span className="text-sm font-semibold text-slate-500">
                {currentStep + 1} / {steps.length}
              </span>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-green-600 transition-all duration-500"
                style={{
                  width: `${((currentStep + 1) / steps.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="flex justify-center">
              <div className="flex h-48 w-48 items-center justify-center rounded-full bg-green-50">
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <StepIcon size={52} />
                </div>
              </div>
            </div>

            <div>
              <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                {step.step}
              </span>

              <p className="mt-5 text-sm font-semibold text-green-700">
                {step.waste} disposal
              </p>

              <h2 className="mt-2 text-3xl font-bold leading-tight">
                {step.title}
              </h2>

              <p className="mt-4 max-w-xl leading-relaxed text-slate-600">
                {step.description}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-700 px-6 py-3 font-semibold text-white transition hover:bg-green-800"
                >
                  {currentStep === steps.length - 1
                    ? 'Complete Journey'
                    : 'Next Step'}

                  {currentStep === steps.length - 1 ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <ArrowRight size={18} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-slate-400">
          WasteWise helps you turn everyday disposal into meaningful
          environmental action.
        </p>
      </div>
    </main>
  )
}

export default WasteJourney