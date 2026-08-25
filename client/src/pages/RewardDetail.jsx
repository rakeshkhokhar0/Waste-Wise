import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  Coffee,
  Gift,
  Leaf,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react'

const rewards = {
  1: {
    id: 1,
    icon: Coffee,
    title: 'Free Coffee',
    partner: 'Green Brew Cafe',
    category: 'Food & Drinks',
    requiredPoints: 500,
    userPoints: 340,
    available: 10,
    expiry: 'Saturday',
    location: 'New Delhi',
    description:
      'Enjoy a complimentary coffee from Green Brew Cafe by completing your sustainability goals and earning 500 WasteWise Green Points.',
    terms: [
      'You must have at least 500 Green Points to claim this reward.',
      'The offer is valid only on the specified reward day.',
      'One reward can be claimed per eligible user.',
      'The reward must be redeemed at the participating partner location.',
    ],
  },

  2: {
    id: 2,
    icon: ShieldCheck,
    title: 'Free Consultation',
    partner: 'Green Health Clinic',
    category: 'Health',
    requiredPoints: 750,
    userPoints: 340,
    available: 5,
    expiry: 'Sunday',
    location: 'New Delhi',
    description:
      'Reach 750 Green Points and get access to a complimentary consultation session provided by our sustainability partner.',
    terms: [
      'You must have at least 750 Green Points to claim this reward.',
      'Limited slots are available.',
      'Appointment must be booked through the partner.',
      'One consultation reward can be claimed per eligible user.',
    ],
  },

  3: {
    id: 3,
    icon: Gift,
    title: 'Free Gym Week',
    partner: 'GreenFit Gym',
    category: 'Fitness',
    requiredPoints: 1000,
    userPoints: 340,
    available: 3,
    expiry: 'Sunday',
    location: 'New Delhi',
    description:
      'Complete your sustainability goals and unlock one full week of gym access at GreenFit Gym.',
    terms: [
      'You must have at least 1000 Green Points.',
      'The reward provides seven days of gym access.',
      'Valid only at participating GreenFit Gym locations.',
      'One reward per eligible user.',
    ],
  },

  4: {
    id: 4,
    icon: Award,
    title: 'Novel Discount',
    partner: 'EcoReads',
    category: 'Books',
    requiredPoints: 600,
    userPoints: 340,
    available: 20,
    expiry: '30 August',
    location: 'Online & New Delhi',
    description:
      'Use your WasteWise Green Points to unlock an exclusive discount on selected novels and books.',
    terms: [
      'You must have at least 600 Green Points.',
      'Discount applies to selected books only.',
      'Offer cannot be combined with other promotional discounts.',
      'The reward must be redeemed before the expiry date.',
    ],
  },
}

