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

// 🎨 Mapping warna badge untuk masing-masing classification
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

export default function MatchCard({ match }) {
  const id = String(match?.id ?? match?._id ?? '')
  const name = match?.eventName ?? 'Untitled'
  const level = match?.levelName ?? '-'
  const city = match?.addressCity || ''
  const prov = match?.addressProvince || ''
  const start = fmtDate(match?.startDateEvent)
  const end = fmtDate(match?.endDateEvent)

 // Ambil huruf classification terakhir setelah tanda "-"
  const classification = level.split('-').pop().trim()
  const badgeClass = levelColors[classification] || defaultLevelColor
  return (
    <Link href={`/matches/${id}`} className='group block'>
      <article className='rounded-2xl overflow-hidden bg-white shadow-lg ring-1 ring-gray-100 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200'>
        {/* Image */}
        <div className='relative h-44 w-full bg-gray-100'>
          <Image
            src={DEFAULT_IMG}
            alt={name}
            fill
            className='object-cover'
            sizes='(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw'
            priority={false}
          />
          {/* 🏷 Badge Classification */}
          <span
            className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold shadow-md backdrop-blur-sm ${badgeClass}`}>
            {level}
          </span>
        </div>

        {/* Body */}
        <div className='p-4'>
          <h3 className='text-base md:text-lg font-semibold text-gray-900 line-clamp-1 group-hover:surface-text-sts'>
            {name}
          </h3>

          <div className='mt-1 text-sm text-gray-600 flex items-center gap-1.5'>
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              className='text-rose-600'>
              <path
                fill='currentColor'
                d='M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7m0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z'
              />
            </svg>
            <span className='truncate'>
              {city}
              {city && prov ? ', ' : ''}
              {prov}
            </span>
          </div>

          <div className='mt-1 text-sm text-gray-600'>
            <span className='font-medium'>Date:</span> {start} — {end}
          </div>

          <div className='mt-3 flex items-center justify-end'>
            {/* <span className='inline-flex items-center gap-2 text-sm text-gray-700'>
              <svg
                width='18'
                height='18'
                viewBox='0 0 24 24'
                className='text-emerald-600'>
                <path
                  fill='currentColor'
                  d='M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5M6 22v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2Z'
                />
              </svg>
              {totalParticipant} Teams
            </span> */}

            <span className='surface-text-sts text-sm font-semibold group-hover:translate-x-0.5 transition'>
              View Detail →
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
