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
      <section className="px-6 py-6">
        <div className="container-xl lg:container m-auto">
          <h2 className="text-2xl font-bold text-black-500 mb-6 text-center">
            New Events
          </h2>

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

      <section className="m-auto max-w-lg my-10 px-6">
        <Link
          href="/matches"
          className="block surface-sts text-white text-center py-4 px-6 rounded-xl hover:btnHover-sts transition-colors duration-300"
        >
          View All Events
        </Link>
      </section>
    </>
  );
};

export default HomeMatches;