function RewardDetail({ rewardId, onNavigate }) {
  const reward = rewards[rewardId] || rewards[1]

  const RewardIcon = reward.icon

  const remainingPoints = Math.max(
    reward.requiredPoints - reward.userPoints,
    0
  )

  const progress = Math.min(
    (reward.userPoints / reward.requiredPoints) * 100,
    100
  )

  const isEligible = reward.userPoints >= reward.requiredPoints

  return (
    <main className="min-h-screen bg-[#f5f8f3] text-slate-900">

      {/* HEADER */}
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

          <button
            type="button"
            onClick={() => onNavigate('/marketplace')}
            className="flex items-center gap-2 rounded-xl border border-green-200 px-4 py-2 text-sm font-semibold text-green-800 transition hover:bg-green-50"
          >
            <ArrowLeft size={17} />
            Marketplace
          </button>

        </div>
      </header>


      {/* CONTENT */}
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">

        {/* BREADCRUMB */}
        <button
          type="button"
          onClick={() => onNavigate('/marketplace')}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800"
        >
          <ArrowLeft size={16} />
          Back to Marketplace
        </button>


        {/* MAIN CARD */}
        <section className="overflow-hidden rounded-3xl border border-green-100 bg-white shadow-sm">

          <div className="grid lg:grid-cols-[.8fr_1.2fr]">

            {/* LEFT */}
            <div className="flex min-h-[420px] items-center justify-center bg-gradient-to-br from-green-800 to-emerald-600 p-10 text-white">

              <div className="text-center">

                <span className="mx-auto flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white/15 shadow-lg">
                  <RewardIcon size={58} />
                </span>

                <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-green-100">
                  WasteWise Reward
                </p>

                <h1 className="mt-3 text-3xl font-bold">
                  {reward.title}
                </h1>

                <p className="mt-2 text-green-100">
                  Powered by {reward.partner}
                </p>

              </div>

            </div>


            {/* RIGHT */}
            <div className="p-7 lg:p-10">

              <div className="flex flex-wrap items-center gap-2">

                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  {reward.category}
                </span>

                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  <Clock size={13} />
                  Ends {reward.expiry}
                </span>

              </div>


              <p className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-400">
                {reward.partner}
              </p>

              <h1 className="mt-1 text-3xl font-bold">
                {reward.title}
              </h1>

              <p className="mt-4 leading-relaxed text-slate-600">
                {reward.description}
              </p>


              {/* POINTS */}
              <div className="mt-7 rounded-2xl border border-amber-100 bg-[#fffaf0] p-5">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-3">

                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                      <Award size={22} />
                    </span>

                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        REQUIRED
                      </p>

                      <p className="text-xl font-bold">
                        {reward.requiredPoints} Green Points
                      </p>
                    </div>

                  </div>

                  {isEligible && (
                    <CheckCircle2
                      size={25}
                      className="text-green-600"
                    />
                  )}

                </div>


                {/* PROGRESS */}
                <div className="mt-5">

                  <div className="flex justify-between text-xs font-semibold">

                    <span>
                      Your points: {reward.userPoints}
                    </span>

                    <span className="text-green-700">
                      {isEligible
                        ? 'Eligible'
                        : `${remainingPoints} points to go`}
                    </span>

                  </div>

                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">

                    <div
                      className="h-full rounded-full bg-green-600 transition-all"
                      style={{
                        width: `${progress}%`,
                      }}
                    />

                  </div>

                </div>

              </div>


              {/* CLAIM */}
              <div className="mt-6">

                {isEligible ? (

                  <button
                    type="button"
                    className="w-full rounded-xl bg-green-700 px-5 py-3.5 font-bold text-white transition hover:bg-green-800"
                  >
                    Claim Reward
                  </button>

                ) : (

                  <button
                    type="button"
                    onClick={() => onNavigate('/dashboard')}
                    className="w-full rounded-xl border border-green-200 bg-green-50 px-5 py-3.5 font-bold text-green-800 transition hover:bg-green-100"
                  >
                    Earn More Green Points
                  </button>

                )}

              </div>


              {/* INFO */}
              <div className="mt-6 grid gap-3 sm:grid-cols-3">

                <div className="rounded-xl bg-slate-50 p-4">

                  <Users
                    size={18}
                    className="text-green-700"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Available
                  </p>

                  <p className="font-bold">
                    {reward.available} slots
                  </p>

                </div>


                <div className="rounded-xl bg-slate-50 p-4">

                  <Clock
                    size={18}
                    className="text-green-700"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Valid until
                  </p>

                  <p className="font-bold">
                    {reward.expiry}
                  </p>

                </div>


                <div className="rounded-xl bg-slate-50 p-4">

                  <MapPin
                    size={18}
                    className="text-green-700"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Location
                  </p>

                  <p className="font-bold">
                    {reward.location}
                  </p>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* HOW TO REDEEM */}
        <section className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_.8fr]">

          {/* TERMS */}
          <div className="rounded-2xl border border-green-100 bg-white p-6 lg:p-8">

            <p className="text-xs font-bold tracking-[0.18em] text-green-700">
              REWARD DETAILS
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              How to redeem
            </h2>

            <div className="mt-6 space-y-4">

              {[
                {
                  number: '01',
                  title: 'Earn Green Points',
                  text: `Reach ${reward.requiredPoints} Green Points by completing verified waste disposal activities.`,
                },
                {
                  number: '02',
                  title: 'Claim the reward',
                  text: 'Once eligible, click the Claim Reward button to reserve your reward.',
                },
                {
                  number: '03',
                  title: 'Show your reward',
                  text: 'Present your WasteWise reward confirmation to the participating partner.',
                },
              ].map((step) => (

                <div
                  key={step.number}
                  className="flex gap-4 rounded-xl bg-[#f5f8f3] p-4"
                >

                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-700 text-xs font-bold text-white">
                    {step.number}
                  </span>

                  <div>

                    <h3 className="font-bold">
                      {step.title}
                    </h3>

                    <p className="mt-1 text-sm leading-relaxed text-slate-500">
                      {step.text}
                    </p>

                  </div>

                </div>

              ))}

            </div>

          </div>


          {/* TERMS */}
          <div className="rounded-2xl border border-green-100 bg-white p-6 lg:p-8">

            <div className="flex items-center gap-2">

              <ShieldCheck
                size={20}
                className="text-green-700"
              />

              <h2 className="text-xl font-bold">
                Terms & conditions
              </h2>

            </div>

            <div className="mt-5 space-y-4">

              {reward.terms.map((term, index) => (

                <div
                  key={index}
                  className="flex gap-3"
                >

                  <CheckCircle2
                    size={17}
                    className="mt-0.5 shrink-0 text-green-600"
                  />

                  <p className="text-sm leading-relaxed text-slate-600">
                    {term}
                  </p>

                </div>

              ))}

            </div>

          </div>

        </section>


        {/* BOTTOM CTA */}
        <section className="mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-green-800 to-emerald-600 p-7 text-white lg:p-8">

          <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">

            <div>

              <p className="text-xs font-bold tracking-[0.18em] text-green-100">
                KEEP MAKING AN IMPACT
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Your waste can unlock real-world benefits.
              </h2>

              <p className="mt-2 text-sm text-green-50">
                Continue disposing responsibly and earn more Green Points.
              </p>

            </div>

            <button
              type="button"
              onClick={() => onNavigate('/dashboard')}
              className="rounded-xl bg-white px-5 py-3 font-bold text-green-800 transition hover:bg-green-50"
            >
              Dispose Waste
            </button>

          </div>

        </section>

      </div>

    </main>
  )
}

export default RewardDetail