import Hero from '@/components/Hero';
import InfoBoxes from '@/components/InfoBoxes';
import HomeMatches from '@/components/HomeMatches';

// BUG FIX (2026-09-25): tanpa ini, Next.js melihat halaman ini TIDAK
// punya sinyal dynamic apa pun (tidak ada fetch({cache:'no-store'}),
// cookies(), atau headers()) — jadi di-PRERENDER STATIS sekali saat
// `next build`, membekukan "Fresh Off The Roster / New Events" (query
// langsung ke MongoDB di HomeMatches.jsx) dgn data SAAT BUILD selamanya.
// Event baru yang ditambahkan atau status Activated/Deactivated yang
// diubah SETELAH deploy tidak akan pernah muncul di homepage sampai
// build ulang berikutnya — persis gejala "card fetch datanya nyangkut/
// tidak update" yang dilaporkan user. Pola sama dgn `dynamic =
// "force-dynamic"` yang sudah dipakai di semua API routes.
export const dynamic = 'force-dynamic';

export const metadata = {
  description:
    'STiming Scoring — temukan event Whitewater Rafting Championship, jelajahi hasil pertandingan, dan pantau skor live secara real-time.',
  openGraph: {
    title: 'STiming Scoring | Smart & Accurate Event Timing System',
    description:
      'Temukan event Whitewater Rafting Championship, jelajahi hasil pertandingan, dan pantau skor live secara real-time.',
    url: '/',
    type: 'website',
    images: [
      {
        url: '/assets/images/sts-logo-primary.png',
        width: 259,
        height: 259,
        alt: 'STiming Scoring',
      },
    ],
  },
  alternates: {
    canonical: '/',
  },
};

const HomePage = () => {
  return (
    <>
      <Hero />
      <InfoBoxes />
      <HomeMatches />
    </>
  );
};
export default HomePage;