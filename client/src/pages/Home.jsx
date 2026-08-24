import { ArrowRight, BarChart3, Leaf, Recycle, Sprout } from 'lucide-react'
import heroImage from '../assets/hero.png'

const features = [
  { icon: Recycle, title: 'Track', text: 'Keep track of daily waste and understand your habits.' },
  { icon: BarChart3, title: 'Analyze', text: 'See meaningful insights about your waste generation.' },
  { icon: Sprout, title: 'Improve', text: 'Make smarter choices and reduce your environmental impact.' },
]

function Home({ onNavigate }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f6faf5] text-slate-900">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <button type="button" onClick={() => onNavigate('/')} className="flex items-center gap-2 text-2xl font-bold text-green-800">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-700 text-white"><Leaf size={22} /></span>
          WasteWise
        </button>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <button type="button" onClick={() => onNavigate('/login')} className="rounded-lg px-4 py-2 text-slate-700 transition hover:bg-green-100">Login</button>
          <button type="button" onClick={() => onNavigate('/signup')} className="rounded-lg bg-green-700 px-5 py-2.5 text-white shadow-lg shadow-green-900/10 transition hover:bg-green-800">Register</button>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-14 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:pb-28 lg:pt-24">
        <div className="relative z-10">
          <p className="mb-5 text-xs font-bold tracking-[0.2em] text-green-700">SMARTER WASTE MANAGEMENT</p>
          <h1 className="max-w-2xl text-5xl font-bold leading-[1.03] tracking-tight text-slate-900 sm:text-6xl">
            Manage waste.<br />Make an impact.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-slate-600">
            WasteWise helps you track, manage, and understand your waste while making better choices for a cleaner, more sustainable future.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button type="button" onClick={() => onNavigate('/signup')} className="group flex items-center gap-2 rounded-xl bg-green-700 px-6 py-3.5 font-semibold text-white shadow-xl shadow-green-900/15 transition hover:bg-green-800">
              Get started <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </button>
            <button type="button" onClick={() => onNavigate('/login')} className="rounded-xl border border-green-200 bg-white px-6 py-3.5 font-semibold text-green-800 transition hover:border-green-400 hover:bg-green-50">Login</button>
          </div>
          <div className="mt-12 flex gap-9 border-t border-green-200 pt-7 text-sm text-slate-500">
            <span><strong className="block text-2xl text-slate-900">Track</strong>daily actions</span>
            <span><strong className="block text-2xl text-slate-900">Learn</strong>better disposal</span>
            <span><strong className="block text-2xl text-slate-900">Improve</strong>your impact</span>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-8 rounded-full bg-green-200/50 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2.5rem] border-8 border-white bg-green-200 shadow-2xl shadow-green-950/15">
            <img src={heroImage} alt="Sustainable waste management" className="aspect-[5/4] w-full object-cover" />
            <div className="absolute bottom-5 left-5 rounded-2xl bg-white/90 p-4 shadow-lg backdrop-blur">
              <p className="text-xs font-bold tracking-wider text-green-700">PLANET POSITIVE</p>
              <p className="mt-1 font-semibold text-slate-800">Every choice counts.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-green-100 bg-white px-6 py-16 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-xs font-bold tracking-[0.18em] text-green-700">A BETTER DAILY HABIT</p>
          <h2 className="mt-3 text-center text-3xl font-bold">Small actions. Real impact.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-green-100 bg-[#f8fcf7] p-7 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-green-950/5">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-700"><Icon size={25} /></span>
              <h3 className="mt-5 text-xl font-bold">{title}</h3>
              <p className="mt-2 leading-relaxed text-slate-600">{text}</p>
            </article>)}
          </div>
        </div>
      </section>
    </main>
  )
}

export default Home
