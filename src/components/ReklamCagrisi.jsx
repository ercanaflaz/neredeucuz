import { Megaphone, ArrowRight } from 'lucide-react'

// Her sayfanın altında görünen ince şerit:
// "Bu platform Ercan Aflaz tarafından geliştirildi · Reklam vermek için tıklayın"
export default function ReklamCagrisi({ className = '' }) {
  return (
    <a
      href="#/reklam-ver"
      className={`group block rounded-2xl bg-gradient-to-r from-primary to-secondary text-white px-4 py-3 shadow-sm hover:shadow-md transition ${className}`}
    >
      <div className="flex items-center gap-3">
        <Megaphone size={18} className="shrink-0 opacity-90" />
        <div className="min-w-0 flex-1 text-sm">
          <span className="font-semibold">Reklam vermek için tıklayın</span>
          <span className="hidden sm:inline opacity-80"> — markanı binlerce alışverişçiye göster</span>
          <span className="block text-[11px] opacity-75">Bu platform Ercan Aflaz tarafından geliştirildi</span>
        </div>
        <span className="inline-flex items-center gap-1 bg-white/20 rounded-lg px-3 py-1.5 text-sm font-semibold shrink-0 group-hover:bg-white/30 transition">
          Reklam Ver <ArrowRight size={15} />
        </span>
      </div>
    </a>
  )
}
