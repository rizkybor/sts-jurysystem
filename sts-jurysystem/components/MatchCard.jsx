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

export default function MatchCard({ match }) {
  const id = String(match?.id ?? match?._id ?? '')
  const name = match?.eventName ?? 'Untitled'
  const level = match?.levelName ?? '-'
  const city = match?.addressCity || ''
  const prov = match?.addressProvince || ''
  const start = fmtDate(match?.startDateEvent)
  const end = fmtDate(match?.endDateEvent)
  const totalParticipant = Array.isArray(match?.participant)
    ? match.participant.length
    : 0

  return (
    <Link href={`/matches/${id}`} className='group block'>
      <article className='rounded-2xl overflow-hidden bg-white shadow-sm ring-1 ring-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200'>
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
          {/* level badge */}
          <span className='absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 text-gray-800 shadow'>
            {level}
          </span>
        </div>

        {/* Body */}
        <div className='p-4'>
          <h3 className='text-base md:text-lg font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600'>
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
            <span className='font-medium'>Tanggal:</span> {start} — {end}
          </div>

          <div className='mt-3 flex items-center justify-between'>
            <span className='inline-flex items-center gap-2 text-sm text-gray-700'>
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
              {totalParticipant} peserta
            </span>

            <span className='text-blue-600 text-sm font-semibold group-hover:translate-x-0.5 transition'>
              Lihat Detail →
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
