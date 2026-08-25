import { useEffect, useState } from 'react'
import { CheckCircle2, Leaf, LoaderCircle, Sparkles } from 'lucide-react'

function WasteClassification({ image, onNavigate }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 900),
      setTimeout(() => setStep(2), 1800),
      setTimeout(() => setStep(3), 2700),
      setTimeout(() => {
        onNavigate('/waste-journey')
      }, 3800),
    ]

    return () => timers.forEach(clearTimeout)
  }, [onNavigate])

  const steps = [
    'Image received',
    'Identifying waste materials',
    'Analyzing disposal methods',
    'Preparing your Waste Journey',
  ]

  return (
    <main className="min-h-screen bg-[#f5f8f3] text-slate-900">

      <header className="border-b border-green-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center px-6 py-4 lg:px-10">
          <div className="flex items-center gap-2 text-xl font-bold text-green-800">
            <Leaf size={23} />
            WasteWise
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-6 py-10">

        <div className="w-full max-w-2xl rounded-3xl border border-green-100 bg-white p-8 text-center shadow-xl sm:p-12">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-700">
            <Sparkles size={30} />
          </div>

          <p className="mt-6 text-xs font-bold tracking-[0.18em] text-green-700">
            WASTEWISE AI
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Analyzing your waste
          </h1>

          <p className="mx-auto mt-3 max-w-md text-slate-500">
            We're identifying your waste and preparing the best disposal
            journey for you.
          </p>

          {image && (
            <div className="mx-auto mt-7 h-40 w-40 overflow-hidden rounded-2xl border-4 border-green-50 shadow-md">
              <img
                src={image}
                alt="Waste being analyzed"
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="mx-auto mt-8 max-w-md text-left">

            {steps.map((text, index) => (
              <div
                key={text}
                className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0"
              >

                {index < step ? (
                  <CheckCircle2
                    size={20}
                    className="flex-shrink-0 text-green-600"
                  />
                ) : index === step ? (
                  <LoaderCircle
                    size={20}
                    className="flex-shrink-0 animate-spin text-green-600"
                  />
                ) : (
                  <div className="h-5 w-5 flex-shrink-0 rounded-full border-2 border-slate-200" />
                )}

                <span
                  className={
                    index <= step
                      ? 'text-sm font-semibold text-slate-800'
                      : 'text-sm text-slate-400'
                  }
                >
                  {text}
                </span>

              </div>
            ))}

          </div>

          <p className="mt-7 text-xs text-slate-400">
            This may take a few seconds...
          </p>

        </div>
      </div>
    </main>
  )
}

export default WasteClassification