import Link from 'next/link';

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-sts via-stsDark to-stsDarkHiglight py-20 sm:py-28">
      {/* Ambient blur orbs */}
      <div className="pointer-events-none absolute -top-32 -left-24 w-96 h-96 rounded-full bg-stsHighlight/30 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-cyan-400/20 blur-[110px]" />
      {/* Subtle dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-semibold tracking-wide uppercase backdrop-blur-sm mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          STiming Scoring is now live!
        </span>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight tracking-tight">
          Find Events Powered by
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-white">
            STiming Scoring
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-white/80 max-w-2xl">
          Discover whitewater rafting championship events, browse match
          results, and follow live scoring in real time.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <Link
            href="/matches"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-stsDark font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 text-center"
          >
            Browse Events
          </Link>
          <Link
            href="/live"
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-white/30 text-white font-semibold hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Live Results
          </Link>
        </div>
      </div>
    </section>
  );
};
export default Hero;
