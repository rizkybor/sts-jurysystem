import MatchesLayout from '@/components/MatchesLayout';

export const metadata = {
  title: 'Browse Events',
  description:
    'Cari dan jelajahi event Whitewater Rafting Championship berdasarkan nama atau level klasifikasi. Temukan jadwal dan detail lengkap tiap event.',
  openGraph: {
    title: 'Browse Events | STiming Scoring',
    description:
      'Cari dan jelajahi event Whitewater Rafting Championship berdasarkan nama atau level klasifikasi.',
    url: '/matches',
    type: 'website',
  },
  alternates: {
    canonical: '/matches',
  },
};

const MatchesPage = async () => {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-sts via-stsDark to-stsDarkHiglight py-10 sm:py-12">
        <div className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-stsHighlight/25 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-72 h-72 rounded-full bg-cyan-400/15 blur-[100px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Browse Events
          </h1>
          <p className="mt-1.5 text-sm text-white/80 max-w-lg mx-auto">
            Search whitewater rafting championship events by name or
            classification level.
          </p>
        </div>
      </section>
      <MatchesLayout />
    </>
  );
};
export default MatchesPage;
