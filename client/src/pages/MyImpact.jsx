import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Flame,
  Leaf,
  Recycle,
  Sprout,
  Target,
  TrendingUp,
  Trophy,
  Trash2,
} from 'lucide-react'

function MyImpact({ onNavigate }) {
  const impact = {
    totalWaste: 12.5,
    recycledWaste: 7.2,
    ecoScore: 82,
    greenPoints: 340,
    nextMilestone: 500,
    verifiedActions: 18,
    streak: 7,
    plastic: 4.2,
    paper: 3.1,
    organic: 2.8,
    other: 2.4,
  }

  const pointsRemaining = Math.max(
    impact.nextMilestone - impact.greenPoints,
    0
  )

  const pointsProgress = Math.min(
    (impact.greenPoints / impact.nextMilestone) * 100,
    100
  )

  const ecoScoreProgress = impact.ecoScore

  return (
    <main className="min-h-screen bg-[#f5f8f3] text-slate-900">

      {/* HEADER */}
      <header className="border-b border-green-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6 py-4 lg:px-10">

          <button
            type="button"
            onClick={() => onNavigate('/dashboard')}
            className="flex items-center gap-2 text-xl font-bold text-green-800"
          >
            <Leaf size={23} />
            WasteWise
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/dashboard')}
            className="flex items-center gap-2 rounded-xl border border-green-200 px-4 py-2 text-sm font-semibold text-green-800 transition hover:bg-green-50"
          >
            <ArrowLeft size={17} />
            Dashboard
          </button>

        </div>
      </header>


      {/* PAGE CONTENT */}
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">

        {/* HERO */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-green-800 to-emerald-600 p-7 text-white shadow-xl shadow-green-950/10 lg:p-10">

          <div className="grid items-center gap-8 lg:grid-cols-[1.3fr_.7fr]">

            <div>

              <p className="text-xs font-bold tracking-[0.2em] text-green-100">
                YOUR WASTEWISE IMPACT
              </p>

              <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
                Your impact is bigger than a bin.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-relaxed text-green-50">
                You've made{' '}
                <strong className="text-white">
                  {impact.verifiedActions} sustainable choices
                </strong>{' '}
                so far. Together, you've given{' '}
                <strong className="text-white">
                  {impact.totalWaste} kg of waste
                </strong>{' '}
                a better next step.
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-green-100">
                You don't need to change everything overnight. Every correctly
                sorted item is another small decision that moves you toward a
                more sustainable habit.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">

                <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs text-green-100">
                    Eco Score
                  </p>
                  <p className="mt-1 text-xl font-bold">
                    {impact.ecoScore}/100
                  </p>
                </div>

                <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs text-green-100">
                    Green Points
                  </p>
                  <p className="mt-1 text-xl font-bold">
                    {impact.greenPoints}
                  </p>
                </div>

                <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs text-green-100">
                    Current Streak
                  </p>
                  <p className="mt-1 text-xl font-bold">
                    {impact.streak} days
                  </p>
                </div>

              </div>

            </div>


            {/* ECO SCORE */}
            <div className="mx-auto w-full max-w-xs">

              <div className="relative flex aspect-square items-center justify-center rounded-full border-[14px] border-white/10">

                <div
                  className="absolute inset-[-14px] rounded-full"
                  style={{
                    background: `conic-gradient(
                      white ${ecoScoreProgress}%,
                      rgba(255,255,255,0.12) ${ecoScoreProgress}%
                    )`,
                    mask: 'radial-gradient(farthest-side, transparent calc(100% - 14px), #000 0)',
                    WebkitMask:
                      'radial-gradient(farthest-side, transparent calc(100% - 14px), #000 0)',
                  }}
                />

                <div className="text-center">

                  <Leaf
                    size={27}
                    className="mx-auto text-green-100"
                  />

                  <p className="mt-2 text-5xl font-bold">
                    {impact.ecoScore}
                  </p>

                  <p className="mt-1 text-sm text-green-100">
                    Eco Score
                  </p>

                  <p className="mt-3 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-green-50">
                    Great progress!
                  </p>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* QUICK STATS */}
        <section className="mt-8">

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <article className="rounded-2xl border border-green-100 bg-white p-5">

              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Trash2 size={21} />
              </span>

              <p className="mt-5 text-sm text-slate-500">
                Waste handled
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                {impact.totalWaste} kg
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                This month
              </p>

            </article>


            <article className="rounded-2xl border border-green-100 bg-white p-5">

              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Recycle size={21} />
              </span>

              <p className="mt-5 text-sm text-slate-500">
                Waste recycled
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                {impact.recycledWaste} kg
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {Math.round(
                  (impact.recycledWaste / impact.totalWaste) * 100
                )}
                % of total
              </p>

            </article>


            <article className="rounded-2xl border border-green-100 bg-white p-5">

              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Award size={21} />
              </span>

              <p className="mt-5 text-sm text-slate-500">
                Green Points
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                {impact.greenPoints}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {pointsRemaining} to next milestone
              </p>

            </article>


            <article className="rounded-2xl border border-green-100 bg-white p-5">

              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <Flame size={21} />
              </span>

              <p className="mt-5 text-sm text-slate-500">
                Current streak
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                {impact.streak} days
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Keep it going!
              </p>

            </article>

          </div>

        </section>


        {/* CONSISTENCY */}
        <section className="mt-8 rounded-2xl border border-green-100 bg-white p-6 lg:p-8">

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

            <div>

              <p className="text-xs font-bold tracking-[0.18em] text-green-700">
                YOUR CONSISTENCY
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Small actions. Big habit.
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                You don't need to make a huge change overnight. You've already
                shown that small actions can become a routine.
              </p>

            </div>

            <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-orange-50 px-5 py-4">

              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <Flame size={25} />
              </span>

              <div>

                <p className="text-xs font-semibold text-orange-700">
                  CURRENT STREAK
                </p>

                <p className="text-2xl font-bold text-orange-800">
                  {impact.streak} days
                </p>

              </div>

            </div>

          </div>


          {/* WEEKLY DOTS */}
          <div className="mt-7 grid grid-cols-7 gap-2 sm:gap-4">

            {[
              { day: 'M', active: true },
              { day: 'T', active: true },
              { day: 'W', active: true },
              { day: 'T', active: true },
              { day: 'F', active: true },
              { day: 'S', active: true },
              { day: 'S', active: true },
            ].map((item, index) => (

              <div
                key={`${item.day}-${index}`}
                className="flex flex-col items-center gap-2"
              >

                <span className="text-xs font-semibold text-slate-400">
                  {item.day}
                </span>

                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    item.active
                      ? 'bg-green-700 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {item.active ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-slate-300" />
                  )}
                </span>

              </div>

            ))}

          </div>

          <div className="mt-6 flex items-center gap-3 rounded-xl bg-[#f5f8f3] p-4">

            <TrendingUp
              size={20}
              className="shrink-0 text-green-700"
            />

            <p className="text-sm text-slate-600">
              <strong className="text-slate-900">
                You're building momentum.
              </strong>{' '}
              Keep making one sustainable choice every day and protect your
              streak.
            </p>

          </div>

        </section>


        {/* WASTE CONTRIBUTION */}
        <section className="mt-8">

          <div>

            <p className="text-xs font-bold tracking-[0.18em] text-green-700">
              YOUR CONTRIBUTION
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Where your waste went
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Every category tells a different story. Your choices determine
              what happens to waste after it leaves your hands.
            </p>

          </div>


          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* PLASTIC */}
            <article className="rounded-2xl border border-green-100 bg-white p-5">

              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Recycle size={20} />
              </span>

              <p className="mt-5 text-sm text-slate-500">
                Plastic
              </p>

              <h3 className="mt-1 text-2xl font-bold">
                {impact.plastic} kg
              </h3>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">

                <div
                  className="h-full rounded-full bg-sky-500"
                  style={{
                    width: `${(impact.plastic / impact.totalWaste) * 100}%`,
                  }}
                />

              </div>

              <p className="mt-2 text-xs text-slate-500">
                Correctly sorted
              </p>

            </article>


            {/* PAPER */}
            <article className="rounded-2xl border border-green-100 bg-white p-5">

              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Trash2 size={20} />
              </span>

              <p className="mt-5 text-sm text-slate-500">
                Paper
              </p>

              <h3 className="mt-1 text-2xl font-bold">
                {impact.paper} kg
              </h3>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">

                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{
                    width: `${(impact.paper / impact.totalWaste) * 100}%`,
                  }}
                />

              </div>

              <p className="mt-2 text-xs text-slate-500">
                Correctly sorted
              </p>

            </article>


            {/* ORGANIC */}
            <article className="rounded-2xl border border-green-100 bg-white p-5">

              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
                <Sprout size={20} />
              </span>

              <p className="mt-5 text-sm text-slate-500">
                Organic
              </p>

              <h3 className="mt-1 text-2xl font-bold">
                {impact.organic} kg
              </h3>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">

                <div
                  className="h-full rounded-full bg-green-600"
                  style={{
                    width: `${(impact.organic / impact.totalWaste) * 100}%`,
                  }}
                />

              </div>

              <p className="mt-2 text-xs text-slate-500">
                Correctly sorted
              </p>

            </article>


            {/* OTHER */}
            <article className="rounded-2xl border border-green-100 bg-white p-5">

              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Trash2 size={20} />
              </span>

              <p className="mt-5 text-sm text-slate-500">
                Other
              </p>

              <h3 className="mt-1 text-2xl font-bold">
                {impact.other} kg
              </h3>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">

                <div
                  className="h-full rounded-full bg-slate-500"
                  style={{
                    width: `${(impact.other / impact.totalWaste) * 100}%`,
                  }}
                />

              </div>

              <p className="mt-2 text-xs text-slate-500">
                Correctly sorted
              </p>

            </article>

          </div>

        </section>


        {/* GREEN SCORE + POINTS */}
        <section className="mt-8 grid gap-6 lg:grid-cols-2">

          {/* ECO SCORE */}
          <article className="rounded-2xl border border-green-100 bg-white p-6 lg:p-8">

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-xs font-bold tracking-[0.18em] text-green-700">
                  YOUR GREEN SCORE
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  You're becoming an Eco Warrior.
                </h2>

              </div>

              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-700">
                <Target size={23} />
              </span>

            </div>

            <div className="mt-7 flex items-end justify-between">

              <div>

                <p className="text-5xl font-bold text-green-700">
                  {impact.ecoScore}
                  <span className="text-xl text-slate-400">
                    /100
                  </span>
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Great progress!
                </p>

              </div>

              <TrendingUp
                size={32}
                className="text-green-600"
              />

            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">

              <div
                className="h-full rounded-full bg-green-600"
                style={{
                  width: `${impact.ecoScore}%`,
                }}
              />

            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-500">
              Your score reflects the consistency of your actions, the waste
              you've identified, and the responsible disposal steps you've
              completed.
            </p>

          </article>


          {/* GREEN POINTS */}
          <article className="rounded-2xl border border-amber-100 bg-[#fffaf0] p-6 lg:p-8">

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-xs font-bold tracking-[0.18em] text-amber-700">
                  GREEN POINTS
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  Your actions are earning something back.
                </h2>

              </div>

              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Trophy size={23} />
              </span>

            </div>

            <div className="mt-7 flex items-end justify-between">

              <div>

                <p className="text-5xl font-bold text-amber-700">
                  {impact.greenPoints}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Green Points earned
                </p>

              </div>

              <div className="text-right">

                <p className="text-sm font-bold text-slate-700">
                  {pointsRemaining}
                </p>

                <p className="text-xs text-slate-500">
                  points to go
                </p>

              </div>

            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-amber-100">

              <div
                className="h-full rounded-full bg-amber-500"
                style={{
                  width: `${pointsProgress}%`,
                }}
              />

            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              You're only{' '}
              <strong className="text-slate-900">
                {pointsRemaining} points away
              </strong>{' '}
              from your next milestone. Keep going — your next reward could be
              closer than you think.
            </p>

            <button
              type="button"
              onClick={() => onNavigate('/marketplace')}
              className="mt-5 flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-700"
            >
              Explore rewards
              <ArrowRight size={17} />
            </button>

          </article>

        </section>


        {/* IMPACT STORY */}
        <section className="mt-8 overflow-hidden rounded-3xl border border-green-100 bg-white">

          <div className="grid lg:grid-cols-[.8fr_1.2fr]">

            <div className="flex min-h-[300px] items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-8">

              <div className="text-center">

                <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-700 text-white shadow-lg">
                  <Sprout size={38} />
                </span>

                <p className="mt-5 text-sm font-bold text-green-700">
                  YOUR IMPACT STORY
                </p>

                <p className="mt-2 text-3xl font-bold text-green-900">
                  One choice at a time.
                </p>

              </div>

            </div>


            <div className="p-7 lg:p-10">

              <p className="text-xs font-bold tracking-[0.18em] text-green-700">
                LOOK HOW FAR YOU'VE COME
              </p>

              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                You don't have to change the world in one day.
              </h2>

              <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-600">

                <p>
                  You started with something simple:{' '}
                  <strong className="text-slate-900">
                    making a better choice about your waste.
                  </strong>
                </p>

                <p>
                  Now you've handled{' '}
                  <strong className="text-green-700">
                    {impact.totalWaste} kg
                  </strong>{' '}
                  of waste, completed{' '}
                  <strong className="text-green-700">
                    {impact.verifiedActions} verified actions
                  </strong>{' '}
                  and built a{' '}
                  <strong className="text-green-700">
                    {impact.streak}-day streak.
                  </strong>
                </p>

                <p>
                  None of these actions has to feel huge on its own. But when
                  small choices are repeated, they become habits — and habits
                  are where lasting change begins.
                </p>

              </div>

              <div className="mt-7 rounded-2xl bg-[#f5f8f3] p-5">

                <div className="flex gap-3">

                  <Leaf
                    size={22}
                    className="mt-0.5 shrink-0 text-green-700"
                  />

                  <p className="text-sm font-semibold leading-relaxed text-slate-700">
                    Keep making the next good choice. Your WasteWise journey
                    is just getting started.
                  </p>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* FINAL CTA */}
        <section className="mt-8 pb-10">

          <div className="rounded-3xl bg-gradient-to-br from-green-800 to-emerald-600 p-7 text-white lg:p-9">

            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">

              <div>

                <p className="text-xs font-bold tracking-[0.18em] text-green-100">
                  KEEP THE MOMENTUM
                </p>

                <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                  Your next sustainable choice is one upload away.
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-relaxed text-green-50">
                  Keep identifying, sorting and disposing responsibly. Every
                  verified action moves your score forward.
                </p>

              </div>

              <button
                type="button"
                onClick={() => onNavigate('/dashboard')}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-green-800 transition hover:bg-green-50"
              >
                Dispose Waste
                <ArrowRight size={17} />
              </button>

            </div>

          </div>

        </section>

      </div>

    </main>
  )
}

export default MyImpact