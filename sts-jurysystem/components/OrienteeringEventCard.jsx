import Link from 'next/link'

// Kartu event modul Orienteering — dipakai berdampingan dgn MatchCard
// (event Rafting) di New Events homepage & /matches. Gaya visual sengaja
// sama dgn MatchCard; perbedaannya: badge "Orienteering" (bukan level
// klasifikasi), daftar jenis + lokasi, dan menuju halaman detail event
// Orienteering (/matches/orienteering/[id]; Live Result ada di dalamnya).

function wib(s, endOfDay = false) {
  if (!s) return null
  const d = new Date(`${s}T${endOfDay ? '23:59:59' : '00:00:00'}+07:00`)
  return isNaN(d) ? null : d
}

function fmtDate(s) {
  const d = wib(s)
  return d
    ? d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })
    : '-'
}

function getStatusBadge(startDate, endDate) {
  const now = new Date()
  const start = wib(startDate)
  const end = wib(endDate || startDate, true)
  if (start && now < start) {
    return { label: 'Upcoming', cls: 'bg-sts/10 text-stsDark ring-1 ring-stsHighlight/20' }
  }
  if (end && now > end) {
    return { label: 'Already passed', cls: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200' }
  }
  return { label: 'Live', cls: 'bg-red-600 text-white' }
}

export default function OrienteeringEventCard({ event }) {
  const status = getStatusBadge(event.startDate, event.endDate)
  const races = event.races || []
  const locations = races.map((r) => r.location).filter(Boolean)
  const where = locations.length ? Array.from(new Set(locations)).join(' · ') : event.location

  return (
    <Link href={`/matches/orienteering/${event.id}`} className="group block">
      <article
        className="
          relative overflow-hidden rounded-2xl
          bg-white text-gray-900
          shadow-md ring-1 ring-gray-200/70
          transition-all duration-500 ease-out
          hover:-translate-y-1 hover:scale-[1.02]
          hover:ring-[2px] hover:ring-emerald-500/60
          hover:shadow-[0_0_40px_rgba(16,185,129,0.35)]
        "
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% -20%, rgba(16,185,129,0.22), rgba(24,116,165,0.08), transparent 70%)',
          }}
        />

        {/* Gambar */}
        <div className="relative h-44 w-full overflow-hidden border-b border-gray-200 bg-gradient-to-br from-emerald-700 via-teal-700 to-sts">
          {event.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.image}
              alt={event.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto w-20 h-20 text-white/25" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm-5.5-2.5 7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5Zm5.5-6.6a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z" />
            </svg>
          )}
          <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold shadow-md backdrop-blur-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
            Orienteering
          </span>
          {event.logo && (
            <span className="absolute bottom-2 right-3 w-11 h-11 rounded-lg bg-white ring-2 ring-white shadow-md overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={event.logo} alt="" className="w-full h-full object-contain p-0.5" />
            </span>
          )}
        </div>

        {/* Isi Card */}
        <div className="relative p-4 z-10">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 line-clamp-1 group-hover:text-emerald-700 transition-colors duration-200">
            {event.name}
          </h3>

          <div className="mt-1 text-sm text-gray-600 flex items-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" className="text-emerald-600 flex-none">
              <path
                fill="currentColor"
                d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7m0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"
              />
            </svg>
            <span className="truncate">{where || '-'}</span>
          </div>

          <div className="mt-1 text-sm text-gray-600">
            <span className="font-medium">Date:</span> {fmtDate(event.startDate)} — {fmtDate(event.endDate)}
          </div>

          {races.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {races.map((r) => (
                <span key={r.id} className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                  {r.name}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="min-h-[28px] flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${status.cls}`}>
                {status.label}
              </span>
              <span className="text-xs text-gray-500">👥 {event.participantCount || 0}</span>
            </div>
            <span className="text-emerald-700 text-sm font-semibold group-hover:translate-x-0.5 transition-all duration-200">
              View Detail →
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
