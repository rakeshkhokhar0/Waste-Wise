import { useState } from 'react'
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Coffee,
  Dumbbell,
  Gift,
  Leaf,
  Medal,
  Search,
  Stethoscope,
  Trophy,
  Clock,
  Users,
} from 'lucide-react'

const rewards = [
  {
    id: 1,
    icon: Coffee,
    title: 'Free Coffee',
    partner: 'Green Brew Cafe',
    category: 'Food & Drinks',
    requiredPoints: 500,
    description:
      'Enjoy a complimentary coffee from a sustainability-focused cafe.',
    expiry: 'Saturday',
    available: 10,
    featured: true,
    color: 'amber',
  },
  {
    id: 2,
    icon: Stethoscope,
    title: 'Free Consultation',
    partner: 'Green Health Clinic',
    category: 'Health',
    requiredPoints: 750,
    description:
      'Get a complimentary consultation session from our sustainability partner.',
    expiry: 'Sunday',
    available: 5,
    featured: true,
    color: 'green',
  },
  {
    id: 3,
    icon: Dumbbell,
    title: 'Free Gym Week',
    partner: 'GreenFit Gym',
    category: 'Fitness',
    requiredPoints: 1000,
    description:
      'Get one full week of gym access by reaching the required Green Points.',
    expiry: 'Sunday',
    available: 3,
    featured: true,
    color: 'sky',
  },
  {
    id: 4,
    icon: BookOpen,
    title: 'Novel Discount',
    partner: 'EcoReads',
    category: 'Books',
    requiredPoints: 600,
    description:
      'Get an exclusive discount on selected novels and books.',
    expiry: '30 August',
    available: 20,
    featured: false,
    color: 'violet',
  },
  {
    id: 5,
    icon: Gift,
    title: 'Restaurant Discount',
    partner: 'EcoBites',
    category: 'Food & Drinks',
    requiredPoints: 300,
    description:
      'Get a special discount at a restaurant supporting sustainable practices.',
    expiry: '31 August',
    available: 25,
    featured: false,
    color: 'rose',
  },
  {
    id: 6,
    icon: Medal,
    title: 'Green Shopping Voucher',
    partner: 'EcoMart',
    category: 'Shopping',
    requiredPoints: 1200,
    description:
      'Redeem your Green Points for an exclusive sustainable shopping voucher.',
    expiry: '5 September',
    available: 15,
    featured: false,
    color: 'emerald',
  },
]

const categories = [
  'All Rewards',
  'Food & Drinks',
  'Health',
  'Fitness',
  'Books',
  'Shopping',
]

