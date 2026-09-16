import Link from 'next/link'
import MatchCard from '@/components/MatchCard'
import connectDB from '@/config/database'
import Event from '@/models/Event'

// Query DB langsung (server component) — sebelumnya lewat fetchMatches(),
// yang self-fetch ke `${NEXT_PUBLIC_API_DOMAIN}/matches` (hardcode
// "http://localhost:3000/api" di .env). Itu penyebab error build yang
// selalu muncul di tiap `next build` ("Route / couldn't be rendered
// statically ... fetch http://localhost:3000/api/matches") — dan di
// production, kalau NEXT_PUBLIC_API_DOMAIN tidak di-override ke domain
// asli, homepage akan gagal total karena serverless function tidak bisa
// memanggil "localhost:3000" dirinya sendiri. Query langsung ke Mongo
// (pola sama dgn app/api/matches/route.js) menghilangkan ketergantungan
// itu sepenuhnya.
const HomeMatches = async () => {
  let recentMatches = []
  try {
    await connectDB()
    // "New Events" / "Fresh Off The Roster" = event yang baru DITAMBAHKAN,
    // jadi diurutkan dari createdAt terbaru — bukan startDateEvent
    // terjauh di masa depan (sort lama: descending by startDateEvent
    // malah menampilkan event yang jadwalnya paling jauh, bukan yang
    // paling baru dibuat).
    recentMatches = await Event.find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .lean()
  } catch (err) {
    console.error('❌ [HomeMatches] Failed to load recent events:', err)
    recentMatches = []
  }

  return (
    <>
      <section className="px-6 py-14 sm:py-16 bg-white">
        <div className="container-xl lg:container m-auto">
          <div className="text-center mb-8 sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-sts">
              Fresh Off The Roster
            </span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              New Events
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentMatches.length === 0 ? (
              <p className="text-gray-500 text-center col-span-full">
                No Matches Found
              </p>
            ) : (
              recentMatches.map((match) => (
                <MatchCard key={String(match._id)} match={match} />
              ))
            )}
          </div>
        </div>
      </section>

      <section className="m-auto max-w-lg pb-16 px-6">
        <Link
          href="/matches"
          className="group flex items-center justify-center gap-2 bg-gradient-to-r from-sts to-stsDark text-white text-center py-4 px-6 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 font-semibold"
        >
          View All Events
          <span className="transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </Link>
      </section>
    </>
  )
}

export default HomeMatches
