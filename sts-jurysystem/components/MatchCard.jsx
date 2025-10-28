import Image from 'next/image'
import Link from 'next/link'

const DEFAULT_IMG = '/images/logo-dummy.png'

function fmtDate(s) {
  if (!s) return '-'
  const d = new Date(s)
  return isNaN(d)
    ? s
    : d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
}

// 🎨 Warna badge level
const levelColors = {
  A: 'bg-gradient-to-r from-green-500 to-green-600 text-white',
  B: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
  C: 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-800',
  D: 'bg-gradient-to-r from-orange-400 to-orange-500 text-white',
  E: 'bg-gradient-to-r from-red-500 to-rose-600 text-white',
  F: 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white',
  G: 'bg-gradient-to-r from-cyan-400 to-sky-500 text-gray-900',
  H: 'bg-gradient-to-r from-pink-400 to-pink-600 text-white',
  I: 'bg-gradient-to-r from-gray-400 to-gray-500 text-white',
}
const defaultLevelColor = 'bg-gray-200 text-gray-800'

// 🔖 Status event (Upcoming / Already passed)
function getStatusBadge(startDate, endDate) {
  const now = new Date()
  const start = startDate ? new Date(startDate) : null
  const end = endDate ? new Date(endDate) : null

  if (start && !isNaN(start) && now < start) {
    return {
      label: 'Upcoming',
      cls: 'bg-sts/10 text-stsDark ring-1 ring-stsHighlight/20',
    }
  }
  if (end && !isNaN(end) && now > end) {
    return {
      label: 'Already passed',
      cls: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
    }
  }
  return null
}

export default function MatchCard({ match }) {
  const id = String(match?.id ?? match?._id ?? '')
  const name = match?.eventName ?? 'Untitled'
  const level = match?.levelName ?? '-'
  const city = match?.addressCity || ''
  const prov = match?.addressProvince || ''
  const startStr = fmtDate(match?.startDateEvent)
  const endStr = fmtDate(match?.endDateEvent)

  // poster_url prioritas utama, lalu variasi lain, terakhir fallback local
  const posterUrl =
    match?.poster_url || match?.posterUrl || match?.imageUrl || DEFAULT_IMG

  const classification = level.split('-').pop().trim()
  const badgeClass = levelColors[classification] || defaultLevelColor

  const status = getStatusBadge(match?.startDateEvent, match?.endDateEvent)

  return (
    <Link href={`/matches/${id}`} className="group block">
      <article
        className="
          relative overflow-hidden rounded-2xl
          bg-white text-gray-900
          shadow-md ring-1 ring-gray-200/70
          transition-all duration-500 ease-out
          hover:-translate-y-1 hover:scale-[1.02]
          hover:ring-[2px] hover:ring-[#4690B7]/70
          hover:shadow-[0_0_40px_rgba(70,144,183,0.45)]
        "
      >
        {/* 🔹 Glow gradient overlay saat hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% -20%, rgba(70,144,183,0.25), rgba(24,116,165,0.1), transparent 70%)',
          }}
        />

        {/* Gambar */}
        <div className="relative h-44 w-full bg-gray-100 overflow-hidden border-b border-gray-200">
          <Image
            src={posterUrl}
            alt={name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            priority={false}
            unoptimized={/^https?:\/\//.test(posterUrl)} // amanin kalau domain eksternal belum di next.config
          />

          {/* 🏷 Level Badge */}
          <span
            className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold shadow-md backdrop-blur-sm ${badgeClass}`}
          >
            {level}
          </span>
        </div>

        {/* Isi Card */}
        <div className="relative p-4 z-10">
          <h3
            className="
              text-base md:text-lg font-semibold text-gray-900 dark:text-sts line-clamp-1
              group-hover:text-stsHighlight transition-colors duration-200
            "
          >
            {name}
          </h3>

          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" className="text-sts">
              <path
                fill="currentColor"
                d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7m0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"
              />
            </svg>
            <span className="truncate">
              {city}
              {city && prov ? ', ' : ''}
              {prov}
            </span>
          </div>

          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Date:</span> {startStr} — {endStr}
          </div>

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between">
            <div className="min-h-[28px]">
              {status ? (
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${status.cls}`}
                >
                  {status.label}
                </span>
              ) : null}
            </div>

            <span
              className="
                text-sts text-sm font-semibold 
                group-hover:text-stsHighlight 
                group-hover:translate-x-0.5 
                transition-all duration-200
              "
            >
              View Detail →
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}