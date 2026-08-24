import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Award, Bell, Camera, ChevronRight, ImageUp, Leaf, LogOut, Medal, Recycle, Sprout, Trash2 } from 'lucide-react'

const rewards = [
  { icon: Recycle, title: 'Recycle more, earn more', text: 'Earn points every time you correctly dispose of waste.' },
  { icon: Award, title: 'Unlock new badges', text: 'Complete waste challenges and collect achievement badges.' },
  { icon: Medal, title: 'Redeem your points', text: 'Turn WasteWise points into exciting rewards.' },
]

const activity = [
  { icon: Recycle, type: 'Plastic', amount: '1.2 kg', action: 'Recycled', date: 'Today', color: 'bg-sky-100 text-sky-700' },
  { icon: Sprout, type: 'Organic', amount: '2.5 kg', action: 'Composted', date: 'Yesterday', color: 'bg-green-100 text-green-700' },
  { icon: Trash2, type: 'Paper', amount: '0.8 kg', action: 'Recycled', date: '2 days ago', color: 'bg-amber-100 text-amber-700' },
]

function Dashboard({ onNavigate, onLogout }) {
  const inputRef = useRef(null)
  const [image, setImage] = useState(null)
  const [rewardIndex, setRewardIndex] = useState(0)
  const reward = rewards[rewardIndex]
  const RewardIcon = reward.icon

  const selectImage = (event) => {
    const file = event.target.files?.[0]
    if (file) setImage(URL.createObjectURL(file))
  }

  return (
    <main className="min-h-screen bg-[#f5f8f3] text-slate-900">
      <header className="border-b border-green-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6 py-4 lg:px-10">
          <button type="button" onClick={() => onNavigate('/dashboard')} className="flex items-center gap-2 text-xl font-bold text-green-800"><Leaf size={23} /> WasteWise</button>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-500 md:flex"><button className="text-green-700">Home</button><button>My activity</button><button>Rewards</button><button>My impact</button></nav>
          <div className="flex items-center gap-3"><button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Bell size={20} /></button><div className="flex items-center gap-2 rounded-full bg-green-50 py-1.5 pl-1.5 pr-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-700 text-sm font-bold text-white">U</span><span className="hidden text-sm font-semibold sm:block">Eco Warrior</span></div><button type="button" onClick={onLogout} className="flex items-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-sm font-semibold text-green-800 transition hover:bg-green-50"><LogOut size={17} /><span className="hidden sm:inline">Logout</span></button></div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <section><p className="text-xs font-bold tracking-[0.18em] text-green-700">YOUR SUSTAINABILITY JOURNEY</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Good morning, User</h1><p className="mt-2 text-slate-600">Let's make your waste count. Identify, dispose, and earn rewards.</p></section>

        <section className="mt-9 overflow-hidden rounded-3xl bg-gradient-to-br from-green-800 to-emerald-600 p-7 text-white shadow-xl shadow-green-950/10 lg:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_.65fr]"><div><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Recycle size={25} /></span><p className="mt-6 text-xs font-bold tracking-[0.18em] text-green-100">SMART WASTE IDENTIFICATION</p><h2 className="mt-3 text-3xl font-bold leading-tight">What kind of waste<br />do you have?</h2><p className="mt-4 max-w-xl leading-relaxed text-green-50">Upload a photo or click a picture of your waste. WasteWise will help identify it and recommend the right way to dispose of it.</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => inputRef.current?.click()} className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-green-800 transition hover:bg-green-50"><Camera size={18} /> Click photo</button><button type="button" onClick={() => inputRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 font-semibold transition hover:bg-white/10"><ImageUp size={18} /> Upload photo</button><input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={selectImage} /></div><p className="mt-4 text-xs text-green-100">JPG, PNG or WEBP. Maximum 10 MB.</p></div>
            <div className="mx-auto w-full max-w-sm"><div className="aspect-square overflow-hidden rounded-[2rem] border border-white/25 bg-white/10 p-3 shadow-inner">{image ? <img src={image} alt="Selected waste" className="h-full w-full rounded-[1.5rem] object-cover" /> : <div className="flex h-full flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/40 bg-white/5 text-center"><span className="rounded-full bg-white/15 p-6"><Camera size={44} /></span><p className="mt-5 font-semibold">Ready to identify</p><p className="mt-1 text-sm text-green-100">Your photo will appear here.</p></div>}</div></div></div>
        </section>

        <section className="mt-7 flex items-center justify-between gap-4 rounded-2xl border border-amber-100 bg-[#fffaf0] p-5 sm:p-7"><button type="button" onClick={() => setRewardIndex((rewardIndex - 1 + rewards.length) % rewards.length)} className="rounded-full bg-white p-2 text-amber-700 shadow-sm"><ArrowLeft size={19} /></button><div className="flex flex-1 items-center gap-4"><span className="hidden rounded-2xl bg-amber-100 p-4 text-amber-700 sm:block"><RewardIcon size={28} /></span><div><p className="text-xs font-bold tracking-[0.15em] text-amber-700">WASTEWISE REWARDS</p><h2 className="mt-1 text-xl font-bold">{reward.title}</h2><p className="mt-1 text-sm text-slate-600">{reward.text}</p></div></div><button type="button" onClick={() => setRewardIndex((rewardIndex + 1) % rewards.length)} className="rounded-full bg-white p-2 text-amber-700 shadow-sm"><ArrowRight size={19} /></button></section>

        <section className="mt-10"><div className="flex items-end justify-between"><div><p className="text-xs font-bold tracking-[0.18em] text-green-700">YOUR IMPACT</p><h2 className="mt-2 text-2xl font-bold">Your sustainability snapshot</h2></div><button className="hidden items-center gap-1 text-sm font-semibold text-green-700 sm:flex">View full impact <ChevronRight size={16} /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[{ label: 'Total waste', value: '12.5 kg', note: 'This month', icon: Trash2, color: 'text-slate-600 bg-slate-100' }, { label: 'Waste recycled', value: '7.2 kg', note: '58% of total waste', icon: Recycle, color: 'text-sky-700 bg-sky-100' }, { label: 'Eco score', value: '82', note: 'Great progress!', icon: Leaf, color: 'text-green-700 bg-green-100' }, { label: 'Reward points', value: '340', note: '60 to next badge', icon: Award, color: 'text-amber-700 bg-amber-100' }].map(({ label, value, note, icon: Icon, color }) => <article key={label} className="rounded-2xl border border-green-100 bg-white p-5"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon size={20} /></span><p className="mt-5 text-sm text-slate-500">{label}</p><h3 className="mt-1 text-2xl font-bold">{value}</h3><p className="mt-1 text-xs text-slate-500">{note}</p></article>)}</div></section>

        <section className="mt-10 pb-10"><div className="flex items-end justify-between"><div><p className="text-xs font-bold tracking-[0.18em] text-green-700">RECENT ACTIVITY</p><h2 className="mt-2 text-2xl font-bold">Your latest waste records</h2></div><button className="hidden items-center gap-1 text-sm font-semibold text-green-700 sm:flex">View history <ChevronRight size={16} /></button></div><div className="mt-5 overflow-hidden rounded-2xl border border-green-100 bg-white">{activity.map(({ icon: Icon, type, amount, action, date, color }) => <div key={type} className="flex items-center justify-between gap-4 border-b border-slate-100 p-5 last:border-0"><div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon size={19} /></span><div><h3 className="font-semibold">{type}</h3><p className="text-sm text-slate-500">{date}</p></div></div><strong className="text-sm">{amount}</strong><span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">{action}</span></div>)}</div></section>
      </div>
    </main>
  )
}

export default Dashboard