function Marketplace({ onNavigate }) {
  const [selectedCategory, setSelectedCategory] = useState('All Rewards')
  const [searchQuery, setSearchQuery] = useState('')

  // Demo user points.
  // Later this will come from your backend.
  const userPoints = 340

  const filteredRewards = rewards.filter((reward) => {
    const matchesCategory =
      selectedCategory === 'All Rewards' ||
      reward.category === selectedCategory

    const matchesSearch =
      reward.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reward.partner.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesCategory && matchesSearch
  })

  const almostThereRewards = rewards
    .filter((reward) => reward.requiredPoints > userPoints)
    .sort(
      (a, b) =>
        a.requiredPoints - userPoints -
        (b.requiredPoints - userPoints)
    )
    .slice(0, 3)

  const availableRewards = rewards.filter(
    (reward) => reward.requiredPoints <= userPoints
  )

  const getProgress = (requiredPoints) => {
    return Math.min((userPoints / requiredPoints) * 100, 100)
  }

  const getRemainingPoints = (requiredPoints) => {
    return Math.max(requiredPoints - userPoints, 0)
  }

  const getColorClasses = (color) => {
    const colors = {
      amber: {
        icon: 'bg-amber-100 text-amber-700',
        badge: 'bg-amber-50 text-amber-700 border-amber-100',
        button: 'bg-amber-500 hover:bg-amber-600',
        progress: 'bg-amber-500',
      },
      green: {
        icon: 'bg-green-100 text-green-700',
        badge: 'bg-green-50 text-green-700 border-green-100',
        button: 'bg-green-700 hover:bg-green-800',
        progress: 'bg-green-600',
      },
      sky: {
        icon: 'bg-sky-100 text-sky-700',
        badge: 'bg-sky-50 text-sky-700 border-sky-100',
        button: 'bg-sky-600 hover:bg-sky-700',
        progress: 'bg-sky-500',
      },
      violet: {
        icon: 'bg-violet-100 text-violet-700',
        badge: 'bg-violet-50 text-violet-700 border-violet-100',
        button: 'bg-violet-600 hover:bg-violet-700',
        progress: 'bg-violet-500',
      },
      rose: {
        icon: 'bg-rose-100 text-rose-700',
        badge: 'bg-rose-50 text-rose-700 border-rose-100',
        button: 'bg-rose-500 hover:bg-rose-600',
        progress: 'bg-rose-500',
      },
      emerald: {
        icon: 'bg-emerald-100 text-emerald-700',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        button: 'bg-emerald-600 hover:bg-emerald-700',
        progress: 'bg-emerald-600',
      },
    }

    return colors[color] || colors.green
  }

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

          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-500 md:flex">

            <button
              type="button"
              onClick={() => onNavigate('/dashboard')}
              className="transition hover:text-green-700"
            >
              Home
            </button>

            <button
              type="button"
              className="transition hover:text-green-700"
            >
              My activity
            </button>

            <button
              type="button"
              className="text-green-700"
            >
              Rewards
            </button>

            <button
              type="button"
              className="transition hover:text-green-700"
            >
              My impact
            </button>

          </nav>

          <div className="flex items-center gap-3">

            <div className="hidden items-center gap-2 rounded-full bg-green-50 py-1.5 pl-1.5 pr-3 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-700 text-sm font-bold text-white">
                U
              </span>

              <span className="text-sm font-semibold">
                Eco Warrior
              </span>
            </div>

          </div>

        </div>
      </header>


      {/* PAGE CONTENT */}
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">

        {/* PAGE INTRO */}
        <section>

          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">

            <div>

              <p className="text-xs font-bold tracking-[0.18em] text-green-700">
                WASTEWISE MARKETPLACE
              </p>

              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                Turn Green Points into rewards
              </h1>

              <p className="mt-2 max-w-2xl text-slate-600">
                Keep making sustainable choices and unlock useful rewards
                from WasteWise partners.
              </p>

            </div>


            {/* POINTS CARD */}
            <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-[#fffaf0] px-5 py-4">

              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Award size={22} />
              </span>

              <div>
                <p className="text-xs font-semibold text-slate-500">
                  YOUR GREEN POINTS
                </p>

                <p className="text-2xl font-bold text-slate-900">
                  {userPoints}
                </p>
              </div>

            </div>

          </div>

        </section>


        {/* FEATURED / ALMOST THERE */}
        <section className="mt-9">

          <div className="flex items-end justify-between">

            <div>

              <p className="text-xs font-bold tracking-[0.18em] text-amber-700">
                🔥 ALMOST THERE
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Rewards within your reach
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                You're closer than you think.
              </p>

            </div>

          </div>


          <div className="mt-5 grid gap-5 lg:grid-cols-3">

            {almostThereRewards.map((reward) => {

              const RewardIcon = reward.icon
              const colors = getColorClasses(reward.color)
              const progress = getProgress(reward.requiredPoints)
              const remaining = getRemainingPoints(
                reward.requiredPoints
              )

              return (

                <article
                  key={reward.id}
                  className="group overflow-hidden rounded-2xl border border-green-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >

                  <div className="flex items-start justify-between gap-4">

                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colors.icon}`}
                    >
                      <RewardIcon size={24} />
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${colors.badge}`}
                    >
                      {reward.available} available
                    </span>

                  </div>


                  <p className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-400">
                    {reward.partner}
                  </p>

                  <h3 className="mt-1 text-xl font-bold">
                    {reward.title}
                  </h3>

                  <p className="mt-2 min-h-[48px] text-sm leading-relaxed text-slate-500">
                    {reward.description}
                  </p>


                  {/* PROGRESS */}
                  <div className="mt-5">

                    <div className="flex items-center justify-between text-xs font-semibold">

                      <span>
                        {userPoints} / {reward.requiredPoints} points
                      </span>

                      <span className="text-green-700">
                        {remaining} to go
                      </span>

                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">

                      <div
                        className={`h-full rounded-full transition-all ${colors.progress}`}
                        style={{
                          width: `${progress}%`,
                        }}
                      />

                    </div>

                  </div>


                  <div className="mt-5 flex items-center justify-between gap-3">

                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock size={14} />
                      Ends {reward.expiry}
                    </div>

                  <button
  type="button"
  onClick={() => onNavigate(`/marketplace/reward/${reward.id}`)}
  className={`flex items-center gap-1 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition ${colors.button}`}
>
  View offer
  <ChevronRight size={15} />
</button>

                  </div>

                </article>

              )
            })}

          </div>

        </section>


        {/* SEARCH + FILTERS */}
        <section className="mt-12">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <p className="text-xs font-bold tracking-[0.18em] text-green-700">
                ALL REWARDS
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Explore the marketplace
              </h2>

            </div>


            {/* SEARCH */}
            <div className="relative w-full lg:max-w-sm">

              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                placeholder="Search rewards or partners..."
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                className="w-full rounded-xl border border-green-100 bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-green-400 focus:ring-2 focus:ring-green-100"
              />

            </div>

          </div>


          {/* CATEGORY FILTER */}
          <div className="mt-5 flex gap-2 overflow-x-auto pb-2">

            {categories.map((category) => (

              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedCategory === category
                    ? 'bg-green-700 text-white'
                    : 'border border-green-100 bg-white text-slate-600 hover:bg-green-50 hover:text-green-700'
                }`}
              >
                {category}
              </button>

            ))}

          </div>

        </section>


        {/* AVAILABLE REWARDS */}
        {availableRewards.length > 0 && (
          <section className="mt-8">

            <div className="mb-5 flex items-center gap-2">

              <CheckCircle2
                size={20}
                className="text-green-700"
              />

              <h2 className="text-xl font-bold">
                Available for you
              </h2>

            </div>


            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

              {availableRewards.map((reward) => {

                const RewardIcon = reward.icon
                const colors = getColorClasses(reward.color)

                return (

                  <article
                    key={reward.id}
                    className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >

                    <div className="flex items-start justify-between">

                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors.icon}`}
                      >
                        <RewardIcon size={22} />
                      </span>

                      <span className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                        <CheckCircle2 size={13} />
                        Eligible
                      </span>

                    </div>

                    <p className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-400">
                      {reward.partner}
                    </p>

                    <h3 className="mt-1 text-xl font-bold">
                      {reward.title}
                    </h3>

                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      {reward.description}
                    </p>

                    <div className="mt-5 flex items-center justify-between">

                      <div>
                        <p className="text-xs text-slate-500">
                          Required
                        </p>

                        <p className="font-bold text-green-700">
                          {reward.requiredPoints} points
                        </p>
                      </div>

                      <button
                        type="button"
                        className="rounded-xl bg-green-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-green-800"
                      >
                        Claim reward
                      </button>

                    </div>

                  </article>

                )
              })}

            </div>

          </section>
        )}


        {/* ALL MARKETPLACE REWARDS */}
        <section className="mt-12 pb-12">

          <div className="mb-5 flex items-center justify-between">

            <div>

              <p className="text-xs font-bold tracking-[0.18em] text-green-700">
                KEEP GOING
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                More rewards to unlock
              </h2>

            </div>

            <div className="hidden items-center gap-2 text-sm font-semibold text-slate-500 sm:flex">
              <Users size={16} />
              Partner rewards
            </div>

          </div>


          {filteredRewards.length === 0 ? (

            <div className="rounded-2xl border border-green-100 bg-white p-10 text-center">

              <Gift
                size={36}
                className="mx-auto text-slate-300"
              />

              <h3 className="mt-4 text-lg font-bold">
                No rewards found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Try another category or search term.
              </p>

            </div>

          ) : (

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

              {filteredRewards.map((reward) => {

                const RewardIcon = reward.icon
                const colors = getColorClasses(reward.color)
                const remaining = getRemainingPoints(
                  reward.requiredPoints
                )
                const progress = getProgress(
                  reward.requiredPoints
                )

                return (

                  <article
                    key={reward.id}
                    className="rounded-2xl border border-green-100 bg-white p-6 transition hover:-translate-y-1 hover:shadow-md"
                  >

                    <div className="flex items-start justify-between">

                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors.icon}`}
                      >
                        <RewardIcon size={22} />
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {reward.category}
                      </span>

                    </div>


                    <p className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-400">
                      {reward.partner}
                    </p>

                    <h3 className="mt-1 text-xl font-bold">
                      {reward.title}
                    </h3>

                    <p className="mt-2 min-h-[48px] text-sm leading-relaxed text-slate-500">
                      {reward.description}
                    </p>


                    {/* POINT PROGRESS */}
                    <div className="mt-5">

                      <div className="flex justify-between text-xs font-semibold">

                        <span>
                          {userPoints} / {reward.requiredPoints}
                        </span>

                        <span className="text-green-700">
                          {remaining > 0
                            ? `${remaining} points to go`
                            : 'Eligible'}
                        </span>

                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">

                        <div
                          className={`h-full rounded-full ${colors.progress}`}
                          style={{
                            width: `${progress}%`,
                          }}
                        />

                      </div>

                    </div>


                    <div className="mt-5 flex items-center justify-between gap-3">

                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock size={14} />
                        {reward.expiry}
                      </div>

                      {remaining > 0 ? (

                        <button
                          type="button"
                          className="flex items-center gap-1 rounded-xl border border-green-200 px-4 py-2.5 text-xs font-bold text-green-700 transition hover:bg-green-50"
                        >
                          Earn points
                          <ChevronRight size={14} />
                        </button>

                      ) : (

                        <button
                          type="button"
                          className="flex items-center gap-1 rounded-xl bg-green-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-green-800"
                        >
                          Claim
                          <ChevronRight size={14} />
                        </button>

                      )}

                    </div>

                  </article>

                )
              })}

            </div>

          )}

        </section>


        {/* MOTIVATION BANNER */}
        <section className="mb-10 overflow-hidden rounded-3xl bg-gradient-to-br from-green-800 to-emerald-600 p-7 text-white shadow-xl shadow-green-950/10 lg:p-10">

          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">

            <div>

              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                <Trophy size={22} />
              </span>

              <h2 className="mt-5 text-2xl font-bold">
                Keep going, Eco Warrior.
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-relaxed text-green-50">
                Every verified waste disposal brings you closer to
                rewards. Your next sustainable action could unlock
                something exciting.
              </p>

            </div>

            <button
              type="button"
              onClick={() => onNavigate('/dashboard')}
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-green-800 transition hover:bg-green-50"
            >
              Dispose waste
              <ChevronRight size={17} />
            </button>

          </div>

        </section>

      </div>

    </main>
  )
}

export default Marketplace