import Hero from '@/components/Hero';
import InfoBoxes from '@/components/InfoBoxes';
import HomeMatches from '@/components/HomeMatches';

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