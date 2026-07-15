export const dynamic = 'force-dynamic';

import Link from 'next/link';
import MatchCard from '@/components/MatchCard';
import { fetchMatches } from '@/utils/requestMatches';

const HomeMatches = async () => {
  const datas = await fetchMatches();

  // Jika events tersedia, urutkan dari terbaru berdasarkan tanggal mulai (startDateEvent)
  const recentMatches = datas?.events
    ? [...datas.events]
        .filter((ev) => ev.startDateEvent) // hanya yang punya tanggal
        .sort(
          (a, b) =>
            new Date(b.startDateEvent).getTime() -
            new Date(a.startDateEvent).getTime()
        )
        .slice(0, 3)
    : [];

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
                <MatchCard key={match._id} match={match} />
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
  );
};

export default HomeMatches;