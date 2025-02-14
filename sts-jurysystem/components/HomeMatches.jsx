export const dynamic = 'force-dynamic';

import Link from 'next/link';
import MatchCard from '@/components/MatchCard'; // Komponen untuk menampilkan match
import { fetchMatches } from '@/utils/requestMatches'; // Utilitas untuk fetch matches

const HomeMatches = async () => {
  const datas = await fetchMatches();

  const recentMatches = datas.events
    ? datas.events.sort(() => Math.random() - Math.random()).slice(0, 3)
    : [];

  return (
    <>
      <section className='px-4 py-6'>
        <div className='container-xl lg:container m-auto'>
          <h2 className='text-3xl font-bold text-blue-500 mb-6 text-center'>
            Recent Matches
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {recentMatches.length === 0 ? (
              <p>No Matches Found</p>
            ) : (
              recentMatches.map((match) => (
                <MatchCard key={match._id} match={match} />
              ))
            )}
          </div>
        </div>
      </section>

      <section className='m-auto max-w-lg my-10 px-6'>
        <Link
          href='/matches'
          className='block bg-black text-white text-center py-4 px-6 rounded-xl hover:bg-gray-700'
        >
          View All Matches
        </Link>
      </section>
    </>
  );
};

export default HomeMatches;